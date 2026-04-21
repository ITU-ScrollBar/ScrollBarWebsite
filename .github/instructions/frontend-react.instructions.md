---
description: "Use when modifying React pages, components, hooks, or Firebase API wrappers in src. Covers frontend architecture, hook usage, Firestore data shaping, and responsive Ant Design patterns."
name: "Frontend React + Firebase Rules"
applyTo: "src/**/*.ts", "src/**/*.tsx"
---
# Frontend Rules

- Keep Firebase access in src/firebase/api and consume it through hooks in src/hooks.
- Pages in src/pages should coordinate UI state and composition; reusable rendering logic belongs in src/components.
- Convert Firestore timestamp-like values to Date objects in hooks/api mapping layers before rendering.
- In table/list render callbacks, prefix intentionally unused args with _ to satisfy lint rules.
- Keep React hook dependency arrays complete. Prefer stabilizing values with useMemo/useCallback over suppressing warnings.
- Follow existing role and route guards in src/routes and admin page patterns when adding protected screens.

# File Structure And Size

- Prefer many small files over large page files. Extract view sections, table configs, and form blocks into components.
- Keep Page.tsx files focused on page-level orchestration only: routing context, tabs, navigation, layout, and high-level state wiring.
- Move page-specific UI into colocated folders near the page (for example src/pages/admin/ShiftManagement/components).
- Keep shared, reusable UI in src/components (for example UserAvatar, Loading, RoleTag) and avoid duplicating equivalents in page folders.
- When logic is page-specific, colocate hooks/utils/types with the page; when reused by multiple pages, promote to src/hooks, src/utils, or src/types.

# Recommended Page Layout

- Prefer this shape for complex pages:
  - Page entry: src/pages/<area>/<Feature>Page.tsx
  - Page module folder: src/pages/<area>/<Feature>/
  - Page components: src/pages/<area>/<Feature>/components/
  - Page hooks: src/pages/<area>/<Feature>/hooks/
  - Page utils/types: src/pages/<area>/<Feature>/utils.ts, src/pages/<area>/<Feature>/types.ts
- Keep the page entry thin and move heavy JSX/render conditionals into child components.
- If a component grows beyond roughly 150 to 200 lines or handles multiple concerns, split it into smaller focused components.

# UI And Responsiveness

- Prefer Ant Design components and existing project patterns before introducing custom UI primitives.
- Keep mobile behavior explicit (for example with useWindowSize) when desktop/table layouts are changed.
- Keep loading, empty, and error states present for data-driven screens.
- Reuse existing utility and context providers instead of duplicating stateful logic.

# Error Handling

- Every async user action (form submit, create, update, delete) must have a catch block that surfaces the failure to the user via message.error or notification.error.
- Use message.error for brief inline feedback (member-facing pages, simple actions). Use notification.error with a description for admin flows where context helps diagnose the failure.
- Never leave a try/finally without a catch when the operation can fail — a silent failure is worse than a visible one.
- For sequential async operations (for example delete satellite then delete primary), await each step so a failure on the first step stops the chain and triggers the catch.

# Validation

- After frontend changes, run yarn lint and yarn build from repo root.
