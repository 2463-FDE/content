# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- `expectations.v1.schema.json` is the shared manifest contract. After editing `client-delivery.html`, `index.html`, or `delivery-track.html`, regenerate with `node tools/expectations/build.mjs --mode post-cutover`; CI enforces `--check`.
- Trainer-only page content is not authored in this public repo. The answer key lives in the private backend repo at `content/expectations.trainer.v1.json` (ADR-004 §3, implementation plan WP-2.2) — first produced by a one-time migration script and reviewed line by line by the trainer in that backend PR — bundled into the Worker at build time and served only by `GET /coworker/manifest?scope=trainer` behind trainer authorization, with the role read from the datastore. Learner-session retrieval builds from the learner manifest only: it never indexes the trainer manifest, and learner-visible items never reference trainer-only ids. Future packet answer-key edits happen in that private file through a reviewed backend PR with trainer line-by-line review, never here; do not restore trainer fields to public literals. Validate the cutover from this side with `node docs/trainer-manifest-qa.mjs`.
- Manifest item ids are display slugs derived from the authored wording, so rewording rotates an id. Attachment records in `tools/expectations/overrides.json` are keyed by item id and the build rejects any key it can no longer resolve — rebind them in the same edit.
- A stakeholder position's durable identity is a human-assigned key in the form `<project>.w<NN>.<business|techlead>.<topic-slug>` (e.g. `healthcare.w07.business.guardrail-proof`). Author it in `tools/expectations/overrides.json` under `stakeholder_position_keys`, keyed by the carrying item id; the generator folds it into the emitted `stakeholder_context.position_key`, and inlining the key in the context is rejected. Choose the key once — it never changes when the wording does.
- A position's `position_type` is immutable for the life of its key. Reclassification is never an in-place edit: tombstone the old key in `retired_position_keys` (recording its `position_type`, the `version` it was retired at, and `superseded_by`), then author a new key whose carrying item sets `supersedes` to `<retired key>@v<version>`. The build rejects a self-supersession, a supersession naming an untombstoned key or a mismatched version, a one-sided link, a retired key reappearing as a live position, and `supersedes` on an item that carries no position.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
