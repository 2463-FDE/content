# Google AI Professional Certificate — GCP path alignment target

Decision: `gcp-cert-alignment-target`, corrected 2026-10-14 — the GCP/Google learner
path aligns to the **Google AI Professional Certificate**. This supersedes the earlier
Professional Agentic Architect decision; no curriculum alignment is claimed to the
Professional Agentic Architect or the Professional Machine Learning Engineer.

## Source

- Canonical first-party page (supplied by the decision):
  https://grow.google/enroll-certificates/ai-professional-certificate-mid/
- **Accessed 2026-10-14**, HTTP 200, fetched with `curl` (HTML SHA-256
  `9eea5925dc05d348ffcf7f002b7fdfd0db30c79841f4127893c1386553fe2867`) and re-read in a
  rendered browser session; the rendered page carries the same headings and text.
- Page title: "Google AI Professional Certificate - Enroll Now".

## Verified facts (quoted or closely paraphrased from that page)

- **Title and type:** "Google AI Professional Certificate", labelled "Career
  Certificate"; "The AI credential that powers your career".
- **Status:** open for enrollment ("Enroll now", "Get started"). The page is not an
  exam page and publishes no beta/GA status, exam code, exam guide, domains, or weights.
- **Audience / learner expectations:** "If you want to learn how to use AI, the Google
  AI Professional Certificate is for you - no previous experience is required." "Learn
  relevant skills for any role or industry immediately, zero experience required." The
  aim is to "start using AI at your job, from day one".
- **Format:** "20+ hands-on activities"; learners "build a portfolio of 20+ AI
  projects"; purchase includes "videos, activities, readings, and graded assessments";
  self-paced ("You can complete the entire program at your own pace").
- **Courses** — "The Google AI Professional Certificate includes eight courses:"
  1. **AI Fundamentals** — "Learn essential AI concepts and practice prompting effectively."
  2. **AI for Brainstorming and Planning** — "Use AI to brainstorm concepts, build detailed timelines, and create a clear plan."
  3. **AI for Research and Insights** — "Use AI as your research partner, leveraging Deep Research and Gemini Notebook to quickly generate summaries, gain insights, and pressure test ideas for informed decision-making."
  4. **AI for Writing and Communicating** — "Turn rough notes into clear messages, easily adapt them for different stakeholders, practice for presentations by anticipating questions and concerns."
  5. **AI for Content Creation** — "Use AI as your creative partner to generate high-quality images, video, and presentations."
  6. **AI for Data Analysis** — "Transform unstructured data into clear insights, and master skills to clean, analyze, and create compelling visualizations and formulas with Gemini in Google Sheets."
  7. **AI for App Building** — "Master vibe coding and build your own custom app. Tackle your most tedious tasks, all without writing a single line of code."
  8. **AI for App Deployment** — "Dive deeper into vibe coding. Learn how to build custom, time-saving tools from scratch and confidently share them with anyone."
- **Tools:** Gemini (including Canvas and Deep Research), Gemini Notebook, Gemini in
  Google Workspace (Docs, Slides, Sheets), Google AI Studio ("build a custom AI tool");
  the tools strip also lists Nano Banana and Veo3.
- **Skill selection:** Google partnered with the Burning Glass Institute (job-posting
  data) and the Skills-First Workforce Initiative ("a group of 12 of America's largest
  employers").
- **Cost and availability:** "In the U.S. and Canada, the subscription cost is $49 per
  month." Available "on Coursera, Google Skills, and Udemy"; prices may vary by
  country. Enrollment includes "three months of no-cost access to Google AI Pro"
  (offer must be redeemed by January 1, 2027, per the page footnote).
- **Duration:** "made up of seven modules that can be completed in about an hour each."

## Discrepancy on the first-party page (reported, not resolved)

The page lists **eight** courses ("includes eight courses", followed by eight names),
but also says "After you complete all **seven** courses, you'll earn a certificate" and
"made up of **seven** modules". The curriculum map uses the eight listed courses and
the certifications page states the discrepancy. Re-check this page before any claim
about course count, duration, or completion requirements.

## Access gaps

- Per-course syllabi, learning objectives, and graded-assessment details on Coursera,
  Google Skills, or Udemy were **not** fetched; the decision names the grow.google page
  as the source, and the curriculum map uses only the course names and one-line
  descriptions above.
- No exam guide, weights, or objective IDs exist on the page, so "objectives" in
  `assets/js/cert-objectives.js` are the eight course descriptions, unweighted.
- The Google AI Pro offer terms (Google One) were not opened.

## Fit with this curriculum (for trainers)

The certificate is a no-experience-required workplace AI-fluency credential built on
Google's AI apps. This program is a mid-to-senior engineering curriculum that builds
and operates AI systems. Overlap is thematic — prompting, planning, research
summaries, stakeholder communication, and AI-assisted app building — and the program
covers those themes at build-it depth through its shared lessons. Two courses (AI for
Content Creation; AI for Data Analysis in Sheets) have no lesson in the program, and
the GCP provider blocks (Gemini Enterprise Agent Platform engineering) go beyond the
certificate's app-level tools. `certifications.html` shows each course's lesson
anchors and gaps.
