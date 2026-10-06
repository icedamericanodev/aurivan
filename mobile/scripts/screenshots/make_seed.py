#!/usr/bin/env python3
"""Build demo learner data for screenshots: ~200 answers, mistakes, a streak,
an exam date 38 days out. Written as localStorage entries (web build)."""
import json, random, sys, time
from pathlib import Path

GEN = Path(__file__).resolve().parents[2] / "src/content/generated/cisa"
random.seed(7)
now = int(time.time() * 1000); day = 86400000
dk = lambda ms: time.strftime("%Y-%m-%d", time.localtime(ms / 1000))
answers, mistakes, review = {}, {}, {}
for dn, rate in {1: .82, 2: .74, 3: .61, 4: .70, 5: .66}.items():
    for q in random.sample(json.loads((GEN / f"d{dn}.json").read_text()), 40):
        ok = random.random() < rate; t = now - random.randint(0, 9) * day
        answers[q["id"]] = {"attempts": 1, "correctCount": int(ok), "lastCorrect": ok, "lastAt": t}
        if not ok:
            m = {"picked": next(l for l in q["options"] if l != q["correct"]), "at": t}
            slip = random.choice(["priority", "priority", "role", "tech-first", None])
            if slip: m["slip"] = slip
            mistakes[q["id"]] = m
            review[q["id"]] = {"box": 1, "dueAt": now - 3600000, "lastSeen": t, "reps": 1}
days = [dk(now - i * day) for i in (6, 5, 4, 2, 1, 0)]
progress = {"state": {"byCert": {"cisa": {"answers": answers, "review": review, "bookmarks": [], "mocks": [],
            "lessonsDone": ["cisa-l-d1-charter"], "mistakes": mistakes, "gameBest": {"trap": 7, "sprint": 14}}},
            "streak": {"current": 6, "best": 9, "lastDay": days[-1], "restDay": dk(now - 3 * day), "recentDays": days},
            "today": {"day": days[-1], "answered": 12}}, "version": 1}
theme = sys.argv[2] if len(sys.argv) > 2 else "dark"
settings = {"state": {"onboarded": True, "activeCertId": "cisa", "examDates": {"cisa": dk(now + 38 * day)},
            "theme": theme, "shuffleOptions": True, "dailyGoal": 20,
            "reminder": {"enabled": False, "hour": 19, "minute": 0}}, "version": 1}
# An in-progress practice session on exam-style v2 questions (unshuffled for clarity).
# SHOT_QUESTIONS=d2_010,d2_045 picks the sample questions (default: Domain 1 samples).
import os
ids = [i for i in os.environ.get("SHOT_QUESTIONS", "d1_010,d1_008,d1_053").split(",") if i]
session = {"state": {"active": {"id": "demo", "mode": "practice", "certId": "cisa", "title": "Practice · IS Audit",
           "questionIds": ids, "perms": {i: ["A", "B", "C", "D"] for i in ids}, "index": 0, "responses": {},
           "flagged": [], "startedAt": now}}, "version": 1}
# The shoot script answers each sample correctly, so it needs the keys.
bank = {q["id"]: q for d in range(1, 6) for q in json.loads((GEN / f"d{d}.json").read_text())}
shot_keys = ",".join(bank[i]["correct"] for i in ids)
Path(sys.argv[1]).write_text(json.dumps({"__shotKeys": shot_keys,
                                         "aurivan.progress.v1": json.dumps(progress),
                                         "aurivan.settings.v1": json.dumps(settings),
                                         "aurivan.session.v1": json.dumps(session)}))
