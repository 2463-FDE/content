# AWS / GCP curriculum paths

The curriculum offers a top-level **AWS · GCP · Both** choice. One cloud is the
expected route. Shared concepts are written once; only genuinely provider-specific
mechanics, examples, and decision checks are written twice.

## Decisions this design applies

| Key | Status | Effect |
|---|---|---|
| `gcp-path-primary-plane` | **Decided 2026-10-14: mirror** | The learner-selected cloud is the primary implementation plane; the other provider is the comparison substrate. GCP learners do not inherit the source curriculum's fixed AWS-primary topology. `Both` presents both paths; one-cloud focus remains the Core-30 route. |
| `gcp-cert-alignment-target` | **Pending** | `assets/js/cert-objectives.js` keeps `paths.gcp.target = null`; `certifications.html` lists both Google Professional candidates as evidence and claims neither. The AWS path's target (AIP-C01) is not decision-dependent. |

Neither decision authorizes cloud accounts, provisioning, billing, IAM, deployment,
or paid provider calls. Provider "labs" are in-page simulations and read-only code.

## Learner experience

- **Picker:** `assets/js/cloud-path.js` renders an accessible radio group
  (`fieldset`/`legend`, one group per picker) above the hub calendar, on
  `certifications.html`, and as a compact picker on every lesson that carries
  provider blocks.
- **Resolution order:** `?cloud=aws|gcp|both` → the tab's session value (set by a
  deep link) → the saved choice (`localStorage`, set only by an explicit pick) →
  unset. A deep link never overwrites the saved choice. Unset renders as **Both**
  with a prompt, so nothing is hidden. Storage failures degrade to unset.
- **On a lesson:** the selected cloud's block stays open and is tagged "Your path";
  the other cloud's block collapses and is tagged "Comparison substrate · optional".
  Only the selected path's Core-30 label shows; in Both, both labels show.
  `quiz.js` shows shared questions plus the selected path's tagged questions;
  `codeviewer.js` shows the selected path's code tab.
- **No JavaScript:** every `details.cloud-block` is `open` in static markup with an
  `AWS`/`GCP` tag in its summary, and both labels are visible.

## Authoring contract

See the Core-30 section of `docs/week-fanout-plan.md`; the reference page is
`weeks/w01/d4b.html` and the validator is `tests/core30.py`.

```html
<span class="core30-meta" data-cloud="aws"><b>Core 30</b> · AWS · ~N min read · K interactions · Q-Q check</span>
<span class="core30-meta" data-cloud="gcp"><b>Core 30</b> · GCP · ~N min read · K interactions · Q-Q check</span>
<details class="cloud-block" data-cloud="aws" open>
  <summary><span class="cloud-tag">AWS</span>Title<span class="cloud-role"></span></summary>
  … provider prose …
  <div class="ix-cloud" data-core-interaction data-cloud="aws"> … decision check … </div>
</details>
<details class="cloud-block" data-cloud="gcp" open> … </details>
```

- Per provider: shared required words + that provider's block ≤ 1,800; label
  minutes = `round(words / 150)`; interaction and check counts are that path's.
- Make room by moving prose into `details.deep[data-core="optional"]`, never by
  deleting it.
- Every provider claim traces to `docs/research/<week>/<page>-provider-paths.md`
  (first-party sources, access date). Every provider source link on the page must
  appear in that artifact (tested).
- `.ix-cloud` (`assets/js/interactive-cloud.js`) is a progressive-enhancement
  predict-then-check: static question, options, and answer are readable without
  JavaScript.

## Project progression by path (mirror)

| Phase | AWS path | GCP path |
|---|---|---|
| Weeks 1–5, solo, local-first | Bedrock is the model plane; Gemini Enterprise Agent Platform is the comparison | Gemini Enterprise Agent Platform is the model plane; Bedrock is the comparison |
| Weeks 6–10, teams of 2–3, inheriting Project 1 | AWS is the primary implementation plane; GCP is the comparison substrate for the cross-cloud deliveries | GCP is the primary implementation plane; AWS is the comparison substrate |
| Cross-cloud judgement (event hop and egress measurement, the two-provider infrastructure design, identity federation, the workload-placement memo) | Shared and required on both paths | Shared and required on both paths |

Weeks 6–7 in the LTM structure (Kafka; Terraform + Ansible) have no live lesson
pages yet; the curriculum-hub lane owns their transfer. When they are authored,
the "primary plane" in each delivery narrative is the learner's selected cloud and
the second provider is the comparison substrate. Terraform stays in its later week.

## Seams with the curriculum-hub lane

- `index.html` gets one additive `<head>` script line; the picker mounts itself
  into `#cloud-path-mount`, or creates that mount directly above `#cal`.
- `assets/js/curriculum-config.js` (hub-owned) may define `cloudPath.options`;
  `cloud-path.js` reads it at call time. Once both lanes land, the hub's
  `cloudPath.status`/`active` placeholder and its "AWS/GCP evidence seam pending"
  status chip should be updated to reflect the live path (one-line follow-up).
- Lesson pages, `cloud-map.js`, and the provider research artifacts belong to this
  lane; week routing, batch context, and W9–W10 pages belong to the hub lane.

## Open items

- **Mixed-path teams (Weeks 6–10).** The mirror decision makes the selected cloud
  the primary plane; how a team of 2–3 whose members picked different clouds
  chooses its plane is not yet decided.
- **GCP certification target.** Pending `gcp-cert-alignment-target`. The
  Professional Agentic Architect is in beta until mid-November 2026; re-verify its
  guide at GA (`docs/research/certifications/`).
- **Held PR overlap.** Lessons rewritten by held PR #15 (W1 D1/D2a/D4a/D5, W2 D4/D5)
  have no provider blocks yet, to avoid conflicting with that PR.
