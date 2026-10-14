# Certification evidence (AWS / Google Cloud) — research-first index

Scope: certification **identity, status, audience, and published objectives** for the
AWS and GCP curriculum paths. Product-capability claims used in lesson provider
blocks live in each week's `docs/research/wWW/` artifact, not here.

**Method.** First-party sources only (`aws.amazon.com`, `docs.aws.amazon.com`,
`skillbuilder.aws`, `cloud.google.com`, `services.google.com`, `www.skills.google`).
Pages fetched with `curl` and, where JavaScript-rendered, read with a browser
snapshot. PDFs converted with `pdftotext -layout`. No third-party summaries, no
search snippets. **All sources accessed 2026-10-14.**

| Artifact | Covers |
|---|---|
| [aws-aip-c01.md](aws-aip-c01.md) | AWS Certified Generative AI Developer – Professional (AIP-C01) — the AWS path's alignment target |
| [gcp-google-ai-professional-certificate.md](gcp-google-ai-professional-certificate.md) | Google AI Professional Certificate — the GCP path's alignment target (decision `gcp-cert-alignment-target`, corrected 2026-10-14) |
| [gcp-professional-candidates.md](gcp-professional-candidates.md) | Superseded candidates (Professional Agentic Architect, Professional Machine Learning Engineer) — record only, no alignment claimed |
| [adjacent.md](adjacent.md) | Optional adjacent credentials on both clouds (associate, foundational, business, retired) |

## PDF fingerprints (as fetched 2026-10-14)

| Document | Bytes | SHA-256 | PDF date |
|---|---|---|---|
| AIP-C01 exam guide (`docs.aws.amazon.com/pdfs/aws-certification/latest/ai-professional-01/ai-professional-01.pdf`) | 621,732 | `e93c39dd375af06edcaf613aee15148ef2dd0dbad2cd319bdfc4ad636c3489be` | 2026-10-13 |
| Google AI Professional Certificate page HTML (`grow.google/enroll-certificates/ai-professional-certificate-mid/`) | — | `9eea5925dc05d348ffcf7f002b7fdfd0db30c79841f4127893c1386553fe2867` | — |
| Professional Agentic Architect exam guide (superseded candidate) (`services.google.com/fh/files/misc/professional_agentic_architect_exam_guide_english.pdf`) | 149,776 | `70214d7d67303884823f8129b6cdfa06b296d88a8d86906453180dceabd1cc01` | 2026-08-31 |
| Professional ML Engineer exam guide (superseded candidate) (`services.google.com/fh/files/misc/professional_machine_learning_engineer_exam_guide_english_new.pdf`) | 156,614 | `8353ed16bc4fcaebd6dab301f61bf2f86a3eaf341a199a1d6f38196745e4a598` | 2026-04-29 |
| Generative AI Leader exam guide (`services.google.com/fh/files/misc/generative_ai_leader_exam_guide_english.pdf`) | 197,566 | `0c79729e3cd033407176fec9b8e91e39ff03f79bbe71a8ba60bd95b0f7b4806e` | — |

## Access gaps (do not fill from inference)

- Google AI Professional Certificate: per-course syllabi, learning objectives, and graded-assessment details on Coursera, Google Skills, and Udemy were not fetched; the Google AI Pro offer terms were not opened.

- Skill Builder individual course pages and per-item subscription terms were not opened.
- (Superseded candidates) The Google Skills Professional Agentic Architect path rendered 9 of its 12 activities without sign-in; the PMLE path's activities and both partner paths were not enumerated.
- `docs.aws.amazon.com/aws-certification/latest/userguide/certification-exam-guides.html` returned 404; exam guides are linked from each certification page instead.

## Re-verification

- **Google AI Professional Certificate:** its page lists eight courses but also says
  "seven courses" and "seven modules". Re-fetch
  https://grow.google/enroll-certificates/ai-professional-certificate-mid/ before any
  claim about course count, duration, cost, or completion requirements, and update
  `assets/js/cert-objectives.js`, `assets/js/cloud-map.js`, and
  `gcp-google-ai-professional-certificate.md` with the new access date. Per-course
  syllabi on Coursera, Google Skills, and Udemy are an open access gap.
- AWS MLA-C02 GA dates were "TBD" on 2026-10-14 (adjacent only).
