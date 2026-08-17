# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- `expectations.v1.schema.json` is the shared manifest contract. After editing `client-delivery.html`, `index.html`, or `delivery-track.html`, regenerate with `node tools/expectations/build.mjs --mode post-cutover`; CI enforces `--check`.
- Trainer-only page content comes from the authenticated Worker manifest route. Validate the cutover with `node docs/trainer-manifest-qa.mjs`; do not restore trainer fields to public literals.
- Manifest item ids are display slugs derived from the authored wording, so rewording rotates an id. Attachment records in `tools/expectations/overrides.json` are keyed by item id and the build rejects any key it can no longer resolve — rebind them in the same edit.
- `stakeholder_context.position_key` is the durable identity a classifying author assigns by hand: 2 to 4 dot-separated lowercase kebab segments, e.g. `healthcare.w01.phi-logging`. Choose it once and never rederive it from item text. Classification history keys off it, so moving a position between `non_negotiable` and `preference` needs `version` incremented and `supersedes` set to `<position_key>@v<superseded version>`; first-time classification is an ordinary versioned addition.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
