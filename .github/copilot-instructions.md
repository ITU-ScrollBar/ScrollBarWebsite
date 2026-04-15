# ScrollBar Repository Guidelines

## Project Structure
- Frontend app code lives in src (React 19, TypeScript, Vite, Ant Design).
- Firebase API wrappers are in src/firebase/api and should be used from hooks in src/hooks.
- Cloud Functions source is in functions/src and compiled output is in functions/lib.
- Firestore data migrations live in migrations.

## Code Quality Defaults
- Follow the repository lint style: 2-space indentation, no tabs, and no unused imports.
- Prefer explicit types for public boundaries (hook return values, API function params, function handler payloads).
- Keep logic readable and composable: small helpers, early returns, and minimal nesting.
- Avoid disabling lint rules unless there is a documented reason in a short code comment.

## Data And API Conventions
- Keep Firebase reads/writes in src/firebase/api; avoid calling Firestore directly from pages/components.
- Keep stateful data orchestration in hooks and keep page components focused on rendering and interaction.
- Preserve existing soft-delete patterns (for example deleted flags) unless a task explicitly requires hard deletes.
- Normalize Firestore data in one place (timestamps, ids, keys) before handing it to UI components.

## Functions And Shared Types
- Treat functions/src as the source of truth for cloud logic; never hand-edit functions/lib files.
- Shared app/function types come from src/types/types-file.ts and are copied into functions/src/types by prebuild scripts.
- When changing shared types, run functions build flow so copied types and generated output stay in sync.

## Validation Commands
- Root frontend checks: yarn lint and yarn build.
- Functions checks: from functions, run npm run build (includes prebuild type copy).
- If a task touches both frontend and functions, run both validation flows before finalizing.

## Change Scope
- Prefer focused, minimal diffs over broad refactors.
- Do not modify generated assets in public/assets unless the task is specifically about build artifacts.
- Preserve current architecture and naming patterns unless user asks for structural change.
