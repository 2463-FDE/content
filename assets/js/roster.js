/* roster.js — access-code → identity map for the 2463-FDE cohort.
   Learner/tester codes are personal and low-stakes, stored in plaintext.
   TRAINER codes are NOT in plaintext (this repo is public) — only SHA-256
   hashes are stored, so an associate reading source can't self-promote to
   trainer view. Add a trainer by hashing their code:
     printf '%s' "CODE" | shasum -a 256
   role: "learner" | "trainer" | "tester" */
// Backend Worker (set both after deploying ~/2463-fde/backend). Empty = live
// "Try it" widgets degrade gracefully and progress just stays in localStorage.
window.FDE_RUN_URL = "";
window.FDE_TRACK_URL = "";

window.ROSTER = [
  // --- learners (Cohort #1) ---
  { code: "MC-FDE!2026", name: "Mahalakshmi Chandrasekar", role: "learner" },
  { code: "AD-FDE!2026", name: "Armaan Dhanoa",            role: "learner" },
  { code: "JF-FDE!2026", name: "Jorge Ferreira",           role: "learner" },
  { code: "KK-FDE!2026", name: "Kalabe Kebede",            role: "learner" },
  // --- tester (learner-equivalent view) ---
  { code: "CJ-TEST",     name: "Charles Jester",           role: "tester" }
];

// Trainer codes — hashes only. DO NOT add plaintext trainer codes above.
window.TRAINERS = [
  { hash: "93898d81b5806366e27aa2c52c6744e32a383e705ba7c00b6a1daad4eae5a400", name: "Charles Jester" }, // CJ-TRN!2026
  { hash: "6c6aa8fdcecd3d6b72d1dbdedd366cdc03c8122cc14ebb6735d3f3e5cd400f67", name: "RH" }              // RH-TRN!2026
];
