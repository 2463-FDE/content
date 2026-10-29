# Local synthetic persona communications

`persona-communications.html` delivers the Riverbend/Meridian communication practice surface linked from the curriculum hub and `client-delivery.html`.

## Boundaries

- `assets/js/persona-communications-fixtures.js` is the single learner-visible scenario-truth source used by technical-lead chat and stakeholder inbox replies.
- Replies are deterministic local rules. The surface makes no model, provider, backend, scheduler, email, credential, production, publication, or deployment request.
- The inbox reads the existing `fde_identity` browser record. It does not validate codes or create an authentication system; learners without that existing record return to Client Delivery to use the established sign-in flow.
- Simulation state is learner-local under an opaque hashed key prefixed `fde_local_synthetic_persona_v1:`. Reset removes only that key.
- Stakeholder replies reveal at a deterministic synthetic `deliverAt` 15–30 minutes after send. `?simClock=accelerated` exposes the injected-clock controls used for local validation.
- Coaching is computed from local transcript text and is formative only. It has no grade, progress, assessment, rubric, trainer-manifest, export, or tracking integration.
- Learner-authored and fixture response text is rendered with DOM `textContent`.

Historical PR 7 at head `874fb96432110237dcc812a700dc9a90ae099527` was inspected as read-only source evidence. Its unresolved stakeholder positions and classifications are not activated. Technical-lead roles remain the centralized functional labels **Riverbend IT lead** and **Meridian platform engineering lead**.

Browser isolation and local-only request evidence is recorded in [`docs/research/persona-communications-browser-isolation-2026-10-29.md`](research/persona-communications-browser-isolation-2026-10-29.md).

## Validation

```bash
node --test tests/persona-communications.test.cjs
python3 -m unittest discover -s tests -v
node --test tests/*.test.cjs
```
