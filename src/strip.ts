// Headless runner: prints one match as a text strip. Both benches get a dealt loadout (v0.26: three skills
// per situation, loadout.ts); A uses one of its usable three at random in every panel it can, B is the
// rival from rival.ts (the same one the single-player UI faces), with his tells in his loadout.
//   npm run strip            seed 1
//   npm run strip -- 7       seed 7
//   npm run strip -- --stats 300   match statistics over 300 matches, no strip
//   npm run strip -- --values      what each place and each shout is worth (Markov over a pitch grid)
//   npm run strip -- --cover       per scene type, how often each skill of the pool does something there
//   npm run strip -- --reach       per situation, the share of its panels each skill of the pool does something in
// v0.27: a match is its highlights; the strip prints each with its minute and headline, and after it the
// jump to the next one with what happened off camera.
// Read the strip. If the highlights read like a match, the UI is presentation only. Read --values after
// changing cards, traits or the sim: a shout's min is where on the pitch it hurts its own bench — since
// v0.13 the place decides, so a negative min is either a selector bug or a place where no coach would
// shout that (and then the row should not exist there). Read --cover after writing or widening a card.

import { CARDS, cardById, POOL } from './engine/data/cards';
import { SCENES, sceneById } from './engine/data/scenes';
import { TEAM_A, TEAM_B } from './engine/data/rosters';
import { firesLine, K, makeScene, moves, newMatch, other, slotFor, step, tiltedWeights, triggers, usable } from './engine/match';
import { dealDraft, reach, SLOTS, toLoadout } from './engine/loadout';
import { minuteLabel } from './engine/highlights';
import { decide, RIVALS, rivalTalk, signature } from './engine/rival';
import { halftime, talksFor } from './engine/talks';
import { GAUGES, level, WORDS } from './engine/form';
import type { Said } from './engine/talks';
import type { Rival } from './engine/rival';
import { nextRandom } from './engine/rng';
import { at, mirror } from './engine/sim';
import { GOAL } from './engine/types';
import type { Card, CardEffect, CardSide, Gap, Laid, MatchState, Panel, Pos, Scene, Side, Slot } from './engine/types';

const PLAY_CHANCE = 1;
const RIVAL = RIVALS[0] as Rival;

function policy(state: MatchState, rng: number): { laid: Laid; rng: number } {
  const laid: Laid = { A: null, B: null };
  const can = usable(state, 'A');
  let r = nextRandom(rng); rng = r.state;
  const pick = can[Math.floor(r.value * can.length)] ?? null;
  r = nextRandom(rng); rng = r.state;
  if (pick && r.value <= PLAY_CHANCE) laid.A = pick;
  const d = decide(state, 'B', RIVAL, rng); rng = d.rng;
  laid.B = d.cardId;
  return { laid, rng };
}

/** `nobody` plays a match without cards and without half-time talks: the football alone. */
/** The match's kick-off: both benches with a dealt loadout (the rival's built around his tells), or none. */
function kickoff(seed: number, nobody = false): MatchState {
  if (nobody) return newMatch(TEAM_A, TEAM_B, seed);
  const a = dealDraft(seed * 31 + 5);
  const b = dealDraft(a.rng, signature(RIVAL));
  return newMatch({ ...TEAM_A, loadout: toLoadout(a.draft) }, { ...TEAM_B, loadout: toLoadout(b.draft) }, seed);
}

function runMatch(seed: number, onPanel?: (p: Panel, s: MatchState) => void, nobody = false, onTalk?: (said: Record<Side, Said | null>) => void): MatchState {
  let state = kickoff(seed, nobody);
  let rng = seed * 7919 + 17;
  while (!state.over) {
    const pol = nobody ? { laid: { A: null, B: null }, rng } : policy(state, rng); rng = pol.rng;
    const res = step(state, pol.laid);
    onPanel?.(res.panel, res.state);
    state = res.state;
    if (!nobody && res.panel.half === 1 && state.half === 2) {
      // A says something at random, B what his habit says
      const offers = talksFor(state, 'A');
      const r = nextRandom(rng); rng = r.state;
      const ht = halftime(state, { A: offers[Math.floor(r.value * offers.length)] ?? null, B: rivalTalk(state, 'B', RIVAL) });
      state = ht.state;
      onTalk?.(ht.said);
    }
  }
  return state;
}

// ---- Printing -----------------------------------------------------------

const cardName = (id: string | null) => (id ? cardById.get(id)?.name ?? id : '–');
const PILE_NAME: Record<CardSide, string> = { ball: 'mit Ball', noball: 'ohne Ball' };
const SITUATION_NAME = { action: 'Ballaktion', challenge: 'Zweikampf', setpiece: 'Standard' } as const;

const slotName = (slot: Slot) => {
  const [pile, sit] = slot.split(':') as [CardSide, keyof typeof SITUATION_NAME];
  return `${SITUATION_NAME[sit]} ${PILE_NAME[pile]}`;
};

function hands(s: MatchState): string {
  return (['A', 'B'] as Side[])
    .map(side => `Repertoire ${side}:\n${SLOTS.map(slot => `  ${slotName(slot).padEnd(22)} ${s.teams[side].loadout[slot].map(cardName).join(' · ')}`).join('\n')}`)
    .join('\n');
}

function printPanel(p: Panel, s: MatchState, teams: Record<Side, string>): void {
  const cast = p.scene.cast.map(m => (m.side === p.scene.side ? m.player.name : `${m.player.name} (${m.side})`)).join(' · ');
  const fires = triggers(p.scene).map(t => `${t.member.player.short} ${firesLine(t)}`).join(' · ');
  const laidStr = (['A', 'B'] as Side[]).map(side => {
    if (!p.laid[side]) return `${side}: ${p.usable[side].length ? `nichts (hätte: ${p.usable[side].map(cardName).join(', ')})` : '–'}`;
    return `${side}: ${cardName(p.laid[side])}${p.result[side] ? ` (${p.result[side]})` : ''}`;
  }).join('   ');
  if (p.n === 1 || s.strip[p.n - 2]?.hl !== p.hl) console.log(`\n  ★ ${minuteLabel(p.minute, p.half)} ${p.title.toUpperCase()}`);
  console.log(`${String(p.n).padStart(2)}  [${SITUATION_NAME[p.scene.situation]}] ${p.scene.label.toUpperCase()} · ${p.scene.side} · ${p.scene.spot.where}   ${cast}`);
  if (p.scene.note) console.log(`    ⏱ ${p.scene.note}`);
  if (fires) console.log(`    ⚡ ${fires}`);
  if (p.usable.A.length || p.usable.B.length) console.log(`    ${laidStr}`);
  console.log(`    ▶ ${p.word}${p.actor ? ` (${p.actor.player.short})` : ''}`);
  for (const line of p.lines) console.log(`    ${line}`);
  for (const x of p.shifts) console.log(`    ~ ${x.line}`);
  if (p.goal) console.log(`    ⚽ TOR für ${teams[p.goal]}!  ${s.score.A}:${s.score.B}`);
  for (const side of p.banned) console.log(`    🟥 Trainer ${side} auf der Tribüne, ${K.banPanels} Bilder lang.`);
  if (!p.closes) { console.log(`    → ${p.nextLabel} (${p.nextSide})`); return; }
  if (s.gap) printGap(s.gap);
}

/** v0.27: the jump between two highlights, and what happened off camera. */
function printGap(g: Gap): void {
  console.log(`  ⏩ ${minuteLabel(g.from, g.half)} → ${minuteLabel(g.to, g.half)}`);
  for (const line of g.lines) console.log(`     ${line}`);
  for (const x of g.shifts) console.log(`     ~ ${x.line}`);
}

/** The form of both benches as the game shows it: words, with the hidden number beside them for the strip tool. */
function form(s: MatchState): string {
  return (['A', 'B'] as Side[]).map(side => `Form ${side}: ${GAUGES.map(g => `${g} ${WORDS[g][s.teams[side].shown[g]]} (${s.teams[side].gauges[g].toFixed(2)})`).join(' · ')}`).join('\n');
}

function printMatch(seed: number): void {
  const teams: Record<Side, string> = { A: TEAM_A.name, B: TEAM_B.name };
  const start = kickoff(seed);
  console.log(`${TEAM_A.name} (A) – ${TEAM_B.name} (B)   Seed ${seed}\n`);
  console.log(hands(start));
  console.log(`\n── 1. Halbzeit ${'─'.repeat(60)}`);
  if (start.gap) printGap(start.gap);
  let lastHalf = 1;
  let second: Gap | undefined;
  const end = runMatch(seed, (p, s) => {
    printPanel(p, s, teams);
    if (s.half !== lastHalf) {
      lastHalf = s.half;
      second = s.gap?.then;
      console.log(`\n── Halbzeit  ${s.score.A}:${s.score.B} ${'─'.repeat(50)}`);
      console.log(hands(s));
      console.log(form(s));
      for (const side of ['A', 'B'] as Side[]) {
        console.log(`Kabine ${side}: ${talksFor(s, side).map(o => `${o.label}${o.man ? ` (${o.man})` : ''}`).join(' · ')}`);
      }
    }
  }, false, said => {
    for (const side of ['A', 'B'] as Side[]) {
      const x = said[side];
      if (!x) continue;
      console.log(`  ${side} sagt: ${x.offer.label} ${x.offer.say}`);
      console.log(`    ${x.react}   [${Object.entries(x.moved).map(([g, v]) => `${g} ${v > 0 ? '+' : ''}${v}`).join(', ') || '–'}]`);
    }
    console.log(`\n── 2. Halbzeit ${'─'.repeat(60)}`);
    if (second) printGap(second);
  });
  console.log(`\n── Abpfiff  ${end.score.A}:${end.score.B} ${'─'.repeat(50)}`);
  console.log(form(end));
  for (const side of ['A', 'B'] as Side[]) {
    const t = end.teams[side];
    console.log(`Gespielt ${side}: ${t.played.map(cardName).join(' · ') || '–'}${t.banned > 0 ? '  (Trainer auf der Tribüne)' : ''}`);
  }
}

const SHOTS = new Set(['shot', 'header', 'through_on_goal', 'penalty']);

function printStats(n: number, nobody: boolean): void {
  const scenes = new Map<string, number>();
  const cardsPlayed = new Map<string, number>();
  const scoredFrom = new Map<string, number>();
  let highlights = 0;
  let goals = 0, panels = 0, heard = 0, ignored = 0, laid = 0, laidA = 0, dead = 0, bannedA = 0, setPanels = 0, shots = 0, flips = 0;
  const results = { A: 0, B: 0, draw: 0 };
  let depth = 0;
  for (let seed = 1; seed <= n; seed++) {
    const end = runMatch(seed, (p, s) => {
      panels++;
      if (p.closes) highlights++;
      scenes.set(p.scene.type, (scenes.get(p.scene.type) ?? 0) + 1);
      if (p.scene.situation === 'setpiece') setPanels++;
      if (SHOTS.has(p.scene.type)) shots++;
      if (p.nextSide !== p.scene.side) flips++;
      depth += p.scene.side === 'A' ? p.scene.pos.x : 1 - p.scene.pos.x;
      if (p.goal) { goals++; scoredFrom.set(p.scene.label, (scoredFrom.get(p.scene.label) ?? 0) + 1); }
      if (p.laid.A) laidA++; else if (s.teams.A.banned > 0 || p.banned.includes('A')) bannedA++; else dead++;
      for (const side of ['A', 'B'] as Side[]) {
        if (p.laid[side]) { laid++; cardsPlayed.set(p.laid[side] as string, (cardsPlayed.get(p.laid[side] as string) ?? 0) + 1); }
        if (p.result[side] === 'heard') heard++;
        if (p.result[side] === 'ignored') ignored++;
      }
    }, nobody);
    if (end.score.A > end.score.B) results.A++; else if (end.score.B > end.score.A) results.B++; else results.draw++;
  }
  const per = (x: number) => (x / n).toFixed(1);
  console.log(`${n} Spiele${nobody ? ' ohne Karten' : ''}, ${per(highlights)} Highlights und ${per(panels)} Bilder pro Spiel. Tore/Spiel ${(goals / n).toFixed(2)}. A ${results.A} · Remis ${results.draw} · B ${results.B}`);
  console.log(`Abschlussbilder/Spiel ${per(shots)} · Standards ${(100 * setPanels / panels).toFixed(0)} % der Bilder · Ballwechsel/Spiel ${per(flips)} · A im Mittel bei x=${(depth / panels).toFixed(2)}`);
  if (!nobody) {
    console.log(`Karten gelegt/Spiel ${per(laid)}. A legt in ${(100 * laidA / panels).toFixed(0)} % der Bilder (${(100 * dead / panels).toFixed(0)} % nichts Passendes, ${(100 * bannedA / panels).toFixed(0)} % Tribüne). Zurufe gehört ${(100 * heard / (heard + ignored)).toFixed(0)} %`);
  }
  console.log('\nBilder nach Typ:');
  for (const [id, c] of [...scenes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${(sceneById.get(id)?.label ?? id).padEnd(22)} ${(100 * c / panels).toFixed(1).padStart(5)} %`);
  }
  console.log('\nTore aus:');
  for (const [label, c] of [...scoredFrom.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${label.padEnd(22)} ${(c / n).toFixed(2)}/Spiel`);
  if (nobody) return;
  console.log('\nKarten gespielt:');
  for (const [id, c] of [...cardsPlayed.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cardName(id).padEnd(26)} ${c}`);
  }
}

// ---- Values ------------------------------------------------------------
// V(kind, place) = P(the side at the ball scores the next goal), no clock. The pitch is a grid; every
// scene type is built at every cell with a handful of casts of both rosters, and the Markov chain runs
// over (type, cell). A shout's worth in a panel is the change in V for the bench that laid it, per cell
// and cast: min and max say *where* on the pitch it is worth least and most.

const TEAMS = { A: TEAM_A, B: TEAM_B };
const NX = 20, NY = 7, CASTS = 8;
const signed = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(100 * x).toFixed(0).padStart(2)}`;

const cellOf = (p: Pos): [number, number] =>
  [Math.min(NX - 1, Math.max(0, Math.floor(p.x * NX))), Math.min(NY - 1, Math.max(0, Math.floor(p.y * NY)))];
const centre = (i: number, j: number): Pos => at((i + 0.5) / NX, (j + 0.5) / NY);
/** A scene type at a place, keyed by where it really is once the type has placed it. */
function keyOf(type: string, p: Pos): string {
  const t = sceneById.get(type)!;
  const [i, j] = cellOf(t.place ? t.place(p) : p);
  return `${type}@${i},${j}`;
}

interface State { key: string; scenes: Scene[]; probs: number[] }

function probs(scene: Scene, shouts: CardEffect[] = []): number[] {
  const w = tiltedWeights(scene, shouts);
  const total = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / total);
}

function buildStates(): Map<string, State> {
  const states = new Map<string, State>();
  let rng = 42;
  for (const t of SCENES) {
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NY; j++) {
        const key = keyOf(t.id, centre(i, j));
        if (states.has(key)) continue;
        const scenes: Scene[] = [];
        for (let c = 0; c < CASTS; c++) {
          const s = makeScene(t.id, c % 2 ? 'A' : 'B', centre(i, j), TEAMS, rng); rng = s.rng;
          scenes.push(s.scene);
        }
        const acc = scenes[0]!.rows.map(() => 0);
        for (const sc of scenes) probs(sc).forEach((x, k) => { acc[k] = (acc[k] as number) + x / scenes.length; });
        states.set(key, { key, scenes, probs: acc });
      }
    }
  }
  return states;
}

/** Where a row leads: the key of the next state, and whether the ball changed hands. */
function edge(scene: Scene, rowIndex: number): { goal: boolean; key: string; flip: boolean } {
  const row = scene.rows[rowIndex]!;
  if (row.next === GOAL) return { goal: true, key: '', flip: false };
  const to = row.to ?? scene.pos;
  return { goal: false, key: keyOf(row.next, row.flip ? mirror(to) : to), flip: !!row.flip };
}

function valueOf(scene: Scene, p: number[], v: Map<string, number>): number {
  let x = 0;
  p.forEach((pi, k) => {
    const e = edge(scene, k);
    x += e.goal ? pi : pi * (e.flip ? 1 - (v.get(e.key) ?? 0.5) : (v.get(e.key) ?? 0.5));
  });
  return x;
}

/**
 * The places a match can actually get to: from the kick-off along every row, and into every drama
 * scene a card can force from there. A shot in front of our own goal is a state of the grid, not of
 * football, and it must not decide what a card is worth.
 */
function reachable(states: Map<string, State>): Set<string> {
  const start = keyOf('kickoff', { x: 0.5, y: 0.5 });
  const seen = new Set([start]);
  const queue = [start];
  const steers = CARDS.filter(c => c.effect.kind === 'steer');
  while (queue.length) {
    const st = states.get(queue.pop() as string);
    if (!st) continue;
    const sc = st.scenes[0]!;
    const next: string[] = sc.rows.map((_, k) => edge(sc, k)).filter(e => !e.goal).map(e => e.key);
    for (const c of steers) {
      const e = c.effect as Extract<CardEffect, { kind: 'steer' }>;
      for (const side of ['A', 'B'] as Side[]) {
        if (!moves(c, sc, side)) continue;
        const nextSide = e.initiative === 'keep' ? sc.side : e.initiative === 'flip' ? other(sc.side) : side;
        next.push(keyOf(e.next, nextSide === sc.side ? sc.pos : mirror(sc.pos)));
      }
    }
    for (const k of next) if (!seen.has(k)) { seen.add(k); queue.push(k); }
  }
  return seen;
}

function sceneValues(states: Map<string, State>): Map<string, number> {
  const v = new Map([...states.keys()].map(k => [k, 0.5]));
  for (let it = 0; it < 200; it++) {
    for (const st of states.values()) v.set(st.key, valueOf(st.scenes[0]!, st.probs, v));
  }
  return v;
}

/** The value of one scene type over the pitch, as a small map: our goal on the left, theirs on the right. */
function printMap(type: string, v: Map<string, number>): void {
  console.log(`\n  ${sceneById.get(type)!.label}: Chance aufs nächste Tor, eigenes Tor links, gegnerisches rechts`);
  for (let j = 0; j < NY; j++) {
    const line: string[] = [];
    for (let i = 0; i < NX; i += 1) line.push(String(Math.round(100 * (v.get(keyOf(type, centre(i, j))) ?? 0))).padStart(3));
    console.log(`   ${line.join('')}`);
  }
}

function printValues(): void {
  const all = buildStates();
  const v = sceneValues(all);
  const reach = reachable(all);
  const states = new Map([...all].filter(([k]) => reach.has(k)));
  console.log(`${states.size} von ${all.size} Bildern (Typ × Ort) sind im Spiel erreichbar; nur die zählen unten.`);
  console.log('Wert eines Bildes = Chance, dass die Seite am Ball das nächste Tor macht (ohne Uhr, über Besetzungen gemittelt).');
  for (const type of ['play', 'freekick', 'throwin']) printMap(type, v);
  console.log('\n  Feste Orte:');
  for (const type of ['kickoff', 'goalkick', 'keeperball', 'corner', 'penalty', 'through_on_goal', 'header']) {
    console.log(`   ${sceneById.get(type)!.label.padEnd(22)} ${(100 * (v.get(keyOf(type, { x: 0.5, y: 0.2 })) ?? 0)).toFixed(0).padStart(3)} %`);
  }

  console.log('\nZurufe: was sie der rufenden Bank bringen, in Prozentpunkten, pro Bildtyp über alle Orte und Besetzungen.');
  console.log('min [wo] · Median · max [wo] · in wie vielen Orten spielbar');
  for (const c of CARDS.filter(c => c.effect.kind === 'shout')) {
    console.log(`\n  ${c.name}  (${PILE_NAME[c.side]})`);
    const byType = new Map<string, { d: number; where: string }[]>();
    const cells = new Map<string, number>();
    for (const st of states.values()) {
      for (const sc of st.scenes) {
        const mine = c.side === 'ball';
        const side = mine ? sc.side : other(sc.side);
        if (!moves(c, sc, side)) continue;
        const d = valueOf(sc, probs(sc, [c.effect]), v) - valueOf(sc, probs(sc), v);
        const list = byType.get(sc.type) ?? [];
        list.push({ d: mine ? d : -d, where: sc.spot.where });
        byType.set(sc.type, list);
        cells.set(sc.type, (cells.get(sc.type) ?? 0) + 1 / CASTS);
      }
    }
    for (const [type, rows] of byType) {
      rows.sort((a, b) => a.d - b.d);
      const lo = rows[0]!, mid = rows[rows.length >> 1]!, hi = rows[rows.length - 1]!;
      const places = new Set([...states.values()].filter(st => st.key.startsWith(`${type}@`))).size;
      console.log(`    ${sceneById.get(type)!.label.padEnd(20)} ${signed(lo.d)} [${lo.where}] · ${signed(mid.d)} · ${signed(hi.d)} [${hi.where}]  ${Math.round(cells.get(type) ?? 0)}/${places}`);
    }
  }

  console.log('\nDrama: was das erzwungene Bild der Bank bringt, die es legt (Median über Orte).');
  for (const c of CARDS.filter((c): c is Card & { effect: Extract<CardEffect, { kind: 'steer' }> } => c.effect.kind === 'steer')) {
    const e = c.effect;
    const by = new Map<string, number[]>();
    for (const st of states.values()) {
      const sc = st.scenes[0]!;
      const att = c.side === 'ball';
      const layer = att ? sc.side : other(sc.side);
      if (!moves(c, sc, layer)) continue;
      const nextSide = e.initiative === 'keep' ? sc.side : e.initiative === 'flip' ? other(sc.side) : layer;
      const after = v.get(keyOf(e.next, nextSide === sc.side ? sc.pos : mirror(sc.pos))) ?? 0.5;
      const mineAfter = nextSide === layer ? after : 1 - after;
      const before = layer === sc.side ? (v.get(st.key) as number) : 1 - (v.get(st.key) as number);
      const list = by.get(sc.type) ?? [];
      list.push(mineAfter - before);
      by.set(sc.type, list);
    }
    const parts = [...by].map(([type, list]) => `${sceneById.get(type)!.label} ${signed(list.sort((a, b) => a - b)[list.length >> 1]!)}`);
    console.log(`  ${c.name.padEnd(22)} → ${sceneById.get(e.next)!.label.padEnd(22)} ${parts.join(' · ')}`);
  }
}

/**
 * The health check of the pool: per scene type, how often each bench has a skill of the pool to use
 * there at all, and how often each of its slot's three does something — a card that rarely does is
 * rarely dealt in a draft (loadout.ts `reach`).
 */
function printCover(): void {
  const all = buildStates();
  const reach = reachable(all);
  const states = new Map([...all].filter(([k]) => reach.has(k)));
  console.log('Wie oft die Bank im Bild eine Karte gezeigt bekommt (über alle Orte), und wie oft jede ihrer drei etwas bewegt:');
  interface Count { slot: Slot; any: number; live: Map<string, number>; n: number }
  const byType = new Map<string, { att: Count; def: Count }>();
  for (const st of states.values()) {
    const sc = st.scenes[0]!;
    const count = (side: Side): Count => ({ slot: slotFor(sc, side), any: 0, live: new Map(), n: 0 });
    const ent = byType.get(sc.type) ?? { att: count(sc.side), def: count(other(sc.side)) };
    for (const [side, e] of [[sc.side, ent.att], [other(sc.side), ent.def]] as const) {
      e.n += 1;
      const live = POOL[e.slot].filter(id => moves(cardById.get(id) as Card, sc, side));
      if (live.length) e.any += 1;
      for (const id of live) e.live.set(id, (e.live.get(id) ?? 0) + 1);
    }
    byType.set(sc.type, ent);
  }
  const pct = (x: number, n: number) => `${Math.round(100 * x / n)} %`;
  const show = (e: Count) =>
    `${pct(e.any, e.n).padStart(5)}  ${slotName(e.slot).padEnd(22)} ${POOL[e.slot].map(id => `${cardName(id)} ${pct(e.live.get(id) ?? 0, e.n)}`).join(' · ')}`;
  for (const [type, e] of byType) {
    console.log(`  ${sceneById.get(type)!.label.padEnd(22)} am Ball ${show(e.att)}`);
    console.log(`  ${''.padEnd(22)} dagegen ${show(e.def)}`);
  }
}

/** v0.26: what the draft deals by — per situation, how often each skill of the pool does anything. */
function printReach(): void {
  for (const [slot, r] of reach()) {
    const list = [...r].sort((a, b) => b[1] - a[1]).map(([id, x]) => `${cardName(id)} ${Math.round(100 * x)}`);
    console.log(`${slotName(slot)}:\n  ${list.join(' · ')}`);
  }
}

const args = process.argv.slice(2);
const statsAt = args.indexOf('--stats');
if (statsAt >= 0) printStats(Number(args[statsAt + 1] ?? 200), args.includes('--nobody'));
else if (args.includes('--values')) printValues();
else if (args.includes('--cover')) printCover();
else if (args.includes('--reach')) printReach();
else printMatch(Number(args[0] ?? 1));
