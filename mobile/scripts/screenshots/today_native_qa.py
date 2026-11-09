#!/usr/bin/env python3
"""Synthetic Today fixtures and actual Android screenshots, isolated AVD only.

Requires an already running KaiSipTodayQA AVD and debuggable development APK.
Never point this at a learner's phone. No production code or debug routes used.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = 'com.kaisip.app'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--serial', default='emulator-5556')
parser.add_argument('--port', default='8085')
parser.add_argument('--fixture', choices=['first', 'returning'])
parser.add_argument('--theme', choices=['light', 'dark'], default='light')
parser.add_argument('--font-scale', type=float, default=1)
parser.add_argument('--capture', type=Path)
parser.add_argument('--expect', default='Today', help='Required accessibility text before accepting a screenshot')
args = parser.parse_args()

def adb(*parts, **kwargs):
    return subprocess.run(['adb', '-s', args.serial, *parts], check=True, timeout=30, **kwargs)

name = adb('emu', 'avd', 'name', capture_output=True, text=True).stdout.splitlines()[0].strip()
if name != 'KaiSipTodayQA':
    raise SystemExit('Refusing to touch any device except the isolated KaiSipTodayQA AVD.')

if args.fixture:
    timezone = adb('shell', 'getprop', 'persist.sys.timezone', capture_output=True, text=True).stdout.strip()
    os.environ['TZ'] = timezone
    time.tzset()
    today = dt.date.today().isoformat()
    with tempfile.TemporaryDirectory(prefix='kaisip-today-fixture-') as temp:
        folder = Path(temp)
        seed_file = folder / 'seed.json'
        subprocess.run(['python3', str(ROOT / 'scripts/screenshots/make_seed.py'), str(seed_file), args.theme], check=True)
        seed = json.loads(seed_file.read_text())
        seed = {k: json.loads(v) for k, v in seed.items() if not k.startswith('__')}
        settings = seed['aurivan.settings.v1']['state']
        settings.update(displayName='Alex', fitPrompt='answered', familiarity='some', dailyMinutes=20, motion='reduced')
        cp = seed['aurivan.progress.v1']['state']['byCert']['cisa']
        if args.fixture == 'first':
            cp.update(answers={}, review={}, mistakes={}, lessonsDone=[], gameBest={}, gameRecent={})
            seed['aurivan.progress.v1']['state']['streak'] = {'current': 0, 'best': 0, 'recentDays': []}
            seed['aurivan.progress.v1']['state']['today'] = {'day': today, 'answered': 0}
            settings['examDates'] = {}
        seed['aurivan.session.v1'] = {'state': {'active': None}, 'version': 1}
        seed['aurivan.seen.v1'] = {'state': {'tester': {'since': today}, 'nameAsk': 'shown',
            'reminderAsk': {'first': 'later', 'second': True, 'newLearner': True}}, 'version': 1}
        database = folder / 'RKStorage'
        con = sqlite3.connect(database)
        con.execute('CREATE TABLE android_metadata (locale TEXT)')
        con.execute('INSERT INTO android_metadata VALUES (?)', ('en_US',))
        con.execute('CREATE TABLE catalystLocalStorage (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
        con.executemany('INSERT INTO catalystLocalStorage VALUES (?,?)', [(k, json.dumps(v)) for k,v in seed.items()])
        con.execute('PRAGMA user_version=1')
        con.commit()
        con.close()
        adb('shell', 'am', 'force-stop', PACKAGE)
        adb('push', str(database), '/data/local/tmp/today-RKStorage', stdout=subprocess.DEVNULL)
        adb('shell', 'run-as', PACKAGE, 'cp', '/data/local/tmp/today-RKStorage', 'databases/RKStorage')
        adb('shell', 'run-as', PACKAGE, 'rm', '-f', 'databases/RKStorage-journal', 'databases/RKStorage-wal', 'databases/RKStorage-shm')
    adb('shell', 'settings', 'put', 'system', 'font_scale', str(args.font_scale))
    adb('reverse', f'tcp:{args.port}', f'tcp:{args.port}', stdout=subprocess.DEVNULL)
    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d',
        f'kaisip://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A{args.port}', PACKAGE,
        stdout=subprocess.DEVNULL)
    # Fonts and the dev bundle can finish later than native launch; never label
    # the splash screen as a successful Today screenshot.
    for attempt in range(8):
        time.sleep(2)
        adb('shell', 'uiautomator', 'dump', '/sdcard/today-qa.xml', stdout=subprocess.DEVNULL)
        tree = adb('exec-out', 'cat', '/sdcard/today-qa.xml', capture_output=True, text=True).stdout
        if 'content-desc="Today"' in tree:
            break
    else:
        raise SystemExit('Today did not become visible; no screenshot accepted.')

if args.capture:
    args.capture.parent.mkdir(parents=True, exist_ok=True)
    adb('shell', 'uiautomator', 'dump', '/sdcard/today-qa.xml', stdout=subprocess.DEVNULL)
    with args.capture.with_suffix('.xml').open('wb') as output:
        adb('exec-out', 'cat', '/sdcard/today-qa.xml', stdout=output)
    tree = args.capture.with_suffix('.xml').read_text()
    if args.expect not in tree:
        raise SystemExit(f'Required screen text {args.expect!r} absent; screenshot rejected.')
    with args.capture.open('wb') as output:
        adb('exec-out', 'screencap', '-p', stdout=output)
    print(args.capture)
