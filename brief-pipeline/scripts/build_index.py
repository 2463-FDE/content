#!/usr/bin/env python3
"""Build data/index.json from every weekly file in data/briefs/.

Usage:
    python3 brief-pipeline/scripts/build_index.py [--briefs DIR] [--out FILE]
    (defaults: brief-pipeline/data/briefs and brief-pipeline/data/index.json)

What it does:
  1. Loads each <year>-w<NN>.json file and checks the fields retrieval depends on.
  2. Marks superseded items: when a later week has an item with the same topic_key,
     the earlier item gets superseded_by = <newer id>.
  3. Precomputes BM25 statistics (token counts per item, document frequency,
     average length) so query.py, or a browser page on GitHub Pages, can search
     a single static JSON file with no server.
Standard library only.
"""
import argparse
import glob
import json
import os
import sys
from collections import Counter
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import item_tokens  # noqa: E402

# Defaults resolve from this folder, so the script works from the repo root,
# from brief-pipeline/, or from a CI runner.
PIPELINE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REQUIRED = ["id", "week", "section", "badge", "source_org", "sources", "headline",
            "summary", "curriculum_note", "tags", "topic_key", "retrieved_at"]
SECTIONS = {"dev", "practice", "compliance"}
BADGES = {"act_now", "plan", "fyi", "background"}


def check_item(item, path, errors):
    for f in REQUIRED:
        if f not in item or item[f] in (None, "", []):
            errors.append(f"{path}: {item.get('id', '?')} is missing {f}")
    if item.get("section") not in SECTIONS:
        errors.append(f"{path}: {item.get('id')} has unknown section {item.get('section')!r}")
    if item.get("badge") not in BADGES:
        errors.append(f"{path}: {item.get('id')} has unknown badge {item.get('badge')!r}")
    for s in item.get("sources", []):
        if not str(s.get("url", "")).startswith("https://"):
            errors.append(f"{path}: {item.get('id')} has a source without an https url")
        if s.get("kind") not in ("primary", "secondary"):
            errors.append(f"{path}: {item.get('id')} has a source without kind primary/secondary")
    for f in ("published", "retrieved_at"):
        v = item.get(f)
        if v:
            try:
                date.fromisoformat(v)
            except ValueError:
                errors.append(f"{path}: {item.get('id')} has a bad {f} date {v!r}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--briefs", default=os.path.join(PIPELINE_ROOT, "data", "briefs"))
    ap.add_argument("--out", default=os.path.join(PIPELINE_ROOT, "data", "index.json"))
    args = ap.parse_args()

    files = sorted(glob.glob(os.path.join(args.briefs, "*.json")))
    if not files:
        sys.exit(f"No weekly files found in {args.briefs}")

    items, weeks, errors, seen = [], [], [], set()
    for path in files:
        with open(path, encoding="utf-8") as fh:
            doc = json.load(fh)
        weeks.append({"week": doc.get("week"), "covers": doc.get("covers"),
                      "published_page": doc.get("published_page"), "file": os.path.basename(path)})
        for item in doc.get("items", []):
            check_item(item, path, errors)
            if item.get("id") in seen:
                errors.append(f"{path}: duplicate id {item.get('id')}")
            seen.add(item.get("id"))
            item = dict(item)
            item["issue_page"] = doc.get("published_page")
            items.append(item)

    if errors:
        print("Index not built. Fix these first:", file=sys.stderr)
        for e in errors:
            print("  - " + e, file=sys.stderr)
        sys.exit(1)

    # Supersession: newest week per topic_key wins.
    by_topic = {}
    for it in items:
        by_topic.setdefault(it["topic_key"], []).append(it)
    for group in by_topic.values():
        group.sort(key=lambda x: (x["week"], x["id"]))
        newest = group[-1]
        for older in group[:-1]:
            if older["week"] < newest["week"]:
                older["superseded_by"] = newest["id"]

    # BM25 statistics.
    df = Counter()
    for it in items:
        tf = Counter(item_tokens(it))
        it["_tf"] = dict(tf)
        it["_len"] = sum(tf.values())
        df.update(tf.keys())
    avgdl = sum(it["_len"] for it in items) / len(items)

    weeks.sort(key=lambda w: w["week"] or "", reverse=True)
    items.sort(key=lambda x: (x["week"], x.get("published") or ""), reverse=True)
    index = {
        "built_at": date.today().isoformat(),
        "weeks": weeks,
        "stats": {"n": len(items), "avgdl": avgdl, "df": dict(df)},
        "items": items,
    }
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(index, fh, ensure_ascii=False, indent=1)
    sup = sum(1 for it in items if it.get("superseded_by"))
    print(f"Indexed {len(items)} items from {len(files)} week(s) into {os.path.relpath(args.out)} ({sup} superseded).")


if __name__ == "__main__":
    main()
