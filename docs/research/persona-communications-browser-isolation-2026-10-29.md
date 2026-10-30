# Persona communications browser-isolation evidence

Validated: 2026-10-29

The UI check used a dedicated `chrome-devtools-axi` session launched **before its first navigation** with:

```text
CHROME_DEVTOOLS_AXI_SESSION=fde-persona-safe
CHROME_DEVTOOLS_AXI_CHROME_ARGS=--proxy-server=http://127.0.0.1:9 --proxy-bypass-list=localhost,127.0.0.1
```

A local server bound only to `127.0.0.1:8765`. The first and only route was the local synthetic page with `?simClock=accelerated&project=riverbend`; local storage was seeded with the synthetic tester identity `SYNTHETIC-LOCAL-TEST`. Desktop (1440×1000) and mobile (390×844) checks exercised deterministic chat plus sent → awaiting → replied inbox states using clock controls.

The final DevTools network record contained only six requests, all to `http://127.0.0.1:8765`: the page, two local stylesheets, `theme.js`, the fixture file, and the local runtime. There were no fetch/XHR requests and no production/backend, model/provider, email, credential, or external-service egress.
