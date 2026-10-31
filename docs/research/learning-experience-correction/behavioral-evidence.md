# Behavioral evidence — LTM learning-experience correction

Recorded 2026-10-30 on branch `fm/fde-ltm-learning-experience-correction-replacement`
(isolated copy `/Users/jestercharles/.treehouse/fde-content-cab3e3/16/fde-content`).
This complements, not replaces, the automated behavioral suites; run commands are listed
at the end.

## 1. Browser isolation proof (before first navigation)

A dedicated headless Chrome instance was launched for this task only, with a fresh
profile under the session scratchpad and these egress-denial arguments, verified in the
actual process list (`ps -axo command`) while the only open page was `about:blank`:

```
--headless=new --remote-debugging-port=9333
--user-data-dir=<session-scratchpad>/chrome-profile-fde-correction
--proxy-server=http://127.0.0.1:9 --host-resolver-rules=MAP * ~NOTFOUND
--disable-background-networking --no-pings --disable-quic
--force-webrtc-ip-handling-policy=disable_non_proxied_udp
```

Ownership/identity was confirmed by reading the owned loopback listener's
`/json/version` (HeadlessChrome 156) before navigation. All subsequent driving went
through `chrome-devtools-axi` attached to that instance via
`CHROME_DEVTOOLS_AXI_BROWSER_URL=http://127.0.0.1:9333` with a dedicated
`CHROME_DEVTOOLS_AXI_SESSION=fde-ltm-correction`. **Behavioral confirmation of egress
denial:** navigating to `https://example.com/` failed with
`net::ERR_PROXY_CONNECTION_FAILED`; no external or real-backend request succeeded at any
point. The instance was terminated when the pass ended. Pages were served as `file://`
URLs of the committed source; the Python behavioral suites apply the same denial flags
to every Chrome context they spawn.

## 2. End-to-end learner path (desktop 1280×860, then mobile 390×844 + 320px probes)

- **Hub orientation.** `index.html` renders the ten-week calendar from the shared
  curriculum map; the rendered DOM contains 106 week-route links, Week 1 appears as
  exactly five singular day routes (`d1`–`d5`), and zero `d2a/…/d4b` part links remain.
- **Week 1 singular-topic route.** `weeks/w01/d2.html` shows the shared crumb grammar
  `Curriculum hub ▸ Week 1 · Production LLM Engineering… ▸ Day 2 · Model selection & API
  patterns`, `Day 2 of 50`, the `Juniper Vale Mutual · Loss Desk · solo · Weeks 1–5`
  project chip, and `◂ Day 1 / Day 3 ▸` steps — behaviorally identical in grammar to
  `weeks/w06/w06d1.html` (`Day 26 of 50`, `Morrowfield Payment Control · team of 2–3 ·
  Weeks 6–10`, `◂ Week 5 / Day 2 ▸`). On w06d1 the lesson heading precedes the Archify
  figure in DOM order (Archify is supporting material, not the first action).
- **Old deep links.** Navigating directly to `weeks/w01/d2a.html` lands on
  `weeks/w01/d2.html` via the alias stub's meta refresh (observed `location.pathname`
  after load); the stub also carries a visible link and a hub return path for
  refresh-suppressed contexts.
- **Interaction behavior.** On `w01/d2`, the first required interaction (`ix-predict`,
  kind `prediction-feedback`) changed state on activation and returned explanatory
  feedback (tier recommendation with reasoning), not a bare correct/incorrect mark.
- **Signed-out and signed-in states.** A direct lesson route without identity presents
  the sign-in gate; after planting the synthetic browser identity, the full lesson
  chrome renders (screenshots `desktop-hub.png`, `mobile-w01d2.png`,
  `desktop-persona-chat.png`, `mobile-hub.png`, `mobile-persona.png`,
  `mobile-clientdelivery.png` in the session scratchpad `shots/` folder — session-local
  working evidence, not committed binaries).
- **Overflow.** At the rendered narrow widths (390/320 probes on w01/d2, hub, persona
  lab), `scrollWidth` never exceeded `clientWidth` (no horizontal overflow); the
  320/390/768/desktop matrix itself is pinned by the committed accessibility/narrow-safe
  suites.

## 3. Persona surfaces (exclusive new-brownfield binding)

- `persona-communications.html?project=riverbend` (legacy param) opens the
  **Juniper Vale Mutual · Loss Desk** scenario; the project tabs are
  `juniper-vale` / `morrowfield` only.
- Chat behaviorally grounded: sending "Can we promise the intake screen will never
  freeze again?" returned a pushback reply from **Juniper Vale claims-platform lead**
  citing the JV-141 no-timeout coverage-call evidence and the smallest defensible next
  step. Switching tabs re-bound title/lead/compose-to to **Morrowfield Payment
  Control** labels.
- **Legacy state honesty:** with a planted v1 practice record
  (`fde_local_synthetic_persona_v1:local-<hash>`), the signed-in page shows the
  disclosure line that retired Riverbend/Meridian practice history remains stored
  untouched; without it the note stays hidden. Reset touches only the active v2 key
  (pinned by `tests/persona-communications.test.cjs`).
- `client-delivery.html?w=9&p=healthcare` (legacy params) lands on
  **Morrowfield Payment Control · Week 9**; clicking the Juniper Vale project tab
  follows the engagement into its own week range (Week 1) instead of snapping back.

## 4. Regression suites backing this pass

```
python3 -m unittest discover -s tests   # 180 tests, OK
node --test tests/*.test.cjs            # 98 tests, OK
```

These include the headless-Chrome behavioral harnesses (hub/trainer/client/lesson
surface rendering, no-JS fallbacks, reduced-motion, deep links, sign-in loopback,
accessibility contracts) run with the same egress-denial flags.
