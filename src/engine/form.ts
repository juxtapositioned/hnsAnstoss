// Form (DESIGN §2.6, v0.22): three hidden gauges per bench — Puste (the legs), Moral (the heads) and
// Gunst (the football god's favour). They move over the match and tilt the dice the way a trait does,
// only for the whole side: a tired side makes mistakes and lets men through, a side with its head up
// follows its coach, and the god's favourite gets the bounces and the whistle. No number is ever shown;
// each gauge is read as one of three words, on the men and in the top bar, and when it crosses into
// another word the commentary says so.
// Laying a card costs: shouts cost legs, events and drama the god's favour, a few cost the men's mood.
// Pure: match.ts calls in here, nothing in here knows about panels on screen.

import { nextRandom } from './rng';
import type { Card, CardEffect, Gauge, Gauges, Level, Row, RowTag, Scene, Shift, Side, Situation, TeamState } from './types';

export const GAUGES: Gauge[] = ['puste', 'moral', 'gunst'];

// v0.25, after a playtest ("after a whole half with four Gunst cards the bars still read frisch / normal /
// schaut zu"): every number that moves a gauge is bigger, and the two that pull it back to the middle are
// smaller, so a half you coached loudly looks different from one you watched. First guesses, like before.
export const F = {
  start: { puste: 1, moral: 0.5, gunst: 0.5 } as Gauges,
  /** Legs every panel costs both sides, by situation. A dead ball is a breather. */
  drain: { action: 0.009, challenge: 0.018, setpiece: -0.008 } as Record<Situation, number>,
  halftime: 0.15,            // Puste back over tea and orange slices: enough for a side that paced itself, not for one that ran everything
  /** What laying a card costs, by kind, for a card that pulls as hard as an attacking shout. A card's own `cost` overrides these gauge by gauge. */
  cost: { shout: { puste: 0.05 }, event: { gunst: 0.09 }, drama: { gunst: 0.25 } } as Record<Card['kind'], Partial<Gauges>>,
  /** v0.23: a shout or event pays for what it does — its Puste and Gunst price times pull / `fullPull`, never less than `minShare` of it. */
  fullPull: 0.8,
  minShare: 0.35,
  humble: 0.02,              // Gunst for a card that was offered and not laid: the god likes a quiet bench
  forget: 0.015,             // each panel Gunst drifts this share of the way back to the middle: the god forgets, both ways
  unlucky: 0.04,             // Gunst back when it goes against you: a goal conceded, a whistle against
  moral: { scored: 0.25, conceded: -0.2, pfiff: 0.05, gegenpfiff: -0.05, fehler: -0.04, chance: 0.03, drift: 0.03 },
  /** v0.25: a gauge's word only changes once the value is this far past the line — no "schaut weg", "schaut wieder zu" on consecutive panels. */
  margin: 0.03,
  /** v0.27: off camera, between two highlights. Legs per minute, and how many panels' worth of drift a minute is (18 panels were 45 minutes). */
  gapDrain: 0.0025,
  pace: 0.4,
};

/**
 * v0.25: the gauges in play. All three by default; `?form=gunst` in the UI parks Puste and Moral — they cost
 * nothing, tilt nothing and are not shown — to try the match with the football god as the only price.
 */
let ACTIVE = new Set<Gauge>(GAUGES);
export function setActive(gauges: Gauge[]): void { ACTIVE = new Set(gauges); }
export const isActive = (g: Gauge) => ACTIVE.has(g);
export const activeGauges = () => GAUGES.filter(isActive);

/** The three words of each gauge. Moral in the middle is not worth a word on the men. */
export const WORDS: Record<Gauge, Record<Level, string>> = {
  puste: { hoch: 'frisch', mittel: 'geht so', tief: 'platt' },
  moral: { hoch: 'heiß', mittel: 'normal', tief: 'Köpfe hängen' },
  gunst: { hoch: 'lächelt', mittel: 'schaut zu', tief: 'schaut weg' },
};

/** Where each gauge's words change: below the first cut it is `tief`, above the second `hoch`. */
export const CUTS: Record<Gauge, [number, number]> = { puste: [0.3, 0.6], moral: [0.35, 0.65], gunst: [0.35, 0.65] };

/** The word a gauge reads as. With `was`, the word it read before: it only changes once `v` is clearly past the line. */
export function level(g: Gauge, v: number, was?: Level): Level {
  const [lo, hi] = CUTS[g];
  const now: Level = v > hi ? 'hoch' : v < lo ? 'tief' : 'mittel';
  if (!was || now === was) return now;
  const m = F.margin;
  const clear = now === 'hoch' ? v > hi + m : now === 'tief' ? v < lo - m : was === 'hoch' ? v < hi - m : v > lo + m;
  return clear ? now : was;
}

/** The words a fresh bench starts with. */
export const startLevels = (): Record<Gauge, Level> =>
  Object.fromEntries(GAUGES.map(g => [g, level(g, F.start[g])])) as Record<Gauge, Level>;

const clamp = (v: number) => Math.min(1, Math.max(0, v));

export function move(team: TeamState, delta: Partial<Gauges>): void {
  for (const g of GAUGES) if (delta[g]) team.gauges[g] = clamp(team.gauges[g] + (delta[g] as number));
}

// ---- Costs --------------------------------------------------------------

/**
 * What laying this card costs its bench: its kind's price, with the card's own exceptions on top — and
 * v0.23, the Puste and Gunst it takes scaled by how hard it pulls, so a card that hardly moves the table
 * (the defending shouts, the safe square pass) is cheap and one that makes the shot likely is dear. Moral
 * and what a card gives back are as written: those are the picture, not the effort. v0.24: so is a card's
 * own price — Drauf! Drauf! is ninety minutes of running whether or not it comes off; only the kind's
 * default price scales.
 */
export function costOf(c: Card): Partial<Gauges> {
  const cost: Partial<Gauges> = { ...F.cost[c.kind], ...c.cost };
  const share = c.effect.kind === 'shout' ? Math.min(1.2, Math.max(F.minShare, c.effect.pull / F.fullPull)) : 1;
  for (const g of ['puste', 'gunst'] as const) {
    const v = cost[g] ?? 0;
    if (v > 0 && c.cost?.[g] === undefined) cost[g] = Math.round(v * share * 1000) / 1000;
  }
  for (const g of GAUGES) if (!isActive(g)) delete cost[g];
  return cost;
}

/** The god does not hand out what he has not got: a card that costs more Gunst than the bench has is not offered. */
export function affordable(c: Card, team: TeamState): boolean {
  const g = costOf(c).gunst ?? 0;
  return g <= 0 || team.gauges.gunst >= g;
}

/** Laying it: the price comes off. */
export function pay(c: Card, team: TeamState): void {
  const cost = costOf(c);
  move(team, Object.fromEntries(GAUGES.map(g => [g, -(cost[g] ?? 0)])));
}

// ---- Dice ---------------------------------------------------------------

/** The bounces: rows where the ball, not a man, decides. Seen from the side with the initiative. */
const LUCKY = new Set(['zweiter_ball', 'eigentor', 'flutscher', 'ecke_direkt', 'fk_abpraller']);
const UNLUCKY = new Set(['latte', 'pfosten', 'querpass_fehler', 'rueckpass_kurz', 'patzer']);

const has = (r: Row, t: RowTag) => !!r.tags?.includes(t);
/** 0 while fresh, 1 when empty. */
const tired = (puste: number) => clamp((0.6 - puste) / 0.6);

/**
 * The table after both sides' form: the side with the ball makes more mistakes and fewer chances when
 * its legs go, the side without it lets more through when its legs go; the heads lean chances against
 * mistakes; the god leans the bounces and the whistle towards his favourite.
 */
export function formWeights(scene: Scene, w: number[], teams: Record<Side, TeamState>): number[] {
  const init = teams[scene.side].gauges;
  const def = teams[scene.side === 'A' ? 'B' : 'A'].gauges;
  const legs = isActive('puste');
  const ti = legs ? tired(init.puste) : 0, td = legs ? tired(def.puste) : 0;
  const m = isActive('moral') ? init.moral - 0.5 : 0;
  const luck = isActive('gunst') ? init.gunst - def.gunst : 0;
  return w.map((x, i) => {
    const r = scene.rows[i] as Row;
    if (has(r, 'fehler')) x *= (1 + 0.8 * ti) * (1 - 0.4 * m);
    if (has(r, 'gefahr')) x *= (1 - 0.3 * ti) * (1 + 0.6 * td) * (1 + 0.4 * m);
    if (has(r, 'geklaert')) x *= 1 - 0.3 * td;
    if (r.id === 'dribbling' || r.id === 'durch') x *= 1 + 0.4 * td;
    if (has(r, 'pfiff')) x *= 1 + 0.6 * luck;
    if (has(r, 'gegenpfiff')) x *= 1 - 0.6 * luck;
    if (LUCKY.has(r.id)) x *= Math.max(0.2, 1 + luck);
    if (UNLUCKY.has(r.id)) x *= Math.max(0.2, 1 - luck);
    return x;
  });
}

/** How well the men follow a shout: as written at normal Moral, harder when they are hot, half-hearted when heads hang. */
export function heard(e: CardEffect, team: TeamState): CardEffect {
  if (e.kind !== 'shout' || !isActive('moral')) return e;
  return { ...e, pull: Math.min(0.95, e.pull * (0.7 + 0.6 * team.gauges.moral)) };
}

// ---- After a panel ------------------------------------------------------

/**
 * What the panel did to both sides: the legs it cost, what the rolled row and a goal did to the heads,
 * and the god making up for a bit of bad luck. Gunst drifts back to the middle, and Moral back to normal — a little above it for the
 * side that is behind (jetzt erst recht), a little below for one two goals up (die meinen, sie haben's schon).
 */
export function afterPanel(teams: Record<Side, TeamState>, scene: Scene, row: Row | null, goal: Side | null, score: Record<Side, number>): void {
  const init = scene.side;
  const def: Side = init === 'A' ? 'B' : 'A';
  const M = F.moral;
  for (const side of [init, def]) move(teams[side], { puste: -F.drain[scene.situation] });
  if (goal) {
    const lost: Side = goal === 'A' ? 'B' : 'A';
    move(teams[goal], { moral: M.scored });
    move(teams[lost], { moral: M.conceded, gunst: F.unlucky });
  } else if (row) {
    if (has(row, 'pfiff')) { move(teams[init], { moral: M.pfiff }); move(teams[def], { moral: M.gegenpfiff / 2, gunst: F.unlucky / 2 }); }
    if (has(row, 'gegenpfiff')) move(teams[init], { moral: M.gegenpfiff, gunst: F.unlucky });
    if (has(row, 'fehler')) move(teams[init], { moral: M.fehler });
    if (has(row, 'gefahr')) move(teams[init], { moral: M.chance });
  }
  for (const side of [init, def]) {
    const diff = score[side] - score[side === 'A' ? 'B' : 'A'];
    const target = diff < 0 ? 0.6 : diff >= 2 ? 0.4 : 0.5;
    const t = teams[side];
    t.gauges.moral += (target - t.gauges.moral) * M.drift;
    t.gauges.gunst += (0.5 - t.gauges.gunst) * F.forget;
  }
}

/**
 * v0.27: what the minutes off camera did: the legs go a little every minute, Moral and Gunst drift back to
 * where they settle, as they would have over the panels nobody watched.
 */
export function afterGap(teams: Record<Side, TeamState>, minutes: number, score: Record<Side, number>): void {
  if (minutes <= 0) return;
  const k = (rate: number) => 1 - Math.pow(1 - rate, minutes * F.pace);
  for (const side of ['A', 'B'] as Side[]) {
    const t = teams[side];
    move(t, { puste: -F.gapDrain * minutes });
    const diff = score[side] - score[side === 'A' ? 'B' : 'A'];
    const target = diff < 0 ? 0.6 : diff >= 2 ? 0.4 : 0.5;
    t.gauges.moral += (target - t.gauges.moral) * k(F.moral.drift);
    t.gauges.gunst += (0.5 - t.gauges.gunst) * k(F.forget);
  }
}

// ---- Saying it ----------------------------------------------------------

/** What the commentary says when a gauge crosses into another word. `{team}` is the side's short name. */
const SAY: Record<Gauge, Record<'up' | 'down', Partial<Record<Level, string[]>>>> = {
  puste: {
    down: {
      mittel: ['Bei {team} stützen die Ersten die Hände auf die Knie.', 'Bei {team} wird jetzt mehr gegangen als gelaufen.'],
      tief: ['{team} pfeift aus dem letzten Loch.', 'Bei {team} geht keiner mehr einen Schritt zu viel.', 'Bei {team} fragt einer an der Linie nach Wasser. Und nach einem Stuhl.'],
    },
    up: {
      mittel: ['{team} hat wieder ein bisschen Luft.'],
      hoch: ['{team} läuft wieder, als wär nichts gewesen.'],
    },
  },
  moral: {
    up: {
      hoch: ['{team} ist jetzt heiß.', 'Bei {team} klatschen sich alle ab. Auch der Torwart.', '{team} will jetzt jeden Ball.',
        'Bei {team} rennen jetzt sogar die, die sonst gehen.', '{team} glaubt jetzt dran. Man sieht es an den Schultern.'],
      mittel: ['{team} rappelt sich wieder auf.'],
    },
    down: {
      tief: ['Bei {team} hängen die Köpfe.', 'Bei {team} schaut keiner mehr hoch.', 'Bei {team} redet keiner mehr mit keinem.'],
      mittel: ['{team} kühlt ein bisschen ab.'],
    },
  },
  gunst: {
    up: {
      hoch: ['Irgendwo über dem Sportplatz lächelt der Fußballgott. Für {team}.', 'Der Fußballgott hat heute was übrig für {team}.'],
      mittel: ['Der Fußballgott schaut {team} wieder zu.'],
    },
    down: {
      tief: ['Der Fußballgott schaut bei {team} weg.', 'Der Fußballgott hat genug von {team}. Für heute.'],
      mittel: ['Der Fußballgott lächelt nicht mehr für {team}.'],
    },
  },
};

const ORDER: Record<Level, number> = { tief: 0, mittel: 1, hoch: 2 };

/**
 * Which gauges now read as another word, with a line for each. v0.25: the word a bench shows is kept on the
 * team (`shown`) and only changes once the value is clearly past the line (`level` with `was`).
 */
export function shifts(teams: Record<Side, TeamState>, rng: number): { shifts: Shift[]; rng: number } {
  const out: Shift[] = [];
  for (const side of ['A', 'B'] as Side[]) {
    for (const g of GAUGES) {
      const was = teams[side].shown[g];
      const now = level(g, teams[side].gauges[g], was);
      if (was === now) continue;
      teams[side].shown[g] = now;
      if (!isActive(g)) continue;
      const lines = SAY[g][ORDER[now] > ORDER[was] ? 'up' : 'down'][now];
      if (!lines?.length) continue;
      const r = nextRandom(rng); rng = r.state;
      const line = (lines[Math.floor(r.value * lines.length)] as string).replace(/\{team\}/g, teams[side].short);
      out.push({ side, gauge: g, level: now, line });
    }
  }
  return { shifts: out, rng };
}
