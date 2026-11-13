#!/usr/bin/env python3
"""Search the brief archive and print a context block a model can answer from.

Usage examples:
    python3 scripts/query.py "what compliance deadlines are coming up?"
    python3 scripts/query.py "MCP allowlist" --section dev --k 3
    python3 scripts/query.py "watermarking" --since 2026-10-01 --format json
    python3 scripts/query.py "colorado hiring" --today 2027-03-01   # test freshness flags

Ranking: BM25 over headline, tags, source, summary, curriculum note and details,
multiplied by a recency weight so newer items rank higher when relevance is close.
Superseded items are dropped unless --include-superseded is given.
If nothing scores above --min-score, it prints NO_MATCH so the model says the
archive doesn't cover the question instead of guessing.
Standard library only.
"""
import argparse
import json
import math
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
PIPELINE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from common import BADGE_LABELS, SECTION_LABELS, tokenize  # noqa: E402

K1, B = 1.2, 0.75
HALF_LIFE_DAYS = 120            # recency weight halves every ~4 months
RECHECK_DAYS = {"compliance": 30, "dev": 60, "practice": 90}


def parse_date(s):
    try:
        return date.fromisoformat(s) if s else None
    except ValueError:
        return None


def bm25(q_tokens, item, stats):
    n, avgdl, df = stats["n"], stats["avgdl"], stats["df"]
    tf, dl = item["_tf"], item["_len"]
    score = 0.0
    for t in set(q_tokens):
        f = tf.get(t, 0)
        if not f:
            continue
        idf = math.log(1 + (n - df.get(t, 0) + 0.5) / (df.get(t, 0) + 0.5))
        score += idf * f * (K1 + 1) / (f + K1 * (1 - B + B * dl / avgdl))
    return score


def item_date(item):
    return parse_date(item.get("published")) or parse_date(item.get("retrieved_at"))


def flags_for(item, today):
    flags = []
    retrieved = parse_date(item.get("retrieved_at"))
    age = (today - retrieved).days if retrieved else None
    limit = RECHECK_DAYS.get(item["section"], 90)
    if age is not None and age > limit:
        if item["section"] == "compliance":
            flags.append(f"RECHECK: read {age} days ago; re-fetch the source before stating this as current law")
        else:
            flags.append(f"MAY BE OUTDATED: read {age} days ago")
    kinds = {s.get("kind") for s in item.get("sources", [])}
    if item["section"] == "compliance" and kinds == {"secondary"}:
        flags.append("SECONDARY SOURCE ONLY: a law firm or press summary; say so when citing")
    for kd in item.get("key_dates", []):
        d = parse_date(kd.get("date"))
        if d and d < today:
            flags.append(f"DATE PASSED: {kd['label']} ({kd['date']})")
    if item.get("superseded_by"):
        flags.append(f"SUPERSEDED by {item['superseded_by']}; prefer the newer item")
    return flags


def search(index, question, section=None, badge=None, since=None, tag=None,
           k=5, today=None, include_superseded=False, min_score=0.5):
    today = today or date.today()
    q = tokenize(question)
    results = []
    for it in index["items"]:
        if section and it["section"] != section:
            continue
        if badge and it["badge"] != badge:
            continue
        if tag and tag not in it.get("tags", []):
            continue
        d = item_date(it)
        if since and d and d < since:
            continue
        if it.get("superseded_by") and not include_superseded:
            continue
        rel = bm25(q, it, index["stats"])
        if rel < min_score:
            continue
        age = (today - d).days if d else 365
        recency = 0.5 + 0.5 * math.pow(0.5, max(age, 0) / HALF_LIFE_DAYS)
        results.append((rel * recency, rel, it))
    # Best score first; ties broken by newest date.
    results.sort(key=lambda r: (round(r[0], 3), item_date(r[2]) or date.min), reverse=True)
    return [(s, r, it, flags_for(it, today)) for s, r, it in results[:k]]


def fmt_date(it):
    if it.get("published"):
        return it["published"]
    return "no publish date" + (f" ({it['date_note']})" if it.get("date_note") else "")


def to_context(question, hits, today):
    lines = [f"QUESTION: {question}", f"ARCHIVE SEARCHED ON: {today.isoformat()}", ""]
    if not hits:
        lines.append("NO_MATCH: nothing in the AI Market Brief archive covers this question.")
        return "\n".join(lines)
    for i, (score, _rel, it, flags) in enumerate(hits, 1):
        lines.append(f"[{i}] {it['id']} | {SECTION_LABELS[it['section']]} | {BADGE_LABELS[it['badge']]} | "
                     f"week {it['week']} | published {fmt_date(it)} | read {it['retrieved_at']}")
        lines.append(f"Source org: {it['source_org']}")
        lines.append(f"Headline: {it['headline']}")
        lines.append(f"Summary: {it['summary']}")
        if it.get("key_dates"):
            lines.append("Key dates: " + "; ".join(f"{k['date']} {k['label']}" for k in it["key_dates"]))
        if it.get("details"):
            lines.append("Details: " + " ".join(it["details"]))
        lines.append(f"For the curriculum: {it['curriculum_note']}")
        for s in it["sources"]:
            lines.append(f"Cite: {s['title']} ({s['kind']}) {s['url']}")
        for f in flags:
            lines.append(f"Flag: {f}")
        lines.append("")
    return "\n".join(lines).rstrip()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("question")
    ap.add_argument("--index", default=os.path.join(PIPELINE_ROOT, "data", "index.json"))
    ap.add_argument("--section", choices=sorted(SECTION_LABELS))
    ap.add_argument("--badge", choices=sorted(BADGE_LABELS))
    ap.add_argument("--tag")
    ap.add_argument("--since", type=date.fromisoformat, help="only items dated on or after YYYY-MM-DD")
    ap.add_argument("--k", type=int, default=5)
    ap.add_argument("--min-score", type=float, default=0.5)
    ap.add_argument("--today", type=date.fromisoformat, help="pretend today is YYYY-MM-DD (for testing freshness)")
    ap.add_argument("--include-superseded", action="store_true")
    ap.add_argument("--format", choices=["context", "json"], default="context")
    args = ap.parse_args()

    with open(args.index, encoding="utf-8") as fh:
        index = json.load(fh)
    today = args.today or date.today()
    hits = search(index, args.question, args.section, args.badge, args.since, args.tag,
                  args.k, today, args.include_superseded, args.min_score)
    if args.format == "json":
        out = [{"score": round(s, 3), "id": it["id"], "headline": it["headline"],
                "published": it.get("published"), "sources": it["sources"], "flags": fl}
               for s, _r, it, fl in hits]
        print(json.dumps(out, indent=2, ensure_ascii=False))
    else:
        print(to_context(args.question, hits, today))


if __name__ == "__main__":
    main()
