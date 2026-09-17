// Simple bench policies for headless runs and the AI opponent.
// Value is the net goal expectation of the attack from the attacker's view: my goal minus theirs
// via a counter. Consequences (red cards, a banned coach) get a flat price per remaining attack.
// Substitutions are ignored — good enough for the sim.

import { K } from './data';
import { computeOdds, other, playableCards } from './match';
import type { Consequence, MatchState, OddsRow } from './types';
import { GOAL, ORIGIN, OVER } from './types';

/** Net goal expectation of a situation on planned odds (no cards, no specials), attacker's view. */
function baseValue(state: MatchState, situationId: string, depth = 0): number {
  if (situationId === GOAL) return 1;
  if (situationId === OVER || depth > 8) return 0;
  const odds = computeOdds({ ...state, situationId, playerName: '' }, null);
  return odds.rows.reduce((s, r) => s + (r.pct / 100) * rowValue(state, situationId, r, depth + 1), 0);
}

function rowValue(state: MatchState, situationId: string, r: OddsRow, depth: number): number {
  const next = r.next === ORIGIN ? situationId : r.next;
  if (r.turnover) return -baseValue({ ...state, attacker: other(state.attacker) }, next, depth);
  return baseValue(state, next, depth);
}

/** What a lasting consequence is worth, in goals, to the attacker of the current situation. Rough. */
function consequenceValue(state: MatchState, cons: Consequence[] | undefined): number {
  if (!cons?.length) return 0;
  const left = state.attacksTotal - state.attackIndex;
  let v = 0;
  for (const c of cons) {
    const price = c.kind === 'red_card' ? K.aiRedCard : c.kind === 'coach_banned' ? K.aiCoachBan : K.aiInjury;
    const team = c.kind === 'injury' ? 'att' : c.team;
    v += (team === 'att' ? -1 : 1) * price * left;
  }
  return v;
}

/** Net expectation for the current situation if the acting side plays `cardId` (null = let them play), attacker's view. */
export function expectedNet(state: MatchState, cardId: string | null): number {
  const odds = computeOdds(state, cardId);
  return odds.rows.reduce((s, r) => s + (r.pct / 100) * (rowValue(state, state.situationId, r, 1) + consequenceValue(state, r.then)), 0);
}

/** Greedy: play the card that moves the net expectation most in your favour; let them play if none helps. */
export function greedy(state: MatchState): string | null {
  const sign = state.turn === 'att' ? 1 : -1;
  let best: string | null = null;
  const v0 = sign * expectedNet(state, null);
  let bestV = v0;
  for (const c of playableCards(state)) {
    const v = sign * expectedNet(state, c.id);
    if (v > bestV + K.aiThreshold) { best = c.id; bestV = v; }
  }
  return best;
}

export function randomPolicy(state: MatchState, r: number): string | null {
  const cards = playableCards(state);
  if (!cards.length) return null;
  return cards[Math.floor(r * cards.length)]!.id;
}
