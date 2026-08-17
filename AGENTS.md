# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- `expectations.v1.schema.json` is the shared manifest contract. After editing `client-delivery.html`, `index.html`, or `delivery-track.html`, regenerate with `node tools/expectations/build.mjs --mode post-cutover`; CI enforces `--check`.
- Trainer-only page content comes from the authenticated Worker manifest route. Validate the cutover with `node docs/trainer-manifest-qa.mjs`; do not restore trainer fields to public literals.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
