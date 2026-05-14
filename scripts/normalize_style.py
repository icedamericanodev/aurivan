#!/usr/bin/env python3
"""
Style normalizer: makes all question-bank text match ISACA/PocketPrep professional register.

Applies to data/originals/d{1..5}.json → then re-run originals_to_domain.py.

Changes made:
  1. Em dashes (—) → contextually-appropriate punctuation (colon, period, or semicolon)
  2. En dashes (–) → hyphen in numeric ranges, semicolon elsewhere
  3. Contractions → expanded forms (it's → it is, don't → do not, etc.)

Fields processed: question, options A-D, correct_explanation, wrong_explanations,
                  tips, scenario_context, key_concept, pre_read.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / "data" / "originals"

# ── CONTRACTION MAP ──────────────────────────────────────────────────────────
# Longest / most-specific first to avoid partial matches.
CONTRACTIONS = [
    (r"\bwouldn't\b", "would not"),
    (r"\bcouldn't\b", "could not"),
    (r"\bshouldn't\b", "should not"),
    (r"\bwasn't\b",   "was not"),
    (r"\bweren't\b",  "were not"),
    (r"\bhadn't\b",   "had not"),
    (r"\bhasn't\b",   "has not"),
    (r"\bhaven't\b",  "have not"),
    (r"\bdoesn't\b",  "does not"),
    (r"\bdidn't\b",   "did not"),
    (r"\bisn't\b",    "is not"),
    (r"\baren't\b",   "are not"),
    (r"\bdon't\b",    "do not"),
    (r"\bwon't\b",    "will not"),
    (r"\bcan't\b",    "cannot"),
    (r"\bit's\b",     "it is"),
    (r"\bthat's\b",   "that is"),
    (r"\bwhat's\b",   "what is"),
    (r"\bwho's\b",    "who is"),
    (r"\bhe's\b",     "he is"),
    (r"\bshe's\b",    "she is"),
    (r"\bthere's\b",  "there is"),
    (r"\bhere's\b",   "here is"),
    (r"\bthey're\b",  "they are"),
    (r"\bwe're\b",    "we are"),
    (r"\byou're\b",   "you are"),
    (r"\bI'm\b",      "I am"),
    (r"\bthey've\b",  "they have"),
    (r"\bwe've\b",    "we have"),
    (r"\byou've\b",   "you have"),
    (r"\bI've\b",     "I have"),
    (r"\bthey'd\b",   "they would"),
    (r"\bwe'd\b",     "we would"),
    (r"\byou'd\b",    "you would"),
    (r"\bI'd\b",      "I would"),
    (r"\bhe'd\b",     "he would"),
    (r"\bshe'd\b",    "she would"),
    (r"\blet's\b",    "let us"),
]

_CONTRACTION_PATS = [(re.compile(p, re.IGNORECASE), r) for p, r in CONTRACTIONS]

def fix_contractions(text: str) -> str:
    for pat, rep in _CONTRACTION_PATS:
        def _sub(m, rep=rep):
            # Preserve sentence-initial capitalisation of the first word
            if m.group(0)[0].isupper():
                return rep[0].upper() + rep[1:]
            return rep
        text = pat.sub(_sub, text)
    return text


# ── EM DASH REPLACEMENT ──────────────────────────────────────────────────────
# Pronouns / demonstratives that typically start a new explanatory sentence
# when they follow an em dash.
_NEW_SENTENCE_STARTERS = re.compile(
    r"^(it is|that is|this is|there is|these are|they are|"
    r"it was|that was|this was|there was|they were|"
    r"it will|that will|this will|they will|"
    r"it does|that does|this does|they do|"
    r"it cannot|it can|that can)\b",
    re.IGNORECASE,
)

# True appositive: — content — where content is ≤70 chars, no period / ! / ?
# After contraction fix, replace both dashes with parentheses.
_TRUE_APPOSITIVE = re.compile(r'—([^—.!?]{5,70})—')

def fix_paired_appositives(text: str) -> str:
    """Replace true paired em-dash appositives with parentheses."""
    def _sub(m):
        inner = m.group(1).strip()
        return f'({inner})'
    return _TRUE_APPOSITIVE.sub(_sub, text)


def _replace_one_dash(before: str, after: str) -> str:
    """Return the correct punctuation to replace ' — ' given context."""
    before = before.rstrip()
    after  = after.lstrip()

    # Rule 1: Trap is A/B/C/D — → colon
    if re.search(r'\bTrap[s]?\s+(?:is|are)\s+[A-D]\b', before, re.IGNORECASE):
        return before + ': ' + after

    # Rule 2: Option A/B/C/D — → colon
    if re.search(r'\bOption[s]?\s+[A-D]\b', before, re.IGNORECASE):
        return before + ': ' + after

    # Rule 3: followed by opening quote / bracket → colon (explanatory)
    if after and after[0] in ('"', "'", '(', '[', ''', ''', '"', '"'):
        return before + ': ' + after

    # Rule 4: followed by "it is / that is / this is / they are …" → period (new sentence)
    if _NEW_SENTENCE_STARTERS.match(after):
        cap = after[0].upper() + after[1:]
        return before + '. ' + cap

    # Rule 5: followed by Uppercase letter → period (new sentence)
    if after and after[0].isupper():
        return before + '. ' + after

    # Rule 6: all other lowercase continuations → semicolon
    return before + '; ' + after


def fix_em_dashes(text: str) -> str:
    """Replace all em dashes one by one (left-to-right) using context rules."""
    while '—' in text:
        idx = text.find('—')
        before = text[:idx]
        after  = text[idx + 1:]
        text = _replace_one_dash(before, after)
        # Safety: if somehow we re-introduce a dash, break
        if before + after == text:
            break
    return text


def fix_en_dashes(text: str) -> str:
    """En dashes in numeric ranges → hyphen; elsewhere → semicolon."""
    text = re.sub(r'(\d)\s*–\s*(\d)', r'\1-\2', text)  # 2020–2025 → 2020-2025
    text = text.replace('–', '; ')
    return text


def normalize(text: str) -> str:
    """Full normalization pass on a single string."""
    if not text:
        return text
    # Fix contractions FIRST so em-dash context-detection sees expanded forms
    text = fix_contractions(text)
    # Handle paired appositives (— content —) before single-dash rules
    text = fix_paired_appositives(text)
    text = fix_em_dashes(text)
    text = fix_en_dashes(text)
    return text


# ── FIELDS TO PROCESS ────────────────────────────────────────────────────────
_STR_FIELDS = ['question', 'correct_explanation', 'key_concept', 'pre_read',
               'scenario_context', 'subtopic']

def normalize_question(q: dict) -> dict:
    for f in _STR_FIELDS:
        if f in q and q[f]:
            q[f] = normalize(q[f])
    for letter in 'ABCD':
        if letter in q.get('options', {}):
            q['options'][letter] = normalize(q['options'][letter])
    if 'wrong_explanations' in q:
        for letter, txt in q['wrong_explanations'].items():
            q['wrong_explanations'][letter] = normalize(txt)
    if 'tips' in q:
        q['tips'] = [normalize(t) for t in q['tips']]
    return q


def main():
    domains = [1, 2, 3, 4, 5]
    if len(sys.argv) > 1:
        domains = [int(x) for x in sys.argv[1:]]

    total_changed = 0
    for d in domains:
        path = ORIGINALS / f"d{d}.json"
        data = json.load(open(path, encoding='utf-8'))
        changed = 0
        for q in data['questions']:
            original = json.dumps(q, ensure_ascii=False)
            normalize_question(q)
            if json.dumps(q, ensure_ascii=False) != original:
                changed += 1
        json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print(f"D{d}: {changed}/{len(data['questions'])} questions modified")
        total_changed += changed

    print(f"\nTotal: {total_changed} questions modified across {len(domains)} domain(s)")
    print("Next: python3 scripts/originals_to_domain.py")


if __name__ == '__main__':
    main()
