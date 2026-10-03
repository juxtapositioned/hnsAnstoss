// The Heilige mode: the collaborator's game idea (docs/IDEAS.md, "Spielidee"), next to the v0.27 match and
// sharing nothing with its sim. A match is a row of highlights; each one is an attack by one side and has
// up to two situations:
//
// 1. Mittelfeld. The attackers pick a lane (links, Mitte, rechts) and may invoke an Angriff saint. The
//    defenders press one lane — the other two count as dropped back — and may invoke a Verteidigung saint.
//    Pressed the lane the attack came through: the ball is stolen and the defenders are in front of goal
//    (a counter, straight to 2); nobody got to invoke anything, so the saints go back to the hand.
//    Otherwise xA decides whether the attack becomes a chance. Through the middle is the short way
//    (+midBonus); over a wing while the press is on the other wing there is all the room in the world
//    (+farBonus).
// 2. Sturm. Both invoke a saint, xG decides whether it goes in.
//
// Saints add their number straight onto xA / xG (data/saints.ts). Each bench may invoke `calls` saints a
// half, so a saint is a choice, not a reflex. The rival decides his saint first and shows it (rivalCall);
// you answer. Now and then the world's pile turns a card over by itself (Randomness, Fußballgott) and
// pushes the situation one way or the other.
// Pure: every function takes the game and returns a new one; the rng state is part of it.

import { saintById, SAINTS } from './data/saints';
import type { Saint } from './data/saints';
import { EARLY, GAP_LINES, LATE } from './data/gaps';
import { ROSTER_A, ROSTER_B } from './data/rosters';
import { nextRandom, shuffle } from './rng';
import type { Player, Side } from './types';

/** A lane on the pitch, named from SVH's view (SVH attacks to the right): 0 links, 1 Mitte, 2 rechts. */
export type Lane = 0 | 1 | 2;
export const LANES: Lane[] = [0, 1, 2];
export const LANE_NAME: Record<Lane, string> = { 0: 'links', 1: 'durch die Mitte', 2: 'rechts' };
export const LANE_SHORT: Record<Lane, string> = { 0: 'Links', 1: 'Mitte', 2: 'Rechts' };

/** First guesses, not tuned (fun before balance). */
export const HZ = {
  perHalf: 7,          // highlights a half
  baseXA: 0.5,         // a midfield attack that is not stolen becomes a chance this often
  baseXG: 0.35,        // a chance goes in this often
  counterXG: 0.4,      // a counter after a steal: fewer men back
  midBonus: 0.1,       // through the middle and not stolen: the short way to goal
  farBonus: 0.15,      // over a wing while they press the other wing: nobody near
  eventChance: 0.3,    // the world's pile turns a card in this share of situations
  hand: 3,             // saints in hand, per kind
  calls: 4,            // saints each bench may invoke a half
  reserve: 2,          // the rival keeps this many calls for the shots
  repeatSide: 0.35,    // the side that had the last highlight has the next one this often
  floor: 0.03, ceil: 0.95,
};

export type Kind = 'angriff' | 'verteidigung';
export interface Bench {
  hand: Record<Kind, string[]>;
  pile: Record<Kind, string[]>;
  discard: Record<Kind, string[]>;
}

export interface Tweak { id: string; delta: number }   // a saint and what it did to the number, signed for the attackers
export interface Bonus { label: string; v: number }     // what the lane itself added

export interface MidStep {
  kind: 'mid';
  att: Side;
  lane: Lane;
  press: Lane;
  /** The saints that were called. On a steal they go back to the hand unspent. */
  cards: Record<Side, string | null>;
  carrier: string; presser: string; striker: string;
  event: Tweak | null;
  bonus: Bonus | null;
  stolen: boolean;
  xa: number;          // after saints, lane and event; 0 when stolen
  roll: number;
  chance: boolean;
  lines: string[];
}

export interface ShotStep {
  kind: 'shot';
  att: Side;
  counter: boolean;
  cards: Record<Side, string | null>;
  striker: string; keeper: string;
  event: Tweak | null;
  xg: number;
  roll: number;
  goal: boolean;
  save: boolean;       // not in: the keeper had it (else it went wide)
  lines: string[];
}

export type Step = MidStep | ShotStep;

export interface Highlight {
  minute: number;
  half: 1 | 2;
  side: Side;          // who attacks when it opens
  gap: string[];       // what happened off camera before it
  /** A rival who changed his mind since the last highlight says so here (Mood). */
  shout: { side: Side; text: string } | null;
  steps: Step[];
  /** What comes next inside this highlight, or null when it is over. */
  next: { kind: 'mid' | 'shot'; att: Side; counter: boolean } | null;
}

/**
 * How a bench reacts to being read. Only der Schleifer uses it: burned twice through the middle, he goes
 * over the wings for a while; run round twice while pressing the middle, he presses the wings for a while.
 */
export interface Mood {
  burned: number;      // own attacks through the middle that were stolen
  beaten: number;      // attacks that got through on a wing while this side pressed the middle
  wingAttacks: number; // attacks left that go over a wing
  wingPress: number;   // presses left that go on a wing
  shout: string | null;
  fresh: boolean;      // shouted since the last highlight opened
}

export interface Game {
  rng: number;
  rival: string;
  score: Record<Side, number>;
  half: 1 | 2;
  minutes: number[];   // the minutes this half's highlights open at
  index: number;       // which of them is on (-1 before the first)
  bench: Record<Side, Bench>;
  calls: Record<Side, number>;            // saints each bench may still invoke this half
  events: string[];
  log: Highlight[];
  lastLane: Record<Side, Lane | null>;    // the lane each side last attacked through
  lastThrough: Record<Side, Lane | null>; // the lane each side last got through (not stolen)
  mood: Record<Side, Mood>;
  used: string[];                         // line templates already said this match
  over: boolean;
}

export const other = (s: Side): Side => (s === 'A' ? 'B' : 'A');
export const ROSTER: Record<Side, Player[]> = { A: ROSTER_A, B: ROSTER_B };
export const SHORT: Record<Side, string> = { A: 'SVH', B: 'RWK' };

const clamp = (x: number) => Math.min(HZ.ceil, Math.max(HZ.floor, x));

// ---- rng helpers over the game ------------------------------------------------

function roll(g: Game): number {
  const r = nextRandom(g.rng);
  g.rng = r.state;
  return r.value;
}
function pick<T>(g: Game, items: readonly T[]): T {
  return items[Math.floor(roll(g) * items.length)] as T;
}
function shuffled<T>(g: Game, items: T[]): T[] {
  const r = shuffle(items, g.rng);
  g.rng = r.state;
  return r.items;
}
const clone = (g: Game): Game => structuredClone(g);

// ---- setup ---------------------------------------------------------------------

const ofGroup = (k: Saint['group']) => SAINTS.filter(x => x.group === k).map(x => x.id);

/** A bench with its own saints: the two benches never share one. */
function newBench(g: Game, angriff: string[], verteidigung: string[]): Bench {
  const b: Bench = { hand: { angriff: [], verteidigung: [] }, pile: { angriff, verteidigung }, discard: { angriff: [], verteidigung: [] } };
  for (const k of ['angriff', 'verteidigung'] as Kind[]) while (b.hand[k].length < HZ.hand) b.hand[k].push(draw(g, b, k) as string);
  return b;
}

function draw(g: Game, b: Bench, k: Kind): string | null {
  if (b.pile[k].length === 0) { b.pile[k] = shuffled(g, b.discard[k]); b.discard[k] = []; }
  return b.pile[k].shift() ?? null;
}

/** The minutes of a half's highlights, at least three apart so two never run into each other. */
function halfMinutes(g: Game, half: 1 | 2): number[] {
  const [lo, hi] = half === 1 ? [3, 44] : [48, 89];
  const out: number[] = [];
  while (out.length < HZ.perHalf) {
    const m = lo + Math.floor(roll(g) * (hi - lo + 1));
    if (out.every(x => Math.abs(x - m) >= 3)) out.push(m);
  }
  return out.sort((a, b) => a - b);
}

const calm = (): Mood => ({ burned: 0, beaten: 0, wingAttacks: 0, wingPress: 0, shout: null, fresh: false });

export function newGame(seed: number, rival: string): Game {
  const g: Game = {
    rng: seed * 7919 + 13, rival, score: { A: 0, B: 0 }, half: 1, minutes: [], index: -1,
    bench: {} as Record<Side, Bench>, calls: { A: HZ.calls, B: HZ.calls }, events: [], log: [],
    lastLane: { A: null, B: null }, lastThrough: { A: null, B: null }, mood: { A: calm(), B: calm() }, used: [], over: false,
  };
  const att = shuffled(g, ofGroup('angriff'));
  const def = shuffled(g, ofGroup('verteidigung'));
  const deal = (xs: string[], i: number) => xs.filter((_, j) => j % 2 === i);
  g.bench = { A: newBench(g, deal(att, 0), deal(def, 0)), B: newBench(g, deal(att, 1), deal(def, 1)) };
  g.events = shuffled(g, [...ofGroup('zufall'), ...ofGroup('gott')]);
  g.minutes = halfMinutes(g, 1);
  return g;
}

// ---- what fits -----------------------------------------------------------------

/** The number a saint moves in this situation: xA in the midfield, xG in front of goal. */
export const valueIn = (id: string, at: 'mid' | 'shot'): number => {
  const x = saintById.get(id);
  return x ? (at === 'mid' ? x.xa : x.xg) : 0;
};
export const kindFor = (attacking: boolean): Kind => (attacking ? 'angriff' : 'verteidigung');
/** A saint can only be invoked where his number exists (an xG-only saint waits for the shot). */
export const fits = (id: string, at: 'mid' | 'shot'): boolean => valueIn(id, at) !== 0;

/** The saint as called, if the bench may call him here: in the hand, fitting, and a call left this half. */
function callable(g: Game, side: Side, id: string | null, at: 'mid' | 'shot', k: Kind): string | null {
  return id && g.calls[side] > 0 && g.bench[side].hand[k].includes(id) && fits(id, at) ? id : null;
}

/** Spends a called saint: a call less, and the next saint takes his place in the hand (same slot). */
function spend(g: Game, side: Side, id: string | null, k: Kind): void {
  if (!id) return;
  const b = g.bench[side];
  const i = b.hand[k].indexOf(id);
  if (i < 0) return;
  const next = draw(g, b, k);
  if (next) b.hand[k][i] = next; else b.hand[k].splice(i, 1);
  b.discard[k].push(id);
  g.calls[side]--;
}

/** Maybe the world's pile turns a card. The first card that has a number here, coin flipped if it is a "+ & −" card. */
function worldEvent(g: Game, at: 'mid' | 'shot'): Tweak | null {
  if (roll(g) >= HZ.eventChance) return null;
  const i = g.events.findIndex(id => fits(id, at));
  if (i < 0) return null;
  const id = g.events.splice(i, 1)[0] as string;
  g.events.push(id);   // under the pile
  const x = saintById.get(id) as Saint;
  const v = valueIn(id, at);
  return { id, delta: x.coin ? (roll(g) < 0.5 ? v : -v) : v };
}

// ---- the highlight ---------------------------------------------------------------

/**
 * Opens the next highlight, or the second half, or ends the match. Whose attack it is: a coin leaned
 * against the side that had the last one, and towards the side that is behind from the 70th minute.
 */
export function openHighlight(game: Game): Game {
  const g = clone(game);
  if (g.index + 1 >= g.minutes.length) {
    if (g.half === 2) { g.over = true; return g; }
    g.half = 2; g.minutes = halfMinutes(g, 2); g.index = -1;
    g.calls = { A: HZ.calls, B: HZ.calls };
  }
  g.index++;
  const minute = g.minutes[g.index] as number;
  const prev = g.log[g.log.length - 1];
  let pA = prev ? (prev.side === 'A' ? HZ.repeatSide : 1 - HZ.repeatSide) : 0.5;
  const diff = g.score.A - g.score.B;
  if (minute >= 70 && diff !== 0) pA += diff < 0 ? 0.15 : -0.15;
  const side: Side = roll(g) < pA ? 'A' : 'B';
  let shout: Highlight['shout'] = null;
  for (const s of ['A', 'B'] as Side[]) if (g.mood[s].fresh && g.mood[s].shout) { shout = { side: s, text: g.mood[s].shout as string }; g.mood[s].fresh = false; }
  g.log.push({ minute, half: g.half, side, gap: gapLines(g, minute), shout, steps: [], next: { kind: 'mid', att: side, counter: false } });
  return g;
}

export const current = (g: Game): Highlight | null => g.log[g.log.length - 1] ?? null;

/** The attackers' lane, or the lane the defenders press. */
export interface MidChoice { lane: Lane; card: string | null }

/** The midfield: the attackers' lane and saint against the defenders' press and saint. */
export function playMid(game: Game, att: MidChoice, def: MidChoice): Game {
  const g = clone(game);
  const hl = current(g) as Highlight;
  const a = hl.next?.att as Side;
  const d = other(a);
  const cards = { [a]: callable(g, a, att.card, 'mid', 'angriff'), [d]: callable(g, d, def.card, 'mid', 'verteidigung') } as Record<Side, string | null>;
  g.lastLane[a] = att.lane;
  const carrier = att.lane === 1 ? man(g, a, 'midfielder') : man(g, a, 'winger');
  const presser = man(g, d, att.lane === 1 ? 'midfielder' : 'defender');
  const striker = man(g, a, 'striker');
  const lines: string[] = [];
  lines.push(pickLine(g, LANE_LINES[att.lane], { c: carrier }));
  const stolen = att.lane === def.lane;
  moodAfter(g, a, d, att.lane, def.lane, stolen);
  if (stolen) {
    lines.push(pickLine(g, STEAL, { p: presser, c: carrier, T: SHORT[d] }));
    hl.steps.push({ kind: 'mid', att: a, lane: att.lane, press: def.lane, cards, carrier, presser, striker, event: null, bonus: null, stolen, xa: 0, roll: 0, chance: false, lines });
    hl.next = { kind: 'shot', att: d, counter: true };
    return g;
  }
  spend(g, a, cards[a], 'angriff');
  spend(g, d, cards[d], 'verteidigung');
  g.lastThrough[a] = att.lane;
  const bonus = laneBonus(att.lane, def.lane);
  lines.push(pickLine(g, bonus?.v === HZ.farBonus ? FAR : DROPPED, { T: SHORT[d], c: carrier, wo: LANE_NAME[def.lane] }));
  const event = worldEvent(g, 'mid');
  const xa = clamp(HZ.baseXA + valueIn(cards[a] ?? '', 'mid') + valueIn(cards[d] ?? '', 'mid') + (bonus?.v ?? 0) + (event?.delta ?? 0));
  const r = roll(g);
  const chance = r < xa;
  lines.push(pickLine(g, chance ? CHANCE : NOTHING, { c: carrier, s: striker, T: SHORT[a], D: SHORT[d] }));
  hl.steps.push({ kind: 'mid', att: a, lane: att.lane, press: def.lane, cards, carrier, presser, striker, event, bonus, stolen, xa, roll: r, chance, lines });
  hl.next = chance ? { kind: 'shot', att: a, counter: false } : null;
  return g;
}

/** What the lane adds when the attack is not stolen: the middle is the short way, the far wing is empty. */
export function laneBonus(lane: Lane, press: Lane): Bonus | null {
  if (lane === press) return null;
  if (lane === 1) return { label: 'Mitte', v: HZ.midBonus };
  if (Math.abs(lane - press) === 2) return { label: 'viel Platz', v: HZ.farBonus };
  return null;
}

/** In front of goal: both saints, then xG. */
export function playShot(game: Game, attCard: string | null, defCard: string | null): Game {
  const g = clone(game);
  const hl = current(g) as Highlight;
  const a = hl.next?.att as Side;
  const counter = hl.next?.counter ?? false;
  const d = other(a);
  const cards = { [a]: callable(g, a, attCard, 'shot', 'angriff'), [d]: callable(g, d, defCard, 'shot', 'verteidigung') } as Record<Side, string | null>;
  spend(g, a, cards[a], 'angriff');
  spend(g, d, cards[d], 'verteidigung');
  const prev = hl.steps[hl.steps.length - 1];
  const striker = counter ? man(g, a, roll(g) < 0.6 ? 'striker' : 'winger') : (prev?.kind === 'mid' ? prev.striker : man(g, a, 'striker'));
  const keeper = man(g, d, 'keeper');
  const event = worldEvent(g, 'shot');
  const xg = clamp((counter ? HZ.counterXG : HZ.baseXG) + valueIn(cards[a] ?? '', 'shot') + valueIn(cards[d] ?? '', 'shot') + (event?.delta ?? 0));
  const r = roll(g);
  const goal = r < xg;
  const save = !goal && roll(g) < 0.5;
  const lines = [pickLine(g, counter ? COUNTER : SHOT, { s: striker, k: keeper, T: SHORT[a] }), pickLine(g, goal ? GOAL : save ? SAVE : MISS, { s: striker, k: keeper })];
  if (goal) g.score[a]++;
  hl.steps.push({ kind: 'shot', att: a, counter, cards, striker, keeper, event, xg, roll: r, goal, save, lines });
  hl.next = null;
  return g;
}

// ---- the rival -----------------------------------------------------------------------

/** After a midfield: a bench that keeps getting read changes its mind (Mood), and says so. */
function moodAfter(g: Game, a: Side, d: Side, lane: Lane, press: Lane, stolen: boolean): void {
  const ma = g.mood[a], md = g.mood[d];
  if (stolen && lane === 1 && ma.wingAttacks === 0 && ++ma.burned >= 2) {
    ma.burned = 0; ma.wingAttacks = 3; ma.shout = 'Über außen, Herrgott! Durch die Mitte geht ja nix!'; ma.fresh = true;
  }
  if (!stolen && press === 1 && lane !== 1 && md.wingPress === 0 && ++md.beaten >= 2) {
    md.beaten = 0; md.wingPress = 3; md.shout = 'Raus auf die Flügel! Die laufen ja um uns rum!'; md.fresh = true;
  }
}

/** Whether a bench is in one of its moods right now (for the screen). */
export const moody = (g: Game, s: Side): boolean => g.mood[s].wingAttacks > 0 || g.mood[s].wingPress > 0;

const wing = (g: Game): Lane => (roll(g) < 0.5 ? 0 : 2);

/** How each rival reads the lanes (his tells, said on his bench). */
export const RIVAL_LANES: Record<string, { tell: string; attack: (g: Game, me: Side) => Lane; press: (g: Game, me: Side) => Lane }> = {
  schleifer: {
    tell: 'Will immer durch die Mitte. Und presst auch da. Bis es ihm zu bunt wird.',
    attack: (g, me) => {
      const m = g.mood[me];
      if (m.wingAttacks > 0) { m.wingAttacks--; return wing(g); }
      return roll(g) < 0.6 ? 1 : pick(g, LANES);
    },
    press: (g, me) => {
      const m = g.mood[me];
      if (m.wingPress > 0) { m.wingPress--; const last = g.lastThrough[other(me)]; return last !== null && last !== 1 ? last : wing(g); }
      return roll(g) < 0.6 ? 1 : pick(g, LANES);
    },
  },
  taktikfuchs: {
    tell: 'Greift nie zweimal über dieselbe Seite an. Presst da, wo du zuletzt durchgekommen bist.',
    attack: (g, me) => { const last = g.lastLane[me]; return last === null ? pick(g, LANES) : pick(g, LANES.filter(l => l !== last)); },
    press: (g, me) => { const last = g.lastThrough[other(me)]; return last !== null && roll(g) < 0.7 ? last : pick(g, LANES); },
  },
};

/**
 * The rival's saint, decided before you choose and shown to you: you answer him. In front of goal he
 * calls his biggest whenever he has a call left. In the midfield only a big one (0,5), and only while he
 * still has more than `reserve` calls, so he keeps some for the shots. No rng: the screen can ask again.
 */
export function rivalCall(g: Game, me: Side, at: 'mid' | 'shot', attacking: boolean): string | null {
  if (g.calls[me] <= 0) return null;
  const hand = g.bench[me].hand[kindFor(attacking)].filter(id => fits(id, at));
  if (!hand.length) return null;
  const score = (id: string) => Math.abs(valueIn(id, at)) - (at === 'mid' ? 0.5 * Math.abs(valueIn(id, 'shot')) : 0);
  const best = hand.reduce((b, id) => (score(id) > score(b) ? id : b));
  if (at === 'shot') return best;
  return g.calls[me] > HZ.reserve && Math.abs(valueIn(best, 'mid')) >= 0.5 ? best : null;
}

/** The rival's lane (where he attacks, or where he presses). Rolls, so it returns the game too. */
export function rivalLane(game: Game, me: Side, attacking: boolean): { game: Game; lane: Lane } {
  const g = clone(game);
  const r = RIVAL_LANES[g.rival] ?? (RIVAL_LANES.schleifer as (typeof RIVAL_LANES)[string]);
  return { game: g, lane: attacking ? r.attack(g, me) : r.press(g, me) };
}

// ---- people and words ------------------------------------------------------------------

function man(g: Game, side: Side, role: Player['role']): string {
  const pool = ROSTER[side].filter(p => p.role === role);
  return (pool.length ? pick(g, pool) : pick(g, ROSTER[side])).short;
}

function fill(line: string, vars: Record<string, string>): string {
  return line.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}
/** A line from the list that has not been said this match yet; when all have, the list starts over. */
function pickLine(g: Game, lines: readonly string[], vars: Record<string, string>): string {
  let fresh = lines.filter(l => !g.used.includes(l));
  if (!fresh.length) { g.used = g.used.filter(l => !lines.includes(l)); fresh = [...lines]; }
  const l = pick(g, fresh);
  g.used.push(l);
  return fill(l, vars);
}

function gapLines(g: Game, minute: number): string[] {
  const pool = minute <= 15 ? [...GAP_LINES, ...EARLY] : minute >= 75 ? [...GAP_LINES, ...LATE] : GAP_LINES;
  const n = 1 + Math.floor(roll(g) * 2);
  const out: string[] = [];
  const role = () => pick(g, ['midfielder', 'winger', 'defender', 'striker'] as const);
  while (out.length < n) out.push(pickLine(g, pool, { a: man(g, 'A', role()), b: man(g, 'B', role()), ta: man(g, 'A', 'keeper'), tb: man(g, 'B', 'keeper') }));
  return out;
}

const LANE_LINES: Record<Lane, string[]> = {
  0: ['{c} zieht links an der Seitenlinie an.', '{c} nimmt den Ball links an, die Bierbank steht auf.', 'Über links, {c} hat Platz.', '{c} links, vorbei am Würstchenstand.'],
  1: ['{c} nimmt den Ball in der Mitte an und schaut hoch.', '{c} will durch die Mitte, mit dem Kopf voran.', 'Mitten durch, {c} marschiert.', '{c} geht durchs Zentrum, als wäre es seins.'],
  2: ['{c} geht rechts die Linie runter.', 'Über rechts, {c} kommt mit Tempo.', '{c} rechts am Zaun entlang, die Oma feuert an.', '{c} rechts, knapp an der Pfütze vorbei.'],
};
const STEAL = [
  '{p} hat genau da gewartet. Ball weg!',
  '{p} spitzelt {c} den Ball vom Fuß. Jetzt rennt {T}!',
  '{c} läuft {p} direkt in die Arme. Konter!',
  '{p} grätscht, und zwar den Ball. Alle sind überrascht, auch {p}.',
  '{p} stellt nur das Bein raus. {c} fällt drüber, der Ball bleibt bei {p}.',
];
const DROPPED = [
  '{T} presst {wo}, da ist keiner. {c} hat Luft.',
  '{T} rennt {wo} drauf, {c} ist ganz woanders.',
  '{T} lässt sich fallen, nur {wo} läuft einer an. Falsche Seite.',
  '{T} steht {wo} und wartet. {c} kommt nicht vorbei, sondern drumherum.',
];
const FAR = [
  '{T} presst {wo}. Ganz {wo}. {c} hat die halbe Wiese für sich.',
  '{T} rennt {wo} drauf, auf der anderen Seite. {c} winkt freundlich.',
  'Bei {c} ist weit und breit keiner. {T} steht {wo} und wundert sich.',
];
const CHANCE = [
  '{c} findet {s}, und der steht frei!',
  'Flanke von {c}, {s} läuft ein!',
  '{c} steckt durch, {s} ist durch!',
  '{c} legt quer, {s} nimmt ihn an. Sechzehner!',
  '{c} chippt den Ball über alle drüber. {s} ist da!',
];
const NOTHING = [
  'Der Pass von {c} ist zu lang. Abstoß.',
  '{c} verdribbelt sich an der Eckfahne.',
  'Der Ball versandet irgendwo vor dem Sechzehner.',
  '{s} steht im Abseits. Sagt jedenfalls der Linienrichter, und der ist von {D}.',
  '{c} flankt. Hinter das Tor. Hinter den Zaun.',
  '{c} will den Doppelpass. {s} will ihn nicht.',
];
const SHOT = ['{s} gegen {k}!', '{s} zieht ab!', '{s} hat nur noch {k} vor sich.', '{s} nimmt ihn direkt!'];
const COUNTER = ['Konter {T}! {s} läuft allein auf {k} zu.', '{T} kontert, drei gegen zwei, {s} hat ihn!', 'Und ab! {s} rennt, {k} kommt raus.', '{T} schaltet um, {s} ist auf und davon!'];
const GOAL = [
  'Rein das Ding! TOOOR!',
  '{k} liegt schon, der Ball ist drin. TOR!',
  'Flach ins Eck. {k} schaut hinterher. TOR!',
  'Nicht richtig getroffen. Drin ist er trotzdem. TOR!',
  'Unter die Latte. Die Bierbank fällt um. TOR!',
];
const SAVE = [
  '{k} kriegt ihn genau auf den Bauch. Er freut sich am meisten.',
  '{k} hält! Mit dem Gesicht, aber er hält.',
  '{k} fliegt und hat ihn. Der Zeugwart applaudiert.',
  '{k} bleibt einfach stehen. Der Ball kommt genau zu ihm.',
  '{k} lenkt ihn mit den Fingerspitzen um den Pfosten.',
];
const MISS = [
  'Drüber. Weit drüber. Ins Maisfeld.',
  'Pfosten! Der Ball springt raus, und keiner weiß wohin.',
  'Beim Schuss weggerutscht. Der Rasen war es.',
  'Knapp vorbei. Die Oma am Zaun hatte ihn schon drin.',
  'Latte! Das ganze Tor wackelt noch.',
];

/** "+0,5" / "−0,25", German decimals, for the numbers on the saints and in the reveal. */
export function num(x: number, sign = true): string {
  const s = String(+Math.abs(x).toFixed(2)).replace('.', ',');
  return sign ? (x < 0 ? `−${s}` : `+${s}`) : s;
}
