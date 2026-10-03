// v0.26: what a bench brings to the match. Before kick-off each coach picks three skills for each of the
// six situations (ball action, challenge, set piece — with the ball and without it); in the match he has
// exactly those three whenever that situation comes up, and uses one of them or none (match.ts `usable`).
// The pick is a draft: per situation a short list of `CHOICES` skills is dealt from the pool (cards.ts
// `POOL`), three of them already picked, and the coach swaps what he likes. The list is weighted by how
// often a skill does anything in its situation at all (`reach`, measured on a few matches without skills),
// so a draft is seldom three skills that wait all match for a penalty.

import { cardById, POOL } from './data/cards';
import { noLoadout, TEAM_A, TEAM_B } from './data/rosters';
import { moves, newMatch, slotFor, step } from './match';
import { nextRandom } from './rng';
import type { Card, Loadout, Side, Slot } from './types';

export const PER_SLOT = 3;
/** How many skills a situation's list offers to pick from. */
export const CHOICES = 6;
/**
 * A skill that does something in fewer of its situation's panels than this is not dealt. Low on purpose:
 * Schieß! and Flanke! only do something in a few ball actions, and they are the shouts a coach has.
 */
const MIN_REACH = 0.05;
/** At most this many dramas picked in one situation: a bench gets one drama a match anyway (K.dramaPerMatch). */
const DRAMA_PER_SLOT = 1;
/** Matches without skills that `reach` is measured on. */
const SAMPLE = 12;

export const SLOTS: Slot[] = [
  'ball:action', 'ball:challenge', 'ball:setpiece',
  'noball:action', 'noball:challenge', 'noball:setpiece',
];

/** One situation of a draft: the list dealt, and the (up to three) picked from it, in key order 1–3. */
export interface DraftSlot { choices: string[]; picked: string[] }
export type Draft = Record<Slot, DraftSlot>;

const card = (id: string) => cardById.get(id) as Card;
const isDrama = (id: string) => card(id).kind === 'drama';

let measured: Map<Slot, Map<string, number>> | null = null;

/**
 * For each situation, the share of its panels in which each skill of the pool does something (`moves`).
 * Measured once on `SAMPLE` matches without skills, so rare pictures (a penalty) weigh what they weigh.
 */
export function reach(): Map<Slot, Map<string, number>> {
  if (measured) return measured;
  const panels = new Map<Slot, number>();
  const hits = new Map<Slot, Map<string, number>>(SLOTS.map(s => [s, new Map()]));
  const a = { ...TEAM_A, loadout: noLoadout() };
  const b = { ...TEAM_B, loadout: noLoadout() };
  for (let seed = 1; seed <= SAMPLE; seed++) {
    let state = newMatch(a, b, seed * 104729);
    while (!state.over) {
      for (const side of ['A', 'B'] as Side[]) {
        const slot = slotFor(state.scene, side);
        panels.set(slot, (panels.get(slot) ?? 0) + 1);
        const h = hits.get(slot) as Map<string, number>;
        for (const id of POOL[slot]) if (moves(card(id), state.scene, side)) h.set(id, (h.get(id) ?? 0) + 1);
      }
      state = step(state, { A: null, B: null }).state;
    }
  }
  measured = new Map(SLOTS.map(slot => {
    const n = panels.get(slot) ?? 0;
    const h = hits.get(slot) as Map<string, number>;
    return [slot, new Map(POOL[slot].map(id => [id, n ? (h.get(id) ?? 0) / n : 0]))];
  }));
  return measured;
}

/**
 * Deal `want` more skills for `slot`, weighted by reach, none of `not`. Skills already in another
 * situation's list (`elsewhere`) only when nothing else is left, so the six lists do not repeat each other.
 */
function dealInto(slot: Slot, want: number, not: Set<string>, elsewhere: Set<string>, rng: number): { ids: string[]; rng: number } {
  const r = reach().get(slot) as Map<string, number>;
  const ids: string[] = [];
  const open = (fresh: boolean) => POOL[slot].filter(id =>
    !not.has(id) && !ids.includes(id) && (r.get(id) ?? 0) >= MIN_REACH && (!fresh || !elsewhere.has(id)));
  while (ids.length < want) {
    let pool = open(true);
    if (!pool.length) pool = open(false);
    if (!pool.length) break;
    // the square root, so the broad ones come up more often without crowding out the rare big ones
    const w = pool.map(id => Math.sqrt(r.get(id) ?? 0));
    const total = w.reduce((x, y) => x + y, 0);
    const x = nextRandom(rng); rng = x.state;
    let at = x.value * total;
    let i = 0;
    while (i < pool.length - 1 && (at -= w[i] as number) >= 0) i++;
    ids.push(pool[i] as string);
  }
  return { ids, rng };
}

/**
 * Pick up to three from a list: in its order, at most one drama, and a shout among them if the list has
 * one — the player is the coach, and what a coach has first is his voice.
 */
function autoPick(choices: string[], first: string[] = []): string[] {
  const picked = [...first];
  const shout = choices.find(id => card(id).kind === 'shout');
  const order = shout && !picked.some(id => card(id).kind === 'shout') ? [shout, ...choices] : choices;
  for (const id of order) {
    if (picked.length >= PER_SLOT) break;
    if (picked.includes(id)) continue;
    if (isDrama(id) && picked.filter(isDrama).length >= DRAMA_PER_SLOT) continue;
    picked.push(id);
  }
  return picked;
}

/**
 * A fresh draft: a list per situation, three of it picked. `signature` skills (a rival's tells) go into
 * every situation whose pool has them, first in the list and picked.
 */
export function dealDraft(rng: number, signature: string[] = []): { draft: Draft; rng: number } {
  const draft = {} as Draft;
  const elsewhere = new Set<string>();
  for (const slot of SLOTS) {
    const sig = signature.filter(id => POOL[slot].includes(id)).slice(0, PER_SLOT);
    const d = dealInto(slot, CHOICES - sig.length, new Set(sig), elsewhere, rng); rng = d.rng;
    const choices = [...sig, ...d.ids];
    choices.forEach(id => elsewhere.add(id));
    draft[slot] = { choices, picked: autoPick(choices, sig) };
  }
  return { draft, rng };
}

/** Deal a situation's list again: what is picked stays, the rest is new. */
export function redeal(draft: Draft, slot: Slot, rng: number): { draft: Draft; rng: number } {
  const { picked, choices } = draft[slot];
  const elsewhere = new Set(SLOTS.filter(s => s !== slot).flatMap(s => draft[s].choices));
  const d = dealInto(slot, CHOICES - picked.length, new Set(choices), elsewhere, rng);
  // a situation whose pool is used up keeps its old list rather than shrink
  const fresh = d.ids.length >= CHOICES - picked.length ? d.ids : choices.filter(id => !picked.includes(id));
  return { draft: { ...draft, [slot]: { choices: [...picked, ...fresh], picked: [...picked] } }, rng: d.rng };
}

/** Why a skill cannot be picked now: the situation has its three, or already its drama. */
export function cannotPick(draft: Draft, slot: Slot, id: string): 'full' | 'drama' | null {
  const { picked } = draft[slot];
  if (picked.includes(id)) return null;
  if (picked.length >= PER_SLOT) return 'full';
  if (isDrama(id) && picked.filter(isDrama).length >= DRAMA_PER_SLOT) return 'drama';
  return null;
}

/** Tap a skill in the draft: picked ones are put back, others picked if there is room. */
export function toggle(draft: Draft, slot: Slot, id: string): Draft {
  const { picked, choices } = draft[slot];
  if (picked.includes(id)) return { ...draft, [slot]: { choices, picked: picked.filter(x => x !== id) } };
  if (cannotPick(draft, slot, id)) return draft;
  return { ...draft, [slot]: { choices, picked: [...picked, id] } };
}

export const complete = (draft: Draft) => SLOTS.every(s => draft[s].picked.length === PER_SLOT);

export function toLoadout(draft: Draft): Loadout {
  return Object.fromEntries(SLOTS.map(s => [s, [...draft[s].picked]])) as Loadout;
}
