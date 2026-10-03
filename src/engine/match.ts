// The scenes engine. Pure: step(state, laid) → { state, panel }. No timers, no DOM.
// Resolution (DESIGN §2.3): a drama card forces the next panel (the defender's has the last word);
// otherwise the dice, tilted by the traits that fire in the picture and pulled by the shouts both
// benches laid. A laid card draws another, so the hand is always full.
// v0.13: a scene is a situation at a place. `makeScene` asks the scene type (sim.ts, or a drama in
// data/scenes.ts) what can happen *here*, and the panel carries that table; the ball's position goes on
// from row to row and is mirrored whenever it changes hands. v0.14: every scene is a ball action, a
// challenge or a set piece (`Situation`), and the same for the other bench mirrored; the piles are still
// the two of the ball.
// v0.11: a card is playable only where it moves this panel's dice (`moves`). There is no cheering
// fallback any more — a shout that has nothing to shout about here cannot be laid.
// v0.15: no hand. A deck is a few cards for each of the six slots (situation × with/without the ball;
// three in v0.15, every card that fits in the v0.16 playtest); a panel offers each bench the first card of
// its slot that does something here, and the bench says yes or no. Either way the offered card goes under
// its slot, so they take turns.
// v0.22: form (form.ts). Each bench has Puste, Moral and Gunst; they tilt the dice for the whole side, a
// laid card costs one of them (a card the bench cannot pay Gunst for is not offered), and every panel and
// the half-time talk (talks.ts) move them.
// v0.25, after a playtest ("the fun is where a village event, a trait and the outcome tell one joke; most
// of what is bad is those three not lining up"):
// - a laid card's picture carries into what happened (`Card.echo`), and a shout the men did not follow says
//   so in a line (`Card.miss`) — the same thing happening, told in the card's words, not a verdict stamp;
// - rows have more than one line, and the actor's trait picks it (`Row.by`); the man who beat his man is the
//   man on the ball in the next panel (`Row.carry`);
// - a defending card no longer just barely pulls: it closes the big chance and part of it becomes a small
//   one (`guard`, `Row.half`), and the panel says so (`Row.blocked`);
// - a card is only offered where its picture is in the table, never twice running, and at the kick-off only
//   the kick-off's own cards;
// - every line is said by whoever says it (voice.ts), and every place is named from SVH's side (sim.ts);
// - Nachspielzeit: a half does not end on a chance, and the match's last panel is a last attack.
// v0.26: no cards, no offer. Each bench brings three skills for each of its six situations (a `Loadout`,
// picked before kick-off, loadout.ts) and in a panel may use any one of the three of the situation it is in,
// or none. A skill that does nothing here, a once-skill already used, a second drama or one the god will not
// pay for lies grey (`whyNot`). The same skill can be used every time its situation comes up.
// v0.27: the match is its highlights (highlights.ts). There is no fixed number of panels a half any more:
// a highlight opens at a hot situation at some minute, `step` plays it on while the ball stays where a goal
// can come from, and when it cools down (or goes in) the clock jumps to the next one and `MatchState.gap`
// says what happened in between. Half-time and the final whistle come when the next highlight would be past
// 45 or 90 minutes — after, perhaps, one in Nachspielzeit (the v0.25 last attack lives there now).

import { cardById, MISS } from './data/cards';
import { sceneById, START_SCENE } from './data/scenes';
import { traitById } from './data/traits';
import { afterGap, afterPanel, affordable, F, formWeights, heard, move, pay, shifts, startLevels } from './form';
import { gapLines, H, hot, opening, stoppageOpening } from './highlights';
import { nextRandom, pickWeighted } from './rng';
import { at, mirror, placeName, SIM_SCENES } from './sim';
import { HOME, voice } from './voice';
import type {
  Card, CardEffect, CardSide, CastMember, Gap, Initiative, Laid, MatchState, Panel, Player, Pos, Row, RowPick, Scene, SceneType, Side, Slot, TeamSetup, TeamState, Trait,
} from './types';
import { GOAL } from './types';

export const K = {
  dramaPerMatch: 1,          // v0.19: drama cards a bench may lay in a match; after that it is only shown the rest
  banPanels: 3,              // how long a coach sent to the stands stays there
};

const SIM_TYPES = new Set(SIM_SCENES.map(t => t.id));

export const other = (s: Side): Side => (s === 'A' ? 'B' : 'A');
export const PILES: CardSide[] = ['ball', 'noball'];
const KICKOFF: Pos = { x: 0.5, y: 0.5 };

function typeOf(id: string): SceneType {
  const t = sceneById.get(id);
  if (!t) throw new Error(`unknown scene type ${id}`);
  return t;
}

function card(id: string): Card {
  const c = cardById.get(id);
  if (!c) throw new Error(`unknown card ${id}`);
  return c;
}

/** German label of a scene type id or GOAL. */
export function labelOf(next: string): string {
  return next === GOAL ? 'Tor' : sceneById.get(next)?.label ?? next;
}

// ---- Setup --------------------------------------------------------------

/** A bench at kick-off: its loadout as picked, fresh legs, nothing used yet. */
function teamOf(setup: TeamSetup): TeamState {
  return { ...structuredClone(setup), played: [], banned: 0, gauges: { ...F.start }, shown: startLevels() };
}

/** With the ball or without it, for this bench in this scene. */
export function pileFor(scene: Scene, side: Side): CardSide {
  return scene.side === side ? 'ball' : 'noball';
}

/** Which of its six situations a bench is in: this situation type, with the ball or without it. */
export function slotFor(scene: Scene, side: Side): Slot {
  return `${pileFor(scene, side)}:${scene.situation}`;
}

/**
 * v0.27: the match opens off camera. Anpfiff, the clock runs, and the first thing on screen is the first
 * highlight; `gap` says what the minutes before it looked like.
 */
export function newMatch(a: TeamSetup, b: TeamSetup, seed: number): MatchState {
  let rng = seed | 0;
  const teams = { A: teamOf(a), B: teamOf(b) };
  const scene = makeScene(START_SCENE, 'A', KICKOFF, teams, rng); rng = scene.rng;
  const s: MatchState = {
    teams, half: 1, minute: 0, hl: 0, title: 'Anpfiff', inHl: 0, stoppage: false, gap: null, offCamera: [],
    scene: scene.scene, score: { A: 0, B: 0 }, strip: [], rng, over: false,
  };
  cut(s, null);
  return s;
}


// ---- Cast ---------------------------------------------------------------

/**
 * Build the situation `type` at `pos` (the initiative side's frame): the scene type puts it where it
 * really is (a corner goes to the flag), says what can happen there, and the cast is filled from the
 * rosters. Exported for the headless runner's value tables.
 * v0.25: `keep` is the man who carried the ball here (he beat his man, he ran through): he fills the first
 * slot of the side with the ball, so the one who got past Kofi is the one who is through on goal.
 */
export function makeScene(
  type: string, side: Side, pos: Pos, teams: Record<Side, { roster: Player[] }>, rng: number, keep?: Player,
): { scene: Scene; rng: number } {
  const t = typeOf(type);
  const p = t.place ? t.place(pos) : at(pos.x, pos.y);
  const b = t.build(p);
  const cast: CastMember[] = [];
  const taken = new Set<string>();
  let kept = false;
  for (const slot of b.cast) {
    const team = slot.of === 'init' ? side : other(side);
    const roles = Array.isArray(slot.role) ? slot.role : [slot.role];
    const carried = keep && !kept && team === side && (keep.role !== 'keeper' || roles.includes('keeper'))
      && teams[team].roster.some(x => x.name === keep.name) ? keep : null;
    let player: Player;
    if (carried) { player = carried; kept = true; }
    else {
      let pool: Player[] = teams[team].roster.filter(p => roles.includes(p.role) && !taken.has(p.name));
      if (!pool.length) pool = teams[team].roster.filter(p => !taken.has(p.name));
      const r = nextRandom(rng); rng = r.state;
      player = pool[Math.floor(r.value * pool.length)] as Player;
    }
    taken.add(player.name);
    cast.push({ slot: slot.slot, side: team, player });
  }
  let prompt = b.prompt;
  if (Array.isArray(prompt)) {
    const r = nextRandom(rng); rng = r.state;
    prompt = prompt[Math.floor(r.value * prompt.length)] as string;
  }
  const raw = b.spot ?? { ...p, where: '' };
  const spot = { ...raw, where: placeName(type, raw, side, !!b.spot && !SIM_TYPES.has(type)) };
  return { scene: { type, side, pos: p, spot, label: b.label, prompt, rows: b.rows, tags: b.tags, situation: t.situation, cast }, rng };
}

/** The first outfield man of a side in the picture (the keeper only if he is alone): who a shout is aimed at. */
export function firstOf(scene: Scene, side: Side): CastMember | undefined {
  return scene.cast.find(m => m.side === side && m.player.role !== 'keeper') ?? scene.cast.find(m => m.side === side);
}

// ---- Triggers -----------------------------------------------------------

/** A tilt fires when its owner is in its slot in one of its scene types, and its row can happen here. */
function fires(t: Trait['tilts'][number], scene: Scene, member: CastMember): boolean {
  return t.scene.includes(scene.type) && t.slot === member.slot && scene.rows.some(r => r.id === t.row);
}

export interface Trigger { member: CastMember; trait: Trait }

/** The trigger line a trait shows for the man in this slot (v0.25: a fast defender does not "run away from his man"). */
export const firesLine = (t: Trigger) => t.trait.firesAs?.[t.member.slot] ?? t.trait.fires;

/** The traits that fire in this picture: owner in a slot one of its tilts names. Both benches see these. */
export function triggers(scene: Scene): Trigger[] {
  const out: Trigger[] = [];
  for (const member of scene.cast) {
    for (const id of member.player.traits) {
      const trait = traitById.get(id);
      if (trait && trait.tilts.some(t => fires(t, scene, member))) out.push({ member, trait });
    }
  }
  return out;
}

// ---- Cards --------------------------------------------------------------

/** Does a row match a selector? */
function rowMatches(row: Row, pick: RowPick): boolean {
  if (pick === 'flip') return !!row.flip;
  if (pick === 'stay') return !row.flip;
  if (pick.startsWith('#')) return !!row.tags?.includes(pick.slice(1) as NonNullable<Row['tags']>[number]);
  return row.id === pick;
}

/** Which way a shout leans a row: up beats down. */
function leanOf(row: Row, e: Extract<CardEffect, { kind: 'shout' }>): 'up' | 'down' | null {
  if (e.up.some(p => rowMatches(row, p))) return 'up';
  if (e.down?.some(p => rowMatches(row, p))) return 'down';
  return null;
}

/** Is the card on the right side of the ball, and in a scene it is limited to? The gate before `moves`. */
export function fits(c: Card, scene: Scene, side: Side): boolean {
  if (c.side !== pileFor(scene, side)) return false;
  // v0.25: some scenes only take the cards written for them (the kick-off)
  if (sceneById.get(scene.type)?.exclusive && !c.playableIn?.includes(scene.type)) return false;
  // an entry is a scene type or a tag; 'play+box' needs all of its parts
  const is = (p: string) => p === scene.type || (scene.tags as string[]).includes(p);
  return !c.playableIn || c.playableIn.some(entry => entry.split('+').every(is));
}

/**
 * Does the card do something in this panel? A drama card always does — it forces its own scene. A shout
 * does when it leans at least one row of the table *and* leaves at least one alone: a shout that lifts
 * every row (or pushes every row down) changes no odds at all and is as good as silence. This is the
 * whole of v0.11 — there is no cheering fallback, so `moves` is what "playable" means.
 * v0.25: and a card that names rows (`up`) is only playable where one of them is in the table. Its picture
 * is what it lifts; a Kleiner Schiri with no wall to pace out, or a Lang! in their box, was playable only
 * because it pushed some other row down, and read as nonsense. Cards that only push down are unchanged.
 */
export function moves(c: Card, scene: Scene, side: Side): boolean {
  if (!fits(c, scene, side)) return false;
  if (c.effect.kind !== 'shout') return true;
  const e = c.effect;
  const leans = scene.rows.map(r => leanOf(r, e));
  if (e.up.length && !leans.includes('up')) return false;
  return leans.some(l => l !== null) && leans.some(l => l !== leans[0]);
}

/** Why a skill cannot be used right now; null when it can. The UI greys it and may say the reason. */
export type WhyNot = 'here' | 'spent' | 'gunst';

/**
 * v0.26: whether a bench can use this skill of its loadout in the panel on screen. `spent`: a once-skill
 * already used, or a drama after the bench has had its `K.dramaPerMatch`; `gunst`: the god will not pay for
 * it; `here`: it does nothing in this picture (v0.11). A coach on the stands can use nothing.
 */
export function whyNot(state: MatchState, side: Side, id: string): WhyNot | null {
  const team = state.teams[side];
  const c = card(id);
  const dramas = team.played.filter(x => card(x).kind === 'drama').length;
  if ((c.once && team.played.includes(id)) || (c.kind === 'drama' && dramas >= K.dramaPerMatch)) return 'spent';
  if (!moves(c, state.scene, side)) return 'here';
  if (!affordable(c, team)) return 'gunst';
  return null;
}

/** The three skills a bench has in the situation on screen, in loadout order. */
export function skillsFor(state: MatchState, side: Side): string[] {
  return state.teams[side].loadout[slotFor(state.scene, side)] ?? [];
}

/** The skills a bench can use in this panel: its three for this situation, minus the grey ones. */
export function usable(state: MatchState, side: Side): string[] {
  if (state.teams[side].banned > 0) return [];
  return skillsFor(state, side).filter(id => whyNot(state, side, id) === null);
}

// ---- Text ---------------------------------------------------------------

/**
 * Fill {slot}, {me}, {you}, {actor} and {where} placeholders with the cast's short names and the place.
 * v0.25: the line is first put in the words of whoever says it (voice.ts): the card's bench for a card's
 * line, the side with the ball for everything the panel itself says.
 */
export function fmt(text: string, scene: Scene, cardSide?: Side, actor?: CastMember | null): string {
  const me = cardSide ? firstOf(scene, cardSide) : undefined;
  const you = cardSide ? firstOf(scene, other(cardSide)) : undefined;
  return voice(text, cardSide ?? scene.side).replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key === 'where') return scene.spot.where;
    if (key === 'me') return me?.player.short ?? 'Einer';
    if (key === 'you') return you?.player.short ?? 'einer';
    if (key === 'actor') return actor?.player.short ?? me?.player.short ?? 'Einer';
    return scene.cast.find(m => m.slot === key)?.player.short ?? 'einer';
  });
}

/** One of a list, by the match's dice. */
function pickLine(lines: string[], rng: number): { line: string; rng: number } {
  const r = nextRandom(rng);
  return { line: lines[Math.floor(r.value * lines.length)] as string, rng: r.state };
}

/**
 * What a row says (v0.25): its lines for the man it belongs to if his trait has some (`by`, keyed by trait,
 * or by 'slot:trait' for another man in the picture), otherwise one of its own.
 */
function rowLines(row: Row, scene: Scene): string[] {
  const actor = scene.cast.find(m => m.slot === row.actor);
  const own: string[] = [];
  for (const [key, lines] of Object.entries(row.by ?? {})) {
    const [slot, trait] = key.includes(':') ? key.split(':') as [string, string] : [row.actor, key];
    const m = slot === row.actor ? actor : scene.cast.find(x => x.slot === slot);
    if (m?.player.traits.includes(trait)) own.push(...lines);
  }
  return own.length ? own : [row.text, ...(row.alt ?? [])];
}

// ---- Dice ---------------------------------------------------------------

/**
 * A shout pulls the table: its `up` rows together get `pull` of the way from their share to certain, its
 * `down` rows lose `pull` of their weight, the rest keeps its proportions. With pull 0.6 a 10 % row
 * becomes 64 %, a 40 % row 76 % — whatever it was, it is now what usually happens.
 */
function pullWeights(w: number[], rows: Row[], e: Extract<CardEffect, { kind: 'shout' }>): number[] {
  const leans = rows.map(r => leanOf(r, e));
  const out = w.map((x, i) => (leans[i] === 'down' ? x * (1 - e.pull) : x));
  const total = w.reduce((a, b) => a + b, 0);
  const up = w.reduce((a, x, i) => a + (leans[i] === 'up' ? x : 0), 0);
  const rest = out.reduce((a, x, i) => a + (leans[i] === 'up' ? 0 : x), 0);
  if (up <= 0 || rest <= 0) return out;
  const u = up / total;
  const target = u + (1 - u) * e.pull;               // the up rows' new share
  const scale = (target / (1 - target)) * rest / up;
  const pulled = out.map((x, i) => (leans[i] === 'up' ? x * scale : x));
  return e.guard ? guardWeights(w, pulled, rows, e.guard) : pulled;
}

const danger = (r: Row) => !r.half && !!r.tags?.includes('gefahr');

/**
 * v0.25: what a defending card does to a chance. Its pull takes share away from the dangerous rows; `guard`
 * of that share does not become a ball won but a half-chance of the same table (`Row.half`: the shot from
 * distance, the man who has to take his man on himself, the ball laid off). It is taken back out of what the
 * card's own rows gained. So the bench without the ball sees its card close the big chance most of the
 * time, and the bench with it still has something — a Kreisklasse match with four goals, not a wall.
 */
function guardWeights(before: number[], after: number[], rows: Row[], guard: number): number[] {
  const tb = before.reduce((a, b) => a + b, 0);
  const ta = after.reduce((a, b) => a + b, 0);
  const b = before.map(x => x / tb);
  const a = after.map(x => x / ta);
  const halves = rows.map((r, i) => (r.half ? i : -1)).filter(i => i >= 0);
  const lost = rows.reduce((s, r, i) => s + (danger(r) ? Math.max(0, (b[i] as number) - (a[i] as number)) : 0), 0);
  if (!halves.length || lost <= 0) return a;
  const gainers = rows.map((r, i) => (!r.half && (a[i] as number) > (b[i] as number) ? i : -1)).filter(i => i >= 0);
  const gained = gainers.reduce((s, i) => s + (a[i] as number) - (b[i] as number), 0);
  const give = Math.min(lost * guard, gained);
  if (give <= 0) return a;
  const out = [...a];
  for (const i of gainers) out[i] = (out[i] as number) - give * ((a[i] as number) - (b[i] as number)) / gained;
  const hb = halves.reduce((s, i) => s + (b[i] as number), 0);
  for (const i of halves) out[i] = (out[i] as number) + give * (hb > 0 ? (b[i] as number) / hb : 1 / halves.length);
  return out;
}

/** Could a defending card have closed a chance here — is there a big one, and somewhere for it to go? */
const closable = (scene: Scene) => scene.rows.some(danger) && scene.rows.some(r => r.half);

/**
 * Row weights after the cast's traits, both sides' form (when `teams` is given) and the shouts laid.
 * Exported for the headless runner, never the UI.
 */
export function tiltedWeights(scene: Scene, shouts: CardEffect[] = [], teams?: Record<Side, TeamState>): number[] {
  let w = scene.rows.map(row => {
    let x = row.weight;
    for (const m of scene.cast) {
      for (const traitId of m.player.traits) {
        for (const tilt of traitById.get(traitId)?.tilts ?? []) {
          if (tilt.scene.includes(scene.type) && tilt.slot === m.slot && tilt.row === row.id) x *= tilt.factor;
        }
      }
    }
    return x;
  });
  if (teams) w = formWeights(scene, w, teams);
  // Two shouts in one panel are a tug of war: each pulls the table on its own, and the men do a bit of
  // both. Pulling one after the other would hand the panel to whoever shouted last.
  const pulls = shouts.filter((e): e is Extract<CardEffect, { kind: 'shout' }> => e.kind === 'shout').map(e => {
    const p = pullWeights(w, scene.rows, e);
    const total = p.reduce((a, b) => a + b, 0);
    return p.map(x => x / total);
  });
  if (!pulls.length) return w;
  return w.map((_, i) => pulls.reduce((a, p) => a + (p[i] as number), 0) / pulls.length);
}

function roll(scene: Scene, shouts: CardEffect[], teams: Record<Side, TeamState>, rng: number): { row: Row; rng: number } {
  const r = pickWeighted(tiltedWeights(scene, shouts, teams), rng);
  return { row: scene.rows[r.index] as Row, rng: r.state };
}

/** The first line of a card's echo that fits this row, if the card has one. */
function echoOf(c: Card, row: Row): string[] | null {
  for (const [pick, lines] of Object.entries(c.echo ?? {})) if (rowMatches(row, pick)) return lines;
  return null;
}

// ---- Step ---------------------------------------------------------------

function sideFor(init: Initiative, att: Side, cardSide: Side): Side {
  return init === 'keep' ? att : init === 'flip' ? other(att) : cardSide;
}

/**
 * Resolve the panel on screen with the skill each coach used (null = none), and put the next scene on
 * screen. A skill the bench cannot use here (`usable`) counts as none.
 */
export function step(state: MatchState, laidIn: Laid): { state: MatchState; panel: Panel } {
  if (state.over) throw new Error('match is over');
  const s: MatchState = structuredClone(state);
  const scene = s.scene;
  const att = scene.side;
  const def = other(att);
  for (const side of ['A', 'B'] as Side[]) if (s.teams[side].banned > 0) s.teams[side].banned -= 1;

  // One of its three, or none. A bench that had something to use and kept quiet earns a little Gunst.
  const laid: Laid = { A: null, B: null };
  const could: Panel['usable'] = { A: usable(state, 'A'), B: usable(state, 'B') };
  const effects: Record<Side, CardEffect | null> = { A: null, B: null };
  for (const side of ['A', 'B'] as Side[]) {
    const id = laidIn[side];
    if (!could[side].length) continue;
    if (!id || !could[side].includes(id)) { move(s.teams[side], { gunst: F.humble }); continue; }
    const c = card(id);
    laid[side] = id;
    // how well the men follow is the Moral they had when it was shouted, before the skill's price
    effects[side] = heard(c.effect, s.teams[side]);
    pay(c, s.teams[side]);
    s.teams[side].played.push(id);
  }

  const result: Panel['result'] = { A: null, B: null };
  const lines: string[] = [];
  let next: string | null = null;
  let nextSide: Side = att;
  let to: Pos = scene.pos;                  // where the ball goes, in this panel's frame
  let rowId: string | null = null;
  let word = '';
  let actor: CastMember | null = null;
  const banned: Side[] = [];
  let cause: Panel['cause'] = null;
  let what: string | null = null;           // the line that says what happened
  let carried: Player | undefined;          // the man who carries the ball into the next panel

  // 1. Drama. The defender reveals last and has the last word; whatever else was laid is overruled.
  for (const side of [att, def]) {
    const e = effects[side];
    if (e?.kind !== 'steer') continue;
    next = e.next; nextSide = sideFor(e.initiative, att, side); cause = { side, cardId: laid[side] as string };
    word = e.word; actor = firstOf(scene, side) ?? null;
    result[side] = 'forced';
    what = fmt(e.line, scene, side);
    lines.push(what);
  }
  if (cause) {
    const o = other(cause.side);
    if (effects[o]) result[o] = 'overruled';
  }

  // 2. Dice, unless a card already decided the panel. Shouts lean the dice and say so first.
  if (next === null) {
    const shouts: CardEffect[] = [];
    const said: Partial<Record<Side, string>> = {};
    for (const side of [att, def]) {
      const e = effects[side];
      if (e?.kind !== 'shout') continue;
      shouts.push(e);
      const l = pickLine([e.line, ...(e.alt ?? [])], s.rng); s.rng = l.rng;
      said[side] = fmt(l.line, scene, side);
    }
    const r = roll(scene, shouts, s.teams, s.rng); s.rng = r.rng;
    const row = r.row;
    rowId = row.id; next = row.next; nextSide = row.flip ? def : att;
    if (row.to) {
      // the same pass never lands on the same blade of grass twice
      const jx = nextRandom(s.rng); const jy = nextRandom(jx.state); s.rng = jy.state;
      to = at(row.to.x + (jx.value - 0.5) * 0.06, row.to.y + (jy.value - 0.5) * 0.08);
    }
    word = row.word; actor = scene.cast.find(m => m.slot === row.actor) ?? null;
    if (row.carry && actor && actor.side === nextSide) carried = actor.player;
    for (const side of [att, def]) {
      const e = effects[side];
      if (e?.kind !== 'shout') continue;
      const lean = leanOf(row, e);
      result[side] = lean === 'up' || (lean === null && e.up.length === 0) ? 'heard' : 'ignored';
    }
    // v0.25: a defending card that closed the big chance: what came instead is the half-chance, and it says so
    const d = effects[def];
    const blocked = d?.kind === 'shout' && !!d.guard && !!row.half && !!row.blocked?.length && closable(scene) && leanOf(row, d) !== 'down';
    if (blocked) result[def] = 'heard';
    // v0.25: what happened, in the words of the card whose picture it is — the one that lifted this row first,
    // then a defence that closed the chance, then a card that merely let it happen (Durchsage: the keeper looks away)
    const echoes = ([att, def] as Side[])
      .filter(side => laid[side] && effects[side]?.kind === 'shout')
      .map(side => ({ side, lines: echoOf(card(laid[side] as string), row), up: leanOf(row, effects[side] as CardEffect & { kind: 'shout' }) === 'up' }))
      .filter(x => x.lines);
    const echo = echoes.find(x => x.up) ?? (blocked ? null : echoes[0]) ?? null;
    let text: string;
    if (echo) {
      const l = pickLine(echo.lines as string[], s.rng); s.rng = l.rng;
      text = fmt(l.line, scene, echo.side, actor);
    } else if (blocked) {
      const l = pickLine(row.blocked as string[], s.rng); s.rng = l.rng;
      text = fmt(l.line, scene, undefined, actor);
    } else {
      const l = pickLine(rowLines(row, scene), s.rng); s.rng = l.rng;
      text = fmt(l.line, scene, undefined, actor);
    }
    // The shouts, and for a shout the men did not follow, one line of what that looked like (not for events:
    // nobody tells a wasp what to do)
    for (const side of [att, def]) {
      if (!said[side]) continue;
      const c = card(laid[side] as string);
      // an event's echo already tells the event (the wasp, and what it did): say it once
      if (c.kind === 'event' && echo?.side === side) continue;
      lines.push(said[side] as string);
      // only for the player's own bench: the rival's shouts come and go without a word, as they do from the stands
      if (side !== HOME || c.kind !== 'shout' || result[side] !== 'ignored' || echo?.side === side) continue;
      const l = pickLine(c.miss ?? MISS[c.side], s.rng); s.rng = l.rng;
      lines.push(fmt(l.line, scene, side));
    }
    lines.push(text);
    what = text;
    if (row.banned) {
      if (row.banned === 'init' || row.banned === 'both') banned.push(att);
      if (row.banned === 'other' || row.banned === 'both') banned.push(def);
    }
  }

  // 3. Goal.
  let goal: Side | null = null;
  if (next === GOAL) {
    goal = att;
    s.score[att] += 1;
    next = START_SCENE;
    nextSide = def;
    to = KICKOFF;
  }
  for (const side of banned) s.teams[side].banned = K.banPanels;

  // 4. Form: what the panel cost the legs and did to the heads, and which gauge crossed into another word.
  afterPanel(s.teams, scene, scene.rows.find(r => r.id === rowId) ?? null, goal, s.score);
  const sh = shifts(s.teams, s.rng); s.rng = sh.rng;

  const panel: Panel = {
    n: s.strip.length + 1, half: s.half, minute: s.minute, hl: s.hl, title: s.title, closes: false,
    scene, usable: could, laid, result, row: rowId, word, actor, lines, what, cause,
    next, nextLabel: labelOf(next), nextSide, goal, banned, shifts: sh.shifts,
    levels: { A: { ...s.teams.A.shown }, B: { ...s.teams.B.shown } },
    form: { A: { ...s.teams.A.gauges }, B: { ...s.teams.B.gauges } },
  };
  s.strip.push(panel);

  // 5. The highlight goes on while the ball is where a goal can come from. The ball keeps its place on the
  // pitch; the frame turns with the side that has it; the man who carried it here carries on.
  s.inHl += 1;
  const ns = makeScene(next, nextSide, nextSide === att ? to : mirror(to), s.teams, s.rng, carried);
  s.rng = ns.rng;
  if (!goal && s.inHl < H.maxPanels && hot(ns.scene)) {
    s.scene = ns.scene;
    s.gap = null;
    panel.nextLabel = ns.scene.label;
    return { state: s, panel };
  }
  // 6. It is over: the clock jumps to the next highlight, or to the whistle.
  panel.closes = true;
  cut(s, goal);
  return { state: s, panel };
}

/**
 * v0.27: the end of a highlight. The clock jumps a few minutes to the next one (highlights.ts `opening`) and
 * the gap says what happened in between; past 45 or 90 there may be one more in Nachspielzeit, and then the
 * whistle: the end of the match, or half-time — and then, in `then`, the second half's own run from the
 * kick-off to its first highlight. The same at the start: `newMatch` cuts from minute 0.
 */
function cut(s: MatchState, goal: Side | null): void {
  const from = s.minute;
  const end = H.end[s.half];
  const r = nextRandom(s.rng); s.rng = r.state;
  let at = from + H.gap[0] + Math.floor(r.value * (H.gap[1] - H.gap[0] + 1));
  let open: ReturnType<typeof opening>['open'] | null = null;
  let whistle: Gap['whistle'] = null;
  if (at <= end) {
    const o = opening(s, at, s.rng); s.rng = o.rng; open = o.open;
  } else {
    const close = s.half === 2 && Math.abs(s.score.A - s.score.B) <= 1;
    const chance = close ? H.stoppage.close : H.stoppage[s.half];
    const x = nextRandom(s.rng); const y = nextRandom(x.state); s.rng = y.state;
    if (!s.stoppage && x.value < chance) {
      s.stoppage = true;
      at = Math.max(from, end) + 1 + Math.floor(y.value * 3);
      const o = stoppageOpening(s, at, s.rng); s.rng = o.rng; open = o.open;
    } else {
      at = Math.max(from, end);
      whistle = s.half === 1 ? 'halftime' : 'end';
    }
  }
  const said = new Set(s.offCamera);
  const gl = gapLines(s, from, at, goal, whistle, said, s.rng); s.rng = gl.rng;
  s.offCamera = [...said];
  afterGap(s.teams, at - from, s.score);
  const sh = shifts(s.teams, s.rng); s.rng = sh.rng;
  const gap: Gap = {
    half: s.half, from, to: at, lines: gl.lines, shifts: sh.shifts, whistle,
    title: whistle === 'halftime' ? 'Halbzeit' : whistle === 'end' ? 'Abpfiff' : (open as NonNullable<typeof open>).title,
  };
  s.gap = gap;
  if (whistle === 'end') { s.over = true; return; }
  if (whistle === 'halftime') {
    // The loadouts stay as they are across half-time; the legs get some of it back over tea. The second
    // half starts off camera like the first.
    for (const side of ['A', 'B'] as Side[]) move(s.teams[side], { puste: F.halftime });
    s.half = 2; s.stoppage = false; s.minute = 45;
    cut(s, null);
    s.gap = { ...gap, then: s.gap as Gap };
    return;
  }
  if (!open) return;
  const ns = makeScene(open.type, open.side, open.pos, s.teams, s.rng); s.rng = ns.rng;
  if (open.note) ns.scene.note = open.note;
  s.scene = ns.scene;
  s.minute = at;
  s.hl += 1;
  s.title = open.title;
  s.inHl = 0;
}
