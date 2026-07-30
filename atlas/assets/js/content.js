/* =====================================================================
   FDE MINDSET ATLAS — content model (2463-FDE, generic program)
   Data-driven so the page is a living document: edit this file to grow it.
   Every factual claim carries an inline citation token [[ID]] that app.js
   renders as a linked chip and rolls up into each branch's Sources list.
   Universal FDE-mindset content only — no client-specific material.
   ===================================================================== */

const SOURCES = {
  // --- FDE mindset spine ---
  PAL_DAY:   { t: "Palantir — A Day in the Life of a Forward Deployed Software Engineer", url: "https://blog.palantir.com/a-day-in-the-life-of-a-palantir-forward-deployed-software-engineer-45ef2de257b1", d: "2020" },
  VINOO_FDE: { t: "Vinoo Ganesh — Forward Deployed Engineering (Project Frontline)", url: "https://vinoo.io/writing/2026-02-05-forward-deployed-engineering/", d: "2026-02-05" },
  VINOO_BLD: { t: "Vinoo Ganesh — Build Products Like a Forward Deployed Engineer", url: "https://vinoo.io/teaching/2026-03-17-build-products-like-a-forward-deployed-engineer/", d: "2026-03-17" },
  PRAG:      { t: "Pragmatic Engineer — What are Forward Deployed Engineers, and why are they so in demand?", url: "https://newsletter.pragmaticengineer.com/p/forward-deployed-engineers", d: "2025" },
  SVPG:      { t: "Silicon Valley Product Group — Forward Deployed Engineers", url: "https://www.svpg.com/forward-deployed-engineers/", d: "2025" },
  FDEACAD:   { t: "FDE Academy — How Palantir Invented the FDE Model", url: "https://fde.academy/", d: "2026" },
  // --- graphs ---
  KOREAI:    { t: "kore.ai — What are context graphs and how do they make AI agents smarter", url: "https://www.kore.ai/blog/what-are-context-graphs", d: "2026" },
  TRANTOR:   { t: "Trantor — Knowledge Graphs for Enterprise AI: Replacing RAG with Structured Reasoning", url: "https://www.trantorinc.com/blog/knowledge-graphs-enterprise-ai", d: "2026-05-28" },
  ARXIV_GA:  { t: "arXiv 2506.18019 — Graphs Meet AI Agents: Taxonomy, Progress, and Future Opportunities", url: "https://arxiv.org/pdf/2506.18019", d: "2025" },
  MSGRAPH:   { t: "Microsoft GraphRAG (open-source)", url: "https://github.com/microsoft/graphrag", d: "2024+" },
  // --- decomposition ---
  ATL:       { t: "Atlassian — Epics, stories, and initiatives", url: "https://www.atlassian.com/agile/project-management/epics-stories-themes", d: "2026" },
  PLANE:     { t: "Plane — Epic vs. feature vs. user story vs. task", url: "https://plane.so/blog/epic-vs-feature-vs-user-story-vs-task-understanding-the-differences", d: "2026" },
  // --- spec-driven development ---
  SDD_BCMS:  { t: "BCMS — Spec-Driven Development (SDD): The Definitive 2026 Guide", url: "https://thebcms.com/blog/spec-driven-development", d: "2026-05-11" },
  SPECKIT:   { t: "GitHub — Spec-Driven Development with AI: get started with GitHub Spec Kit (open-source toolkit)", url: "https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/", d: "2025" },
  KIRO:      { t: "AWS Kiro — agentic IDE with a native spec-driven workflow (Requirements / Design / Tasks)", url: "https://kiro.dev/", d: "2025" },
  // --- modernization patterns & agent/coding practice ---
  FOWLER_SF: { t: "Martin Fowler — Strangler Fig Application (gradual legacy modernization)", url: "https://martinfowler.com/bliki/StranglerFigApplication.html", d: "2024" },
  FOWLER_FP: { t: "Martin Fowler / Thoughtworks — Patterns of Legacy Displacement: Feature Parity (the 'feature-parity trap')", url: "https://martinfowler.com/articles/patterns-legacy-displacement/feature-parity.html", d: "2024" },
  AWS_SF:    { t: "AWS Prescriptive Guidance — Strangler fig pattern", url: "https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html", d: "2024" },
  CC_BP:     { t: "Anthropic — Best practices for Claude Code (explore → plan → code; verify; specific context)", url: "https://code.claude.com/docs/en/best-practices", d: "2026" },
  ANTH_AGENTS:{ t: "Anthropic — Building Effective Agents (workflows vs agents; orchestrator-workers; composable patterns)", url: "https://www.anthropic.com/engineering/building-effective-agents", d: "2025" },
  FEATHERS:  { t: "Characterization (golden-master) tests — Michael Feathers, Working Effectively with Legacy Code", url: "https://en.wikipedia.org/wiki/Characterization_test", d: "2004+" },
  // --- video ---
  YCFDE:     { t: "Y Combinator — The FDE Playbook for AI Startups with Bob McGrew (50 min)", url: "https://www.youtube.com/watch?v=Zyw-YA0k3xo", d: "2025-09-08" },
  VIMEO:     { t: "Galent FDE Session 1 &mdash; What is an FDE? (private, instructor copy)", url: "https://vimeo.com/1202201578/3c00b899c5", d: "2026-06-17" },
  VIMEO2:    { t: "Galent FDE Session 2 &mdash; Stellantis app-mod walkthrough + platform deep-dive (private, instructor copy)", url: "https://vimeo.com/1202558378/f4d9043652", d: "2026-06-18" }};

const VIDEOS = {
  vimeoSession1:  { kind: "vimeo", id: "1202201578", hash: "3c00b899c5", title: "Galent FDE Session 1 — What is an FDE?", src: "VIMEO" },
  galentSession2: { kind: "vimeo", id: "1202558378", hash: "f4d9043652", title: "Galent FDE Session 2 — Stellantis walkthrough + platform deep-dive", src: "VIMEO2" },
  ycMcGrew: { kind: "youtube", id: "Zyw-YA0k3xo", title: "The FDE Playbook for AI Startups — Bob McGrew (Y Combinator)", src: "YCFDE" }
};

/* Each branch is a mind-map node. Each `node` may have:
   t (title), lead (always-visible summary), body (HTML revealed on expand),
   views (viewpoint tabs), deeper (nested child nodes — the "dive deeper" layers),
   video (key into VIDEOS), tagline. Citations as [[ID]] tokens anywhere. */

const BRANCHES = [
  /* ============================================================ 1 — start here */
  {
    id: "what-is-fde",
    t: "What is an FDE?",
    icon: "&#9678;",
    color: "#e8590c",
    tag: "Start here — the role in one breath",
    lead: "A Forward Deployed Engineer is a software engineer who owns customer <em>outcomes</em> from inside the customer's world &mdash; not from a lab. This is the ground floor of everything else on this map. Start here, then climb.",
    nodes: [
      {
        t: "The one-sentence core",
        lead: "An FDE owns customer outcomes &mdash; the actual results the customer is trying to achieve &mdash; not relationships, not satisfaction scores, not the PR.",
        body: "<blockquote>&ldquo;An FDE is a software engineer who owns customer <em>outcomes</em>. Not customer relationships, not satisfaction scores, but outcomes: the actual results the customer is trying to achieve.&rdquo; [[VINOO_FDE]]</blockquote><p>Shipping the PR is an <strong>output</strong>. The analyst's morning being 45 minutes shorter is an <strong>outcome</strong>. FDEs are measured on the second. [[VINOO_FDE]][[VIMEO]]</p>"
      },
      {
        t: "The inversion: one-to-many vs many-to-one",
        lead: "A traditional software engineer builds <strong>one capability for many customers</strong>. An FDE enables <strong>many capabilities for a single customer</strong>. Breadth over a customer, not depth over a feature.",
        body: "<p>Palantir's original name for the FDE was the <strong>&ldquo;Delta&rdquo;</strong> &mdash; and until 2016 Palantir had <em>more Deltas than software engineers.</em> [[PRAG]] The canonical framing: &ldquo;FDSEs focus on enabling many capabilities for a single customer.&rdquo; [[PAL_DAY]]</p>",
        deeper: [
          {
            t: "Full-stack &times; full-context",
            lead: "An FDE isn't just full-stack &mdash; they're full-context.",
            body: "<p>The FDE blends the depth of a Software Engineer, the systems fluency of a Platform Engineer, and the customer intuition of a Solutions Architect &mdash; and runs on curiosity, speed, and empathy. The defining edge isn't more code; it's understanding the problem the code is for. [[PAL_DAY]][[VINOO_FDE]]</p>"
          },
          {
            t: "Not a consultant, not a solutions architect",
            lead: "OpenAI deliberately separates the FDE from the professional-services Solution Architect role.",
            body: "<p>OpenAI established a dedicated <strong>Head of FDE</strong>, explicitly differentiated from the prof-services Solution Architect. [[PRAG]] FDEs run a <strong>dual loop</strong>: embed with customers <em>and</em> embed back into core product-engineering teams &mdash; roughly <strong>25% of time onsite.</strong> [[PRAG]]</p><blockquote>&ldquo;As an FDE, you'll embed with customers, understand their domain, and co-develop solutions to tackle real problems in often undefined or evolving problem spaces.&rdquo; &mdash; OpenAI job posting [[PRAG]]</blockquote>"
          }
        ]
      },
      {
        t: "Why the role is exploding now",
        lead: "a16z calls it &ldquo;the hottest job in tech.&rdquo; Three shifts converged to make it the default model for AI delivery.",
        body: "<ol><li><strong>AI needs context.</strong> Large models without domain context are blunt instruments. FDEs sit where the data and the decisions actually live.</li><li><strong>Enterprises want outcomes, not pilots.</strong> The age of endless proofs-of-concept is over &mdash; buyers want production value.</li><li><strong>Velocity matters.</strong> FDEs compress delivery from months to weeks by closing the gap between &lsquo;built&rsquo; and &lsquo;adopted.&rsquo;</li></ol><p>OpenAI, Anthropic, Databricks, Anduril, xAI and the YC cohort are all building FDE functions &mdash; whether or not they use the name. [[PRAG]][[VINOO_BLD]]</p>",
        video: "ycMcGrew"
      },
      {
        t: "The delivery arc you rehearse every week",
        lead: "A four-beat loop that turns long-cycle pilots into continuous value: scope, build, ship, measure.",
        body: "<ol><li><strong>Problem decomposition &amp; scoping</strong> &mdash; define a solvable challenge by asking the right questions.</li><li><strong>Rapid prototyping &amp; iteration</strong> &mdash; build side-by-side with users.</li><li><strong>Optimization &amp; hardening</strong> &mdash; performance, security, scale.</li><li><strong>Deployment &amp; feedback loop</strong> &mdash; deploy, train, feed insights back.</li></ol><p>The craft underneath it is <em>engineering empathy</em>: writing code that understands the problem before it solves it. That &lsquo;understand first&rsquo; reflex is the whole next branch. [[VINOO_FDE]][[PAL_DAY]]</p>"
      }
    ]
  },

  /* ============================================================ 2 — the mindset */
  {
    id: "mindset",
    t: "The Mindset",
    icon: "&#9788;",
    color: "#f59e0b",
    tag: "6 traits &middot; principles &middot; traps &middot; moves",
    lead: "The mindset is the part a curriculum can't teach by lecture. These are the traits, mental models, and anti-patterns that separate a great FDE from a competent coder.",
    nodes: [
      {
        t: "The 6 traits of a great FDE",
        lead: "The spine. Memorize the order &mdash; it is the natural shape of every defense, retro, and review.",
        body: "<ol class='trait-list'><li><strong>Relentlessly curious about the customer's world.</strong> Great FDEs surface the problem the customer gave up on or never articulated. <em>Become a user before you become a builder.</em></li><li><strong>Calibrate engineering to the situation.</strong> Know when to build a robust system vs. a script that just works. Both over- and under-engineering leave scars.</li><li><strong>Communicate across audiences.</strong> Same problem, different language for the CTO vs the eng lead. If you can't explain it in one page without jargon, you don't understand it.</li><li><strong>Stay calm when things break.</strong> Things <em>will</em> break. Crisis composure matters as much as the fix.</li><li><strong>Own outcomes without authority.</strong> The hardest skill: get a team that doesn't report to you to act &mdash; by explaining the <em>why</em>.</li><li><strong>Know when to push back.</strong> Don't just do what the customer asks. Push back <em>with an alternative, not a no.</em></li></ol><p class='cite-line'>Canonical six from [[VINOO_FDE]].</p>",
        views: [
          { r: "Earlier in your career", t: "Master traits 1&ndash;3 first (curiosity, calibration, communication). Get &lsquo;become a user before a builder&rsquo; into your bones before you reach for ownership-without-authority." },
          { r: "Later in your career", t: "Traits 4&ndash;6 (calm, ownership-without-authority, principled push-back) are the differentiators on defense day &mdash; the senior stakeholder can't be commanded, only convinced." },
          { r: "As a mentor / lead", t: "Every exercise and rubric line should reward a trait and trap the code-only learner. Map each incident drill to the trait it stresses." }
        ]
      },
      {
        t: "Principles &amp; mental models",
        lead: "Quotable, load-bearing, and full of traps for the unwary.",
        body: "<ul><li><strong>The XY Problem.</strong> Customers ask for <em>Y</em> when they need a solution to <em>X</em>. The single most important FDE question: <em>&ldquo;What are you trying to accomplish?&rdquo;</em> [[VINOO_FDE]]</li><li><strong>Shelfware is the enemy.</strong> Most enterprise software fails not because it's broken but because it's never adopted. &ldquo;Software that gets adopted is worth infinitely more than software that sits on a shelf.&rdquo; [[VINOO_FDE]]</li><li><strong>Build from experience, not specs.</strong> The best ideas come from engineers who felt the pain themselves. [[VINOO_FDE]]</li><li><strong>Underpromise, overdeliver.</strong> &ldquo;Done Wednesday, finished Tuesday&rdquo; beats &ldquo;Done Monday, finished Wednesday.&rdquo; [[VINOO_FDE]]</li><li><strong>Credibility is points you can spend.</strong> You earn the right to disagree by being right and delivering. [[VINOO_FDE]]</li><li><strong>Calm is preparation, not personality.</strong> Volunteer for on-call; by the 10th escalation you have a playbook in your head. [[VINOO_FDE]]</li><li><strong>The telephone game.</strong> Every person a technical message passes through degrades it. FDEs short-circuit the chain by being in the room. [[VINOO_FDE]]</li></ul>"
      },
      {
        t: "The four core moves",
        lead: "Vinoo Ganesh's distilled FDE playbook &mdash; the verbs, not the virtues.",
        body: "<ol><li><strong>Detect problems</strong> &mdash; separate what users say they want from what they actually need.</li><li><strong>Demonstrate through action</strong> &mdash; build to show, don't tell.</li><li><strong>Control the narrative</strong> &mdash; own how the work is understood across audiences.</li><li><strong>Ship fast while maintaining production quality.</strong></li></ol><p>From the engineer who built Palantir's <strong>Project Frontline</strong> (trained 250+ FDEs; alumni now at OpenAI, xAI, Anduril). [[VINOO_BLD]]</p>"
      },
      {
        t: "Traps &amp; anti-patterns",
        lead: "The wrong instinct that looks right. Every defense and drill should punish these.",
        body: "<table class='trap-table'><tr><th>Anti-pattern</th><th>Why it's a trap</th></tr><tr><td>Overengineering</td><td>Two weeks on a configurable dedup engine when a one-time SQL query was needed. The customer cared about Friday. [[VINOO_FDE]]</td></tr><tr><td>Solving the wrong problem</td><td>Building Y (the literal ask) instead of X (the real need). The most expensive mistake. [[VINOO_FDE]]</td></tr><tr><td>Retreating into code</td><td>When a meeting gets tense, hiding behind the laptop. Stay present. [[VINOO_FDE]]</td></tr><tr><td>Building without seeing the data</td><td>The Cassandra story: empty date &rarr; epoch 1970 &rarr; 2.3M keyspaces &rarr; 14TB RAM to boot &rarr; OOM. They'd never seen the real data. [[VINOO_FDE]]</td></tr><tr><td>Throwing it over the wall</td><td>The old model the FDE role exists to <em>correct</em>. [[VINOO_FDE]]</td></tr><tr><td>Can't set boundaries</td><td>FDE work expands to fill all available time. Saying no is a survival skill. [[VINOO_FDE]]</td></tr></table>"
      },
      {
        t: "Why AI makes this the default",
        lead: "AI is making deployment <em>harder</em>, not easier &mdash; which is exactly why the FDE wins.",
        body: "<p>LLM systems need fine-tuning, prompt engineering, evaluation, and ongoing adjustment. &ldquo;You can't throw an LLM over the wall and expect customers to figure it out.&rdquo; [[VINOO_FDE]] The engineer who stays valuable is the one who can do what AI can't: <em>sit with a customer, understand the real problem, own the outcome.</em></p><p>The forward-looking version of the role pairs code with cognition &mdash; the most valuable engineers won't just ship code, they'll shape <strong>context</strong>. That's the bridge straight into the Graphs branch of this map. [[VINOO_FDE]][[KOREAI]]</p>",
        video: "ycMcGrew"
      },
      {
        t: "HITL is the FDE's direction-check",
        lead: "Human-in-the-loop isn't only a feature you ship &mdash; it's the FDE's own discipline of checking that the build is still pointed at the deliverable.",
        body: "<p>Periodically zoom out from the code and run a <strong>direction-check</strong>: <em>What are the finalized deliverables? Am I crossing them off? Where's the discrepancy? What's too rigid to survive the customer's real constraints?</em></p><p>This is trait 5 (own outcomes) and trait 2 (calibrate to the situation) made operational &mdash; the recurring &lsquo;is this still pointed at the outcome?&rsquo; checkpoint that you build into your own cadence rather than waiting for a gate. [[VIMEO]][[VINOO_FDE]]</p><p><strong>Two different things are called HITL on this program. Keep them apart.</strong> <em>This</em> one is a <strong>direction</strong> check, performed by a human, asking whether the work still points at the deliverable. The other is a <strong>completion</strong> check &mdash; the machine-verifiable stopping condition from Loop Engineering in Week 5, which decides whether the agent is allowed to call itself finished. A loop can pass its tests and still be building the wrong thing, which is exactly why you need both. [[VIMEO]]</p>",
        views: [
          { r: "As an FDE", t: "Build the checkpoint into your own cadence &mdash; don't wait for a review. &lsquo;Am I crossing off the finalized deliverables?&rsquo; is a question you ask yourself." },
          { r: "As the reviewer", t: "The review checks direction, not just correctness: discrepancy against the deliverable, and inflexibility that won't survive the customer's real constraints." }
        ]
      }
    ]
  },

  /* ============================================================ 3 — scenarios */
  {
    id: "scenarios",
    t: "Scenarios &amp; Viewpoints",
    icon: "&#9683;",
    color: "#f472b6",
    tag: "Same problem, many lenses",
    lead: "An FDE's hardest skill is holding multiple viewpoints at once. Each scenario below is a recurring FDE situation &mdash; switch the lens tabs to see how the CTO, the eng lead, the BA, and the FDE each read it.",
    nodes: [
      {
        t: "Scenario: &ldquo;Just give us a chatbot.&rdquo;",
        lead: "A sponsor asks for an LLM chatbot over a pile of documents. Classic XY problem.",
        body: "<p>The literal ask (Y) is a chatbot. The real need (X) is faster, <em>defensible</em> answers that a user can trust and act on. The FDE move: build the answer to X &mdash; grounded, cited, traceable &mdash; not the literal Y. [[VINOO_FDE]]</p>",
        views: [
          { r: "Sponsor / CIO", t: "&ldquo;Will this hallucinate something that embarrasses us? What's my exposure, my budget, my renewal story?&rdquo; Speak to risk and outcome, not architecture." },
          { r: "Eng Lead", t: "&ldquo;Pure vector RAG can't traverse multi-hop relationships or give a white-box citation path. We may need a graph layer.&rdquo; (See the Graphs branch.) [[TRANTOR]]" },
          { r: "Business Analyst", t: "&ldquo;The epic is &lsquo;trustworthy answers,&rsquo; not &lsquo;a chatbot.&rsquo; I write stories around the user's workflow and outcome, in their language.&rdquo; [[ATL]]" },
          { r: "FDE", t: "Own the outcome: the user's answer is faster AND trustworthy. Push back on &lsquo;just a chatbot&rsquo; with an alternative, not a no. [[VINOO_FDE]]" }
        ]
      },
      {
        t: "Scenario: the demo crashes in front of the CEO",
        lead: "Production breaks mid-showcase. Trait 4 (stay calm) is now the whole game.",
        body: "<p>The Palantir benchmark: fixed in 4 minutes, the CEO never knew an engineer was on the phone. [[VINOO_FDE]] <em>Calm is preparation, not personality</em> &mdash; the playbook was already in the FDE's head from the 10th on-call rotation.</p>",
        views: [
          { r: "FDE", t: "Triage silently, narrate confidence, fix the smallest thing that restores the demo. How you handle the crisis matters as much as whether you fix it. [[VINOO_FDE]]" },
          { r: "Eng Lead", t: "Was there a rollback path and a runbook? The incident is a retro input, not a blame event." },
          { r: "Showcase audience", t: "Sees composure or panic. The narrative you control here is the renewal conversation." }
        ]
      },
      {
        t: "Scenario: the customer asks for the elegant rebuild",
        lead: "A sponsor wants a full microservices re-architecture. Calibrate engineering to the situation.",
        body: "<p>The trap: optimizing for the wrong thing &mdash; elegant architecture, great test coverage, solving a problem that didn't exist while ignoring the one that did. [[VINOO_FDE]] The FDE calibrates: is this a script-that-works moment or a robust-system moment? Push back <em>with an alternative.</em> Modernize in slices, not big-bang &mdash; see the App Modernization branch. [[FOWLER_SF]]</p>",
        views: [
          { r: "FDE", t: "Surface the real constraint (the deadline, the audit, the renewal) and propose the smallest thing that hits the outcome." },
          { r: "BA", t: "Re-frames the epic against the mission outcome, not the architecture diagram. Decomposes into stories that ship incrementally. [[ATL]]" },
          { r: "Pattern reality", t: "This is exactly what the strangler-fig pattern optimizes for &mdash; grow the new system around the old one and migrate behaviour incrementally. [[FOWLER_SF]][[AWS_SF]]" }
        ]
      }
    ]
  },

  /* ============================================================ 4 — decomposition */
  {
    id: "decomposition",
    t: "Decomposition",
    icon: "&#9635;",
    color: "#a78bfa",
    tag: "Epic &rarr; Story &rarr; Subtask",
    lead: "Decomposition is where the mindset, the graphs, and the build meet. The BA owns the <em>what/why</em> (epics &amp; stories); the engineer is the focal point for the <em>how</em> (subtasks that ship code); the AI agent plans against the system graph.",
    nodes: [
      {
        t: "The hierarchy",
        lead: "Initiative &rarr; Epic &rarr; Story &rarr; Task/Subtask. Each level answers a different question for a different audience.",
        body: "<table class='trap-table'><tr><th>Level</th><th>What</th><th>Horizon</th><th>Owner lens</th></tr><tr><td><strong>Initiative</strong></td><td>Collection of epics toward one goal</td><td>Multi-quarter&ndash;year</td><td>Program / sponsor</td></tr><tr><td><strong>Epic</strong></td><td>Large body of work &rarr; many stories; &ldquo;2&ndash;3 per quarter&rdquo;</td><td>Month&ndash;quarter</td><td>Business Analyst</td></tr><tr><td><strong>Story</strong></td><td>Requirement from the <em>end-user's</em> perspective; sprint-sized</td><td>1&ndash;2 weeks</td><td>BA &harr; Eng handoff</td></tr><tr><td><strong>Subtask</strong></td><td>The technical <em>how</em>; one dev/QA</td><td>Hours&ndash;days</td><td>Engineer (FDE)</td></tr></table><p class='cite-line'>Hierarchy + horizons from [[ATL]]; level definitions corroborated by [[PLANE]].</p>"
      },
      {
        t: "The BA-vs-engineer split (the load-bearing line)",
        lead: "&ldquo;Reporting to the Head of Engineering, you'd speak in <strong>epics</strong>. Talking to a dev colleague, you'd speak at the <strong>story</strong> level.&rdquo; [[ATL]]",
        body: "<p>The altitude of the conversation tells you who owns it. The split is literal: <strong>no file names above the line</strong> (BA surface &mdash; business language), <strong>legacy/codebase file references below it</strong> (engineer/agent surface). Keep technical jargon out of epics/stories so a BA can validate without reading code.</p>",
        views: [
          { r: "Business Analyst", t: "Owns Initiative &rarr; Epic &rarr; Story. Writes in the user's language, tied to outcomes. Asks the XY-Problem question on every story: real need, or literal ask? [[ATL]][[VINOO_FDE]]" },
          { r: "Engineer / FDE", t: "Owns Story &rarr; Subtask &rarr; code. Decides script-vs-robust-system. Writes the ADR &mdash; the &lsquo;why not X.&rsquo; The focal point for the sub-tasks that deliver. [[ATL]]" },
          { r: "AI Agent", t: "Task planning IS decomposition: break the complex task into subtasks &lsquo;easier to handle&rsquo;; good decomposition improves agent accuracy. The graph is what lets it decompose <em>correctly.</em> [[ARXIV_GA]]" }
        ]
      },
      {
        t: "Worked decomposition: from wish to subtasks",
        lead: "From sponsor wish to shippable subtasks &mdash; the full ladder.",
        body: "<p><strong>Initiative</strong> (sponsor): <em>Modernize intake so decisions are faster and audit-ready.</em></p>",
        deeper: [
          {
            t: "Epic (BA owns)",
            lead: "&ldquo;AI-assisted eligibility review for incoming applications.&rdquo;",
            body: "<p>Written as an outcome, not a feature. The BA defines acceptance in mission terms: <em>reviewer time per application drops, and every decision is explainable to an auditor.</em> [[ATL]]</p>"
          },
          {
            t: "Stories (BA &harr; Eng)",
            lead: "Sprint-sized, user-perspective slices.",
            body: "<ul><li>As a reviewer, I see an eligibility summary grounded in the actual rule that applied.</li><li>As an auditor, I can trace why an application was flagged ineligible.</li><li>As a reviewer, I can override the AI with a recorded justification.</li></ul><p>That third story is a <strong>context-graph decision event</strong> in disguise (see Graphs branch). [[KOREAI]]</p>"
          },
          {
            t: "Subtasks (Engineer/FDE owns)",
            lead: "The technical how &mdash; one dev each.",
            body: "<ul><li>Build the knowledge-graph schema for application &rarr; rule &rarr; precedent.</li><li>Wire GraphRAG retrieval over the rule corpus; add a white-box citation path.</li><li>Persist override events to the context graph with approver + condition + precedent link.</li><li>HITL gate: which decisions the agent may auto-resolve vs. escalate.</li></ul><p>The override-event subtask is where decomposition, graphs, and the HITL direction-check converge.</p>"
          }
        ]
      },
      {
        t: "Decomposition as an FDE-supervised AI act",
        lead: "AI tools now generate epic&rarr;story&rarr;task hierarchies from a high-level idea. The FDE supervises the cut.",
        body: "<p>AI backlog tools propose epics, break them into stories, and suggest initial tasks from a single idea. [[ARXIV_GA]] But an agent only decomposes <em>correctly</em> if it can traverse the system graph &mdash; which subtasks touch which services, entities, and rules. Bad decomposition is usually a missing-graph problem, not a model problem. This is the direct hand-off to the Graphs branch. [[ARXIV_GA]][[KOREAI]]</p>"
      }
    ]
  },

  /* ============================================================ 5 — app modernization */
  {
    id: "appmod",
    t: "App Modernization",
    icon: "&#9851;",
    color: "#fb923c",
    tag: "Diagnose before you build",
    lead: "The work itself: take a system a business has leaned on for years and modernize it <em>without losing the business impact.</em> The reflex underneath every step is the same &mdash; understand the problem before you touch the code.",
    nodes: [
      {
        t: "Why modernize &mdash; keep the value, remove the risk",
        lead: "Legacy is hard to maintain, expensive to run, and hard to extend. You replace it while making sure the business <em>gains</em>, never loses.",
        body: "<p>Systems get modernized because legacy is hard to maintain and expensive to run, and costly to build on top of. The job is to stand up new software that covers what matters in the old one &mdash; <strong>keep the business value, remove the risk.</strong> It should be a gain, not a like-for-like swap. And it's never big-bang: modernization runs <strong>in phases</strong>, proven out with a POC on the one or two most critical modules first. [[FOWLER_SF]][[FOWLER_FP]][[VIMEO]]</p>"
      },
      {
        t: "The FDE's 4-step method (diagnose before you build)",
        lead: "Before any platform or tool, this is the discipline you run yourself: understand the business, analyze the sources, write the spec, implement in modules.",
        body: "<p>The human method that AI tools later accelerate &mdash; and the clearest expression of the &lsquo;diagnose before you build&rsquo; reflex:</p>",
        deeper: [
          {
            t: "1 &middot; Understand the business before a single line of code",
            lead: "What is the app, why does it matter, where does it sit, and what must never break?",
            body: "<p>On the first call, take a walkthrough; see it from the <em>user's</em> perspective (persona, current features, desired enhancements). Find the <strong>core trade-offs</strong> &mdash; the modules that, if they break, halt the business. Those get battle-tested before any deploy. [[VINOO_FDE]][[VIMEO]]</p>"
          },
          {
            t: "2 &middot; Analyze the sources &mdash; trust nothing, trace everything",
            lead: "Code + docs + manuals + screenshots. Never rely on one tool. Never take AI analysis as hard truth.",
            body: "<p>Do not rely on one platform or one tool, and never take its analysis as hard truth &mdash; counter, question, and verify against the cited sources, and always trace it back to the business understanding you built. On a mismatch: flag it, redo the analysis with another approach, read the code yourself, escalate to an SME. Large legacy codebases mean heavy back-and-forth &mdash; expect it. [[CC_BP]][[VIMEO]]</p>"
          },
          {
            t: "3 &middot; Specification generation (via the target state)",
            lead: "Map features to the validated business understanding, then write what the modernized app will be.",
            body: "<p>Once sources are analyzed and validated, write the <strong>specification document</strong> &mdash; the modernized app's features, screens, personas &mdash; all traced back to ground truth. It is itself a checkpoint (&ldquo;how well are my specs grounded?&rdquo;) and it goes to the client <strong>as a proposal</strong>, iterated with feature add/omit. [[SDD_BCMS]][[VIMEO]]</p>"
          },
          {
            t: "4 &middot; Implement in modules, never in one go",
            lead: "AI coding tools + tests, module by module, validated by SMEs &mdash; so a domino effect can't take the whole system down.",
            body: "<p>Don't let the domino effect happen &mdash; do it one step at a time and validate with SMEs. The common failure: a necessary feature gets missed and the <em>intended business impact isn't derived</em> &mdash; most often when both the source and target stacks are unfamiliar. That's exactly where an SME validates the implemented approach. [[FOWLER_FP]][[VIMEO]]</p>"
          }
        ]
      },
      {
        t: "Spec-Driven Development (SDD)",
        lead: "The spine of the whole method: a versioned <em>spec</em> &mdash; not the code &mdash; is the source of truth. Write the spec, derive the plan, break it into tasks, then generate code.",
        body: "<p><strong>Spec-driven development</strong> makes an executable, version-controlled <em>specification</em> the single source of truth: describe <em>what</em> the system should do, derive a plan, break it into atomic tasks, and only then generate code. When requirements change, you edit the spec and regenerate. [[SDD_BCMS]]</p><blockquote>&ldquo;The spec is the prompt.&rdquo; &mdash; the phrase that keeps recurring across 2025&ndash;26 GitHub and AWS posts. [[SDD_BCMS]]</blockquote>",
        deeper: [
          {
            t: "Why SDD exists &mdash; the vibe-coding correction",
            lead: "SDD emerged in 2025 as the answer to AI agents that produce plausible code which drifts from intent.",
            body: "<p>&ldquo;Vibe coding&rdquo; (term popularized by Andrej Karpathy, early 2025) is prompting an agent and accepting whatever it produces &mdash; fast for prototypes, miserable at scale: the code drifts from intent, hallucinates APIs, and decays as the project grows. A precise spec is the missing layer between human intent and machine execution. It is the FDE's antidote to <em>both</em> shelfware and vibe-coding drift. [[SDD_BCMS]]</p>"
          },
          {
            t: "The SDD loop",
            lead: "Spec &rarr; Plan &rarr; Tasks &rarr; Code &rarr; verify against the spec. The spec stays alive.",
            body: "<p>Capture intent, behaviour, edge cases, and acceptance criteria in a structured form a model can act on; then an agent reads it, plans, breaks it into tasks, writes code, and verifies against the original criteria. [[SDD_BCMS]] Tool workflows make this concrete: <strong>GitHub Spec Kit</strong> runs <code>/specify &rarr; /plan &rarr; /tasks &rarr; /implement</code>; <strong>AWS Kiro</strong> guides Requirements &rarr; Design &rarr; Tasks before any code is generated. [[SPECKIT]][[KIRO]]</p>"
          },
          {
            t: "It's gone mainstream (2026)",
            lead: "By 2026 every major AI coding tool ships an SDD flavour.",
            body: "<p>GitHub Spec Kit (open-source; supports Claude Code, Copilot, Gemini CLI), AWS Kiro (agentic IDE), Cursor, OpenSpec, BMAD, and others each shipped their own SDD flavour. GitHub reports teams on Spec Kit ship with roughly an order-of-magnitude fewer &ldquo;regenerate from scratch&rdquo; cycles. [[SDD_BCMS]][[SPECKIT]]</p>"
          }
        ],
        views: [
          { r: "Business Analyst", t: "The spec is your surface: validate intent + acceptance criteria before code exists &mdash; the cheapest place to catch the wrong build. [[SDD_BCMS]]" },
          { r: "Engineer / FDE", t: "Build against the spec, not vibes. The spec is the guardrail that keeps the agent's output from drifting from intent. [[SDD_BCMS]]" }
        ]
      },
      {
        t: "Current state &rarr; target state",
        lead: "Between analysis and spec sits the target state: where UI/UX, database, language, and deployment strategy are actually chosen.",
        body: "<p><strong>Current state</strong> = where the app is now; <strong>target state</strong> = the modernized design. The <strong>target-state configuration</strong> is where the big calls land: UI/UX, DB choice, target language, deployment architecture (all-at-once vs phased), and the phase-out pattern. Get the target state right and the spec, the backlog, and the implementation all inherit correct decisions; get it wrong and every downstream step compounds the error.</p>"
      },
      {
        t: "Strangler fig &mdash; modernize in slices",
        lead: "You don't cut over in a day. Grow the new system around the legacy one behind a façade and migrate behaviour incrementally.",
        body: "<p>Martin Fowler's canonical pattern: grow the new system around the legacy one behind a façade, move behaviour across incrementally, and let the old system shrink &mdash; gradual, visible investment with earlier ROI and far less risk than a big-bang rewrite. [[FOWLER_SF]] AWS documents the same pattern as prescriptive cloud guidance: route slices of traffic to the new implementation as each capability is migrated. [[AWS_SF]]</p>"
      },
      {
        t: "The feature-parity trap",
        lead: "&ldquo;Just rebuild exactly what it does, in new tech&rdquo; is the trap &mdash; and it's why the FDE method leads with business understanding + target state, not blind cloning.",
        body: "<p>Fowler calls like-for-like replacement the <strong>feature-parity trap</strong>: teams greatly underestimate the effort, and just <em>defining the &lsquo;as-is&rsquo; scope</em> is enormous for a system that's become core to the business. Worse, legacy systems bloat &mdash; a 2014 Standish Group report found <strong>~50% of features go unused</strong>, and old bug-workarounds calcify into &ldquo;must-have&rdquo; requirements. Rebuilding all of it &ldquo;is not only waste, it's a missed opportunity to build what's actually needed today.&rdquo; [[FOWLER_FP]]</p><p>Start from the <em>business model</em> and a scoped POC, not a 1:1 clone &mdash; modernize the value, drop the cruft. [[FOWLER_FP]]</p>"
      },
      {
        t: "Analyze the codebase with AI agents",
        lead: "When a code base is large or unfamiliar, run AI agents to analyze it &mdash; but explore before you build, cite the evidence, and verify.",
        body: "<p>Clone the repo, open an agentic coding tool in that directory, and run analysis agents to build (and cross-check) your understanding of the system. The prompt structure that works lines up almost 1:1 with Anthropic's documented agentic-coding guidance:</p><table class='trap-table'><tr><th>The discipline</th><th>Anthropic's documented practice [[CC_BP]]</th></tr><tr><td>Read the actual code first; no guesses</td><td><strong>Explore first, then plan, then code</strong> &mdash; separating research from execution &ldquo;helps avoid solving the wrong problem.&rdquo;</td></tr><tr><td>Cite the evidence; map accuracy</td><td><strong>Give the agent a way to verify its work</strong> &mdash; verification is &ldquo;the highest-leverage practice.&rdquo;</td></tr><tr><td>Point to prior analysis + source location</td><td><strong>Provide specific context</strong> &mdash; reference specific files and example patterns.</td></tr><tr><td>Batch huge files; be exhaustive</td><td><strong>Manage the context window</strong> &mdash; performance degrades as context fills, so scope work deliberately.</td></tr></table><p>The best agentic systems use <em>simple, composable patterns</em> &mdash; an augmented LLM (model + tools + memory + retrieval) composed into workflows, not a heavy framework. [[ANTH_AGENTS]]</p><p><em>Worked example:</em> see <strong>External analysis with AI agents</strong> in the Galent Sessions branch, where this is run for real against 200K lines of mainframe COBOL &mdash; including the 4-layer prompt structure and the three classes of defect the second pass caught. [[VIMEO2]]</p>"
      },
      {
        t: "Co-pilot, never autopilot",
        lead: "AI helps &mdash; it does not do the task for you. The FDE keeps the human checkpoint.",
        body: "<p>Treat the tooling as a co-pilot, never autopilot: keep analysis, validation, and HITL in the loop that checks &mdash; is this going in the right direction? This is the same discipline as the Mindset branch's <em>direction-check</em>: deliverables crossed off, discrepancies caught, inflexibility flagged. The FDE owns the steering even when the agent writes the code. [[CC_BP]][[ANTH_AGENTS]][[VIMEO]]</p>"
      },
      {
        t: "What does &ldquo;done&rdquo; look like?",
        lead: "For legacy modernization, &lsquo;done&rsquo; is not naive feature parity. Here's the credible answer.",
        body: "<ul><li><strong>Not</strong> &ldquo;rebuild every feature&rdquo; &mdash; that's the feature-parity trap (effort underestimated, ~50% of legacy features unused). Done = the <em>validated target-state spec's</em> acceptance criteria are met for the in-scope capabilities. [[FOWLER_FP]]</li><li><strong>Behaviour preserved where it matters:</strong> for the slices you change, capture the legacy system's real outputs and lock them in as <strong>characterization / golden-master tests</strong> (Michael Feathers) &mdash; &ldquo;if a legacy system has no tests and you start refactoring, you're not modernizing, you're gambling.&rdquo; [[FEATHERS]]</li><li><strong>Definition of Done as a shared gate:</strong> a written, agreed checklist every increment must satisfy before it's shippable &mdash; the FDE's own &ldquo;am I crossing off the finalized deliverables?&rdquo; check, made explicit.</li></ul>",
        views: [
          { r: "Business Analyst", t: "Done = your acceptance criteria on the validated spec/stories are demonstrably met &mdash; the POC produces the expected business output you signed off. [[FOWLER_FP]]" },
          { r: "Engineer / FDE", t: "Done = in-scope behaviour reproduced and protected by characterization tests + the story's definition-of-done checklist green, not 1:1 parity with dead legacy features. [[FEATHERS]]" },
          { r: "The trap to avoid", t: "&lsquo;Do what the old system does&rsquo; sounds safe but blows up scope &mdash; defining the full &lsquo;as-is&rsquo; is often the biggest cost of all. Scope to value. [[FOWLER_FP]]" }
        ]
      }
    ]
  },

  /* ============================================================ 6 — graphs */
  {
    id: "graphs",
    t: "Knowledge &amp; Context Graphs",
    icon: "&#9903;",
    color: "#38bdf8",
    tag: "The system graph that lets agents execute",
    lead: "To understand a large, complex system &mdash; and to let an AI agent act in it safely &mdash; you build a graph of it: what exists (knowledge graph) and how decisions get made (context graph). This is the substrate under every serious agentic platform.",
    nodes: [
      {
        t: "The three-layer context stack",
        lead: "Vector RAG, Knowledge Graph, and Context Graph are not alternatives &mdash; they are three layers of one stack.",
        body: "<table class='trap-table'><tr><th>Layer</th><th>Question it answers</th><th>Agent role</th></tr><tr><td><strong>Vector RAG</strong></td><td>What does our documentation <em>say</em>?</td><td>Surfaces knowledge</td></tr><tr><td><strong>Knowledge Graph</strong></td><td>What is true now, and how is it connected?</td><td>Structured reasoning</td></tr><tr><td><strong>Context Graph</strong></td><td>How did we get here? How have we handled this before?</td><td>Judgment on edge cases</td></tr></table><p>&ldquo;AI memory, RAG, and knowledge graphs are not alternatives to pick between &mdash; they are three distinct layers of the same context stack.&rdquo; [[TRANTOR]] &ldquo;RAG improves what a model <em>knows</em>. A context graph improves how an agent <em>decides</em>.&rdquo; [[KOREAI]]</p>"
      },
      {
        t: "Knowledge graph vs context graph",
        lead: "A knowledge graph maps what exists. A context graph records how decisions were made. Both are necessary; they conflate constantly.",
        body: "<table class='trap-table'><tr><th>Dimension</th><th>Knowledge Graph</th><th>Context Graph</th></tr><tr><td>Core unit</td><td>Entity + relationship</td><td>Decision event (situation, policy, exception, approver, precedent)</td></tr><tr><td>Time</td><td>Static snapshot of current state</td><td>Temporal record of evolving behavior</td></tr><tr><td>Query focus</td><td>&ldquo;what / who&rdquo;</td><td>&ldquo;how / why&rdquo;</td></tr><tr><td>Captures</td><td>Structure &amp; connections (data lineage)</td><td>Reasoning, exceptions, precedent (decision lineage)</td></tr><tr><td>Powers</td><td>Search, retrieval, entity resolution</td><td>Autonomous agent judgment &amp; edge cases</td></tr></table><p class='cite-line'>Framing via [[KOREAI]].</p>",
        deeper: [
          {
            t: "What a decision event looks like",
            lead: "The atomic unit of a context graph.",
            body: "<p>A decision event captures: the situation that triggered it, the entity involved, the conditions present, the policy version in effect; what was decided/approved/escalated/overridden; whether the standard rule was followed or <em>bent</em>, under what conditions, by whose authority; and a link to the prior decisions that informed it. [[KOREAI]]</p><blockquote>A log records that something happened. A database records current state. A context graph records <em>why a decision was permitted to happen, what it was based on, and what it means for every similar situation that follows.</em> [[KOREAI]]</blockquote>"
          },
          {
            t: "The analyst signal",
            lead: "Context graphs were flagged as foundational infrastructure for agentic AI in early 2026.",
            body: "<p>Gartner projects that by <strong>2029, 80%</strong> of AI agent platforms will have context layers in place &mdash; today <strong>fewer than 10%</strong> do. [[KOREAI]] The missing piece they name is the &ldquo;why&rdquo; and the &ldquo;how,&rdquo; especially when decisions happened outside any formal system. [[KOREAI]]</p>"
          }
        ]
      },
      {
        t: "Why pure vector RAG isn't enough",
        lead: "Three structural failures that better prompting and bigger context windows cannot fix.",
        body: "<ol><li><strong>The multi-hop wall.</strong> &ldquo;How did the delay in Project Apollo affect Q3 APAC margins?&rdquo; Vector RAG retrieves Apollo docs and APAC docs but cannot traverse the causal link. GraphRAG: <strong>90.63% vs 46.88%</strong> on multi-hop. [[TRANTOR]]</li><li><strong>The audit gap.</strong> &ldquo;These chunks were semantically similar&rdquo; is not an acceptable answer to a compliance officer. Graphs give a white-box path: <em>Entity A &rarr; Relationship C &rarr; Entity B.</em> [[TRANTOR]]</li><li><strong>The global question.</strong> &ldquo;What are the compliance risks across all our vendor contracts?&rdquo; needs whole-corpus synthesis (Microsoft GraphRAG's Leiden-community summarization), not top-k chunks. [[TRANTOR]][[MSGRAPH]]</li></ol>",
        views: [
          { r: "The numbers", t: "GraphRAG ~80% accuracy vs ~51% for vector RAG &mdash; a 3.4x improvement on enterprise benchmarks (Lettria/AWS, Dec 2024). Up to +35% precision when KGs are integrated. [[TRANTOR]]" },
          { r: "The adoption gap", t: "71% of orgs use GenAI regularly (McKinsey) but only 17% attribute >5% of EBIT to it &mdash; &lsquo;largely an architecture problem.&rsquo; ~85% adopting hybrid vector+graph RAG by 2026. [[TRANTOR]]" },
          { r: "Audit lens", t: "White-box auditability is exactly what a compliance or ATO reviewer demands. &lsquo;Show me the reasoning path&rsquo; is a graph query, not a vector lookup &mdash; which is why serious agentic platforms converge on a graph layer." }
        ]
      },
      {
        t: "The system graph &rarr; agent execution",
        lead: "Build a graph of the whole system, and the agent can finally decompose and act <em>clearly.</em>",
        body: "<p>This closes the loop with Decomposition. An agent that can traverse a knowledge graph of services, data, and dependencies &mdash; governed by a context graph of which decisions it may make autonomously vs. escalate &mdash; can break a complex task into correct subtasks and execute them with a defensible trail. [[ARXIV_GA]][[KOREAI]] The knowledge graph gives the agent the map; the context graph gives it the judgment and the guardrail.</p>"
      }
    ]
  },


  /* ============================================================ 7 — galent sessions */
  {
    id: "galent",
    t: "Galent Sessions",
    icon: "&#9636;",
    color: "#34d399",
    tag: "The vendor walkthrough, recorded",
    lead: "Two recorded sessions with Archit (Galent) on what an FDE does and how their app-mod platform runs. Galent is a sister company, not this cohort's client &mdash; treat these as a <em>consistency reference</em> so an engineer moving between orgs hears one vocabulary. Your delivery target stays the brownfield projects on the Client Delivery page. Everything vendor-specific lives in this branch and nowhere else on the map.",
    nodes: [
      {
        t: "Watch first &mdash; Session 1: What is an FDE?",
        lead: "Archit&rsquo;s framing of the role, why companies modernize, the FDE&rsquo;s own 4-step method, and the co-pilot close.",
        body: "<p>The whole generalized spine of this Atlas &mdash; <em>understand the business before a single line of code</em>, <em>keep the business value and remove the risk</em>, and the HITL direction-check &mdash; comes from this session. [[VIMEO]]</p><p class=\"note\"><strong>If the player does not load:</strong> these are private instructor copies and the embed is domain-restricted, so the frame may show a Vimeo error. Use the <em>source</em> link under the player, which opens the recording directly. Ask your trainer if you hit a permissions wall.</p>",
        video: "vimeoSession1"
      },
      {
        t: "Watch second &mdash; Session 2: Stellantis walkthrough &amp; platform",
        lead: "The same method run against a real 33-year-old COBOL warehouse system, plus a screen-by-screen platform tour.",
        body: "<p>Where Session 1 gives you the method, Session 2 shows it surviving contact with a mainframe. [[VIMEO2]]</p><p class=\"note\"><strong>If the player does not load:</strong> these are private instructor copies and the embed is domain-restricted, so the frame may show a Vimeo error. Use the <em>source</em> link under the player, which opens the recording directly. Ask your trainer if you hit a permissions wall.</p>",
        video: "galentSession2"
      },
      {
        t: "The Galent app-mod pipeline (7 steps)",
        lead: "What the platform does, as walked on screen. Distinct from the FDE&rsquo;s own 4-step method in App Modernization &mdash; that one is what <em>you</em> do, this is what the tool does.",
        body: "<p><strong>Inputs:</strong> source code, documentation, minutes of meeting, DB schema, client data, <em>plus</em> the target-state configuration.<br><strong>Outputs:</strong> an understanding of the existing app, a modernized target design (security, DB, data-migration strategy, features, architecture), and a ready-to-build backlog of epics, stories and sub-tasks that lands in Jira in implementation order. [[VIMEO]][[VIMEO2]]</p>",
        video: "galentSession2",
        deeper: [
          {
            t: "1 &middot; Ingestion of sources (Application Discovery)",
            lead: "Ingest the legacy codebase and every source, then map features to data schema to user persona.",
            body: "<p>Agents produce <em>application understanding</em>, <em>features</em> and <em>business features</em>, identify the domain, dissect lines of code, and generate an architecture diagram and personas &mdash; roughly <strong>16 analysis layers.</strong></p><p><strong>&ldquo;Application at a glance&rdquo;</strong> answers three things: who uses it (receiving clerks, storage attendants, material handlers), what the system logic does (records every part movement arriving at the plant dock, prints movement tickets directing handlers), and what it integrates with (plant shop-floor display, supervisor email, pager alerts).</p><p><strong>Managed sources</strong> are file groups &mdash; requirements, minutes of meeting, logs, custom labels &mdash; plus an external-repo connection. Anything you upload here flows into the target state. [[VIMEO2]]</p>"
          },
          {
            t: "2 &middot; Target-state generation",
            lead: "The complete modernized design, before a line of it is built.",
            body: "<p><strong>Target-state configuration</strong> picks the path (Cloud Native, Databricks, Salesforce) and the in-scope features. <strong>Scope selection</strong> narrows to the POC. <strong>Target-state results</strong> give files analyzed, an executive summary and the modernized design.</p><p>Archit&rsquo;s phrase: you can <em>&ldquo;dissect the whole modernized application even before it is built.&rdquo;</em> [[VIMEO]][[VIMEO2]]</p>"
          },
          {
            t: "3 &middot; Target-state walkthrough &amp; validation",
            lead: "The checkpoint the presenter never numbered out loud. Heavy back-and-forth with the customer and their SMEs.",
            body: "<p>Architecture diagram, parameters, and &ldquo;here is where we are&rdquo; walkthroughs. Session 1 calls this the stage with the most iteration alongside source analysis.</p><p><strong>Naming note.</strong> Archit catches his own slide numbering slipping here in Session 2 &mdash; <em>&ldquo;this three or four, there&rsquo;s a mismatch&rdquo;</em> &mdash; and never names step 3 as a numbered step in either session. This Atlas names it, because the walkthrough plainly happens and an unnamed step is harder to learn than a named one. See <em>Where the sessions and this Atlas differ.</em> [[VIMEO2]]</p>"
          },
          {
            t: "4 &middot; Implementation-specs generation",
            lead: "From target state to a statement of work, agreed with the client.",
            body: "<p>Auto-generated from the in-scope capabilities and the configuration. Editable after validation, though Archit expects you rarely need to: <em>&ldquo;once the previous steps have worked up to the mark, this step is actually very smooth flowing.&rdquo;</em></p><p>Ships with <strong>design documents</strong>: architecture overview, non-functional requirements, recommended testing strategy, data-migration strategy, and the delivery and rollout plan. [[VIMEO2]]</p><p><strong>Careful: two different artifacts are called &ldquo;spec&rdquo; in this pipeline, at two altitudes.</strong> Reading them as one is the easiest way to think steps 5 and 6 are in the wrong order.</p><ul><li><strong>This one, at step 4, is the SOW.</strong> Business language, agreed with the client, and explicitly <em>above</em> epics and stories &mdash; Archit&rsquo;s words: <em>&ldquo;specs is something that we think of as an even higher order of epics and stories.&rdquo;</em> It carries no technical specification, no definition of done, and no legacy file references. It is what the client signs before anyone writes a story.</li><li><strong>The spec that actually drives code is the technical spec inside each sub-task, at step 6.</strong> It is not its own step and it is not authored here &mdash; it is generated after the BA has been through the stories.</li></ul><p>So the sequence is genuinely SOW first, then stories, then the technical spec. What looks like an inversion is two artifacts sharing one word. [[VIMEO]][[VIMEO2]]</p>"
          },
          {
            t: "5 &middot; Epics &amp; stories &mdash; the BA&rsquo;s surface",
            lead: "Capability layer, then epics, then story features. Written in business language on purpose.",
            body: "<p><strong>The BA reviews this</strong>, and this is where time estimates and resource planning land. Highlighted items are the BA&rsquo;s; platform notes and labels are for the agent or developer.</p><p>Deliberately carries <em>no</em> technical jargon or file names, so a BA can track and validate <strong>without reading the codebase</strong>. The BA milestone here is what catches a missed feature before it reaches development. [[VIMEO]][[VIMEO2]]</p>"
          },
          {
            t: "6 &middot; Sub-tasks &mdash; the engineer&rsquo;s and agent&rsquo;s surface",
            lead: "Generated only after the BA has given feedback on epics and stories. Never before.",
            body: "<p>Technically specific: technical spec, <strong>definition of done</strong>, and <strong>the relevant files from the legacy codebase</strong> &mdash; the one place legacy file references appear.</p><p>Archit&rsquo;s reason for the separate step: <em>&ldquo;any dev or any AI agent working on the sub-task can understand the existing code alongside the spec and the expected outcome.&rdquo;</em> [[VIMEO]][[VIMEO2]]</p><p><strong>This is the spec that drives implementation</strong>, not the statement of work back at step 4. Note the ordering that follows from it: the BA review on epics and stories is a <em>gate</em> on this step &mdash; <em>&ldquo;sub-task is something based on the edits and whatever the comment and the feedback that you're getting on epic and stories, then you generate sub-task.&rdquo;</em> The technical spec is therefore written <em>after</em> the business has signed off the story, which is the right way round even though the word &ldquo;spec&rdquo; appears two steps earlier. [[VIMEO2]]</p>"
          },
          {
            t: "7 &middot; Implementation workbench + code companion",
            lead: "Three panes: your stories, a VS Code editor, and a team of agents.",
            body: "<p>The <strong>code companion</strong> is not one agent but a group with expertise across UI/UX, front-end and back-end. It triggers per sub-task and <strong>wraps each in about five to seven minutes</strong>, checks for duplication and already-implemented code, designs a plan, implements, commits, and resolves conflicts. It raises and reviews PRs into GitHub, Bitbucket or Azure DevOps.</p><p>Archit: it is <em>&ldquo;a software engineer itself&rdquo;</em> &mdash; which is exactly why the co-pilot rule below matters. [[VIMEO]][[VIMEO2]]</p>"
          }
        ]
      },
      {
        t: "Stellantis &mdash; the case study",
        lead: "Fortune-500 automotive, just-in-time manufacturing, and a 33-year-old COBOL system whose failure stops the production line.",
        body: "<p>The <strong>Controlled Storage Application</strong> is a mainframe-COBOL Kanban warehouse-management system, <strong>31 to 33 years old</strong>, patched throughout with feature additions in 2018 and 2023. Around <strong>140&ndash;200K lines</strong> total.</p><p><strong>The crux:</strong> if the modernized app does not match the business model, the production line stops and losses run minute to minute. That is why it must be battle-tested before deploy, and why the approach is <strong>strangler fig</strong> &mdash; group modules into domains and migrate in phased milestones, never big-bang. [[FOWLER_SF]][[VIMEO2]]</p>",
        video: "galentSession2",
        deeper: [
          {
            t: "The POC scope &mdash; Replenishment Management System",
            lead: "About 21K in-scope lines out of 140&ndash;200K. When a part runs low, raise and fulfil a replenish order.",
            body: "<p>High-low request file and Kanban picklist. Picking one critical module and proving the approach on it is the standard opening move: <em>&ldquo;every time that you are approaching a new app modernization project, you&rsquo;ll be doing a POC first.&rdquo;</em></p><p>Archit&rsquo;s caution on scoping a POC: the replenishment engine alone was not functionally sufficient, so its dependencies had to be pulled into the POC too. [[VIMEO]][[VIMEO2]]</p>"
          },
          {
            t: "Team shape and cadence",
            lead: "Three FDEs for a Java + Angular target, and a deliberately relaxed three-week rhythm.",
            body: "<p>One Java FDE, one Angular FDE, and one <strong>architect-level FDE</strong> who owns the legacy-to-new mapping.</p><p>Cadence: analysis in week 1 with client-call validation, target state by week 2, generated features by week 3. Archit calls that <em>&ldquo;a very relaxed timeframe.&rdquo;</em> Stellantis slipped past it anyway &mdash; a client-side reorg, plus the difficulty of tracking down SMEs for a 33-year-old system. Expect the schedule to flex for reasons that have nothing to do with the code. [[VIMEO2]]</p>"
          }
        ]
      },
      {
        t: "External analysis with AI agents (Claude Code)",
        lead: "FDE discretion, not a platform step. When the tool cannot handle the codebase, you go around it and pipe the findings back.",
        body: "<p>The platform was not mature enough for a mainframe COBOL base of that size, so Archit cloned the repo locally, opened <strong>Claude Code</strong>, designed agents, ran them in parallel, and fed the results back in as a managed-source file group &mdash; where they flow into the target state and the specs.</p><p>This is the clearest illustration of the session&rsquo;s real thesis: <em>&ldquo;100% FDE&rsquo;s discretion along this whole process.&rdquo;</em> If the playbook works, leave it alone. If it breaks, step in. [[VIMEO2]][[CC_BP]]</p><p><em>The principle behind this</em> lives in <strong>Analyze the codebase with AI agents</strong> in the App Modernization branch: explore before you build, cite the evidence, verify. This node is that discipline under field conditions. [[CC_BP]]</p>",
        video: "galentSession2",
        deeper: [
          {
            t: "The 4-layer prompt structure",
            lead: "Archit&rsquo;s preferred shape for an analysis agent. Read it as an anti-hallucination design, not a template.",
            body: "<ol><li><strong>Read the actual code</strong> &mdash; no guesses, no assumptions, stated as a hard roadblock.</li><li><strong>Cite the evidence</strong> &mdash; the location in code. Never cite what is not there.</li><li><strong>Extract what exists</strong> &mdash; de-duplicate against the platform&rsquo;s prior analysis. He saved 16 platform docs into one markdown file, gave the agent the path, and asked it to <em>rate that analysis&rsquo;s accuracy</em> while doing its own exploration. Batch the huge files (one program was 14&ndash;15K lines) and be exhaustive.</li><li><strong>Phases of approach + accuracy mapping</strong> &mdash; source location and already-found domains in, phased analysis and an accuracy listing out.</li></ol><p>Note that layers 1 and 2 are the same discipline this Atlas teaches as <em>trust nothing, trace everything</em>. [[VIMEO2]][[CC_BP]]</p>"
          },
          {
            t: "What the second look actually caught",
            lead: "Three classes of defect the platform&rsquo;s own analysis missed.",
            body: "<ul><li><strong>De-duplication</strong> &mdash; one capability spread across two programs, counted twice as two features.</li><li><strong>Ghost programs</strong> &mdash; cited programs that do not exist in the codebase. Hallucination, caught by requiring citations.</li><li><strong>Missing data schema</strong> &mdash; absent from the sources entirely, so a business doc and sample data had to be requested from the client.</li></ul><p>Why small files matter in COBOL: a 200-line program can hold a critical feature and gets overshadowed in analysis by a 15K-line neighbour. Three passes were run &mdash; the whole control-storage app, the in-scope replenishment scope, and a business-capability analysis. [[VIMEO2]]</p>"
          }
        ]
      },
      {
        t: "Where the sessions and this Atlas differ",
        lead: "Read this before you quote a session in front of a client. Two numbering defects and two open questions, found by checking the recordings against the transcripts.",
        body: "<p><strong>The pipeline step count is inconsistent in the source.</strong> It is walked as seven steps, but Archit summarizes the same flow as <em>&ldquo;these are the six stages&rdquo;</em> and catches his slide numbering slipping live: <em>&ldquo;this three or four, there&rsquo;s a mismatch.&rdquo;</em> This Atlas commits to <strong>seven</strong> and names step 3, because the walkthrough plainly performs it.</p><p><strong>The FDE&rsquo;s 4 steps and the platform&rsquo;s 7 steps are different things</strong> and are easy to conflate because both are numbered and both start with understanding the sources. The 4-step method in <em>App Modernization</em> is what you do. The 7-step pipeline here is what the tool does. Sequence them, do not merge them.</p><p><strong>&ldquo;What does done look like?&rdquo; was never crisply answered.</strong> Asked in Session 2, deferred to the platform walkthrough, and only loosely resolved as BA-validated POC acceptance. If you need a definition of done, you are building it yourself.</p><p><strong>The verbatim prompt was promised and not delivered.</strong> Archit offered to share the 4-layer prompt and agent JSON in the chat after Session 2. The transcripts record no follow-up. The reconstruction above comes from what he narrated on screen, not from his file. [[VIMEO]][[VIMEO2]]</p><p><strong>Three numbered frameworks, and how they nest.</strong> You will meet three Galent-sourced sequences on this program and they are not competing versions of one thing:</p><ul><li><strong>Scope &rarr; Sequence &rarr; Build &rarr; Ship &rarr; Measure</strong> &mdash; the <em>delivery model</em>, from Galent&rsquo;s published writing. Taught in Week 5 Day 5. This is the outermost frame.</li><li><strong>The FDE&rsquo;s 4-step method</strong> (App Modernization branch) &mdash; what <em>you</em> do inside it, from Session 1.</li><li><strong>The 7-step platform pipeline</strong> (above) &mdash; what the <em>tool</em> does when you reach for it. It sits inside step 3 and step 4 of the FDE method, not beside them.</li></ul><p><strong>The 4-step method has no Measure stage.</strong> Its step 4 ends at implement-in-modules, validated by SMEs and FD support &mdash; and validation is not measurement. Nothing in either session asks whether the modernized module changed an outcome anyone tracks. That means the session material stops one stage short of Galent&rsquo;s <em>own</em> published operating model, which names Measure explicitly. Do not read the 4 steps as complete; read them as Scope through Ship, and bring your own Measure. [[VIMEO]][[VIMEO2]]</p>"
      }
    ]
  },

  /* ============================================================ 8 — resources */
  {
    id: "resources",
    t: "Resources &amp; Video",
    icon: "&#9654;",
    color: "#fb7185",
    tag: "Watch, then read deeper",
    lead: "Every claim on this map is backed by a citation. Start with the video, then follow the source links. This list grows with every research pass.",
    nodes: [
      {
        t: "Watch first &mdash; Bob McGrew, The FDE Playbook (YC)",
        lead: "Palantir/OpenAI pioneer on why &ldquo;doing things that don't scale, at scale&rdquo; is the heart of the AI boom.",
        body: "<p>50-minute keynote. [[YCFDE]]</p>",
        video: "ycMcGrew"
      },
      {
        t: "Read deeper &mdash; the mindset",
        lead: "The canonical FDE writing.",
        body: "<ul><li>[[VINOO_FDE]] &mdash; the richest single source (6 traits, traps, playbook).</li><li>[[VINOO_BLD]] &mdash; the four core moves.</li><li>[[PAL_DAY]] &mdash; the origin &lsquo;many capabilities for one customer.&rsquo;</li><li>[[PRAG]] &mdash; the market: Deltas, OpenAI, demand.</li><li>[[SVPG]] &mdash; product-leadership view.</li><li>[[FDEACAD]] &mdash; how Palantir invented the model.</li></ul>"
      },
      {
        t: "Read deeper &mdash; graphs &amp; decomposition",
        lead: "The agent-execution substrate.",
        body: "<ul><li>[[KOREAI]] &mdash; context graphs, decision events, Gartner 2026.</li><li>[[TRANTOR]] &mdash; GraphRAG stats, multi-hop wall, white-box audit.</li><li>[[ARXIV_GA]] &mdash; Graphs Meet AI Agents (taxonomy).</li><li>[[MSGRAPH]] &mdash; Microsoft GraphRAG.</li><li>[[ATL]] &mdash; epics/stories/initiatives.</li><li>[[PLANE]] &mdash; epic vs feature vs story vs task.</li></ul>"
      },
      {
        t: "Read deeper &mdash; modernization &amp; SDD",
        lead: "The build discipline.",
        body: "<ul><li>[[SDD_BCMS]] &mdash; spec-driven development, the 2026 guide.</li><li>[[SPECKIT]] &mdash; GitHub Spec Kit.</li><li>[[KIRO]] &mdash; AWS Kiro spec workflow.</li><li>[[FOWLER_SF]] &mdash; the strangler-fig pattern.</li><li>[[FOWLER_FP]] &mdash; the feature-parity trap.</li><li>[[FEATHERS]] &mdash; characterization / golden-master tests.</li><li>[[CC_BP]] &mdash; explore &rarr; plan &rarr; code; verify.</li><li>[[ANTH_AGENTS]] &mdash; building effective agents.</li></ul>"
      }
    ]
  }
];

// expose
window.FDE = { SOURCES, VIDEOS, BRANCHES };
