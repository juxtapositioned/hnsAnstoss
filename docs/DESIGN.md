# Football God — Design Doc

Status: v0.5, 2026-09-14. Reboot of the Bolzplatz prototypes (`prototype/v04`–`v07`).
v0.4 put the player where the fiction always had him: on the bench. The coach does not dribble
or shoot; he prepares, he waits, and now and then he shouts. v0.5 takes the world out of his
hands: events are the god's own pile, shouts cost something, and a lost ball is a counter.
The three team stats are placeholders (2.6) and not a system to build on yet.
Research behind the choices: [RESEARCH.md](RESEARCH.md).
Everything under **Prototype** is decided; everything under **Later** is direction, not spec.

History, short: v0.1 fixed graph, one actor per node, 67% dead hands. v0.2 both sides play into
one roll (fixed the numbers, felt like two cards into one dice roll). v0.3 back to one actor,
turn alternating across the whole match, split attacking/defending hands, +N cards. v0.4: the
coach's levers; cards do graph surgery instead of arithmetic; one finite deck of shouts and events.
v0.5: the v0.4 playtest was "who holds more kill events when the other is through" — 14 of 24
cards deleted an attack, attack shouts touched one row and were invisible 70% of the time. Now:
events are drawn by the god, not played; every shout replaces the situation; deleting an attack
risks a red card, a banned coach, a counter; turnovers are counters, not "attack over".

## 1. Vision

A football game with no match simulation. The trainer stands on the touchline with the
football god beside him. Matches are 1v1 duels of six attacks per side, played turn by turn
from the two benches. Between matches the trainer runs the club alone: rewards from matches
improve the club and the grounds, a weekly calendar brings decisions (press, village, squad).

Players have no playing strength. What decides a situation is the table the god rolls on — set
by the two coaches' plans, tilted by the named player's special, rewritten by one card. Players
are still collected, because each can carry a special effect.

There is no money.

Platform: prototype in the browser, then mobile, maybe PC ports at the end.

### Pillars

1. **Every action changes the situation.** One bench acts, the god rolls, the situation is a new
   one, the other bench acts. Nobody ever answers inside the same situation, and nobody waits
   through a simulation.
2. **The god rolls, you tilt the table.** Outcomes are probabilistic; plans, specials and cards
   change what is on the table. Nothing is certain, nothing is pure luck.
3. **The player is the coach.** He can't kick the ball. He prepares the plan, the lineup and the
   deck; in the match he lets them play, shouts once, or makes a change. The god sends the rest.
4. **Squad as a deck, not as a ratings table.** Players matter for what they do, not how good
   they are.
5. **Duels between friends.** The match must be fun as a game in itself, against a friend or
   later online.

## 2. The match

### 2.1 Structure

- Two sides, A and B. 12 attacks, strictly alternating, A attacks first.
- An attack is a chain of **situations**. Each situation resolves into either the next
  situation or an **end state** (goal, or the attack is over). A **turnover** outcome hands the
  ball to the other team inside the same attack: they play on from `next` (usually `counter`),
  the attack counter does not move. An attack can change hands more than once.
- When a situation arises, the **god may draw a world event** on it (`K.eventChance` per
  situation, from a shuffled pile of every event, each at most once per match). The event
  replaces the situation before anybody acts; the bench then acts on what the world made.
- **Exactly one bench acts per situation.** The turn **alternates across the whole match**,
  also over the attack boundary: whoever did not act last acts next. Attacks have different
  lengths, so sometimes the attacking bench opens at build-up and sometimes the defending one.
- The acting bench does one of three things (2.3): **let them play**, **play one card**, or
  **substitute**. Then the god rolls once, in public.
- No hidden information beyond the hand: the opponent does not see your hand, but sees every
  card you play, the table it made, and the roll, before they move. Plans are public.
- Only the current situation is visible, plus its outcomes with their current odds. The tree
  beyond is not shown.
- Draws are allowed. Half-time exists conceptually but is not in the prototype.

### 2.2 Situations

A situation is a hand-authored node:

```
id            "through_on_goal"
text          "{player} is through on goal — only the keeper is in his way."
role          which lineup role is named
outcomes[]    { label, base weight, side (att|def|neutral), next: situation id | GOAL | OVER | ORIGIN,
                turnover?, then?: consequences }
```

`ORIGIN` means "play on": back to the situation the bench acted on (the ref lets it go).
`turnover` flips the attacker; `next` is then played by the other team. `then` is what stays
after the roll — see *Consequences* in 2.4.

The **graph** — reachable from `build_up` without a card:

| id | situation | outcomes (base weights) |
|---|---|---|
| `build_up` | {defender} plays out from the back. | advance → `midfield` 55 · long ball → `through_on_goal` 12 · misplaced pass ⇄ `counter` 25 |
| `midfield` | {midfielder} has the ball, looking for a forward pass. | through ball → `through_on_goal` 25 · out wide → `flank` 45 · dispossessed ⇄ `counter` 25 |
| `flank` | {winger} takes on his man on the flank. | cross → `header` 35 · cuts inside → `edge_shot` 30 · tackled ⇄ `build_up` 30 |
| `counter` | {midfielder} of the *other* team breaks. | through → `through_on_goal` 25 · settles → `midfield` 35 · fizzles → OVER 40 |
| `through_on_goal` | {striker} is through on goal. | GOAL 45 · saved 30 · wide 25 |
| `header` | {striker} rises for the header. | GOAL 30 · saved 25 · cleared 45 |
| `edge_shot` | {midfielder} shoots from the edge of the box. | GOAL 22 · saved 28 · blocked 50 |

(⇄ = turnover.) Net goal expectation from `build_up`, mine minus theirs via counters, is ~10%
at equal plans; a shot situation is 20–44%, a penalty 72%.

**Card-only situations** live in the same table but are reached only through a shout or an
event: set pieces (`penalty`, `free_kick`, `corner`), one situation per attacking shout
(`long_ball`, `draw_foul`, `dive`, `early_cross`, `long_shot`, `possession`, `trick_free_kick`),
one per defending shout (`offside_trap`, `cynical_foul`, `keeper_rushes_out`, `last_ditch`,
`crowded_box`, `double_team`, `trainer_tobt`, `provoke`) and the event situations. Authoring one
is authoring a node; there is no second format. The full list is in `data.ts`.

Every attack starts at `build_up`. A chain is normally 2–4 long; counters, *Second ball* and
"play on" outcomes make it longer, `K.maxSteps` ends it.

### 2.3 What the bench does

**Before the match.** The **plan**: two dials, public like a team sheet.
*Tempo* (patient / direct) applies while attacking, *press* (deep / high) while defending.
Each dial value is a table of multipliers per situation and outcome (`TEMPO`, `PRESS` in
`data.ts`): patient means fewer turnovers and fewer direct chances, direct the reverse; a high
press wins the ball more at build-up (and every win is a counter now) but leaves space behind —
both ways, a counter against a high line goes through more often; deep sits bodies in the box
so shots get blocked and counters fizzle. Both coaches' dials tilt every situation of every
attack. The dials are set once; there are no cards that change them — a shout is about *this*
situation, never about the rest of the match (playtest 2026-09-14: plan cards felt like the
wrong lever). Plus the **lineup** (eleven starters, a bench of three) and the **deck**: the pool
of 24 shouts, split by side. For a match `K.pileAtt` (8) attacking and `K.pileDef` (8) defending
shouts are dealt; the hand holds up to `K.handAtt` (4) of each and refills from its pile after
every action. No reshuffle: the 16 are the match. The split is what keeps a shout on offer in
most turns (a mixed hand was half dead by construction), and two **nudges** per side (*Anfeuern!*,
*Ruhig, Jungs!* / *Hinten bleiben!*, *Konzentration!*, ×1.2 or ×0.8 on a whole side of the table,
playable anywhere) mean there is nearly always something slightly good to do — spending one now
or holding it is the small decision of every turn.

**In a situation**, one of:

- **Let them play.** The table as the plans, the named player's special and the match
  modifiers have set it. This is the default and most of the time the right move. It draws
  nothing.
- **Play one shout.** The card rewrites the table; the god rolls the rewritten one. A played card
  is gone for the match; one card is drawn if the deck has any left. A coach sent to the stands
  plays no more cards.
- **Substitute.** A bench player comes on for the starter of the same role (preferably not the
  one on the ball right now); three per match; then the players play on the table as it stands.
  It changes who gets named in the situations that follow, i.e. which specials can fire.

### 2.4 Cards

One rule: **a card rewrites the table before the god rolls.** Cards do not add or subtract
numbers; they do graph surgery.

```
id, name, text
kind          shout | event
side          att | def | any         (playable in your attacking turn, defending turn, either)
situations    list of situation ids, or "any"
effects       in order, one or more of:
              replace(situation)                 the situation becomes another one — what nearly every shout does
              redirect(from, next)               same outcome, different destination (Second ball)
              convert(from, label, next, side)   an outcome becomes a different one, leading elsewhere
              add(label, weight, next, side)     a new row on the table
              match(label, target, factor)       every situation for the rest of the match (events only)
              plan(dial, value)                  your own dial for the rest of the match — supported, unused since v0.5
```

**Shouts** are the coach's deck. Two authoring rules, both learned from v0.4:

1. **A shout is always visible.** It replaces the situation (new text, new rows) or touches the
   majority of the table. A card that only rewrites the failure row fires one time in four and
   teaches the player nothing.
2. **Deleting an attack costs something.** Every defensive shout that can end an attack can
   also hand the attacker a free kick, a penalty, a man advantage, or the coach's own seat.
   The attacker's shouts risk a counter or a yellow instead.

**Events** are the world — the god beside the coach. They are never in a hand: at every
situation the god rolls once and, on `K.eventChance`, draws the next fitting event from the
shuffled world pile. Mechanically an event is the same card (`replace` or `match`); the
difference is who plays it. The fiction of v0.4 ("the coach *calls* the dog") is gone, and with
it the game of holding kill events for the opponent's big chance.

**Consequences** (`then` on an outcome) are what stays after the roll:

- `red_card(team, role?)` — a player of that team leaves the lineup; the team is a man down
  for the rest of the match (`K.manDownDef` ×0.75 on its defending rows, `K.manDownAtt` ×0.85
  on its attacking rows, per man). Without a role: the named player (attacker) or a defender.
  The keeper can go too (*Torwart, raus!*), then "der Kassenwart steht im Tor".
- `coach_banned(team)` — that bench plays no more shouts. Substitutions still work.
- `injury` — the named player goes off. A bench player of his role comes on if there is one and
  a sub is left; otherwise the team plays a man down.

Prototype pool. In-game names are German (see *Tone*); the doc keeps the English working
names, `data.ts` has the German ones. Values are net goal expectation deltas for the actor at
equal plans, so the reader can see the shape: most shouts are +2 to +9, the nudges +1 to +3,
*Ausraster* is the emergency brake.

| card | side · where | what it does | risk / cost |
|---|---|---|---|
| Hoof it! | att · build_up | → `long_ball`: through 35 · midfield 25 · keeper's arms 40 | no misplaced pass, but 40% wasted (+9) |
| Win the foul | att · midfield, flank, counter | → `draw_foul`: free kick 45 · penalty 12 · played on ⇄ counter 18 · yellow 25 | counter, yellow (+1…+2) |
| Go down easy | att · flank, edge_shot | → `dive`: penalty 30 · free kick 20 · played on ⇄ counter 25 · yellow 25 | counter, yellow (+8 on the flank, +2 at the edge) |
| Second ball! | att · header, edge_shot, free_kick, corner | cleared / blocked → `midfield` instead of OVER | none (+6…+7) |
| Early cross | att · flank | → `early_cross`: header 65 · too long 23 · intercepted ⇄ counter 12 | counter; pays with Kalle (+2, +13 if he is named) |
| Hau drauf! | att · midfield, flank, counter | → `long_shot`: goal 12 · saved 30 · over 38 · deflected → `corner` 20 | none — the safe shout (+4…+5) |
| Keep the ball | att · build_up, midfield, flank, counter | → `possession`: midfield 45 · through 20 · fizzles 35 | no counter possible (+5 at build-up, ~0 later) |
| Rehearsed! | att · free_kick | → `trick_free_kick`: goal 32 · saved 20 · intercepted ⇄ counter 28 · fluffed 20 | counter (+8; Basti's ×1.5 does not apply) |
| Square it! | att · through_on_goal | → `square_ball`: tapped in 50 · keeper gathers 30 · fumbled ⇄ counter 20 | counter (+4) |
| Anfeuern! / Ruhig, Jungs! | att · any | attacking rows ×1.2 / defending rows ×0.8 | none — the nudge (+1…+3) |
| Step up! | def · midfield | → `offside_trap`: offside 45 · one sleeps, through 20 · to the flank 20 · intercepted ⇄ counter 15 | a striker alone (+3) |
| Take him out | def · midfield, flank, counter | → `cynical_foul`: nothing given 55 · ball won ⇄ counter 15 · yellow, free kick 20 · red, free kick 10 | 10% red (+9) |
| Keeper, out! | def · through_on_goal | → `keeper_rushes_out`: smothers 58 · rounded, goal 22 · penalty + red for the keeper 20 | 20% keeper red (+7) |
| Last-ditch tackle | def · through_on_goal | → `last_ditch`: too late, goal 25 · corner 25 · penalty + red 15 · ball won ⇄ counter 35 | 15% red (+6) |
| Everybody back! | def · header, edge_shot, corner | → `crowded_box`: blocked 45 · deflected in 15 · rebound → `edge_shot` 20 · blocked ⇄ counter 20 | deflection (+11 header, +4 edge) |
| Double up | def · flank | → `double_team`: run down ⇄ counter 35 · cross anyway 25 · through the gap 20 · out 20 | the gap (+3) |
| Ausraster | def · shots | → `trainer_tobt`: ref blows 30 · plays on → ORIGIN 50 · coach banned, free kick 20 | 20% no more shouts, ever (+13 when through, +5 header) |
| Provoke | def · midfield, flank, counter | → `provoke`: attacker hits back, red 15 · provoker red, free kick 10 · scuffle → `midfield` 30 · laughs it off → ORIGIN 45 | a red either way (+3) |
| Press the build-up | def · build_up | → `press_build_up`: misplaced ⇄ counter 35 · forced out 20 · hoofed, through 18 · played out → `midfield` 27 | a striker through (+3) |
| Build the wall | def · free_kick | → `wall`: into the wall 45 · over it, goal 15 · deflected → `corner` 15 · off the wall ⇄ counter 25 | over the wall (+4) |
| Keeper, dance! | def · penalty | → `keeper_dance`: goal 62 · saved 28 · over 10 | none (+10 — the one answer to a penalty) |
| Hinten bleiben! / Konzentration! | def · any | defending rows ×1.2 / attacking rows ×0.85 | none — the nudge (+1…+3) |
| Dog on the pitch | event · any | → `dog_on_pitch` | |
| Floodlight failure | event · any | → `floodlights` | |
| Ref swallows the whistle | event · midfield, flank | → `no_whistle`: clattered ⇄ counter 45 · rides it 35 · scuffle 20 | |
| Linesman's flag | event · through_on_goal | → `flag_up` | |
| Injury | event · midfield, flank, counter | → `injury`: carried off 60 (`injury` consequence) · fine 40 | |
| Bratwurstalarm, Der Platzwart, Maulwurfshügel, Stürmer verpennt | event | as v0.4 | |
| Downpour | event · any | match: neutral ×1.4 for the rest | |

Effects apply in order: plans, men on the pitch and match modifiers → the named player's
special → the card. A `replace` throws away the rows so far and starts from the new situation's
planned table.

Why graph surgery and not +N: the v0.3 sim showed +25 on one row was a decision worth 5 points
over random, because the base table decided 80% and the card was an EV comparison anyone can
read off the screen. A card that hands the opponent a *different situation* is a decision about
the tree, and it is the coach's kind of decision — he can't make the striker shoot better, he
can tell him to go down.

Why counters: without them a lost ball was "attack over", which made keeping the ball worth
nothing and deleting an attack free. Now the defender's shouts are bets (*Take him out* wins
the ball 15% and loses a man 10%), the plan dials are trade-offs (a high press feeds counters
both ways), and *Keep the ball* exists.

### 2.5 Players in the match

Each side has eight starters and three on the bench, each with a role (defender, midfielder,
winger, striker). A situation names a player of the matching role. Players have no numbers. A
player may carry a **special**: a passive (`multiply`) that fires when he is the one named in a
given situation. Prototype: Kalle (A) header ×1.4, Sven (B) edge shot ×1.4, Rudi (A, bench)
penalty ×1.25, Basti (B, bench) free kick ×1.5. Substitutions are how the bench brings a special
into play. Later: cards that are only in the deck while a player is in the lineup.

### 2.6 Favor, motivation, fitness — placeholders

Three team-level 0–10 sliders, hidden behind a fold in the setup screen, feeding one
`edge` multiplier as in v0.3. Zero at equal stats. They are kept only so the socket exists;
nothing is built on them. Where they would plug in, when the time comes: favor → the roll
(see RESEARCH B1, a visible mood pile); motivation → whether the players follow a shout;
fitness → how the plan degrades late in a match, or a resource a shout costs.

### 2.7 UI (prototype)

Split screen for playtesting only: the two benches side by side, A left, B right, both upright;
release will show one bench's perspective with the opponent online. A row of twelve ticks for
the twelve attacks runs across the top, match modifiers (Downpour) beneath it. Each half shows:

- Head: own name, plan, subs left, score (own goals first), attacking/defending, attack counter.
- The situation text and the named player (and his special, if it fires here); the outcome
  list. When the acting bench selects a card, its half shows the rewritten table — a replace
  shows the old text struck through and the new situation's text and rows; a convert marks the
  changed destinations; an added row is dashed. The waiting half sees only the table as it stands.
- If the god drew an event on this situation: the original text struck through, an event block
  ("Der Fußballgott — Waldi!") with a double border, then the situation the world made.
- The own hand (up to four attacking and four defending shouts, tagged ▲ / ▼ and where they
  play; the piles' sizes next to it), the bench
  players who can come on ("Rudi on for Kalle ★"), and the two actions: **Let them play** and
  **Shout: …**. A banned coach sees "Du sitzt auf der Tribüne" instead of the hand; a team a man
  down shows "10 Mann" in the head.
- Turnover rows show "⇄ Konter"; after one the attacking colour flips mid-attack and the trail
  keeps counting.
- After the action the god rolls for a beat in both halves, the played card (or "let them play",
  or the substitution) as a chip; then the outcome is highlighted and either side can Continue.

## 3. Later — direction only

### 3.1 AI opponent
Rule-based per situation: score let-play and each playable card by expected goal delta across
the tree (the sim's greedy policy does this; it ignores subs and prices consequences flatly). Add noise scaled
by a personality (cautious / gambler / cynical). Good enough for a season; PvP is the real opponent.

### 3.2 Multiplayer
Hot-seat first (the split screen). Then online, one bench per device: async (one situation per
notification, Words-with-Friends style) or live. About 30 hand-offs per match; a favor stake on
an attack (RESEARCH B10) is the cheap way to give a match a climax for async. Open: whether
progression carries into PvP or PvP uses balanced pools.

### 3.3 Season and progression (solo)
- A league of AI clubs, a table, promotion and relegation. Matches against friends can count
  as friendlies with their own rewards.
- Rewards from matches: cards, players, favor. No money anywhere.
- Deck stays 20 and lineup stays 11+3: a reward replaces something (RESEARCH B9).
- Club and grounds upgrades give mechanical things: deck slots, hand size, a shrine that
  steadies favor.
- Player collection: players arrive as rewards, each with a special effect; roster limit;
  no strength values, ever.

### 3.4 Weekly calendar
Keep the v07 rhythm as a starting point: one screen per day, at most one decision, the match
on Sunday. Decisions are narrative (press conference, village, a player's mood) with
consequences on favor, motivation and fitness — and on which cards arrive, once favor exists:
a well-behaved club gets the god's events, a cynical one gets Take him out.

### 3.5 Match features deferred
Half-time (change the plan), match modifiers revealed at kick-off (weather, referee, crowd —
Marvel-Snap-style, RESEARCH B2), cards that return to hand on a goal (RESEARCH B4), god cards
(spend favor to force an outcome), a favor stake per attack.

## 4. Tech

- **Engine as pure functions**, no DOM: `state + action → state`, seeded RNG. Headless-testable
  and portable to mobile. Actions: `let_play`, `play(cardId)`, `sub(inName)`, `continue`.
- TypeScript, Vite. UI is thin over the engine; plain DOM is enough for the prototype.
- **The sim is a check, not a loop.** `npm run sim` reports win rates, a "decision value" (how
  much greedy beats random and always-let-play), cards played per match and which. Run it once
  after structural changes, then move on.

  v0.4 (2000 games, both patient/deep): greedy beat let-play by ~24 points — but nearly all of
  it was kill events played by the defender at the opponent's chance; the attacker's shouts
  moved 2–5 points and were invisible. 1.5 goals per match, 21% 0:0.

  v0.5 (2000 games, both patient/deep): ~2.3 goals per match, 8% 0:0, ~3.3 events and ~4.7
  counters per match, a red card every third match, a banned coach every eighth. Greedy beats
  let-play by ~18 points and random by only ~3: smaller than v0.4 on purpose — the decision is
  no longer "nuke the chance", the greedy bench does not price consequences well, and no card
  is a trap any more, so random play is not punished. 14 cards played per match from 16;
  let-play is 63% of turns, 22% of turns have nothing playable (mostly late, when a pile is
  empty). The next numbers should come from people.
- Data (situations, cards, plans, players) in plain TS tables, no logic in data.
- No backend until online play.

## 5. Prototype scope (phase 1)

In: 2.1–2.7 as written, two humans on one screen or one human against the greedy bench, setup
screen with plan dials per side, seeded matches.

Out: season, calendar, rewards, upgrades, half-time, match modifiers at kick-off, persistence,
deck building (8 + 8 are dealt from the pool of 24).

Done when: two people can play a full 12-attack match from the benches, the odds shown match the
engine, and changing a plan dial or a card's table in `data.ts` visibly changes how matches feel.

## 6. Open questions (not blocking phase 1)

- ~~Should events be playable at all?~~ decided 2026-09-14 (v0.5): no. The god draws them
  himself. Open: is `K.eventChance` per situation the right rhythm, or should the god have a
  fixed budget per match (three events, at attacks he picks at kick-off)?
- The event pool is still mostly spoiling. With events no longer aimed by a bench, that is
  less of a problem; events that favour the attacker (a keeper error) would still be welcome.
- Consequences are priced roughly by the AI (`K.aiRedCard` etc.). Is a red card worth more
  early than late in a match of 12 attacks? Probably — the AI should scale it.
- Progression in PvP: carried over or balanced pools?
- Does the god's favor belong to the club or to the trainer (a person who can change clubs)?
- ~~Tone / language~~ decided 2026-09-14: **German, Kreisklasse, Bolzplatz.** All game text (situations,
  outcome labels, cards, specials, UI) is German; ids and docs stay English. The god has a voice:
  `commentary.ts` holds the Stadionsprecher and the Zaun (a line after every roll, kick-off with the
  attendance incl. dogs, full-time verdict, the log as "Spielbericht fürs Dorfblatt"). Flavour lines are
  picked by hash, never from the match rng, so they cannot change a roll. The three sliders show as
  placeholders in the setup only.
