# Collaborator Output Docs

This folder stores reusable markdown artifacts produced by collaborator commands:

- `/research`
- `/prd`
- `/implement`
- `/review`
- `/collab` (router/chain mode)

## Structure

- `templates/` — markdown templates for consistent output shape
- `runs/` — dated execution artifacts for specific initiatives

## Run Conventions

For each initiative, create:

- `docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/research.md`
- `docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/prd.md`
- `docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/implementation-log.md`
- `docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/review.md`

Use lowercase kebab-case for `<slug>`.

## Why this exists

- Keeps command outputs discoverable and auditable.
- Preserves decision trails from research through review.
- Makes future agent sessions faster by providing structured history.
