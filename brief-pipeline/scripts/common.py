"""Shared text helpers for the brief index and query scripts. Standard library only."""
import re

STOPWORDS = set("""
a an and are as at be by can do does for from has have how i if in into is it its
of on or our should so than that the their them then there these this to was we
what when where which who why will with you your about any my me more most new
latest week weeks recent recently tell know need us
""".split())

SECTION_LABELS = {
    "dev": "Developer tools and models",
    "practice": "FDE practice and market",
    "compliance": "Compliance and governance",
}

BADGE_LABELS = {
    "act_now": "Act now",
    "plan": "Plan",
    "fyi": "FYI",
    "background": "Background",
}

_SPLIT = re.compile(r"[^a-z0-9]+")


def _norm(tok):
    # Very light plural folding so "deadlines" matches "deadline".
    if len(tok) > 4 and tok.endswith("ies"):
        return tok[:-3] + "y"
    if len(tok) > 3 and tok.endswith("s") and not tok.endswith("ss"):
        return tok[:-1]
    return tok


def tokenize(text):
    if not text:
        return []
    return [_norm(t) for t in _SPLIT.split(text.lower()) if t and t not in STOPWORDS]


def item_tokens(item):
    """Weighted bag of tokens: headline and tags count three times, source org twice."""
    toks = []
    toks += tokenize(item.get("headline", "")) * 3
    toks += tokenize(" ".join(t.replace("-", " ") for t in item.get("tags", []))) * 3
    toks += tokenize(item.get("source_org", "")) * 2
    toks += tokenize(item.get("summary", ""))
    toks += tokenize(item.get("curriculum_note", ""))
    toks += tokenize(" ".join(item.get("details", [])))
    toks += tokenize(" ".join(k.get("label", "") for k in item.get("key_dates", [])))
    toks += tokenize(SECTION_LABELS.get(item.get("section", ""), ""))
    return toks
