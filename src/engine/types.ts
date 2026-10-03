// Everything the scenes engine knows. No DOM, no timers, no logic here — see match.ts and sim.ts.
// Design: docs/DESIGN.md v0.14. Every panel is a situation at a place on the pitch; the place decides
// what can happen there and how likely it is (sim.ts). Every situation is one of three types — ball
// action, challenge, set piece — seen by the side with the ball, and mirrored for the side without it.
// Traits trigger in the picture for all to see. A shout pulls the dice of the panel onto one or two
// outcomes; a drama card forces a scene. v0.26: no deck. Before kick-off each coach picks three skills
// for each of the six situations (a `Loadout`); in a panel he may use one of the three of his situation,
// or none. Skills are still `Card` in the code — the name stayed, the card framing did not.

export type Side = 'A' | 'B';
/**
 * `duel`: a man faces a man. `box`: in front of goal. `setpiece`: a dead ball.
 * `attack`: open play with the ball going forward. `drama`: a scene only a card reaches. `wing`: out
 * wide. `upfield`: in the half the side with the ball attacks — where offside exists. `deep`: in front of
 * its own box, where a mistake is a chance for the others.
 */
export type Tag = 'attack' | 'defence' | 'setpiece' | 'keeper' | 'drama' | 'duel' | 'box' | 'wing' | 'upfield' | 'deep';
export type Role = 'keeper' | 'defender' | 'midfielder' | 'winger' | 'striker';
/**
 * What a row is, seen from the side that has the initiative in the panel. This is the vocabulary a
 * shout speaks: a card leans `#pfiff` or `#gefahr` and then works in every panel that has such a row,
 * in a normal scene and in a drama scene alike.
 * - `pfiff`: the referee gives the initiative side something.
 * - `gegenpfiff`: the referee gives it against them — a yellow for their man, a free kick for the others.
 * - `gefahr`: it becomes dangerous, or it is in.
 * - `fehler`: the side with the ball makes a mess of it.
 * - `geklaert`: the other side gets it away, blocks it, holds it.
 * Rows that are nobody's doing — the dog, the siren, a Schiedsrichterball — carry no tag: there is
 * nothing to shout there, and only a card that names the row by its id reaches them.
 */
export type RowTag = 'pfiff' | 'gegenpfiff' | 'gefahr' | 'fehler' | 'geklaert';

/**
 * The three kinds of situation (DESIGN §2.1, v0.14), seen from the side with the ball; for the other
 * side it is the same situation mirrored — their ball action, their challenge, their set piece.
 * - `action`: our man has the ball and time; nobody is on him. He picks: pass, long ball, cross, shot.
 * - `challenge`: an opponent is directly on him — a dribble, a tackle, a man against the keeper.
 * - `setpiece`: a dead ball — kick-off, goal kick, throw-in, free kick, corner, penalty.
 */
export type Situation = 'action' | 'challenge' | 'setpiece';

/** A row's `next` that scores for the initiative side instead of naming a scene type. */
export const GOAL = 'goal';

// ---- Place ----------------------------------------------------------------

/**
 * Where the ball is, seen from the side that has the initiative: `x` runs from that side's own goal
 * line (0) to the goal it attacks (1), `y` from its left touchline (0) to its right one (1). The
 * engine mirrors a position when the ball changes hands.
 */
export interface Pos {
  x: number;
  y: number;
}

/**
 * Where a panel is *drawn*: usually the ball's position, but a drama scene may happen at the fence or
 * towards the Gerätehaus (values outside 0..1). `flank` says a fixed spot may be drawn on either wing;
 * `where` is the German place name the panel says out loud ("im Strafraum", "am Zaun").
 */
export interface Spot extends Pos {
  flank?: boolean;
  where: string;
}

// ---- Scenes -------------------------------------------------------------

export interface CastSlot {
  slot: string;              // name used in row texts: {carrier}, {keeper}
  role: Role | Role[];       // which roster players may fill it
  of: 'init' | 'other';      // the initiative side or the other one
}

/** One row of a scene's table. Text may use {slot} placeholders and {where}. */
export interface Row {
  id: string;
  weight: number;
  next: string;              // scene type id or GOAL
  to?: Pos;                  // where the ball goes, in this panel's frame; none = it stays where it is
  flip?: boolean;            // initiative goes to the other side
  banned?: 'init' | 'other' | 'both';   // a coach is sent to the stands for a few panels
  word: string;              // the headline of the panel, one or two words: "FLANKE!", "BALL WEG"
  actor?: string;            // the cast slot the word belongs to: who did it
  tags?: RowTag[];           // what kind of row this is, seen from the side with the initiative
  text: string;
  alt?: string[];            // v0.25: other ways to say the same row; one of `text` and `alt` at random
  by?: Record<string, string[]>;   // v0.25: lines for an actor with this trait id ("zittert", and scores anyway)
  carry?: boolean;           // v0.25: the actor is the man on the ball in the next panel (he beat his man, he runs on)
  half?: boolean;            // v0.25: a half-chance — where a chance a defending card closed goes instead (match.ts)
  blocked?: string[];        // v0.25: how this row reads when it came because a defending card closed the bigger one
}

/** What a scene type makes of a place: the picture and its table. */
export interface Built {
  label: string;             // German panel title: "Flügellauf", "Freistoß"
  prompt: string | string[]; // what the panel shows before the dice, with {slot} and {where} placeholders; one at random
  cast: CastSlot[];
  rows: Row[];               // only rows that can happen here (weight > 0)
  tags: Tag[];
  spot?: Spot;               // where it is drawn, if not where the ball is
}

export interface SceneType {
  id: string;
  label: string;             // generic German label, for "→ Freistoß" chips
  situation: Situation;
  place?: (p: Pos) => Pos;   // where this situation really is, given where the ball came from
  build: (p: Pos) => Built;
  exclusive?: boolean;       // v0.25: only cards that name this scene type in `playableIn` are offered here (the kick-off)
}

// ---- People -------------------------------------------------------------

/** A trait's trigger: fires when its owner fills `slot` in one of `scene`. Shown on the panel, both benches see it. */
export interface Tilt {
  scene: string[];
  slot: string;
  row: string;
  factor: number;
}

export interface Trait {
  id: string;
  label: string;
  text: string;              // on the player card
  fires: string;             // the trigger line on the panel: what it makes likelier here, no numbers
  firesAs?: Record<string, string>;   // v0.25: the trigger line for a slot where `fires` would read wrong (a fast defender)
  tilts: Tilt[];
}

export interface Player {
  name: string;              // full name, for cast lists
  short: string;             // what the commentary calls him
  role: Role;
  traits: string[];
}

export interface CastMember {
  slot: string;
  side: Side;
  player: Player;
}

/** A panel's situation: a scene type at a place, built into its concrete picture and table. */
export interface Scene {
  type: string;
  side: Side;                // initiative
  pos: Pos;                  // where the ball is, in the initiative side's frame
  spot: Spot;                // where the panel is drawn
  label: string;
  prompt: string;
  rows: Row[];
  tags: Tag[];
  situation: Situation;
  cast: CastMember[];
  note?: string;             // v0.25: a line over the panel that says why it is here ("Nachspielzeit.")
}

// ---- Cards --------------------------------------------------------------

/** Who has the initiative in the panel this effect leads to, relative to the current one. `mine` = the card's side. */
export type Initiative = 'keep' | 'flip' | 'mine';

/**
 * A row selector: a row id ('flanke', 'kopfball'), '#tag' for every row of that kind (see `RowTag`),
 * 'flip' (rows that hand the ball over) or 'stay' (rows that keep it). Row ids are shared across scene
 * types on purpose: 'vorbei' is a miss anywhere; the tags are what make a shout reach a scene it never saw.
 */
export type RowPick = string;

/**
 * - shout: the panel's dice are pulled onto the `up` rows: their share of the table moves `pull` of the
 *   way towards certain (0.6: a 10 % cross becomes a 64 % cross), and the `down` rows lose `pull` of
 *   their weight. What *kind* of thing happens is the coach's; how it turns out stays with the dice —
 *   "Schieß!" makes the shot likely, not the goal. `line` is the shout. Whether the dice then went
 *   its way is never said (v0.17): the card is played, something happens. A shout that moves nothing in this panel cannot be laid at all (`moves` in match.ts).
 *   `alt` are other ways the same line can go: one of `line` and `alt` is said at random, so a card that
 *   comes up five times a match does not tell the same joke five times.
 * - steer: the next panel is `next`, no dice here. Drama. `word` is the panel's headline.
 */
export type CardEffect =
  | { kind: 'shout'; up: RowPick[]; down?: RowPick[]; pull: number; line: string; alt?: string[]; guard?: number }
  | { kind: 'steer'; next: string; initiative: Initiative; word: string; line: string };

/** shout: the coach yells, the men try to follow. drama: something happens to the match. */
/**
 * A shout is the bench, a drama forces its own scene, an event (v0.16) is the village doing something
 * small and absurd — a wasp, the Gülle wind, a phone in the wall. An event pulls the table exactly like a
 * shout; it just is not shouted, it happens.
 */
export type CardKind = 'shout' | 'drama' | 'event';
/** Which pile the card lives in and when it fits: with the ball, or without it. */
export type CardSide = 'ball' | 'noball';

export interface Card {
  id: string;
  name: string;
  text: string;              // one line on the card, German
  kind: CardKind;
  side: CardSide;
  playableIn?: string[];     // scene type ids and/or tags, 'play+box' for both at once; without it: wherever it moves a row
  once?: boolean;            // one per match: laid, it leaves the deck instead of going back under its slot
  cost?: Partial<Gauges>;    // v0.22: what laying it costs where that is not what its kind costs (form.ts); negative gives
  effect: CardEffect;
  /**
   * v0.25: how a row reads when this card was laid and that row came up — the card's picture carried into
   * what happened ("Tunnel!" → "durch die Beine"). Keyed by row selector (row id or '#tag'); it replaces the
   * row's own line. Not a verdict: it is the same thing happening, told in the card's words.
   */
  echo?: Record<string, string[]>;
  /** v0.25: for a shout whose men did something else: a short line between the shout and what happened. */
  miss?: string[];
}

// ---- Form (v0.22) ---------------------------------------------------------

/**
 * Three hidden gauges per bench, 0..1, that move over the match (DESIGN §2.6, form.ts). Never shown as a
 * number: each is read as one of three words, on the men and in the top bar.
 * - `puste`: the legs. Drains panel by panel and with every shout; half-time gives some back.
 * - `moral`: the heads. Goals, whistles and blunders move it; it decides how well the men follow a shout.
 * - `gunst`: the football god's favour. Events and drama spend it; a coach who lets a card go earns it back.
 */
export type Gauge = 'puste' | 'moral' | 'gunst';
export type Gauges = Record<Gauge, number>;
export type Level = 'hoch' | 'mittel' | 'tief';

/** A gauge that crossed into another level in a panel: the commentary says it out loud. */
export interface Shift {
  side: Side;
  gauge: Gauge;
  level: Level;
  line: string;
}

// ---- Match --------------------------------------------------------------

/**
 * One of the six situations a bench can be in (v0.15): the three situation types, with the ball or
 * without it. Each has its own three skills.
 */
export type Slot = `${CardSide}:${Situation}`;

/**
 * v0.26: skill ids per situation. A bench's loadout is three per situation, picked before kick-off and
 * fixed for the match; the same shape holds the pool they are picked from (`POOL` in cards.ts).
 */
export type Loadout = Record<Slot, string[]>;

export interface TeamSetup {
  name: string;
  short: string;
  roster: Player[];
  loadout: Loadout;
}

export interface TeamState extends TeamSetup {
  played: string[];          // every skill used this match, in order
  banned: number;            // panels left on the stands, 0 = on the bench
  gauges: Gauges;            // v0.22: legs, heads, the god's favour
  shown: Record<Gauge, Level>;   // v0.25: the word each gauge reads as; changes only once clearly past the line
}

export type Laid = Record<Side, string | null>;

/** What a laid card did in the panel. For the strip tool only; the game never shows it (v0.17). */
export type CardResult =
  | 'heard'                  // a shout, and the dice went where it pointed
  | 'ignored'                // a shout, and the men did something else
  | 'forced'                 // a drama card that decided the next panel
  | 'overruled';             // laid, but a drama card from the other bench decided the panel

/**
 * v0.27: what happened off camera between two highlights. The clock runs from `from` to `to`, a few lines
 * say what it looked like, and `title` is what comes next: the next highlight's headline, "Halbzeit" or
 * "Abpfiff". `shifts` are the gauges that read as another word by then.
 */
export interface Gap {
  half: 1 | 2;               // the half the gap is in (a gap to half-time is still the first half)
  from: number;              // match minute of the highlight before (0: the kick-off, 45 in the second half: its kick-off)
  to: number;                // match minute of the next one, or the whistle
  lines: string[];
  shifts: Shift[];
  title: string;
  whistle: 'halftime' | 'end' | null;   // the gap ends in a whistle, not in a highlight
  then?: Gap;                // after the half-time whistle: the second half's run to its first highlight
}

/** One resolved panel: what the strip shows. */
export interface Panel {
  n: number;                 // 1-based over the whole match
  half: 1 | 2;
  minute: number;            // v0.27: match minute (46 in the first half is 45+1)
  hl: number;                // v0.27: which highlight this panel belongs to, 1-based over the match
  title: string;             // v0.27: that highlight's headline ("Konter RWK")
  closes: boolean;           // v0.27: the highlight ended with this panel; `MatchState.gap` says what came after
  scene: Scene;
  usable: Record<Side, string[]>;   // v0.26: the skills each bench could have used here (the rest of its three lay grey)
  laid: Laid;
  result: Record<Side, CardResult | null>;
  row: string | null;        // rolled row id, null when a card decided the panel
  word: string;              // the headline: the row's word, or the drama card's
  actor: CastMember | null;  // whose panel it was
  lines: string[];           // commentary in order
  what: string | null;       // v0.25: the line of `lines` that says what happened (the rolled row, in whoever's words)
  cause: { side: Side; cardId: string } | null;   // the card that decided `next`, if one did
  next: string;
  nextLabel: string;         // what the next panel is called, once it is built
  nextSide: Side;
  goal: Side | null;
  banned: Side[];            // coaches sent to the stands in this panel
  shifts: Shift[];           // v0.22: gauges that crossed into another level in this panel
  form: Record<Side, Gauges>;   // both benches' gauges after the panel, so an old panel shows the men as they were
  levels: Record<Side, Record<Gauge, Level>>;   // v0.25: and the words they read as then
}

/**
 * v0.27: the match is its highlights. Only the moments where a goal can come from are played as panels;
 * between two of them the clock jumps and a gap (`Gap`) says what happened off camera.
 */
export interface MatchState {
  teams: Record<Side, TeamState>;
  half: 1 | 2;
  minute: number;            // v0.27: match minute of the scene on screen
  hl: number;                // v0.27: the highlight on screen, 1-based over the match
  title: string;             // v0.27: its headline
  inHl: number;              // v0.27: panels of it already resolved
  stoppage: boolean;         // v0.27: this half has had its Nachspielzeit highlight
  gap: Gap | null;           // v0.27: the jump that led to the scene on screen; null inside a highlight
  offCamera: string[];       // v0.27: the gap lines already used this match, so none comes twice
  scene: Scene;              // the panel on screen, waiting for cards
  score: Record<Side, number>;
  strip: Panel[];
  rng: number;
  over: boolean;
}
