// v0.27: the match is its highlights. Before, every panel of a half was played — 18 of them, in a row,
// including the goal kicks and the square passes in midfield. Now only the moments are played where a goal
// can come from, the way a Sportschau shows a Kreisklasse match: a highlight opens at a hot situation (an
// attack, a counter, a corner, a free kick near the box, their back line wobbling), runs as panels while the
// ball stays hot, and ends when the danger is gone or the ball is in the net. Between two highlights the
// clock jumps a few minutes, and a gap (types.ts `Gap`) says what happened off camera. No goal ever falls
// off camera: nothing is rolled between highlights, the football only exists in them.
// Pure: match.ts calls in here for where a highlight opens, whether it goes on, and what the gap says.

import { AFTER_GOAL, EARLY, GAP_LINES, LATE, TO_WHISTLE } from './data/gaps';
import { isActive } from './form';
import { nextRandom, pickWeighted } from './rng';
import { at } from './sim';
import type { MatchState, Player, Pos, Scene, Side } from './types';
import { HOME } from './voice';

export const H = {
  gap: [4, 12] as [number, number],    // minutes between two highlights
  maxPanels: 5,                        // a highlight is cut after this many panels, hot or not
  end: { 1: 45, 2: 90 } as Record<1 | 2, number>,
  /** How often a half gets a Nachspielzeit highlight: the first half, and the second when it is close. */
  stoppage: { 1: 0.3, 2: 0.45, close: 0.85 },
  lines: [1, 3] as [number, number],   // lines of what happened in a gap
};

const other = (s: Side): Side => (s === 'A' ? 'B' : 'A');

/** The minute as the clock at the Vereinsheim says it: 46 in the first half is 45+1. */
export function minuteLabel(minute: number, half: 1 | 2): string {
  const end = H.end[half];
  if (minute === 0 || (half === 2 && minute === 45)) return 'Anpfiff';
  return minute > end ? `${end}+${minute - end}'` : `${minute}'`;
}

// ---- Does it go on ----------------------------------------------------------

/** Scenes that are always the moment: the ball is where a goal comes from, or something is going on. */
const ALWAYS = new Set(['shot', 'header', 'through_on_goal', 'penalty', 'corner', 'cross', 'counter']);

/**
 * Is the ball still somewhere a goal can come from? A chance, a counter, a drama, anything in the box, and
 * open play, a throw-in or a free kick in the last forty percent of the pitch. The keeper with the ball, a
 * goal kick, a kick-off and anything in midfield or deeper is not: the highlight is over.
 */
export function hot(scene: Scene): boolean {
  if (ALWAYS.has(scene.type) || scene.tags.includes('drama') || scene.tags.includes('box')) return true;
  if (scene.type === 'play' || scene.type === 'duel' || scene.type === 'throwin' || scene.type === 'freekick') return scene.pos.x >= 0.6;
  return false;
}

// ---- Where the next one opens ------------------------------------------------

/**
 * A highlight's first panel, seen from the side it is *for* (`S`): the scene type, whose ball it is (`ball`:
 * S, or the other side when S is the one pressing), where, and the headline. The headline names the team.
 */
interface Opener {
  weight: number;
  type: string;
  ball: 'S' | 'O';
  pos: (r1: number, r2: number) => Pos;
  title: (s: string, o: string) => string;
}

const wingY = (r: number) => (r < 0.5 ? 0.08 + r * 0.1 : 0.82 + (r - 0.5) * 0.2);

const OPENERS: Opener[] = [
  { weight: 24, type: 'play', ball: 'S', pos: (a, b) => at(0.62 + a * 0.18, 0.25 + b * 0.5), title: s => `${s} greift an` },
  { weight: 14, type: 'duel', ball: 'S', pos: (a, b) => at(0.64 + a * 0.18, wingY(b)), title: s => `${s} über außen` },
  { weight: 12, type: 'counter', ball: 'S', pos: (a, b) => at(0.42 + a * 0.16, 0.2 + b * 0.6), title: s => `Konter ${s}` },
  { weight: 9, type: 'freekick', ball: 'S', pos: (a, b) => at(0.72 + a * 0.1, 0.3 + b * 0.4), title: s => `Freistoß für ${s}` },
  { weight: 9, type: 'corner', ball: 'S', pos: (_, b) => at(1, b < 0.5 ? 0 : 1), title: s => `Ecke für ${s}` },
  { weight: 5, type: 'throwin', ball: 'S', pos: (a, b) => at(0.78 + a * 0.14, b < 0.5 ? 0 : 1), title: s => `Einwurf ${s}, ganz vorne` },
  // their back line wobbles: the ball is theirs, deep, and S is the one who can profit
  { weight: 5, type: 'keeperball', ball: 'O', pos: () => at(0.06, 0.5), title: (s, o) => `${s} läuft ${o} hoch an` },
  { weight: 5, type: 'play', ball: 'O', pos: (a, b) => at(0.08 + a * 0.1, 0.2 + b * 0.6), title: (_, o) => `Wackeln hinten bei ${o}` },
];

/**
 * Whose highlight is next. Even, leaned by the form — fresher legs and higher heads get more of the ball —
 * and late in the second half towards the side that is behind, which throws everything forward.
 */
function pickSide(state: MatchState, minute: number, rng: number): { side: Side; rng: number } {
  const a = state.teams.A.gauges, b = state.teams.B.gauges;
  let pA = 0.5;
  if (isActive('puste')) pA += 0.25 * (a.puste - b.puste);
  if (isActive('moral')) pA += 0.2 * (a.moral - b.moral);
  const diff = state.score.A - state.score.B;
  if (state.half === 2 && minute >= 70 && diff !== 0) pA += diff < 0 ? 0.08 : -0.08;
  pA = Math.min(0.7, Math.max(0.3, pA));
  const r = nextRandom(rng);
  return { side: r.value < pA ? 'A' : 'B', rng: r.state };
}

export interface Opening { type: string; side: Side; pos: Pos; title: string; note?: string }

/** The next highlight's first panel: whose it is, what kind of moment, where. */
export function opening(state: MatchState, minute: number, rng: number): { open: Opening; rng: number } {
  const ps = pickSide(state, minute, rng); rng = ps.rng;
  const w = pickWeighted(OPENERS.map(o => o.weight), rng); rng = w.state;
  const o = OPENERS[w.index] as Opener;
  const r1 = nextRandom(rng); const r2 = nextRandom(r1.state); rng = r2.state;
  const s = state.teams[ps.side].short, them = state.teams[other(ps.side)].short;
  return {
    open: { type: o.type, side: o.ball === 'S' ? ps.side : other(ps.side), pos: o.pos(r1.value, r2.value), title: o.title(s, them) },
    rng,
  };
}

/**
 * Nachspielzeit. In the first half an ordinary highlight with the ref looking at his watch; at the end of the
 * match (v0.25's last attack) a corner or a free kick at the box for the side that is behind — at a draw for
 * whichever side the dice like.
 */
export function stoppageOpening(state: MatchState, minute: number, rng: number): { open: Opening; rng: number } {
  if (state.half === 1) {
    const o = opening(state, minute, rng);
    const l = nextRandom(o.rng);
    return { open: { ...o.open, note: STOPPAGE[Math.floor(l.value * STOPPAGE.length)] as string }, rng: l.state };
  }
  const diff = state.score.A - state.score.B;
  const r0 = nextRandom(rng); const r1 = nextRandom(r0.state); const r2 = nextRandom(r1.state); rng = r2.state;
  const side: Side = diff === 0 ? (r0.value < 0.5 ? 'A' : 'B') : diff < 0 ? 'A' : 'B';
  const corner = r1.value < 0.5;
  const short = state.teams[side].short;
  const note = diff === 0
    ? `Letzte Minute. Keiner will das Unentschieden. ${short} kriegt noch ${corner ? 'eine Ecke' : 'einen Freistoß'}.`
    : `Letzte Minute. ${short} wirft alles nach vorne, sogar der Zeugwart steht an der Linie. ${corner ? 'Ecke' : 'Freistoß'}.`;
  return {
    open: {
      type: corner ? 'corner' : 'freekick', side,
      pos: corner ? at(1, r2.value < 0.5 ? 0 : 1) : at(0.8, 0.38 + r2.value * 0.24),
      title: corner ? `Letzte Ecke für ${short}` : `Letzter Freistoß für ${short}`, note,
    },
    rng,
  };
}

/** Said over a first-half Nachspielzeit highlight. */
const STOPPAGE = [
  'Nachspielzeit. Der Schiri schaut auf die Uhr und lässt laufen.',
  'Nachspielzeit. Der Schiri hat die Pfeife schon im Mund. Noch nicht.',
  'Nachspielzeit. Die Bierbank pfeift, der Schiri noch nicht.',
];

// ---- What happened off camera -------------------------------------------------

const pickOf = <T>(xs: T[], rng: number): { item: T; rng: number } => {
  const r = nextRandom(rng);
  return { item: xs[Math.floor(r.value * xs.length)] as T, rng: r.state };
};

/**
 * A few lines of what the match looked like between `from` and `to`: after a goal, first what the goal did;
 * then the Kreisklasse, early lines at the start and tired ones at the end; and before a whistle, the whistle.
 * The same line never twice in a match (`said` holds what was used).
 */
export function gapLines(
  state: MatchState, from: number, to: number, goal: Side | null, whistle: 'halftime' | 'end' | null, said: Set<string>, rng: number,
): { lines: string[]; rng: number } {
  const out: string[] = [];
  const men = (side: Side) => state.teams[side].roster.filter(p => p.role !== 'keeper');
  const keeper = (side: Side) => state.teams[side].roster.find(p => p.role === 'keeper') as Player;
  const fill = (text: string): string => text.replace(/\{(a|b|ta|tb)\}/g, (_, k: string) => {
    if (k === 'ta') return keeper('A').short;
    if (k === 'tb') return keeper('B').short;
    const r = nextRandom(rng); rng = r.state;
    const pool = men(k === 'a' ? 'A' : 'B');
    return (pool[Math.floor(r.value * pool.length)] as Player).short;
  });
  // one filler per picked template, and a man named twice in one line is the same man
  const say = (pool: string[]) => {
    const fresh = pool.filter(l => !said.has(l));
    if (!fresh.length) return;
    const p = pickOf(fresh, rng); rng = p.rng;
    said.add(p.item);
    const names = new Map<string, string>();
    out.push(p.item.replace(/\{(a|b)\}/g, m => names.get(m) ?? (names.set(m, fill(m)), names.get(m) as string)).replace(/\{(ta|tb)\}/g, m => fill(m)));
  };
  if (goal) say(AFTER_GOAL[goal === HOME ? 'us' : 'them']);
  const minutes = to - from;
  const r = nextRandom(rng); rng = r.state;
  const want = Math.min(H.lines[1], Math.max(H.lines[0], Math.round(minutes / 4 + r.value)));
  while (out.length < want) {
    const before = out.length;
    const pool = from < 15 && out.length === 0 ? EARLY : state.half === 2 && to >= 75 && out.length === 0 ? LATE : GAP_LINES;
    say(pool);
    if (out.length === before) say(GAP_LINES);
    if (out.length === before) break;
  }
  if (whistle) { const w = pickOf(TO_WHISTLE[whistle], rng); rng = w.rng; out.push(w.item); }
  return { lines: out, rng };
}
