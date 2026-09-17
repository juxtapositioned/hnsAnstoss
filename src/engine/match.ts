// The match as pure functions: createMatch, reduce(state, action) → state. No DOM, no globals.
//
// The player is the coach. Every situation has exactly one acting bench: they let the players play,
// or put one shout on top, or make a substitution — then the god rolls, the situation changes, and
// the other bench acts in the new one. The turn alternates across the whole match, also over the
// attack boundary, so the side that opens an attack varies.
// A card rewrites the table before the roll; that is the only thing a card does. The hand refills
// from a finite pile after every action, so there is nearly always a shout on offer. The world (events)
// is not in anybody's hand: when a situation arises, the god may draw one from the world pile.
// Some outcomes carry consequences that stay: a red card, a banned coach, an injury. Some outcomes
// are turnovers: the other team has the ball, the same attack goes on the other way.

import { DIAL_LABEL, EVENT_POOL, K, PLAN_LABEL, PRESS, START_SITUATION, TEMPO, cardById, situationById } from './data';
import { commentLine, kickoffLine } from './commentary';
import { nextRandom, shuffle } from './rng';
import type {
  Action, Card, Consequence, Effect, MatchModifier, MatchState, OddsRow, Outcome, Player, Resolution, Side, TeamRuntime, TeamSetup, Turn,
} from './types';
import { GOAL, ORIGIN, OVER } from './types';

export const other = (s: Side): Side => (s === 'A' ? 'B' : 'A');

/** Who acts in the current situation. */
export function actor(state: MatchState): Side {
  return state.turn === 'att' ? state.attacker : other(state.attacker);
}

export function isAttacking(state: MatchState, side: Side): boolean {
  return state.attacker === side;
}

// ---- Setup --------------------------------------------------------------

export function createMatch(a: TeamSetup, b: TeamSetup, seed: number): MatchState {
  let rng = seed;
  const teams = {} as Record<Side, TeamRuntime>;
  for (const [side, setup] of [['A', a], ['B', b]] as const) {
    const pool = setup.deck.filter(id => cardById.get(id)?.kind === 'shout');
    const att = shuffle(pool.filter(id => cardById.get(id)!.side === 'att'), rng);
    const def = shuffle(pool.filter(id => cardById.get(id)!.side === 'def'), att.state);
    rng = def.state;
    const attPile = att.items.slice(0, K.pileAtt), defPile = def.items.slice(0, K.pileDef);
    teams[side] = {
      ...setup,
      stats: { ...setup.stats },
      plan: { ...setup.plan },
      lineup: setup.lineup.slice(),
      bench: setup.bench.slice(),
      deck: [...attPile, ...defPile],
      hand: [...attPile.slice(0, K.handAtt), ...defPile.slice(0, K.handDef)],
      attPile: attPile.slice(K.handAtt),
      defPile: defPile.slice(K.handDef),
      played: [],
      subsLeft: K.subs,
      menDown: 0,
      coachBanned: false,
    };
  }
  const world = shuffle(EVENT_POOL, rng);
  rng = world.state;
  const state: MatchState = {
    seed, rng, teams,
    modifiers: [],
    worldPile: world.items,
    score: { A: 0, B: 0 },
    attacksTotal: K.attacks,
    attackIndex: 0,
    attacker: 'A',
    originId: START_SITUATION,
    eventId: null,
    situationId: START_SITUATION,
    step: 0,
    playerName: '',
    turn: 'att',
    phase: 'choose',
    last: null,
    log: [kickoffLine(seed), `${a.name} greifen zuerst an.`],
  };
  return enter(state, START_SITUATION, true);
}

/** A situation arises: the god may draw a world event on it, then a player is named. */
function enter(state: MatchState, situationId: string, world: boolean): MatchState {
  let s: MatchState = { ...state, originId: situationId, situationId, eventId: null };
  if (world && s.worldPile.length) {
    const r = nextRandom(s.rng);
    s = { ...s, rng: r.state };
    if (r.value < K.eventChance) {
      const idx = s.worldPile.findIndex(id => {
        const c = cardById.get(id)!;
        return c.situations === 'any' || c.situations.includes(situationId);
      });
      if (idx >= 0) s = fireEvent(s, s.worldPile[idx]!);
    }
  }
  return pickPlayer(s);
}

function fireEvent(state: MatchState, eventId: string): MatchState {
  const card = cardById.get(eventId)!;
  let situationId = state.situationId;
  let modifiers = state.modifiers;
  const log = [...state.log, `Der Fußballgott: ${card.name.replace(/[!.]$/, '')}.`];
  for (const ef of card.effects) {
    if (ef.kind === 'replace') situationId = ef.situation;
    else if (ef.kind === 'match') {
      modifiers = [...modifiers, { label: ef.label, target: ef.target, factor: ef.factor }];
      log.push(`${ef.label}: den Rest des Spiels.`);
    }
  }
  return { ...state, situationId, eventId, modifiers, log, worldPile: state.worldPile.filter(id => id !== eventId) };
}

function pickPlayer(state: MatchState): MatchState {
  const sit = situationById.get(state.situationId)!;
  const lineup = state.teams[state.attacker].lineup;
  const pool = lineup.filter(p => p.role === sit.role);
  const candidates = pool.length ? pool : lineup.filter(p => p.role !== 'keeper');
  const r = nextRandom(state.rng);
  const player = candidates[Math.floor(r.value * candidates.length)]!;
  return { ...state, rng: r.state, playerName: player.name };
}

// ---- Odds ---------------------------------------------------------------

/** Placeholder tilt from the three team stats. Zero at equal stats. */
export function edge(state: MatchState): number {
  const att = state.teams[state.attacker].stats;
  const def = state.teams[other(state.attacker)].stats;
  const raw = K.wFavor * (att.favor - def.favor)
    + K.wMot * (att.motivation - def.motivation)
    + K.wFit * (att.fitness - def.fitness);
  return Math.max(-K.edgeCap, Math.min(K.edgeCap, raw)) / K.edgeCap;
}

export function canPlay(state: MatchState, card: Card): boolean {
  if (card.kind !== 'shout') return false;
  if (state.teams[actor(state)].coachBanned) return false;
  if (card.side !== 'any' && card.side !== state.turn) return false;
  return card.situations === 'any' || card.situations.includes(state.situationId);
}

export function playableCards(state: MatchState): Card[] {
  return state.teams[actor(state)].hand
    .map(id => cardById.get(id)!)
    .filter(c => canPlay(state, c));
}

/** The special of the player named in the current situation, if it applies here. */
export function activeSpecial(state: MatchState) {
  const p = state.teams[state.attacker].lineup.find(p => p.name === state.playerName);
  return p?.special && p.special.situation === state.situationId ? p.special : null;
}

/** Bench players the acting side may bring on now: same role as some starter, subs left. */
export function availableSubs(state: MatchState): Player[] {
  const t = state.teams[actor(state)];
  if (t.subsLeft <= 0) return [];
  return t.bench.filter(b => t.lineup.some(p => p.role === b.role));
}

/** Who goes off for `inName`: a starter of the same role, preferably not the one on the ball right now. */
export function subTarget(state: MatchState, inName: string): Player | null {
  const t = state.teams[actor(state)];
  const b = t.bench.find(p => p.name === inName);
  if (!b) return null;
  const same = t.lineup.filter(p => p.role === b.role);
  return same.find(p => p.name !== state.playerName) ?? same[0] ?? null;
}

export interface Odds {
  situationId: string;          // the situation the rows belong to (differs from the state's after a replace)
  rows: OddsRow[];
}

function matches(o: Outcome, target: string): boolean {
  return o.label === target || o.side === target;
}

/** The base table of a situation as the two plans, the men on the pitch and the match modifiers have set it. */
function planned(state: MatchState, situationId: string): Outcome[] {
  const sit = situationById.get(situationId)!;
  const e = edge(state);
  const tempo = TEMPO[state.teams[state.attacker].plan.tempo][situationId] ?? {};
  const press = PRESS[state.teams[other(state.attacker)].plan.press][situationId] ?? {};
  const attDown = state.teams[state.attacker].menDown;
  const defDown = state.teams[other(state.attacker)].menDown;
  let rows: Outcome[] = sit.outcomes.map(o => {
    let w = o.weight;
    w *= o.side === 'att' ? 1 + K.edgeTilt * e : o.side === 'def' ? 1 - K.edgeTilt * e : 1;
    w *= tempo[o.label] ?? 1;
    w *= press[o.label] ?? 1;
    if (o.side === 'att') w *= Math.pow(K.manDownAtt, attDown);
    if (o.side === 'def') w *= Math.pow(K.manDownDef, defDown);
    return { ...o, weight: w };
  });
  for (const m of state.modifiers) rows = applyMultiply(rows, m.target, m.factor);
  return rows;
}

function applyMultiply(rows: Outcome[], target: string, factor: number): Outcome[] {
  return rows.map(o => matches(o, target) ? { ...o, weight: o.weight * factor } : o);
}

function applyEffects(state: MatchState, situationId: string, rows: Outcome[], effects: Effect[]): { situationId: string; rows: Outcome[] } {
  for (const ef of effects) {
    switch (ef.kind) {
      case 'multiply':
        rows = applyMultiply(rows, ef.target, ef.factor);
        break;
      case 'convert':
        rows = rows.map(o => o.label === ef.from ? { ...o, label: ef.label, next: ef.next, side: ef.side, turnover: false } : o);
        break;
      case 'add':
        rows = [...rows, { label: ef.label, weight: ef.weight, next: ef.next, side: ef.side }];
        break;
      case 'redirect':
        rows = rows.map(o => o.label === ef.from ? { ...o, next: ef.next, turnover: false } : o);
        break;
      case 'replace':
        situationId = ef.situation;
        rows = planned(state, situationId);
        break;
      case 'match':
        rows = applyMultiply(rows, ef.target, ef.factor);   // applies now too; stored at resolution
        break;
      case 'plan':
        break;                                              // applied at resolution, for the situations after this one
    }
  }
  return { situationId, rows };
}

/** Odds for the current situation: plans and modifiers, then the named player's special, then the card. */
export function computeOdds(state: MatchState, cardId: string | null): Odds {
  let situationId = state.situationId;
  let rows = planned(state, situationId);

  const special = activeSpecial(state);
  if (special) ({ rows } = applyEffects(state, situationId, rows, special.effects));

  const card = cardId ? cardById.get(cardId) : undefined;
  if (card) ({ situationId, rows } = applyEffects(state, situationId, rows, card.effects));

  rows = rows.filter(o => o.weight > 0);
  const total = rows.reduce((s, o) => s + o.weight, 0) || 1;
  return { situationId, rows: rows.map(o => ({ ...o, pct: (o.weight / total) * 100 })) };
}

// ---- Actions ------------------------------------------------------------

export function reduce(state: MatchState, action: Action): MatchState {
  switch (action.type) {
    case 'let_play':
      if (state.phase !== 'choose') return state;
      return resolve(state, null, null);
    case 'play': {
      if (state.phase !== 'choose') return state;
      const card = cardById.get(action.cardId);
      if (!card || !canPlay(state, card)) return state;
      const side = actor(state);
      if (!state.teams[side].hand.includes(card.id)) return state;
      return resolve(playCard(state, side, card.id), card.id, null);
    }
    case 'sub': {
      if (state.phase !== 'choose') return state;
      const side = actor(state);
      const out = subTarget(state, action.inName);
      const t = state.teams[side];
      const inP = t.bench.find(p => p.name === action.inName);
      if (!out || !inP || t.subsLeft <= 0) return state;
      const team: TeamRuntime = {
        ...t,
        subsLeft: t.subsLeft - 1,
        lineup: t.lineup.map(p => p === out ? inP : p),
        bench: t.bench.filter(p => p !== inP),
      };
      return resolve({ ...state, teams: { ...state.teams, [side]: team } }, null, `${inP.name} kommt für ${out.name}`);
    }
    case 'continue':
      if (state.phase !== 'resolved') return state;
      return advance(state);
  }
}

/** Played cards leave the hand for good. */
function playCard(state: MatchState, side: Side, cardId: string): MatchState {
  const t = state.teams[side];
  const team: TeamRuntime = { ...t, hand: t.hand.filter(id => id !== cardId), played: [...t.played, cardId] };
  return { ...state, teams: { ...state.teams, [side]: team } };
}

/** After acting, the bench draws back up to K.handAtt attacking and K.handDef defending shouts while the piles last. */
function refill(state: MatchState, side: Side): MatchState {
  const t = state.teams[side];
  const held = (s: 'att' | 'def') => t.hand.filter(id => cardById.get(id)!.side === s).length;
  const nA = Math.min(Math.max(0, K.handAtt - held('att')), t.attPile.length);
  const nD = Math.min(Math.max(0, K.handDef - held('def')), t.defPile.length);
  if (!nA && !nD) return state;
  const team: TeamRuntime = {
    ...t,
    hand: [...t.hand, ...t.attPile.slice(0, nA), ...t.defPile.slice(0, nD)],
    attPile: t.attPile.slice(nA),
    defPile: t.defPile.slice(nD),
  };
  return { ...state, teams: { ...state.teams, [side]: team } };
}

function roll(rows: OddsRow[], rng: number): { row: OddsRow; rng: number } {
  const r = nextRandom(rng);
  let x = r.value * 100;
  for (const row of rows) {
    x -= row.pct;
    if (x < 0) return { row, rng: r.state };
  }
  return { row: rows[rows.length - 1]!, rng: r.state };
}

// ---- Consequences -------------------------------------------------------

function pickOne<T>(items: T[], rng: number): { item: T | undefined; rng: number } {
  if (!items.length) return { item: undefined, rng };
  const r = nextRandom(rng);
  return { item: items[Math.floor(r.value * items.length)], rng: r.state };
}

/** Apply what the rolled outcome does to the teams. Returns the changed teams, the new rng and the lines to show. */
function applyConsequences(state: MatchState, teams: Record<Side, TeamRuntime>, rng: number, cons: Consequence[]): { teams: Record<Side, TeamRuntime>; rng: number; lines: string[] } {
  const lines: string[] = [];
  for (const c of cons) {
    if (c.kind === 'coach_banned') {
      const side = c.team === 'att' ? state.attacker : other(state.attacker);
      const t = teams[side];
      if (t.coachBanned) continue;
      teams = { ...teams, [side]: { ...t, coachBanned: true } };
      lines.push(`Trainer ${t.name} auf die Tribüne: keine Zurufe mehr, den Rest des Spiels.`);
    } else if (c.kind === 'red_card') {
      const side = c.team === 'att' ? state.attacker : other(state.attacker);
      const t = teams[side];
      let pool: Player[];
      if (c.role) pool = t.lineup.filter(p => p.role === c.role);
      else if (c.team === 'att') pool = t.lineup.filter(p => p.name === state.playerName);
      else pool = t.lineup.filter(p => p.role === 'defender');
      if (!pool.length) pool = t.lineup.filter(p => p.role !== 'keeper');
      const pick = pickOne(pool, rng);
      rng = pick.rng;
      if (!pick.item) continue;
      const off = pick.item;
      teams = { ...teams, [side]: { ...t, lineup: t.lineup.filter(p => p !== off), menDown: t.menDown + 1 } };
      lines.push(off.role === 'keeper'
        ? `Rot für ${off.name}, den Torwart. ${t.name} spielen mit ${11 - t.menDown - 1} Mann, im Tor steht jetzt der Kassenwart.`
        : `Rot für ${off.name}. ${t.name} spielen mit ${11 - t.menDown - 1} Mann, den Rest des Spiels.`);
    } else if (c.kind === 'injury') {
      const side = state.attacker;
      const t = teams[side];
      const off = t.lineup.find(p => p.name === state.playerName);
      if (!off) continue;
      const sub = t.subsLeft > 0 ? t.bench.find(b => b.role === off.role) : undefined;
      if (sub) {
        teams = { ...teams, [side]: { ...t, subsLeft: t.subsLeft - 1, lineup: t.lineup.map(p => p === off ? sub : p), bench: t.bench.filter(p => p !== sub) } };
        lines.push(`${off.name} kann nicht weiter. ${sub.name} kommt für ihn.`);
      } else {
        teams = { ...teams, [side]: { ...t, lineup: t.lineup.filter(p => p !== off), menDown: t.menDown + 1 } };
        lines.push(`${off.name} kann nicht weiter, und keiner mehr auf der Bank. ${t.name} spielen mit ${11 - t.menDown - 1} Mann.`);
      }
    }
  }
  return { teams, rng, lines };
}

function resolve(state: MatchState, cardId: string | null, subLine: string | null): MatchState {
  const side = actor(state);
  const odds = computeOdds(state, cardId);
  const rolled = roll(odds.rows, state.rng);
  const row = rolled.row;
  let rng = rolled.rng;

  // lasting effects: plan changes hit the actor's team, match modifiers hit everybody, consequences whoever the outcome names
  let teams = state.teams;
  let modifiers = state.modifiers;
  const lines: string[] = [];
  const card = cardId ? cardById.get(cardId) : undefined;
  for (const ef of card?.effects ?? []) {
    if (ef.kind === 'plan') {
      const t = teams[side];
      teams = { ...teams, [side]: { ...t, plan: { ...t.plan, [ef.dial]: ef.value } } };
      lines.push(`${t.name} stellen um: ${DIAL_LABEL[ef.dial]} → ${PLAN_LABEL[ef.value]}, den Rest des Spiels.`);
    } else if (ef.kind === 'match') {
      const m: MatchModifier = { label: ef.label, target: ef.target, factor: ef.factor };
      modifiers = [...modifiers, m];
      lines.push(`${ef.label}: den Rest des Spiels.`);
    }
  }
  if (row.then?.length) {
    const c = applyConsequences(state, teams, rng, row.then);
    teams = c.teams; rng = c.rng; lines.push(...c.lines);
  }
  if (subLine) lines.unshift(`${teams[side].name}: ${subLine}.`);

  const res: Resolution = {
    originId: state.originId,
    eventId: state.eventId,
    actedId: state.situationId,
    situationId: odds.situationId,
    playerName: state.playerName,
    attacker: state.attacker,
    turn: state.turn,
    cardId,
    subLine,
    base: cardId ? computeOdds(state, null).rows : odds.rows,
    odds: odds.rows,
    outcome: row,
    lines,
    comment: '',
  };
  res.comment = commentLine(res, state.seed, state.attackIndex, state.step);
  const what = card ? card.name : subLine ?? 'spielen lassen';
  const tail = row.next === GOAL ? '  ⚽ TOR!' : row.turnover ? '  ⇄ Konter' : '';
  const line = `${state.playerName} · ${state.teams[side].name}: ${what} → ${row.label.replace(/\{player\}/g, state.playerName)}${tail}`;
  return refill({ ...state, rng, teams, modifiers, phase: 'resolved', last: res, log: [...state.log, line, ...lines, `„${res.comment}“`] }, side);
}

/** The other side moves next — the turn alternates across the whole match, attacks included. */
function nextTurn(state: MatchState, attacker: Side): Turn {
  return other(actor(state)) === attacker ? 'att' : 'def';
}

function advance(state: MatchState): MatchState {
  const out = state.last!.outcome;
  let next = out.next;
  if (next === ORIGIN) next = state.last!.actedId;
  const step = state.step + 1;
  if (next !== GOAL && next !== OVER && step < K.maxSteps) {
    if (out.turnover) {
      const attacker = other(state.attacker);
      return enter({
        ...state, attacker, step, turn: nextTurn(state, attacker), phase: 'choose',
        log: [...state.log, `Konter: ${state.teams[attacker].name} haben den Ball.`],
      }, next, true);
    }
    return enter({ ...state, step, turn: nextTurn(state, state.attacker), phase: 'choose' }, next, out.next !== ORIGIN);
  }
  const score = next === GOAL
    ? { ...state.score, [state.attacker]: state.score[state.attacker] + 1 }
    : state.score;
  const attackIndex = state.attackIndex + 1;
  if (attackIndex >= state.attacksTotal) {
    const a = state.teams.A.name, b = state.teams.B.name;
    return {
      ...state, score, attackIndex, phase: 'finished',
      log: [...state.log, `Abpfiff. ${a} ${score.A} : ${score.B} ${b}. Ab ins Vereinsheim.`],
    };
  }
  // attacks alternate by index: the team that opened this attack is not the one that opens the next
  const attacker = attackIndex % 2 === 0 ? 'A' : 'B';
  return enter({
    ...state, score, attackIndex, attacker,
    step: 0, turn: nextTurn(state, attacker), phase: 'choose',
    log: [...state.log, `— Angriff ${attackIndex + 1}: ${state.teams[attacker].name}`],
  }, START_SITUATION, true);
}
