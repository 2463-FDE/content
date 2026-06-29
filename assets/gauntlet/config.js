// Runtime config for the FDE Interview Gauntlet (ported into the 2463-fde site).
// Identity comes from the program site's shared access code (auth.js writes
// localStorage["fde_identity"] = {code,name,role}); the gauntlet uses that
// `code` as its passcode, so there is no separate gauntlet login. ROSTER is no
// longer used by the gate (kept empty for back-compat with any stray refs).
window.CONFIG = {
  WORKER_URL: "https://fde-backend.jestercharles.workers.dev",
  ROSTER: []
};
