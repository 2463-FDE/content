# AI Market Brief retrieval pipeline (2463 FDE program)

The weekly AI Market Brief, stored as data a model can search and cite. Trainees ask a question, the query script pulls the newest matching items with their dates and source links, and a model answers only from those items.

No paid services, no API keys, no server. Python 3 standard library only.

## What's here

| Path | What it is |
|---|---|
| `schema/brief-item.schema.json` | JSON Schema for one weekly file and each item in it |
| `data/briefs/2026-w46.json` | Week 46 sample issue (Nov 6 to 13, 2026), 11 items |
| `data/index.json` | Built search index (generated; don't edit by hand) |
| `scripts/build_index.py` | Checks every weekly file, marks superseded items, writes the index |
| `scripts/query.py` | Searches the index and prints a context block for a model |
| `scripts/common.py` | Shared tokenizer and labels |
| `prompts/answer-from-briefs.md` | System prompt for a model answering from the archive |
| `../.github/workflows/build-brief-index.yml` | GitHub Action that rebuilds the index when a new week lands |

The trainee-facing page is [`market-brief.html`](../market-brief.html) at the site root. Because the site is served as-is by GitHub Pages, the index is also readable at `https://2463-fde.github.io/content/brief-pipeline/data/index.json`.

## Quick start

Run from the repository root (the scripts find their data folder on their own, so running from `brief-pipeline/` works too):

```bash
python3 brief-pipeline/scripts/build_index.py
python3 brief-pipeline/scripts/query.py "What compliance deadlines should our hiring-screening demo plan for?" --section compliance --k 3
```

Useful flags for `query.py`:

- `--section dev|practice|compliance` and `--badge act_now|plan|fyi|background` to filter
- `--since 2026-11-01` to keep only items dated on or after a day
- `--tag mcp` to filter by tag
- `--format json` for machine use, `context` (default) to paste into a model
- `--today 2027-02-01` to see how freshness flags look later on

## Answering a question with a model

1. Run `brief-pipeline/scripts/query.py` with the trainee's question.
2. Send the model `brief-pipeline/prompts/answer-from-briefs.md` as the system prompt, and the query output plus the question as the user turn.
3. The model answers only from the retrieved items, cites them as [1], [2], and says "The brief archive doesn't cover that yet" when the output is `NO_MATCH`.

## Adding a week

1. Save the new week as `brief-pipeline/data/briefs/<year>-w<NN>.json` (for example `2026-w47.json`). Give a continuing story the same `topic_key` as last time so the older item is marked superseded.
2. Commit to `main`. The Action rebuilds `brief-pipeline/data/index.json` and commits it. You can also run `build_index.py` yourself and commit both files together; the Action then usually finds nothing to change.

## Freshness rules (in `query.py`)

- Compliance items read more than 30 days ago get a RECHECK flag: re-fetch the source before stating it as current law. Dev tools items get a MAY BE OUTDATED flag after 60 days, practice items after 90.
- Compliance items whose only source is a law firm or press summary are flagged SECONDARY SOURCE ONLY.
- Deadlines that have passed are flagged DATE PASSED.
- Items replaced by a later week on the same topic are hidden unless `--include-superseded`.

Change the windows in `RECHECK_DAYS` at the top of `query.py`.

## Later, if keyword search isn't enough

Add embeddings as a second ranking signal: compute them once per item in the Action with a small open model, store them next to the index, and blend the cosine score with BM25. Keyword search plus date and section filters is enough while the archive is a few hundred items.
