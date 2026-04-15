---
description: "Use when modifying Firebase Cloud Functions in functions/src, including HTTP handlers, mail services, and Firestore query logic. Covers runtime-safe patterns, exports, and deployment readiness."
name: "Firebase Functions Rules"
applyTo: "functions/src/**/*.ts"
---
# Firebase Functions Rules

- Keep functions/src as the editable source; generated files in functions/lib are build output only.
- Export deployable functions from functions/src/index.ts and keep module files focused on one responsibility.
- Use process.env for runtime configuration in functions code and provide safe defaults for local emulation when needed.
- Keep admin initialization guarded against duplicate init during local runs.
- Validate request inputs early and return clear HTTP status codes/messages for failures.

# Firestore And Data Handling

- Query only the needed env-scoped collections and fields; avoid broad reads when narrower filters are possible.
- Normalize timestamp/date inputs defensively before generating calendar or mail payloads.
- Keep event/member mapping logic deterministic and null-safe to avoid partial payload crashes.

# Shared Types And Build

- Shared types are copied from src/types/types-file.ts via the prebuild script.
- After changing shared types or function signatures, run npm run build in functions to refresh copied types and lib output.
- Keep node runtime compatibility with functions/package.json engines (node 22).
