// Generalized week fan-out workflow (W3-8). Run with:
//   Workflow({ scriptPath: "content/docs/workflows/week-fanout.js",
//              args: { week: 3, phase: "agent",
//                      days: [ {d:1, topic:"...", sub:"..."}, ... 5 entries ... ] } })
//
// Fixes baked in from the W2 shakedown:
//  1. CONCEPT RECONCILIATION step (serial, after research) — parallel research
//     agents coined overlapping ids (embedding-dimensions vs -dimensionality);
//     one agent now dedupes into a canonical taxonomy + remap BEFORE authoring,
//     and assigns each concept its canonical home day (fixes concept-bleed).
//  2. NO critic truncation — the question critic sees the full question set.
//  3. Filename convention is explicit: weeks/wWW/wWWdN.html.
//
// The workflow does research -> reconcile -> readings + questions (gated, 3-pass
// repass). It returns structured data; the ORCHESTRATOR does the serial wiring
// (index WEEKS, CURRICULUM_DAYS, progress ORDER, backend CONCEPTS+BANK) and the
// Gate E integration check + conditional deploy.

export const meta = {
  name: 'week-fanout',
  description: 'Generalized week fan-out: research -> reconcile concepts -> readings + questions, gated with 3-pass repass loops',
  phases: [
    { title: 'Research' },
    { title: 'Reconcile' },
    { title: 'Readings' },
    { title: 'Questions' },
  ],
}

const WEEK = (args && args.week) || 0
const WW = String(WEEK).padStart(2, '0')
const TEMPLATE = 'content/weeks/w01/d1.html'
const RDIR = `content/docs/research/w${WW}`
const WDIR = `content/weeks/w${WW}`
const DAYS = ((args && args.days) || []).map(x => ({ ...x, slug: `w${WW}d${x.d}` }))

const RESEARCH_SCHEMA = { type:'object', additionalProperties:false, properties:{
  concepts:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{ id:{type:'string'}, label:{type:'string'} }, required:['id','label'] } },
  sourceCount:{ type:'number' }, summary:{ type:'string' } }, required:['concepts','sourceCount','summary'] }
const VERDICT = { type:'object', additionalProperties:false, properties:{ pass:{type:'boolean'}, critiques:{type:'array', items:{type:'string'}}, summary:{type:'string'} }, required:['pass','critiques','summary'] }
const RECONCILE_SCHEMA = { type:'object', additionalProperties:false, properties:{
  canonical:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{ id:{type:'string'}, label:{type:'string'}, day:{type:'string'} }, required:['id','label','day'] } },
  remap:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{ from:{type:'string'}, to:{type:'string'} }, required:['from','to'] } },
  summary:{ type:'string' } }, required:['canonical','remap','summary'] }
const READING_SCHEMA = { type:'object', additionalProperties:false, properties:{
  summary:{type:'string'}, wordCount:{type:'number'}, steps:{type:'number'},
  futureInteractives:{ type:'array', items:{ type:'object', additionalProperties:false, properties:{ concept:{type:'string'}, description:{type:'string'} }, required:['concept','description'] } } },
  required:['summary','wordCount','steps','futureInteractives'] }
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
    result = await gen(v.critiques)
  }
}
const fix = (cr) => cr && cr.length ? ('\n\nThis is a REPASS. A critic flagged these issues — fix every one, keep what was good:\n- ' + cr.join('\n- ')) : ''

// ---------- PHASE 1: RESEARCH ----------
phase('Research')
const research = await parallel(DAYS.map(day => () => gated(
  `${day.slug} research`, 'Research',
  (cr) => agent(
    `You are the research agent for FDE curriculum ${day.slug} — "${day.topic}" (${day.sub}).\n`+
    `Produce a CURRENT, source-backed brief authoring will cite. Models default to stale advice; verify against current docs.\n`+
    `1. Use WebSearch + WebFetch (ToolSearch: select:WebSearch,WebFetch). Prefer official/primary docs and primary papers (arxiv). No SEO blogs.\n`+
    `2. VERIFY every URL with WebFetch — real content, supports the claim. Never include an unverified URL.\n`+
    `3. Write ${RDIR}/${day.slug}.md: title, version-stamps, ## Claims (each with [title](url)), ## Sources.\n`+
    `4. Define 3-6 technical concept-ids (kebab-case) scoped TIGHTLY to THIS day's topic — do not reach into later days' topics.\n`+
    `Return the concept list, sources verified, 2-sentence summary.`+fix(cr),
    { schema: RESEARCH_SCHEMA, label:`${day.slug}:research`, phase:'Research' }),
  (_r) => agent(
    `RESEARCH CRITIC for ${RDIR}/${day.slug}.md (topic: ${day.topic}). Read it. Load WebFetch (ToolSearch: select:WebFetch).\n`+
    `PASS only if: every Claim has a source URL; spot-check >=3 URLs with WebFetch (real supporting content); version stamps present + CURRENT (flag deprecated APIs); 3-6 concept-ids defined and scoped to THIS day only.\n`+
    `Else pass=false with specific critiques. One-sentence summary.`,
    { schema: VERDICT, label:`${day.slug}:research-crit`, phase:'Research' })
)))

const rawConcepts = []
research.forEach((r, i) => { if (r && r.result && Array.isArray(r.result.concepts)) r.result.concepts.forEach(c => rawConcepts.push({ ...c, day: DAYS[i].slug })) })

// ---------- PHASE 2: RECONCILE (serial — fixes cross-agent id drift) ----------
phase('Reconcile')
const recon = await gated(
  `w${WW} concept reconciliation`, 'Reconcile',
  (cr) => agent(
    `You are the CONCEPT RECONCILER for Week ${WEEK}. The parallel research agents proposed these concept-ids (with the day each came from):\n`+
    JSON.stringify(rawConcepts, null, 1) + '\n'+
    `Produce a CLEAN canonical taxonomy:\n`+
    `- Merge near-duplicates and exact duplicates into ONE canonical id (kebab-case). e.g. "embedding-dimensions" + "embedding-dimensionality" -> one id.\n`+
    `- Assign each canonical concept its correct HOME day = the earliest day whose topic genuinely introduces it (fix concept-bleed where an early day over-reached into a later day's topic).\n`+
    `- Return remap = every original id -> its canonical id (include identity maps where unchanged).\n`+
    `Return canonical[], remap[], one-sentence summary.`+fix(cr),
    { schema: RECONCILE_SCHEMA, label:`w${WW}:reconcile`, phase:'Reconcile' }),
  (r) => agent(
    `RECONCILE CRITIC for Week ${WEEK}. Reconciler output:\n`+ JSON.stringify(r, null, 1) +'\n'+
    `Original concepts:\n`+ JSON.stringify(rawConcepts, null, 1) +'\n'+
    `PASS only if: no two canonical ids are near-duplicates; every original id appears in remap; each canonical concept's home day is plausible for its topic; ids are kebab-case.\n`+
    `Else pass=false with specific critiques. One-sentence summary.`,
    { schema: VERDICT, label:`w${WW}:reconcile-crit`, phase:'Reconcile' })
)
const remap = {}
;(recon.result.remap || []).forEach(m => { remap[m.from] = m.to })
const canonical = recon.result.canonical || []
const canonByDay = {}
canonical.forEach(c => { (canonByDay[c.day] = canonByDay[c.day] || []).push(c.id) })
log(`Reconciled ${rawConcepts.length} -> ${canonical.length} canonical concepts`)

// ---------- PHASE 3: AUTHOR readings + questions (use canonical concepts) ----------
phase('Readings')
const readings = await parallel(DAYS.map((day) => () => gated(
  `${day.slug} reading`, 'Readings',
  (cr) => agent(
    `Reading author for FDE ${day.slug} — "${day.topic}" (${day.sub}).\n`+
    `Read (1) ${TEMPLATE} — copy its FULL structure (head+meta, topbar, toc, <article class="reading-col"> scrolly .step sections, <aside class="side"> diagram+cards+nav, deep-dive/quiz/goals modals, <script> with window.FDE_NEXT + window.DIAGRAM, all script includes). (2) ${RDIR}/${day.slug}.md — your ONLY source of facts.\n`+
    `Write ${WDIR}/${day.slug}.html (FILENAME MUST BE ${day.slug}.html):\n`+
    `- <meta name="fde-day" content="${day.slug}"> and <meta name="fde-concepts" content="..."> using ONLY these canonical concept-ids for this day: ${JSON.stringify(canonByDay[day.slug] || [])}.\n`+
    `- 7-9 scrolly .step sections; prose 2,400-3,000 words (16-20 min @150wpm).\n`+
    `- window.DIAGRAM (nodes/edges/captions) modeled on d1; captions.length == number of steps; each step reveals a meaningful part of the concept.\n`+
    `- 6-question comprehension modal (model on d1's quiz) + optional deep-dive modal.\n`+
    `- "Sources & deeper dive" <section class="reading-sources"> before </article> with the brief's verified URLs.\n`+
    `- DO NOT build functional ix-run blocks. Where a live try-it belongs, insert <div class="ix-future"><div class="k">Interactive — future goal</div><p>Planned: ... Needs backend standup.</p></div> and report each in futureInteractives.\n`+
    `- window.FDE_NEXT to the next day (w${WW}d${day.d+1}.html, or ../../index.html for the last day).\n`+
    `- Relative paths ../../assets/... and the template's <script src> includes (incl. progress.js + day-summary.js — the end-of-reading STT summary that completes the day).\n`+
    `Return summary, wordCount (prose), steps, futureInteractives.`+fix(cr),
    { schema: READING_SCHEMA, label:`${day.slug}:reading`, phase:'Readings' }),
  (_r) => agent(
    `READING + DESIGN CRITIC for ${WDIR}/${day.slug}.html. Read it, ${RDIR}/${day.slug}.md (allowed sources), ${TEMPLATE} (design gold standard). Load WebFetch (ToolSearch: select:WebFetch).\n`+
    `PASS only if: prose 2,400-3,000 words; 7-9 .step sections; window.DIAGRAM present, captions.length == steps, nodes carry coords; 6-Q modal + deep-dive present; .reading-sources present with >=3 URLs spot-checked live; every claim traces to the brief (flag invented facts); >=1 .ix-future placeholder and ZERO functional ix-run; meta fde-concepts uses only the canonical ids ${JSON.stringify(canonByDay[day.slug] || [])}; structure matches the template and diagram steps map 1:1 to sections.\n`+
    `Else pass=false with specific critiques. One-sentence summary.`,
    { schema: VERDICT, label:`${day.slug}:reading-crit`, phase:'Readings' })
)))

phase('Questions')
const questionSets = await parallel(canonical.map(c => () => gated(
  `${c.id} questions`, 'Questions',
  (cr) => agent(
    `Interview-question author for canonical concept "${c.id}" (${c.label}), Week ${WEEK} day ${c.day}.\n`+
    `Read ${RDIR}/${c.day}.md for grounding. Author >=4 DISTINCT questions testing this concept (WEAK_TARGET=4: a weak learner must see 4 different questions before any repeat).\n`+
    `Each: prompt (spoken-interview, scenario-flavored like the FDE bank), tier ("both"|"senior"), concepts (include "${c.id}", plus other CANONICAL ids only), rubricHints (start "Judge-only."), strongAnswer (start "Judge-only.").\n`+
    `Ground every question in CURRENT practice — no deprecated/stale patterns.\n`+
    `Return concept, questions (>=4), one-sentence summary.`+fix(cr),
    { schema: QUESTIONS_SCHEMA, label:`${c.id}:questions`, phase:'Questions' }),
  (r) => agent(
    `QUESTION CRITIC for canonical concept "${c.id}". The author returned ${r && r.questions ? r.questions.length : 0} questions:\n`+
    JSON.stringify(r && r.questions ? r.questions : [], null, 1) + '\n'+   // FIX: no truncation — critic sees all
    `Read ${RDIR}/${c.day}.md. PASS only if: >=4 distinct non-overlapping questions; each genuinely tests "${c.id}"; all grounded in current practice (no deprecated patterns); rubricHints + strongAnswer present and start "Judge-only."; sensible tier mix.\n`+
    `Else pass=false with specific critiques. One-sentence summary.`,
    { schema: VERDICT, label:`${c.id}:questions-crit`, phase:'Questions' })
)))

// ---------- compact report ----------
const compact = (arr) => arr.filter(Boolean).map(x => ({ task:x.task, status:x.status, passes:x.passes, ...(x.flags?{flags:x.flags}:{}), summary:x.summary }))
const allQuestions = []
questionSets.forEach((q, i) => { if (q && q.result && Array.isArray(q.result.questions)) allQuestions.push({ concept: canonical[i].id, day: canonical[i].day, questions: q.result.questions }) })
const futureInteractives = []
readings.forEach((r, i) => { if (r && r.result && Array.isArray(r.result.futureInteractives)) r.result.futureInteractives.forEach(fi => futureInteractives.push({ day: DAYS[i].slug, ...fi })) })
const flaggedCount = [...research, recon, ...readings, ...questionSets].filter(x => x && x.status === 'flagged').length
log(`W${WW} run complete. Flagged items: ${flaggedCount}`)

return {
  week: WEEK, flaggedCount,
  research: compact(research), reconcile: compact([recon])[0],
  readings: compact(readings), questions: compact(questionSets),
  concepts: canonical, remap: recon.result.remap,
  questionCounts: allQuestions.map(q => ({ concept:q.concept, day:q.day, n:q.questions.length })),
  questionBank: allQuestions, futureInteractives,
}
