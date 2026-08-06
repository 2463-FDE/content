// W7/W8 fan-out — derived from week-fanout.js, with the four changes the 2026-08-06
// W7-W10 planning cycle requires. Run with:
//   Workflow({ scriptPath: "content/docs/workflows/week-fanout-w78.js",
//              args: { week: 7, wordMin: 2200, wordMax: 2600, readRate: 150,
//                      packetW: 7, days: [ {d:1, topic:"...", sub:"..."}, ... ] } })
//
// DELTAS vs week-fanout.js — each one is a decision recorded in
// projects/weeks-7-10/decisions/. Do not silently revert any of them.
//
//  D1. RESEARCH GOES THROUGH /web-research, NOT WebSearch+WebFetch.
//      week-fanout.js told the research agent to "Use WebSearch + WebFetch". That skips the
//      second-brain vault, which week-fanout-plan.md:95 requires ("route every /web-research
//      pull into the vault so later weeks reuse it instead of re-fetching"). The critic still
//      uses WebFetch — that is URL *verification*, not research, and it must stay.
//
//  D2. WORD BAND IS A PARAMETER, NOT A CONSTANT.
//      The old band (2,400-3,000) was hardcoded in three places and breached on all ten W5/W6
//      days (measured 3,139-3,728). W7/W8 carry a heavier delivery load, so the band tightens
//      and is enforced identically in the author prompt, the critic, and the salvage critic.
//
//  D3. THE READING-MINUTE META LINE IS COMPUTED, NOT GUESSED.
//      26 of 33 existing pages say "~18 min" regardless of length. The author now writes the
//      measured value and the critic checks the arithmetic.
//
//  D4. CLIENT COUPLING IS BAKED IN.
//      week-fanout-plan.md:357-376 (added 2026-07-30) requires every deliverable to name the
//      brownfield repo and deep-link client-delivery.html?w=NN, with the five days chaining
//      into ONE packet artifact and an outcome line on the star day. W5/W6 were retrofitted by
//      hand; the script never knew about it.

export const meta = {
  name: 'week-fanout-w78',
  description: 'W7/W8 fan-out: /web-research -> reconcile concepts -> client-coupled readings + questions, gated with 3-pass repass loops',
  phases: [
    { title: 'Research' },
    { title: 'Reconcile' },
    { title: 'Readings' },
    { title: 'Questions' },
  ],
}

const A = typeof args === 'string' ? JSON.parse(args) : (args || {})
const WEEK = A.week || 0
const WW = String(WEEK).padStart(2, '0')
const WMIN = A.wordMin || 2200
const WMAX = A.wordMax || 2600
const RATE = A.readRate || 150
const PACKET_W = A.packetW || WEEK
const ROOT = '/Users/jestercharles/2463-fde'
const BACKEND = `${ROOT}/backend/src/index.js`
const TEMPLATE = `${ROOT}/content/weeks/w06/w06d1.html`      // current structure + client coupling
const CODE_REF = `${ROOT}/content/weeks/w01/d1.html`         // the only page with the code popup
const RDIR = `${ROOT}/content/docs/research/w${WW}`
const WDIR = `${ROOT}/content/weeks/w${WW}`
const PACKETS = `${ROOT}/projects/{healthcare,finance}/client-packets.md`
const DAYS = (A.days || []).map(x => ({ ...x, slug: `w${WW}d${x.d}` }))
const BAND = `${WMIN.toLocaleString()}-${WMAX.toLocaleString()} words (${Math.round(WMIN/RATE)}-${Math.round(WMAX/RATE)} min @${RATE}wpm)`

const RESEARCH_SCHEMA = { type:'object', additionalProperties:false, properties:{
  concepts:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{ id:{type:'string'}, label:{type:'string'} }, required:['id','label'] } },
  sourceCount:{ type:'number' }, vaultPaths:{ type:'array', items:{type:'string'} }, summary:{ type:'string' } },
  required:['concepts','sourceCount','vaultPaths','summary'] }
const VERDICT = { type:'object', additionalProperties:false, properties:{ pass:{type:'boolean'}, critiques:{type:'array', items:{type:'string'}}, summary:{type:'string'} }, required:['pass','critiques','summary'] }
const RECONCILE_SCHEMA = { type:'object', additionalProperties:false, properties:{
  canonical:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{ id:{type:'string'}, label:{type:'string'}, day:{type:'string'}, isNew:{type:'boolean'} }, required:['id','label','day','isNew'] } },
  remap:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{ from:{type:'string'}, to:{type:'string'} }, required:['from','to'] } },
  summary:{ type:'string' } }, required:['canonical','remap','summary'] }
const READING_SCHEMA = { type:'object', additionalProperties:false, properties:{
  summary:{type:'string'}, wordCount:{type:'number'}, declaredMinutes:{type:'number'}, steps:{type:'number'}, codeFile:{type:'string'},
  futureInteractives:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{ concept:{type:'string'}, description:{type:'string'} }, required:['concept','description'] } } },
  required:['summary','wordCount','declaredMinutes','steps','futureInteractives'] }
const QUESTIONS_SCHEMA = { type:'object', additionalProperties:false, properties:{
  concept:{type:'string'},
  questions:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{
    prompt:{type:'string'}, tier:{type:'string'}, concepts:{type:'array', items:{type:'string'}}, rubricHints:{type:'string'}, strongAnswer:{type:'string'} },
    required:['prompt','tier','concepts','rubricHints','strongAnswer'] } },
  summary:{type:'string'} }, required:['concept','questions','summary'] }

async function gated(label, phaseName, gen, crit) {
  let result = await gen(null)
  for (let pass = 1; pass <= 3; pass++) {
    const v = await crit(result, pass)
    if (v && v.pass) return { task: label, status:'done', passes: pass, summary: (v.summary || (result&&result.summary) || ''), result }
    if (pass === 3) return { task: label, status:'flagged', passes: 3, flags: (v ? v.critiques : ['critic returned null']), summary: (result&&result.summary) || (v&&v.summary) || '', result }
    result = await gen(v ? v.critiques : ['prior critic hard-failed (returned null) — regenerate from scratch, full quality bar'])
  }
}
const fix = (cr) => cr && cr.length ? ('\n\nThis is a REPASS. A critic flagged these issues — fix every one, keep what was good:\n- ' + cr.join('\n- ')) : ''

// ---------- PHASE 1: RESEARCH (D1 — /web-research only) ----------
phase('Research')
const research = await parallel(DAYS.map(day => () => gated(
  `${day.slug} research`, 'Research',
  (cr) => agent(
    `You are the research agent for FDE curriculum ${day.slug} — "${day.topic}" (${day.sub}).\n`+
    `Produce a CURRENT, source-backed brief that the authoring agent will cite. Models default to stale advice; verify against current primary docs.\n\n`+
    `**MANDATORY TOOL — READ THIS TWICE.** You MUST gather every source by invoking the \`web-research\` skill (Skill tool, skill name: \`web-research\`). `+
    `Do NOT use WebSearch or WebFetch to *find* material. This is not a style preference: /web-research routes each pull into the second-brain vault at `+
    `/Users/jestercharles/second-brain (raw/articles/ + a wiki note + an index.md line + a log.md entry), which is what lets later weeks reuse this instead of re-fetching. `+
    `A brief assembled without /web-research fails the gate regardless of how good it is.\n`+
    `Use a thread prefix for this run so the vault clusters it: \`w${WW}d${day.d}-<slug>\`.\n\n`+
    `1. Prefer official/primary docs and primary papers (arxiv, standards bodies, vendor engineering blogs). No SEO listicles.\n`+
    `2. Every URL you cite must have been actually retrieved. Never include an unverified URL.\n`+
    `3. Write ${RDIR}/${day.slug}.md with: title, \`version-stamps:\` (library + version + verified date), \`## Claims\` (each line \`- <claim> — [title](url)\`), \`## Sources\`.\n`+
    `4. Define 3-6 technical concept-ids (kebab-case) scoped TIGHTLY to THIS day's topic — do not reach into later days' topics.\n`+
    `5. Read ${PACKETS} week ${PACKET_W} for BOTH projects. Add a \`## Client hook\` section naming, for each domain, the specific thing in that week's client ask this day's topic answers. The authoring agent needs this to write the deliverable.\n`+
    `Return the concept list, sourceCount, vaultPaths (the vault files /web-research actually wrote), and a 2-sentence summary.`+fix(cr),
    { schema: RESEARCH_SCHEMA, label:`${day.slug}:research`, phase:'Research' }),
  (_r) => agent(
    `RESEARCH CRITIC for ${RDIR}/${day.slug}.md (topic: ${day.topic}). Read it. Load WebFetch (ToolSearch: select:WebFetch) — you use it to VERIFY, not to research.\n`+
    `PASS only if ALL hold:\n`+
    `- every Claim carries a source URL;\n`+
    `- you spot-check >=3 URLs with WebFetch and each returns real content that supports the claim it is attached to;\n`+
    `- version stamps present AND current (flag any deprecated API);\n`+
    `- 3-6 concept-ids, scoped to THIS day only;\n`+
    `- a \`## Client hook\` section exists naming both domains' week-${PACKET_W} tie-in;\n`+
    `- **the vault was actually written**: check that the paths the agent reported under vaultPaths exist under /Users/jestercharles/second-brain. If none exist, the agent did not run /web-research — fail with that as the critique.\n`+
    `Else pass=false with specific critiques. One-sentence summary.`,
    { schema: VERDICT, label:`${day.slug}:research-crit`, phase:'Research' })
)))

const rawConcepts = []
research.forEach((r, i) => { if (r && r.result && Array.isArray(r.result.concepts)) r.result.concepts.forEach(c => rawConcepts.push({ ...c, day: DAYS[i].slug })) })

// ---------- PHASE 2: RECONCILE (serial) ----------
phase('Reconcile')
const recon = await gated(
  `w${WW} concept reconciliation`, 'Reconcile',
  (cr) => agent(
    `You are the CONCEPT RECONCILER for Week ${WEEK}. The parallel research agents proposed these concept-ids (with the day each came from):\n`+
    JSON.stringify(rawConcepts, null, 1) + '\n'+
    `FIRST read ${BACKEND} — the CONCEPTS object is the LIVE, already-shipped taxonomy (Weeks 0-6 plus pre-seeded stubs). Those ids are plain kebab-case; the day is noted in the LABEL, never in the id.\n`+
    `Produce a CLEAN canonical taxonomy:\n`+
    `- If a proposed concept means the SAME thing as a live CONCEPTS id, REUSE that exact live id — do NOT mint a synonym. Pre-seeded stubs (notably \`agent-observability\` and \`output-guardrails\`, which are the intended homes for much of W7) MUST be reused, not duplicated.\n`+
    `- Merge near-duplicates and exact duplicates WITHIN this week into ONE canonical id (kebab-case).\n`+
    `- For genuinely new concepts, mint a plain kebab-case id that collides with NO live CONCEPTS id and NO other canonical id.\n`+
    `- isNew = false for any id reused from the live taxonomy, true for a newly minted id.\n`+
    `- Assign each canonical concept its correct HOME day = the earliest day whose topic genuinely introduces it.\n`+
    `- Return remap = every original id -> its canonical id (include identity maps where unchanged).\n`+
    `Return canonical[] (each with isNew), remap[], one-sentence summary.`+fix(cr),
    { schema: RECONCILE_SCHEMA, label:`w${WW}:reconcile`, phase:'Reconcile' }),
  (r) => agent(
    `RECONCILE CRITIC for Week ${WEEK}. Reconciler output:\n`+ JSON.stringify(r, null, 1) +'\n'+
    `Original concepts:\n`+ JSON.stringify(rawConcepts, null, 1) +'\n'+
    `Read ${BACKEND} CONCEPTS (the live shipped taxonomy).\n`+
    `PASS only if: no two canonical ids are near-duplicates; NO canonical id marked isNew=true collides with or near-duplicates a LIVE CONCEPTS id (a concept matching a live id MUST reuse that id with isNew=false); every original id appears in remap; each canonical concept's home day is plausible for its topic; ids are plain kebab-case (no week prefix, day only in the label).\n`+
    `Else pass=false with specific critiques. One-sentence summary.`,
    { schema: VERDICT, label:`w${WW}:reconcile-crit`, phase:'Reconcile' })
)
const reconResult = (recon && recon.result) || { remap: [], canonical: [] }
const remap = {}
;(reconResult.remap || []).forEach(m => { remap[m.from] = m.to })
const canonical = reconResult.canonical || []
const canonByDay = {}
canonical.forEach(c => { (canonByDay[c.day] = canonByDay[c.day] || []).push(c.id) })
log(`Reconciled ${rawConcepts.length} -> ${canonical.length} canonical concepts`)

// ---------- PHASE 3: AUTHOR readings ----------
phase('Readings')
const readings = await parallel(DAYS.map((day) => () => gated(
  `${day.slug} reading`, 'Readings',
  (cr) => agent(
    `Reading author for FDE ${day.slug} — "${day.topic}" (${day.sub}).\n`+
    `Read (1) ${TEMPLATE} — the CURRENT structural reference (head+meta, topbar, toc, <article class="reading-col"> scrolly .step sections, <aside class="side"> diagram+cards+nav, deep-dive/quiz/goals modals, <script> with window.FDE_NEXT + window.DIAGRAM, all script includes). `+
    `(2) ${CODE_REF} — copy its \`code-w1d1\` popup markup exactly; it is the only page that still has one. `+
    `(3) ${RDIR}/${day.slug}.md — your ONLY source of facts.\n`+
    `Write ${WDIR}/${day.slug}.html (FILENAME MUST BE ${day.slug}.html):\n`+
    `- <meta name="fde-day" content="${day.slug}"> and <meta name="fde-concepts" content="..."> using ONLY these canonical concept-ids: ${JSON.stringify(canonByDay[day.slug] || [])}.\n`+
    `- **PROSE BUDGET: ${BAND}.** This band is TIGHTER than W5/W6, deliberately — those ran 3,139-3,728 words against a 3,000 ceiling and the learner day now carries a delivery block too. Count only text inside <article class="reading-col">. Going under is as much a failure as going over.\n`+
    `- **THE META LINE IS COMPUTED, NOT GUESSED.** Line ~39 of the template reads \`<span><b>~18 min</b> · reading @${RATE} wpm + diagram + check</span>\`. Twenty-three of the thirty-three existing pages say "~18 min" whatever their length, and that is a defect you must not copy. Count your actual prose words, compute ceil(words/${RATE}), and write THAT number. Report both in wordCount and declaredMinutes.\n`+
    `- 7-9 scrolly .step sections.\n`+
    `- **WRITE FOR MID-LEVEL ENGINEERS, NOT NOVICES — this is a correctness constraint, not a tone note.** The expertise-reversal effect (Kalyuga, Ayres, Chandler & Sweller 2003) is that instructional techniques which help inexperienced learners "can lose their effectiveness and even have negative consequences when used with more experienced learners", because guidance that overlaps redundantly with an existing schema forces cross-referencing and consumes working memory — and "redundant information is frequently difficult to ignore", so you cannot fix it by telling the reader to skip ahead. This cohort has six weeks of production LLM, RAG, agent, spec and SDLC work behind them. Do NOT re-explain what a trace is, what an API call is, or what a test is. Assume W1-W6. Where a full worked example would be the obvious move, prefer a **completion problem** — a partially worked solution with the load-bearing step left for the reader — because worked examples do not compel careful study and completion problems do.\n`+
    `- window.DIAGRAM (nodes/edges/captions) modeled on the template; captions.length == number of steps; each step reveals a meaningful part of the concept. **Keep the total of all captions + node \`detail:\` strings under 700 words** — these render as the learner scrolls and are real reading time that the meta line does not capture.\n`+
    `- 6-question comprehension modal + optional deep-dive modal.\n`+
    `- "Sources & deeper dive" <section class="reading-sources"> before </article> with the brief's verified URLs.\n`+
    `- **CLIENT COUPLING (week-fanout-plan.md:357-376) — this is a hard requirement:** the \`#goals-modal\` \`.deliv-list\` MUST name the learner's brownfield repo and deep-link \`../../client-delivery.html?w=${PACKET_W}\`. The deliverable is a slice of the ONE artifact week ${PACKET_W}'s packet asks for — not a standalone exercise. Read the \`## Client hook\` section of the brief for the tie-in. On the star day (d5), end on the packet's stated deliverable PLUS an outcome line: what changes for a person at the client, and the number that proves it.\n`+
    `- DO NOT build functional ix-run blocks. Where a live try-it belongs, insert <div class="ix-future"><div class="k">Interactive — future goal</div><p>Planned: ... Needs backend standup.</p></div> and report each in futureInteractives.\n`+
    `- ADD ONE read-only "production code" popup for THIS day's single key concept. (a) load <script src="../../assets/js/codeviewer.js"></script> right after interactive.js; (b) place a <button class="code-cta" type="button" data-modal="code-${day.slug}"><span class="cc-ico">&lt;/&gt;</span> See the production code <span class="cc-meta">· FILE.py</span></button> at that concept; (c) before the roster.js <script>, add <div id="code-${day.slug}" class="modal-overlay" hidden><div class="modal-card code-modal"><button class="modal-close" type="button" aria-label="Close">✕</button><h2>…</h2><p class="cv-cap">…</p><div class="cv" data-file="FILE.py" data-lang="python"><pre class="cv-raw">HTML-ESCAPED CODE</pre></div><p class="cv-foot">…</p></div></div>. Code is SHORT (~15-30 lines), production-shaped, HTML-escaped. For ANY LLM call use AWS Bedrock ONLY (boto3 bedrock-runtime + Converse API; auth via AWS_BEARER_TOKEN_BEDROCK bearer token, no IAM; default Claude Haiku 4.5 "us.anthropic.claude-haiku-4-5-20251001-v1:0"; size up to Sonnet 4.6 "us.anthropic.claude-sonnet-4-6-v1" ONLY where sizing up is the lesson) — NEVER OpenAI in code. Report the filename in codeFile.\n`+
    `  NOTE: W3-W6 shipped with ZERO code popups despite the gate requiring one. Do not repeat that.\n`+
    `- window.FDE_NEXT to the next day (w${WW}d${day.d+1}.html, or ../../index.html for the last day).\n`+
    `- Relative paths ../../assets/... and every <script src> the template includes (incl. progress.js + day-summary.js — the end-of-reading STT summary that completes the day).\n`+
    `Return summary, wordCount (prose only), declaredMinutes, steps, codeFile, futureInteractives.`+fix(cr),
    { schema: READING_SCHEMA, label:`${day.slug}:reading`, phase:'Readings' }),
  (_r) => agent(
    `READING + DESIGN CRITIC for ${WDIR}/${day.slug}.html. Read it, ${RDIR}/${day.slug}.md (allowed sources), ${TEMPLATE} (structural reference). Load WebFetch (ToolSearch: select:WebFetch).\n`+
    `Count the prose words yourself with a Bash one-liner over <article class="reading-col"> — do NOT trust the author's reported number.\n`+
    `PASS only if ALL hold:\n`+
    `- prose is ${BAND} — measured by you, not reported;\n`+
    `- the meta line's minute figure equals ceil(measured_words/${RATE}) within +/-1; a bare "~18 min" that does not match the word count is an automatic FAIL;\n`+
    `- diagram captions + node detail strings total under 700 words;\n`+
    `- 7-9 .step sections; window.DIAGRAM present, captions.length == steps, nodes carry coords;\n`+
    `- 6-Q modal + deep-dive present;\n`+
    `- .reading-sources present with >=3 URLs spot-checked live;\n`+
    `- every claim traces to the brief (flag invented facts);\n`+
    `- >=1 .ix-future placeholder and ZERO functional ix-run;\n`+
    `- EXACTLY ONE code popup (a code-cta button + a #code-${day.slug} .code-modal with a .cv/.cv-raw snippet + codeviewer.js loaded) whose code is Bedrock-only (boto3/Converse, NO openai/gpt/text-embedding in the snippet) with the code HTML-escaped;\n`+
    `- **the #goals-modal .deliv-list names the brownfield repo AND contains a link to client-delivery.html?w=${PACKET_W}**; the deliverable is a slice of that week's packet artifact, not a generic exercise;\n`+
    `- meta fde-concepts uses only the canonical ids ${JSON.stringify(canonByDay[day.slug] || [])};\n`+
    `- structure matches the template and diagram steps map 1:1 to sections.\n`+
    `Else pass=false with specific critiques. One-sentence summary.`,
    { schema: VERDICT, label:`${day.slug}:reading-crit`, phase:'Readings' })
)))

// Salvage: a StructuredOutput hard-fail on the RETURN often follows a successfully WRITTEN file.
const readingsRepaired = await parallel(DAYS.map((day, i) => () => {
  const r = readings[i]
  if (r && r.status) return Promise.resolve(r)
  return agent(
    `POST-HOC SALVAGE CRITIC for ${WDIR}/${day.slug}.html. The authoring agent hard-failed its structured return, but it may have already written a valid file. If the file does NOT exist, return pass=false with critique "file missing — regenerate". Otherwise apply the FULL reading critic above: read it, ${RDIR}/${day.slug}.md, ${TEMPLATE}. Load WebFetch (ToolSearch: select:WebFetch). Count prose words yourself.\n`+
    `PASS only if: prose ${BAND}; meta-line minutes == ceil(words/${RATE}) +/-1; diagram captions+details under 700 words; 7-9 .step sections; window.DIAGRAM present with captions.length == steps; 6-Q modal + deep-dive; .reading-sources with >=3 URLs spot-checked; every claim traces to the brief; >=1 .ix-future and ZERO functional ix-run; EXACTLY ONE Bedrock-only code popup (code-cta + #code-${day.slug} .code-modal + codeviewer.js); .deliv-list names the brownfield repo and links client-delivery.html?w=${PACKET_W}; meta fde-concepts uses only ${JSON.stringify(canonByDay[day.slug] || [])}.\n`+
    `Else pass=false with specific critiques. One-sentence summary.`,
    { schema: VERDICT, label:`${day.slug}:salvage-crit`, phase:'Readings' }
  ).then(v => ({ task:`${day.slug} reading`, status: (v && v.pass) ? 'done' : 'flagged', passes: 0,
                 ...(v && !v.pass ? { flags: v.critiques } : (v ? {} : { flags: ['salvage critic hard-failed too'] })),
                 summary: 'hard-fail salvage: ' + ((v && v.summary) || 'no verdict'), result: null }))
}))
const readingHardFails = DAYS.map((day, i) => (readings[i] && readings[i].status) ? null : day.slug).filter(Boolean)
if (readingHardFails.length) log(`Salvaged ${readingHardFails.length} hard-failed reading return(s): ${readingHardFails.join(', ')} — wordCount/steps/futureInteractives missing for these, verify at wire time`)

// ---------- PHASE 4: QUESTIONS ----------
phase('Questions')
const questionSets = await parallel(canonical.map(c => () => gated(
  `${c.id} questions`, 'Questions',
  (cr) => agent(
    `Interview-question author for canonical concept "${c.id}" (${c.label}), Week ${WEEK} day ${c.day}.\n`+
    `Read ${RDIR}/${c.day}.md for grounding. Author >=4 DISTINCT questions testing this concept (WEAK_TARGET=4: a weak learner must see 4 different questions before any repeat).\n`+
    `Each: prompt (spoken-interview, scenario-flavored like the FDE bank), tier ("both"|"senior"), concepts (include "${c.id}", plus other CANONICAL ids only), rubricHints (start "Judge-only."), strongAnswer (start "Judge-only.").\n`+
    `At least ONE of the four must be posed as a client-facing question — the learner has to explain this concept to a non-technical stakeholder (Dr. Okonkwo, COO of Riverbend, or Dana, VP Lending Ops at Meridian) and the model answer must still require the technical fact.\n`+
    `Ground every question in CURRENT practice — no deprecated/stale patterns.\n`+
    `Return concept, questions (>=4), one-sentence summary.`+fix(cr),
    { schema: QUESTIONS_SCHEMA, label:`${c.id}:questions`, phase:'Questions' }),
  (r) => agent(
    `QUESTION CRITIC for canonical concept "${c.id}". The author returned ${r && r.questions ? r.questions.length : 0} questions:\n`+
    JSON.stringify(r && r.questions ? r.questions : [], null, 1) + '\n'+
    `Read ${RDIR}/${c.day}.md. PASS only if: >=4 distinct non-overlapping questions; each genuinely tests "${c.id}"; at least one is posed client-facing while still requiring the technical fact; all grounded in current practice (no deprecated patterns); rubricHints + strongAnswer present and start "Judge-only."; sensible tier mix.\n`+
    `Else pass=false with specific critiques. One-sentence summary.`,
    { schema: VERDICT, label:`${c.id}:questions-crit`, phase:'Questions' })
)))

// ---------- compact report ----------
const repairNulls = (arr, labelFor) => arr.map((x, i) => x || ({ task: labelFor(i), status:'flagged', passes:0, flags:['agent hard-failed (structured return / terminal error)'], summary:'hard-fail — regenerate' }))
const researchRepaired = repairNulls(research, i => `${DAYS[i].slug} research`)
const questionsRepaired = repairNulls(questionSets, i => `${canonical[i].id} questions`)
const reconRepaired = recon || { task:`w${WW} concept reconciliation`, status:'flagged', passes:0, flags:['reconciler hard-failed'], summary:'hard-fail — regenerate' }
const compact = (arr) => arr.filter(Boolean).map(x => ({ task:x.task, status:x.status, passes:x.passes, ...(x.flags?{flags:x.flags}:{}), summary:x.summary }))
const allQuestions = []
questionSets.forEach((q, i) => { if (q && q.result && Array.isArray(q.result.questions)) allQuestions.push({ concept: canonical[i].id, day: canonical[i].day, questions: q.result.questions }) })
const futureInteractives = []
readings.forEach((r, i) => { if (r && r.result && Array.isArray(r.result.futureInteractives)) r.result.futureInteractives.forEach(fi => futureInteractives.push({ day: DAYS[i].slug, ...fi })) })
const readingStats = []
readings.forEach((r, i) => { if (r && r.result) readingStats.push({ day: DAYS[i].slug, words: r.result.wordCount, minutes: r.result.declaredMinutes, steps: r.result.steps, codeFile: r.result.codeFile }) })
const vaultPaths = []
research.forEach(r => { if (r && r.result && Array.isArray(r.result.vaultPaths)) vaultPaths.push(...r.result.vaultPaths) })
const flaggedCount = [...researchRepaired, reconRepaired, ...readingsRepaired, ...questionsRepaired].filter(x => x && x.status === 'flagged').length
log(`W${WW} run complete. Flagged items: ${flaggedCount}. Total prose: ${readingStats.reduce((s,x)=>s+(x.words||0),0)} words.`)

return {
  week: WEEK, band: BAND, flaggedCount,
  research: compact(researchRepaired), reconcile: compact([reconRepaired])[0],
  readings: compact(readingsRepaired), questions: compact(questionsRepaired),
  concepts: canonical, remap: reconResult.remap,
  readingStats, vaultPaths,
  questionCounts: allQuestions.map(q => ({ concept:q.concept, day:q.day, n:q.questions.length })),
  questionBank: allQuestions, futureInteractives,
}
