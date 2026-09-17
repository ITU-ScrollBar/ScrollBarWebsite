# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ScrollBar website: a React 19 + TypeScript + Vite + Ant Design SPA on Firebase (Auth, Firestore, Storage, Hosting) with Cloud Functions in `functions/` and Firestore data migrations in `migrations/`.

## Commands

Root uses Yarn v1 (`yarn@1.22.22`); CI runs Node 22.

```bash
yarn install
yarn dev            # Vite dev server on http://localhost:3000
yarn lint           # ESLint over src/ (functions/** and public/assets/** are ignored)
yarn lint:fix
yarn build          # tsc -b && vite build -> dist/ (type-checks src/ AND migrations/)
yarn migrate        # runs migrations/migration-runner.ts directly with node (TS type stripping)
```

Functions (run from `functions/`):

```bash
npm run build           # prebuild copies src/types/types-file.ts -> functions/src/types/, then tsc -> lib/
npm start               # build + firebase emulators (functions, firestore)
npm run upload-template # push functions/templates/*.html to Mailgun (needs MAILGUN_ADMIN_API_KEY)
```

There is no test suite. Validation is `yarn lint` + `yarn build` at the root, plus `npm run build` in `functions/` when functions or shared types change. The functions code is not linted by the root ESLint config.

## Architecture

### Firestore layout and environments

One Firebase project hosts both environments. Data is split in two:

- **Env-scoped** under `env/{VITE_APP_ENV}/<collection>`: `shifts`, `events`, `engagements`, `teams`, `internalEvents`, `boardRoles`, `applications`, `tickets`, shift planning data, email-request collections, and the migration tracking collection.
- **Global** (not env-scoped): `users`, `invites`, `settings`, `studylines`.

`VITE_APP_ENV` (`dev`/`prod`) is read in each `src/firebase/api/*.ts` module, in functions via `process.env.VITE_APP_ENV || 'dev'`, and by the migration runner. `src/firebase/index.ts` doesn't connect to emulators, so `yarn dev` reads and writes the real Firestore under whichever env `.env` names. Writes to global collections affect prod users.

### Frontend data flow

`src/firebase/api/*` (raw Firestore/Storage calls, `onSnapshot` streams) → `src/hooks/use*.ts` (subscribe, map Timestamps to `Date`, surface errors via `message.error`) → `src/contexts/*Context.tsx` (memoized provider wrapping the hook) → pages/components via `use*Context()`.

Providers are mounted at two levels, which decides where a context is available:
- `src/main.tsx` (every route): `AuthProvider`, `EventProvider`, `TenderProvider`, `SettingsProvider`.
- `src/routes/ProtectedRoutes.tsx` (logged-in routes only): `EngagementProvider`, `ShiftProvider`, `ShiftPlanningProvider`, `InternalEventProvider`, `TeamProvider`. Public pages can't use these.

The live `shifts`/`events` listeners only cover a rolling 12-month window (`src/firebase/api/dataWindow.ts`). Anything that needs older data has to query for it explicitly.

`src/types/types-file.ts` holds types shared by the frontend and functions. The copy in `functions/src/types/` is gitignored and overwritten on every functions build, so never edit that copy.

### Routing and access control

All routes are declared in `src/App.tsx`. `ProtectedRoutes` redirects unauthenticated users to `/login` and inactive users (`active: false`) to `/deletedUser`. `RoleProtectedRoute` checks `currentUser.roles` (the `Role` enum) against `requiredRole`, and admins (`isAdmin`) bypass the check unless `allowAdminBypass={false}`. Without a `requiredRole`, only admins get in.

### Cloud Functions (`functions/src`, region `europe-west1`)

All deployable functions are exported from `functions/src/index.ts`. There are three kinds:
- **HTTP**: `calendar` is an Express app (`calendar.ts`). It serves `.ics` feeds at `/calendar/:uid` (Hosting rewrites `/calendar/**` to it) and the REST ticket API at `/tickets`, which `src/firebase/api/tickets.ts` calls. The `createTicket`/`listTickets`/`setTicketStatus` callables in `tickets.ts` also exist.
- **Callable (`onCall`)**: `generateShiftPlan` and `resetUserMail` (exported from `adminChangeUserEmail`).
- **Firestore-triggered mail** (`mailservice.ts`, Mailgun): emails are sent when the frontend creates a document in trigger paths such as `invites/{email}` or `env/{_env}/applicationInviteEmails/{id}`, and when `env/{_env}/engagements/{id}` is updated. The trigger paths use an `{_env}` wildcard, so they fire for both envs. Mailgun template HTML is maintained in `functions/templates/`. Don't edit templates in the Mailgun UI.

Shift plan generation (`functions/src/shiftPlanning/`, which includes a max-flow solver) is a multi-phase allocation algorithm. Read `functions/src/shiftPlanning/GENERATE_SHIFT_PLAN.md` before changing it. A period can't be regenerated once `status === "generated"` until it is reset from the admin UI.

### Migrations

`migration-runner.ts` runs `migrations/NNN-*.ts` files in sorted order and records each file name in `env/{env}/migrations` (some docs call this collection `__migrations__`, but the runner uses `env/{env}/migrations`). Credentials come from `FIREBASE_SERVICE_ACCOUNT` or `./.credentials.json` at the repo root. Each migration default-exports `async ({ db, env }) => {...}` and runs against real Firestore, not an emulator.

### CI/CD (`.github/workflows`)

- Push to `main` deploys prod; push to `dev` deploys dev. The steps run in order: lint → migrate → build and deploy Hosting → build and deploy functions.
- PRs targeting branches other than `main` get a Hosting preview channel built with `VITE_APP_ENV=dev`.
- `public/assets/` holds old build output. Don't edit it unless the task is about build artifacts.

## Coding rules

@.github/copilot-instructions.md
@.github/instructions/frontend-react.instructions.md
@.github/instructions/firebase-functions.instructions.md
@.github/instructions/firestore-migrations.instructions.md
