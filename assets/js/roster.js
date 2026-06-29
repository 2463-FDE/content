/* roster.js — backend Worker endpoints for the 2463-FDE program site.

   Logins are SERVER-SIDE now (#7). No access codes or trainer hashes ship here:
   auth.js POSTs the entered code to the Worker's /auth/login, which validates it
   against KV (login:<sha256(code)>) plus a hardcoded fallback and returns an
   HMAC-signed session token. Trainers create/revoke logins from trainer.html.

   Set both URLs after deploying ~/2463-fde/backend. Empty = live "Try it" widgets
   degrade gracefully and progress just stays in localStorage. */
window.FDE_RUN_URL = "https://fde-backend.jestercharles.workers.dev";
window.FDE_TRACK_URL = "https://fde-backend.jestercharles.workers.dev/track";
