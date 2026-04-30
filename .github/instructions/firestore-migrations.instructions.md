---
description: "Use when creating or updating Firestore migration scripts in migrations. Covers naming, idempotency, batching, and execution safety conventions for this repository."
name: "Firestore Migration Rules"
applyTo: "migrations/**/*.[ts|js]"
---
# Migration Rules

- Use filename format ###-short-description.ts (3-digit, zero-padded prefix) to preserve execution order.
- Export a default async migration function with the expected db context signature.
- Treat migrations as immutable after they run in any environment; create a new migration for follow-up changes.
- Keep migrations idempotent and safe to re-run checks against existing data shape.
- Use Firestore batch writes and keep each batch at 500 operations or fewer.
- Do not manually alter __migrations__ tracking records unless explicitly required for recovery.

# Data Safety

- Prefer additive or soft-delete style data changes over destructive deletes when possible.
- Include defensive guards for missing fields and legacy document variants.
- Keep logs concise but actionable so failed migration steps are diagnosable.

# Validation

- Validate migration naming and expected ordering before execution.
- Run migrations through the repository migration runner flow, not ad-hoc scripts.
