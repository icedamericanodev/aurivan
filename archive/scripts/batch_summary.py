#!/usr/bin/env python3
"""
Batch summary reporter for CISA practice question batches.

Built after the D4-closing pedagogy review surfaced three recurring D5
risks that aren't caught by existing mechanical checkers:

  1. "Plus-list" answer pattern formulaic across analysis questions
     (correct option has many "+" delimiters; distractors don't) — makes
     answers pattern-matchable without engaging the scenario
  2. Industry concentration in scenario_context (e.g., too many
     financial-services scenarios in a row) reduces realism diversity
  3. Citation reuse rate trending down — every batch adding 50+ new
     citations suggests over-specificity rather than reuse

This tool runs after Stage-2.5 mechanical checkers and surfaces these
patterns. It doesn't enforce anything — the human author decides whether
to act on the signals.

Usage:
    python3 scripts/batch_summary.py --batch dN_NNN..dN_NNN
    python3 scripts/batch_summary.py --batch dN_NNN..dN_NNN --strict
        (exit 1 if plus-list pattern exceeds threshold)
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).parent.parent
ORIGINALS = ROOT / "data" / "originals"
LIBRARY = ORIGINALS / "_framework_library.md"

# Industry keywords (lowercase substrings) → sector buckets
# Used to detect scenario_context industry concentration
INDUSTRY_KEYWORDS = {
    "financial": ["bank", "broker-dealer", "credit union", "FINRA", "FDIC",
                  "FRB", "OCC", "FFIEC", "SEC ", "SOX", "PCI DSS",
                  "fintech", "brokerage", "financial services",
                  "in assets", "wealth management", "ACH"],
    "healthcare": ["hospital", "clinical", "HIPAA", "patient",
                   "EHR", "medical", "pharmaceutical", "FDA",
                   "biotech", "healthcare", "physician",
                   "HHS", "OCR", "PHI"],
    "retail": ["retail", "e-commerce", "store", "POS",
               "customer-facing", "consumer", "merchant",
               "online shopping"],
    "manufacturing": ["manufacturer", "manufacturing", "OT",
                      "SCADA", "industrial control", "factory",
                      "production line", "plant", "ICS"],
    "technology": ["SaaS", "software", "PaaS", "IaaS", "cloud-native",
                   "tech company", "ARR", "developer",
                   "API gateway", "microservice", "B2B SaaS"],
    "energy_utility": ["utility", "power grid", "energy",
                       "natural gas", "electric", "water utility"],
    "insurance": ["insurance", "policyholder", "claims processing",
                  "NAIC", "insurer", "carrier"],
    "education": ["university", "school", "student", "academic"],
    "government": ["federal", "state agency", "government",
                   "CISA", "FBI", "DOJ", "OFAC", "federal contractor",
                   "CMMC"],
    "hospitality": ["hotel", "hospitality", "guest"],
    "logistics": ["logistics", "supply chain", "distribution center",
                  "warehouse", "shipping"],
    "media": ["streaming", "media", "publisher", "advertising"],
}


def classify_industry(scenario_text: str) -> list[str]:
    """Return all matching industry buckets for a scenario.

    Short tokens (≤3 chars) are matched as whole words to avoid false
    positives (e.g., "OT" matching inside "got"/"not"/"lot"; "ICS"
    matching inside "tactics"/"physics"; "FBI" matching inside
    "FBI agent" or similar)."""
    if not scenario_text:
        return []
    text = scenario_text.lower()
    buckets = []
    for industry, keywords in INDUSTRY_KEYWORDS.items():
        for kw in keywords:
            kw_lower = kw.lower()
            if len(kw_lower) <= 4 or kw_lower.isalpha() and len(kw_lower) <= 5:
                # Word-boundary match for short keywords
                if re.search(rf"\b{re.escape(kw_lower)}\b", text):
                    buckets.append(industry)
                    break
            else:
                # Substring match for longer phrases
                if kw_lower in text:
                    buckets.append(industry)
                    break
    return buckets if buckets else ["unclassified"]


def count_plus_delimiters(option_text: str) -> int:
    """Count '+' delimiters that separate list elements (not other uses of '+')."""
    if not option_text:
        return 0
    # Count " + " (space-plus-space) which is the list-delimiter pattern
    return option_text.count(" + ")


def parse_batch(spec: str):
    m = re.match(r"d(\d+)_(\d+)\.\.d(\d+)_(\d+)", spec)
    if not m:
        return None
    d1, s, d2, e = m.groups()
    if d1 != d2:
        return None
    return int(d1), int(s), int(e)


def load_library_citations() -> set:
    """Load existing citations from the framework library."""
    if not LIBRARY.exists():
        return set()
    text = LIBRARY.read_text()
    # Each citation is a line starting with "- "
    cites = set()
    for line in text.split("\n"):
        line = line.strip()
        if line.startswith("- "):
            cites.add(line[2:].strip())
    return cites


def extract_question_citations(q: dict) -> set:
    """Extract individual citation strings from framework_ref."""
    fr = q.get("framework_ref", "")
    if not fr:
        return set()
    # Citations are separated by ";"
    return {c.strip() for c in fr.split(";") if c.strip()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", required=True, help="dN_NNN..dN_NNN range")
    ap.add_argument("--strict", action="store_true",
                    help="Exit 1 if plus-list ratio exceeds threshold")
    ap.add_argument("--plus-list-threshold", type=float, default=0.70,
                    help="Fraction of analysis questions allowed to have plus-list pattern (default 0.70)")
    args = ap.parse_args()

    batch = parse_batch(args.batch)
    if not batch:
        print(f"ERROR: invalid --batch: {args.batch}", file=sys.stderr)
        sys.exit(2)
    d, s, e = batch

    all_q = json.loads((ORIGINALS / f"d{d}.json").read_text()).get("questions", [])
    questions = []
    for q in all_q:
        qid = q.get("id", "")
        if "_" not in qid:
            continue
        num = int(qid.split("_")[1])
        if s <= num <= e:
            questions.append(q)

    if not questions:
        print(f"No questions in batch {args.batch}")
        return

    print(f"=== Batch Summary: {args.batch} ({len(questions)} questions) ===\n")

    # --- 1. Position-letter distribution ---
    pos = Counter(q.get("correct", "?") for q in questions)
    print("Position-letter distribution:")
    for letter in "ABCD":
        c = pos.get(letter, 0)
        bar = "█" * c
        print(f"  {letter}: {c:2d} {bar}")
    if min(pos.get(L, 0) for L in "ABCD") >= 1 and max(pos.values()) - min(pos.values()) <= 1:
        print("  ✓ Well-distributed")
    elif max(pos.values()) >= len(questions) * 0.4:
        print(f"  ⚠ Imbalanced (one letter >={int(len(questions)*0.4)} of {len(questions)})")
    print()

    # --- 2. Option-length stats ---
    correct_lens = []
    distractor_lens = []
    plus_delim_correct = []
    plus_delim_distractor_max = []
    for q in questions:
        correct = q.get("correct", "")
        options = q.get("options", {})
        if correct not in options:
            continue
        correct_text = options[correct]
        correct_wc = len(correct_text.split())
        correct_lens.append(correct_wc)
        plus_delim_correct.append(count_plus_delimiters(correct_text))
        distractor_wcs = []
        distractor_pluses = []
        for k, v in options.items():
            if k == correct:
                continue
            distractor_wcs.append(len(v.split()))
            distractor_pluses.append(count_plus_delimiters(v))
        distractor_lens.extend(distractor_wcs)
        plus_delim_distractor_max.append(max(distractor_pluses) if distractor_pluses else 0)

    def stats(label, values):
        if not values:
            return
        print(f"  {label}: min={min(values)}, avg={sum(values)/len(values):.1f}, max={max(values)}")

    print("Option-length stats:")
    stats("Correct options (w)", correct_lens)
    stats("Distractor options (w)", distractor_lens)
    print()

    # --- 3. Plus-list pattern detection ---
    pl_threshold = 4  # 4+ "+" delimiters = strong plus-list pattern
    analysis_qs = [q for q in questions if q.get("difficulty") == "analysis"]
    if analysis_qs:
        analysis_plus_high = sum(
            1 for q in analysis_qs
            if count_plus_delimiters(q["options"].get(q["correct"], "")) >= pl_threshold
        )
        ratio = analysis_plus_high / len(analysis_qs)
        print(f"Plus-list pattern (analysis tier):")
        print(f"  {analysis_plus_high}/{len(analysis_qs)} analysis questions have correct option "
              f"with {pl_threshold}+ '+' delimiters ({ratio:.0%})")
        if ratio > args.plus_list_threshold:
            print(f"  ⚠ EXCEEDS threshold {args.plus_list_threshold:.0%} — pattern-matching risk")
            print(f"    Consider making 1-2 analysis questions have single-focus correct answers")
            print(f"    (where situation calls for SURGICAL ACTION not broad coordination)")
        else:
            print(f"  ✓ Within tolerance (threshold {args.plus_list_threshold:.0%})")
        print()

        # Also: how often does the plus-list pattern correlate with correctness?
        # (if every plus-list option is correct, the pattern is exposed)
        non_plus_correct = sum(
            1 for q in analysis_qs
            if count_plus_delimiters(q["options"].get(q["correct"], "")) < 2
        )
        if non_plus_correct == 0 and analysis_plus_high > 0:
            print(f"  ⚠ Zero analysis questions have single-focus correct answers; "
                  "pattern fully exposed")

    # --- 4. Industry/sector breakdown ---
    sector_counts = Counter()
    for q in questions:
        scenario = q.get("scenario_context", "")
        if scenario:
            for sector in classify_industry(scenario):
                sector_counts[sector] += 1
    if sector_counts:
        print("Scenario-context industry breakdown:")
        total_scenarios = sum(1 for q in questions if q.get("scenario_context"))
        for sector, c in sector_counts.most_common():
            bar = "█" * c
            print(f"  {sector:18s} {c:2d} {bar}")
        # Concentration warning
        top_sector, top_count = sector_counts.most_common(1)[0]
        if total_scenarios > 0 and top_count / total_scenarios > 0.4:
            print(f"  ⚠ '{top_sector}' is {top_count}/{total_scenarios} "
                  f"({top_count/total_scenarios:.0%}) — consider diversifying")
        print()

    # --- 5. Citation reuse rate ---
    library = load_library_citations()
    batch_citations = set()
    for q in questions:
        batch_citations |= extract_question_citations(q)
    new_citations = batch_citations - library
    reused_citations = batch_citations & library
    print("Citation reuse:")
    print(f"  Library size: {len(library)} canonical citations")
    print(f"  Citations in this batch: {len(batch_citations)} unique")
    print(f"  Reused: {len(reused_citations)}")
    print(f"  New (would add to library): {len(new_citations)}")
    if batch_citations:
        reuse_rate = len(reused_citations) / len(batch_citations)
        print(f"  Reuse rate: {reuse_rate:.0%}")
        if reuse_rate < 0.5:
            print(f"  ⚠ Low reuse rate (<50%) — consider whether new citations "
                  "are genuinely needed or could be replaced by existing")
    print()

    # --- Exit code ---
    if args.strict:
        if analysis_qs and analysis_plus_high / len(analysis_qs) > args.plus_list_threshold:
            sys.exit(1)


if __name__ == "__main__":
    main()
