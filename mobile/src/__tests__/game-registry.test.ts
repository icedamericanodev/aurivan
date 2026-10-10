/**
 * The game registry: one source of truth for game names, taglines, round
 * sizes and honest lengths, read by Play, the game screens, Today's plan and
 * the Mistake journal.
 */
import { getAllQuestions } from '../content/loader';
import { itemMinutes } from '../engine/dayPlan';
import { GAME_ORDER, GAMES, gameInfo, gameMinutes, gameTitle, isPlayable, roundMinutes } from '../engine/games/registry';
import { MINUTES_PER_QUESTION } from '../engine/pace';
import { todaysPlan } from '../engine/planner';
import { PATTERN_COPY } from '../engine/slipCoach';

const bank = getAllQuestions('cisa');

describe('game registry', () => {
  it('keeps the saved-progress ids forever', () => {
    expect(GAME_ORDER).toEqual(['trap', 'sprint', 'priority']);
    for (const id of GAME_ORDER) expect(GAMES[id].id).toBe(id);
  });

  it('uses the new names and taglines', () => {
    expect(GAMES.trap.name).toBe('Snare Spotter');
    expect(GAMES.trap.tagline).toBe('Find the answer built to fool you, then the best one.');
    expect(GAMES.sprint.name).toBe('Sure Footing');
    expect(GAMES.sprint.tagline).toBe('How sure are you, really? Honest confidence scores best.');
    expect(GAMES.priority.name).toBe('Signpost');
    expect(GAMES.priority.tagline).toBe('Read the word that decides which true answer wins.');
  });

  it('never uses betting words in any game copy', () => {
    for (const g of Object.values(GAMES)) {
      expect(`${g.name} ${g.tagline} ${g.skill}`).not.toMatch(/\b(bet|bets|betting|stake|stakes|wager|gamble)\b/i);
    }
  });

  it('works the length out from the round size, at the normal study pace', () => {
    for (const g of Object.values(GAMES)) {
      expect(g.minutes).toBe(Math.max(1, Math.round(g.size * MINUTES_PER_QUESTION)));
      // The old "about two minutes" claim was not honest for 5+ full exam items.
      expect(g.minutes).toBeGreaterThan(2);
    }
    expect(roundMinutes(5)).toBe(6);
    expect(roundMinutes(0)).toBe(1);
  });

  it('offers every game for CISA, and hides a game whose pool is too small', () => {
    for (const id of GAME_ORDER) expect(isPlayable(id, bank)).toBe(true);
    expect(isPlayable('trap', bank.slice(0, 3))).toBe(false);
    expect(isPlayable('sprint', [])).toBe(false);
  });

  it('handles an unknown saved game id without crashing', () => {
    expect(gameInfo('nope')).toBeUndefined();
    expect(gameMinutes('nope')).toBeGreaterThan(0);
    expect(gameMinutes('sprint')).toBe(GAMES.sprint.minutes);
  });
});

describe('renames reach every touch-point', () => {
  it("Today's planner labels a game with its registry name and length", () => {
    const plan = todaysPlan({ stage: 'practice', dueReviews: 0, dailyGoal: 20, daysLeft: 40, examQuestions: 150 });
    const game = plan.find((p) => p.kind === 'game');
    expect(game).toEqual({ kind: 'game', gameId: 'trap', label: `Snare Spotter · ${GAMES.trap.minutes} min` });
    const ready = todaysPlan({ stage: 'ready', dueReviews: 0, dailyGoal: 20, daysLeft: 40, examQuestions: 150 });
    expect(ready[0]).toMatchObject({ gameId: 'sprint', label: expect.stringContaining('Sure Footing') });
  });

  it('a plan saved before the rename shows the new name and the honest length', () => {
    const old = { kind: 'game' as const, gameId: 'trap' as const, label: 'Trap Spotter · 2 min' };
    expect(gameTitle(old.gameId, old.label)).toBe('Snare Spotter');
    expect(itemMinutes(old)).toBe(GAMES.trap.minutes);
    expect(gameTitle('priority', 'Priority Lens · read like the examiner')).toBe('Signpost');
    // A game id from a newer app version still gets a readable title.
    expect(gameTitle('future', 'Root or Rumor · 5 min')).toBe('Root or Rumor');
  });

  it('Today never plans a game this exam cannot play', () => {
    const base = { dueReviews: 0, dailyGoal: 20, daysLeft: 40, examQuestions: 150 };
    for (const stage of ['practice', 'ready', 'examDay'] as const) {
      const none = todaysPlan({ ...base, stage, playable: () => false });
      expect(none.some((p) => p.kind === 'game')).toBe(false);
    }
    // Only the playable game is kept.
    const ready = todaysPlan({ ...base, stage: 'ready', playable: (id) => id !== 'sprint' });
    expect(ready.some((p) => p.kind === 'game')).toBe(false);
    expect(todaysPlan({ ...base, stage: 'practice', playable: (id) => id === 'trap' }).some((p) => p.kind === 'game')).toBe(true);
  });

  it("the slip coach's drills are all real games", () => {
    for (const copy of Object.values(PATTERN_COPY)) {
      if (copy.game) expect(gameInfo(copy.game)).toBeDefined();
    }
  });
});
