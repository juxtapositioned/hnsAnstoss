// Everything the engine knows. No DOM, no logic here — see match.ts.

export type Side = 'A' | 'B';
export type Role = 'keeper' | 'defender' | 'midfielder' | 'winger' | 'striker';   // keeper is never named by a situation — he is there so the team is eleven
export type OutcomeSide = 'att' | 'def' | 'neutral';
/** Who acts in a situation, relative to the attacker. Exactly one side acts per situation. */
export type Turn = 'att' | 'def';
export const GOAL = 'GOAL';
export const OVER = 'OVER';
/** "Play on": back to the situation the bench acted on. Only card-only situations use it. */
export const ORIGIN = 'ORIGIN';
export type Next = string | typeof GOAL | typeof OVER | typeof ORIGIN;

/** Placeholders — see DESIGN 2.6. Not a system to build on yet. */
export interface TeamStats {
  favor: number;      // 0..10
  motivation: number; // 0..10
  fitness: number;    // 0..10
}

/** The coach's game plan, set before kick-off. Tempo applies while attacking, press while defending. */
export type Tempo = 'patient' | 'direct';
export type Press = 'deep' | 'high';
export interface Plan {
  tempo: Tempo;
  press: Press;
}

/**
 * A card rewrites the table before the god rolls. Effects apply in order.
 * `multiply` is for passives (player specials, match modifiers) — cards do graph surgery, not arithmetic.
 */
export type Effect =
  | { kind: 'multiply'; target: string | OutcomeSide; factor: number }
  | { kind: 'convert'; from: string; label: string; next: Next; side: OutcomeSide }   // rename an outcome and send it elsewhere
  | { kind: 'add'; label: string; weight: number; next: Next; side: OutcomeSide }     // a new row
  | { kind: 'redirect'; from: string; next: Next }                                    // same outcome, different destination
  | { kind: 'replace'; situation: string }                                            // the situation becomes another one
  | { kind: 'plan'; dial: 'tempo'; value: Tempo }                                     // change your own plan for the rest of the match
  | { kind: 'plan'; dial: 'press'; value: Press }
  | { kind: 'match'; label: string; target: string | OutcomeSide; factor: number };   // for the rest of the match, every situation

/**
 * What an outcome does to the match beyond where the ball goes next. This is where a shout costs
 * something: the red card stays, the banned coach stays banned, the injured player is gone.
 * `team` is relative to the attacker of the situation.
 */
export type Consequence =
  | { kind: 'red_card'; team: Turn; role?: Role }   // a player of that team leaves; with role: one of that role, else the named player (att) or a defender (def)
  | { kind: 'coach_banned'; team: Turn }            // that bench plays no more cards this match
  | { kind: 'injury' };                             // the named player goes off; a bench player of his role comes on if there is one and a sub is left

/** A passive that fires when this player is the one named in `situation`. */
export interface Special {
  situation: string;
  text: string;
  effects: Effect[];
}

export interface Player {
  name: string;
  role: Role;
  special?: Special;
}

export interface Outcome {
  label: string;
  weight: number;
  side: OutcomeSide;
  next: Next;
  turnover?: boolean;       // the other team has the ball: `next` is played with the attacker swapped, same attack
  then?: Consequence[];
}

export interface Situation {
  id: string;
  text: string;         // may contain {player}
  role: Role;           // which lineup role is named
  outcomes: Outcome[];
}

export type CardKind = 'shout' | 'event';

/**
 * Shouts are the coach's deck. Events are the world: they are never in a hand, the god draws them
 * himself from the world pile as a situation arises (`side` is meaningless for them).
 */
export interface Card {
  id: string;
  name: string;
  text: string;
  kind: CardKind;
  side: Turn | 'any';           // playable in your attacking turn, your defending turn, or either
  situations: string[] | 'any';
  effects: Effect[];
}

export interface TeamSetup {
  name: string;
  stats: TeamStats;
  plan: Plan;
  lineup: Player[];             // starters
  bench: Player[];
  deck: string[];               // shout ids, the pool; K.pileAtt attacking and K.pileDef defending ones are dealt for the match
}

export interface TeamRuntime extends TeamSetup {
  hand: string[];               // up to K.handAtt attacking and K.handDef defending shouts; refilled after every action
  attPile: string[];
  defPile: string[];
  played: string[];
  subsLeft: number;
  menDown: number;              // players sent off or carried off without a replacement
  coachBanned: boolean;         // sent to the stands: no more cards
}

export interface MatchModifier {
  label: string;
  target: string | OutcomeSide;
  factor: number;
}

export interface OddsRow {
  label: string;
  next: Next;
  side: OutcomeSide;
  weight: number;
  pct: number;
  turnover?: boolean;
  then?: Consequence[];
}

export interface Resolution {
  originId: string;             // the situation as it arose
  eventId: string | null;       // the world event that hit it, if any
  actedId: string;              // the situation the bench acted on (after the event)
  situationId: string;          // the situation that was rolled (after a card's replace)
  playerName: string;
  attacker: Side;
  turn: Turn;                   // who acted
  cardId: string | null;        // null = let them play
  subLine: string | null;       // "Kalle on for Bello"
  base: OddsRow[];              // the table before the card — what the bench changed
  odds: OddsRow[];
  outcome: OddsRow;
  lines: string[];              // plan changes, match modifiers, consequences
  comment: string;              // Stadionsprecher / Zaun — flavour only
}

export type Phase = 'choose' | 'resolved' | 'finished';

export interface MatchState {
  seed: number;
  rng: number;                  // mulberry32 state
  teams: Record<Side, TeamRuntime>;
  modifiers: MatchModifier[];   // from events, for the rest of the match
  worldPile: string[];          // event card ids the god has not drawn yet
  score: Record<Side, number>;
  attacksTotal: number;
  attackIndex: number;          // 0-based
  attacker: Side;
  originId: string;             // the situation as it arose, before any world event
  eventId: string | null;       // the world event on the current situation
  situationId: string;          // the situation the bench acts on
  step: number;                 // 0-based index of the situation within the attack
  playerName: string;           // who is named in the current situation
  turn: Turn;                   // who acts in this situation; flips after every situation, also across attacks
  phase: Phase;
  last: Resolution | null;
  log: string[];
}

export type Action =
  | { type: 'let_play' }                          // trust the plan; the god rolls the table as it stands
  | { type: 'play'; cardId: string }              // one shout on top
  | { type: 'sub'; inName: string }               // bring on a bench player for the starter of the same role; then let them play
  | { type: 'continue' };
