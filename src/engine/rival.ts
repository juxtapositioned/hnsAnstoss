// The AI coach on the other bench. A rival is a person with tells (DESIGN §3): a few fixed habits
// and one random streak, so a human can learn to read him. Pure: decide() takes the match state and
// an rng number and says whether the offered card goes down and *when* in the panel (0..1) — timing is a
// tell too. v0.26: like you, he brings three skills for each situation (his tells are among them:
// `signature`) and in a panel uses one of the three or none.

import { cardById } from './data/cards';
import { costOf, isActive } from './form';
import { nextRandom } from './rng';
import { usable } from './match';
import { talksFor } from './talks';
import type { TalkId, TalkOffer } from './talks';
import type { Card, MatchState, Side } from './types';

export type Tell =
  | { kind: 'always'; card: string; at: number }     // uses this skill whenever he can
  | { kind: 'never_first' }                          // never uses anything in the first panel of a highlight (v0.27; was: of a half)
  | { kind: 'never_in'; scene: string };             // never lays in this scene type

export interface Rival {
  id: string;
  name: string;              // "Schorsch Brandl"
  nick: string;              // "der Schleifer"
  text: string;              // one line on the bench, German
  tells: Tell[];
  playChance: number;        // the random streak: how often he says yes to anything else
  late: [number, number];    // when a random card goes down, as a fraction of the panel
  talks: TalkId[];           // v0.21: what he says at half-time, the first of these he can
}

export interface Decision {
  cardId: string | null;
  at: number;
  rng: number;
}

export const RIVALS: Rival[] = [
  {
    id: 'schleifer', name: 'Schorsch Brandl', nick: 'der Schleifer',
    text: 'Seit 1994 auf der Bank. Hält Technik für eine Ausrede.',
    tells: [
      { kind: 'always', card: 'umhauen', at: 0.15 },
      { kind: 'always', card: 'lang', at: 0.2 },
      { kind: 'always', card: 'pressing', at: 0.2 },
      { kind: 'always', card: 'direkt', at: 0.1 },
      { kind: 'always', card: 'anlaufen', at: 0.15 },
      { kind: 'never_first' },
    ],
    playChance: 0.85,
    late: [0.5, 0.9],
    talks: ['anschiss', 'donnerwetter', 'hinten_dicht', 'kiste'],
  },
  {
    id: 'taktikfuchs', name: 'Dr. Volker Reindl', nick: 'der Taktikfuchs',
    text: 'Hat ein Laptop auf der Bank. Es ist nicht an.',
    tells: [
      { kind: 'always', card: 'abseitsfalle', at: 0.9 },
      { kind: 'always', card: 'stellen', at: 0.85 },
      { kind: 'always', card: 'schwalbe', at: 0.9 },
      { kind: 'always', card: 'mauer', at: 0.8 },
      { kind: 'never_in', scene: 'kickoff' },
      { kind: 'never_in', scene: 'keeperball' },
    ],
    playChance: 0.7,
    late: [0.7, 0.95],
    talks: ['aufbauen', 'loben', 'hinten_dicht', 'lebensweisheit'],
  },
];

export const rivalById = new Map(RIVALS.map(r => [r.id, r]));

/** v0.26: the skills his habits are made of. His loadout is built around them, so the tells can show. */
export function signature(rival: Rival): string[] {
  return rival.tells.flatMap(t => (t.kind === 'always' ? [t.card] : []));
}

/**
 * Which of his usable skills the rival uses on the scene on screen, if any, and when. A tell fires on the
 * spot; otherwise his streak decides whether he says anything, and which of the others it is, late in the
 * panel.
 */
export function decide(state: MatchState, side: Side, rival: Rival, rng: number): Decision {
  const none = (r: number): Decision => ({ cardId: null, at: 0, rng: r });
  const can = usable(state, side);
  if (!can.length) return none(rng);
  for (const t of rival.tells) {
    if (t.kind === 'never_first' && state.inHl === 0) return none(rng);
    if (t.kind === 'never_in' && state.scene.type === t.scene) return none(rng);
  }
  for (const t of rival.tells) {
    if (t.kind === 'always' && can.includes(t.card)) return { cardId: t.card, at: t.at, rng };
  }
  // v0.22: a bench whose men are finished thinks twice before it makes them run
  const tired = isActive('puste') && state.teams[side].shown.puste === 'tief';
  const runs = (id: string) => (costOf(cardById.get(id) as Card).puste ?? 0) > 0;
  let r = nextRandom(rng); rng = r.state;
  const cardId = can[Math.floor(r.value * can.length)] as string;
  r = nextRandom(rng); rng = r.state;
  if (r.value > rival.playChance * (tired && runs(cardId) ? 0.5 : 1)) return none(rng);
  r = nextRandom(rng); rng = r.state;
  const at = rival.late[0] + r.value * (rival.late[1] - rival.late[0]);
  return { cardId, at, rng };
}

/** What the rival says in his Kabine: the first talk of his habit that the half gave him. */
export function rivalTalk(state: MatchState, side: Side, rival: Rival): TalkOffer | null {
  const offers = talksFor(state, side);
  for (const id of rival.talks) {
    const o = offers.find(x => x.talk === id);
    if (o) return o;
  }
  return offers[0] ?? null;
}
