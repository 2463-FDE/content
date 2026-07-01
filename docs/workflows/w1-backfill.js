// W1 thin-concept question backfill. Brings each under-covered Week-1 TECHNICAL
// concept up to >=4 BANK questions (WEAK_TARGET=4). Questions-only: W1 has no
// research artifact, so authors ground against the existing W1 reading HTML and
// dedup against the live BANK. Returns structured question objects; the
// ORCHESTRATOR assigns ids (tec-0NN, continuing the sequence) + inserts into
// backend/src/index.js BANK, then wrangler-deploys (user gate).

export const meta = {
  name: 'w1-backfill',
  description: 'Backfill under-covered Week-1 technical concepts to >=4 interview questions each, gated with 3-pass repass loops',
  phases: [ { title: 'Questions' } ],
}

const THIN = [
  { id:'context-window',        label:'Context window',        day:'w01d1', reading:'content/weeks/w01/d1.html',                                  need:3 },
  { id:'model-selection',       label:'Model selection',       day:'w01d2', reading:'content/weeks/w01/d2a.html + content/weeks/w01/d2b.html',     need:2 },
  { id:'api-integration',       label:'API integration',       day:'w01d2', reading:'content/weeks/w01/d2a.html + content/weeks/w01/d2b.html',     need:2 },
  { id:'idempotency',           label:'Idempotency',           day:'w01d2', reading:'content/weeks/w01/d2a.html + content/weeks/w01/d2b.html',     need:2 },
  { id:'prompt-engineering',    label:'Prompt engineering',    day:'w01d3', reading:'content/weeks/w01/d3a.html + content/weeks/w01/d3b.html',     need:2 },
  { id:'structured-output',     label:'Structured output',     day:'w01d3', reading:'content/weeks/w01/d3a.html + content/weeks/w01/d3b.html',     need:2 },
  { id:'token-optimization',    label:'Token optimization',    day:'w01d4', reading:'content/weeks/w01/d4a.html + content/weeks/w01/d4b.html',     need:2 },
  { id:'output-guardrails',     label:'Output guardrails',     day:'w01d4', reading:'content/weeks/w01/d4a.html + content/weeks/w01/d4b.html',     need:2 },
  { id:'hallucination-grounding',label:'Hallucination grounding',day:'w01d4',reading:'content/weeks/w01/d4a.html + content/weeks/w01/d4b.html',    need:1 },
]

const VERDICT = { type:'object', additionalProperties:false, properties:{ pass:{type:'boolean'}, critiques:{type:'array', items:{type:'string'}}, summary:{type:'string'} }, required:['pass','critiques','summary'] }
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

phase('Questions')
const sets = await parallel(THIN.map(c => () => gated(
  `${c.id} backfill`, 'Questions',
  (cr) => agent(
    `Interview-question author backfilling Week-1 concept "${c.id}" (${c.label}), day ${c.day}.\n`+
    `GROUND in the existing reading(s): ${c.reading} — read them; these are your only source of facts.\n`+
    `DEDUP: read backend/src/index.js and find every BANK question already tagged concepts including "${c.id}". Your new questions MUST be distinct from those (different angle/scenario, not a reword).\n`+
    `Author EXACTLY ${c.need} new DISTINCT questions testing "${c.id}".\n`+
    `Each: prompt (spoken-interview, scenario-flavored like the FDE bank), tier ("both"|"senior"), concepts (include "${c.id}", plus other EXISTING live concept-ids only — no new ids), rubricHints (start "Judge-only."), strongAnswer (start "Judge-only.").\n`+
    `Ground every question in CURRENT practice — no deprecated/stale patterns.\n`+
    `Return concept, questions (exactly ${c.need}), one-sentence summary.`+fix(cr),
    { schema: QUESTIONS_SCHEMA, label:`${c.id}:qgen`, phase:'Questions' }),
  (r) => agent(
    `QUESTION CRITIC for Week-1 backfill concept "${c.id}". The author returned ${r && r.questions ? r.questions.length : 0} questions:\n`+
    JSON.stringify(r && r.questions ? r.questions : [], null, 1) + '\n'+
    `Read ${c.reading} (grounding) and backend/src/index.js (existing questions for "${c.id}").\n`+
    `PASS only if: exactly ${c.need} questions; each is DISTINCT from the others AND from the existing BANK questions for this concept (no rewords); each genuinely tests "${c.id}"; grounded in the reading + current practice (no deprecated patterns); concepts use only existing live ids; rubricHints + strongAnswer present and start "Judge-only."; sensible tier.\n`+
    `Else pass=false with specific critiques. One-sentence summary.`,
    { schema: VERDICT, label:`${c.id}:qcrit`, phase:'Questions' })
)))

const compact = (arr) => arr.filter(Boolean).map(x => ({ task:x.task, status:x.status, passes:x.passes, ...(x.flags?{flags:x.flags}:{}), summary:x.summary }))
const bank = []
sets.forEach((s, i) => { if (s && s.result && Array.isArray(s.result.questions)) bank.push({ concept: THIN[i].id, day: THIN[i].day, questions: s.result.questions }) })
const flaggedCount = sets.filter(x => x && x.status === 'flagged').length
log(`W1 backfill complete. Flagged: ${flaggedCount}. New questions: ${bank.reduce((n,b)=>n+b.questions.length,0)}`)

return { flaggedCount, report: compact(sets), counts: bank.map(b=>({concept:b.concept, n:b.questions.length})), questionBank: bank }
