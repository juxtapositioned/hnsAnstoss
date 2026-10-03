# Comic Scenes — Design Doc

Status: v0.27, 2026-09-27. The only prototype line since 2026-09-25 (the earlier Football God line, turn-based
from two benches, was deleted; it lives in git history, commit 209c306).
Same setting (German Kreisklasse, the player is the coach, no money, no ratings), different
match feel: the match is a **comic strip that plays itself**, the coach slips cards under
the panels. Everything under **Prototype** is decided; **Later** is direction only.

> **Priority rule (2026-09-25, after v0.13): fun first, balance later. So far it is NOT fun.**
> Playing a single situation — one panel, one card, one reveal — has to feel good before anything
> else matters. Until it does, no balancing: no goal-rate targets, no `--stats`/`--values` tuning
> passes, no deck-size knobs, no value tables. v0.13 went too far too early (Markov grids, pull
> calibration, drama-load analysis); treat its numbers as scaffolding, not as goals. The next work
> is only about the moment of play: what the coach sees, what he decides, and what he gets back.
> Judge it by playing it, not by the headless runner.

v0.2 changes: cards steer, dice resolve (§2.2); commit-and-reveal with a counter triangle
(§2.3); opposing coaches are people with tells (§3); phase 0 is a text strip (§5).
v0.3 changes after the first playtest: cards are **moments, not instructions** (§2.2), with
`duel`/`box` tags and an `advance` target per scene so one moment fits many panels; a few cards
have two faces; the screen attributes every effect to its card (§2.4); hand of 6.
v0.4: single player. Hot-seat was a pain to test, so the other bench is an AI rival with tells
(§3, `src/engine/rival.ts`), the hand is a fan of real cards, and your laid card lies face up on
your corner while the rival's lands face down partway through the panel (§2.4).
v0.5 after the second playtest ("the cards are unfun"): **traits trigger in the picture, visibly**,
and cards are eight big ones, three per half (§2.2). Determinism dropped: shouts lean the dice.
v0.6 after the first headless analysis (`npm run strip -- --values`, ~40k matches): every shout now
carries a **cost row** in the data, not just in its text (§2.2); Foul ziehen! and Flutlicht were dead
and are replaced by Umhauen! and Hoch rein!; Hund is a defender's card; Bürgermeister needs a dead ball
and bans for five panels, not the match (§2.3); a shout is stamped by what it did to the dice, not by
whether its row came up (§2.4); Frisch gekreidet (cancel) is replaced by Abseitsfalle! (§2.2).
v0.7 (2026-09-21): **the coach lays almost every panel.** A laid card draws another; the deck is two
piles (with the ball / without) and the hand three of each; a bench that lays nothing cycles its oldest
card. Cards are always a plus — the price is the hand slot, not a cost row — and most of them are plain
touchline shouts the men try to follow ("gehört" / "überhört"); the four drama cards change the picture
(§2.2, §2.3). Every panel resolves to **one word** and the man it belongs to; the screen is built around
the men in the picture (§2.4). Findings that are not fixed are in §6.
v0.8 (2026-09-21): **goals.** 1.1 a match was a goalless strip. Three common-sense fixes: *Torwart raus!*
only has a keeper to send at crosses, corners and a man through (since v0.11 it cannot be laid at a shot or
a penalty at all); the
dog and the mayor are **once a match** per bench instead of coming back with every shuffle; and the tables
were steepened once for Kreisklasse football (worse keepers, slower defenders, more direct play) — §2.1.
18 panels a half. Headless: 2.5 goals a match, 23 % draws.
v0.9 (2026-09-21): **more cards, from the village.** Nine shout sidegrades and five drama cards, all data
(§2.2). Sidegrades run along three axes: the clean/dirty pair (*Stellen!* / *Umhauen!*), the safe/direct pair
(*Kurz!* / *Lang!*), and narrow-and-loud against broad-and-quiet (*Freibier!* ×7 on the goal only, *Trau
dich!* ×3 over the whole build-up). Drama is what the village provides: the fire brigade, a brawl, a linesman who
pours the beer, a coach who thinks he can still play, a ball that hit something. Same day, six more drama
cards (v0.9b): the Bierbank on the pitch, the keeper up for a corner, Erwin on the goal line, the Zeugwart's
Eisspray, a ref in the family, a keeper who talks before the penalty. All 45 are in the default deck; that is a
knob, not a decision (§6).
v0.10 (2026-09-21): **a card never explains what it does.** The card text is the picture, one line, no
outcomes, no conditions, no "once a match"; the hand no longer says "Eher: Flanke." under a card and no longer
glows or dims by fit. The name and the theme carry the card (*Flanke!* does what a coach yelling "Flanke!"
does), and not knowing precisely is part of the suspense — the reveal is where the card is read. It also
removes a whole class of UI: hint boxes, tiers, tooltips (§2.2, §2.4).
v0.12 (2026-09-22): **every panel says where it is.** Beside the men lies a chalk sketch of the pitch
with one mark on it: here. Each scene type carries a `spot` (§2.1) — a place written from the view of the
side with the initiative — and the sketch never turns: SVH attacks to the right all match, so the same
picture always means the same thing (§2.4). A dashed run from the panel before shows where the ball came
from; when a panel resolves, the mark runs on to where the next panel opens (or into the net). The place is also a German phrase ("im Strafraum", "am Zaun"),
so the panel and the text strip say it out loud as well.
v0.13 (2026-09-25): **a football simulation under the strip, and a third pile.** The ball now has a real
place on a real pitch (105 × 68 m), and every panel is a situation *at* that place: the scene type builds its
table from the position (`src/engine/sim.ts`) — which outcomes can happen at all, how likely they are, and
where the ball goes next. A man on the ball in our half has a long ball and a square pass; the same man on
the wing in their half has a cross; at the Sechzehner he shoots, and the shot goes in by distance and angle.
A foul is a free kick in midfield, a dangerous free kick at the box and a penalty inside it. Shouts no longer
multiply a row by five: they **pull** the table onto one or two outcomes, so a simple shout makes what it
names very likely (§2.2). And every dead ball — kick-off, goal kick, throw-in, free kick, corner, penalty — is
a **third situation**: both benches play from a set-piece pile there, with cards for the side taking it and
cards for the side defending it (§2.2).
v0.14 (2026-09-25): **three situation types, mirrored.** v0.13 misread the brief and made set pieces a third
*pile*. What was meant: when you have the ball, every situation is one of three types — **ball action** (our
man has the ball and time, nobody is on him), **challenge** (an opponent is directly involved) and **set
piece** (a dead ball). Without the ball it is the same three, mirrored: their ball action, their challenge,
their set piece (§2.1). The set-piece pile is gone again; its cards live in the two piles of the ball and
fit only at set pieces. Every panel leads with its type as a badge in the colour of the side with the ball
(§2.4).
v0.15 (2026-09-25): **six situations, eighteen cards, one yes or no.** The three situation types with the ball
and the same three without it are six situations, and a deck is **three cards for each** — 18 in all, no hand,
no piles to draw from. Every time a situation comes up the coach is shown **one** of its three cards and only
decides *whether*: Spielen or Nicht spielen; the clock running out is a no. Laid or not, the card goes under its
situation's three, so they take turns (a laid once-card leaves). The card shown is the next of the three that
does something here (v0.11); when none does, there is no card and the panel is watched. The rival is shown one
card too and says yes or no (§2.2, §2.4). Everything below that speaks of a hand, piles, drawing or cycling
the oldest card describes v0.14 and earlier.
v0.18 (2026-09-25): **more goals, on three fronts.** (1) Every card that works towards a goal — the
attacking shouts, the set-piece shouts for the side taking it, the village events with the ball — pulls
harder: on top of its own pull it takes 40 % of the rest of the way to certain (`ATTACK_BOOST` in
`cards.ts`; 0.6 becomes 0.76). The defending cards stay as they are. (2) The football makes more stupid
mistakes: the square pass across your own box, the back-pass that stops halfway, the fumble in front of your
own goal, keepers who let the easy one slip (*Flutscher*), own goals from crosses and corners, the odd corner
straight in, and twice as many keeper blunders at goal kicks and throws. Rows in front of your own box carry
the new `deep` tag. (3) Cards that can end in the net: the events *Sturmböe*, *Maulwurfshügel* and
*Geburtstag* with the ball, *Handy im Tor* and *Hochzeit nebenan* without it (the others' mistakes at the
back), and two dramas with a goal row of their own, *Stromausfall!* and *Auf den Torwart!*. Headless: 1.15
→ 1.74 goals a match with cards, 1.36 → 1.65 without.
v0.18b (2026-09-25): **the defence is weaker, the football quicker.** Aim: about 4 goals a match. Every card
without the ball pulls half as hard as written (`DEFENCE_DAMP`), except the two that make their back line
blunder; attacking cards take 50 % of the rest of the way (`ATTACK_BOOST`). The defending dramas lean towards
the side that was attacking (the dog runs to them, the alarm is false, the flag is waved away, the offside
trap is a coin toss), and *Rudelbildung!* and *Abseitsfalle!* are once a match. A man through on goal is no
longer a `duel`, so our own dramas (*Schwalbe!*, *Schwager!* …) cannot be laid there and steal the chance.
The football: worse keepers (xG ×1.25), more one-on-ones scored, headers and penalties in, more through
balls, shots and crosses in their half, their defenders slower there, fewer square and back passes, and a
won ball anywhere but at the ends is a counter. Headless: 2.45 goals a match with cards, 2.73 without. At
18 panels a half that is roughly the ceiling — goals grow with the panels (≈ 0.07 each; 28 a half gives ≈ 4).
v0.18c (2026-09-25): **24 panels a half**, and a few more chances in them: more long shots and through balls,
counters that get through more often, more keeper blunders, more headers from corners. The safe shouts with the
ball (*Kurz!*, *Tempo raus!*, *Absichern!* …) are damped like the defending cards. Headless: 3.47 goals a match
with cards, 3.8 without.
v0.19 (2026-09-25, after a playtest: "not that many chances"): **one drama card per bench per match**
(`K.dramaPerMatch`; `offer` stops showing drama once a bench has laid one). Before, each bench laid nearly
every once-card in its deck and ~10 of 48 panels were dog, mayor and brawl instead of football; a once-card
also only left the slot it was laid from, so it came back from another (fixed: it leaves every slot). The
chances themselves: everybody shoots from 30 m, through balls are the favourite pass, crosses from further
out, past the man in their last third means through on goal, counters get through, saves bounce back for a
second shot. Defending cards pull a quarter of what they say (`DEFENCE_DAMP` 0.25). The dramas that stop
an attack (dog, fire alarm, mayor, brawl, Bierbank) now end in a counter — while everyone looks at the
fence, the pitch is open. Headless: 5.5 goals and ~12 chances a match with cards, 4.9 goals without.
Same day: **back to 18 panels a half.** With the drama rule and the chances above that is 3.9 goals a match.
v0.20 (2026-09-25, after a playtest: "the dog is funny once, then it gets tedious"): **forty more cards, all gentle.**
None of them forces a scene: they are shouts and events that lean the table, and the football goes on. The
fun is meant to be in the picture, not in the size of the effect. Every new card has two or three lines (`alt`
on the shout effect, one said at random), so a card that comes up five times a match does not tell the same
joke five times. With the ball: *Flach!*, *Nach vorne!*, *Aufs Tor!*, *Pike!*, *Dreh dich!*, *Fallrückzieher!*,
*Schieß ihn an!*, *Hintermann!*, *Leo!*, *In den Winkel!*, *Erster Pfosten!* (shouts); *Der Scout*, *Konferenz*,
*Frisch gemäht*, *Neue Handschuhe*, *Kühe am Zaun*, *Frühschoppen*, *Schwiegermutter*, *Langer Schiri*,
*Balljunge*, *Nieselregen*, *Geschirrtuch*, *Glückssocken*, *Nasse Pfeife* (events). Without it: *Keine Flanke!*,
*Mitgehen!*, *Meiner!* (shouts); *Rasensprenger*, *Maisfeld*, *Hüpfburg*, *Grillrauch*, *Kontaktlinse*, *Der
Maibaum*, *Der Hahn*, *32 Grad*, *Balljunge trödelt*, *Mähroboter*, *Kleiner Schiri*, *Brennnesseln*, *Kuhfladen*
(events). Pairs on purpose: the tall ref and the short one at the wall, the Balljunge who is quick for us and
dawdles for them, *Erster Pfosten!* against *Zweiter Pfosten!*. All are dealt into the big v0.16 slots; the
attacking ones are in `FOR_GOAL`, *Hintermann!* is `SAFE`. No card leans a goal row on its own at full pull
(the *Schwiegermutter* only pushes their clearances down). Headless: 3.81 goals a match (3.96 before, within noise).
v0.22 (2026-09-25): **form: Puste, Moral, Gunst.** Every bench has three hidden gauges that move over the
match — the legs, the heads, and the football god's favour — read only as words, never as numbers. Laying a
card now has a price: **a shout costs Puste, an event or a drama costs Gunst**, a few shouts cost Moral, and
a few give something back (§2.5). A bench without the Gunst for a card is not shown it. The half-time talk
(v0.21) moves the gauges instead of leaving moods in single men's heads; the moods are gone.
v0.23 (2026-09-25): **prices follow strength.** A card pays Puste and Gunst in proportion to how hard it pulls,
so the damped defending cards are cheap; Moral-costing shouts pay Moral instead of Puste; base prices down a
little; Gunst drifts back to the middle (§2.5).
v0.25 (2026-09-25, after a playtest by Claude, one full match at `?tempo=60000`): **card, man and outcome tell one
story.** The verdict: the fun is already there — *Blaskapelle* → Steilpass → *Durchsage* ("Torte dreht sich zum
Parkplatz um") → Tor, or *32 Grad* and a fast defender ("schnauft wie der Bulldog vom Huber") — and most of what
was bad was the three not lining up. Seven changes:
1. **Echo** (`data/echoes.ts`): a laid card can say how a row reads when that row comes up (*Tunnel!* → "durch die
   Beine", *Hochzeit nebenan* → "denkt an die Rede und spielt quer"), keyed by row id or `#tag`; it replaces the
   row's line, and an event's echo replaces the event's own line too, so the wasp is told once. For the player's
   own shouts that the men did not follow there is one short line between the shout and what happened (`miss`:
   "Kalle nickt zur Bank und macht was anderes.", "Steil war dann höchstens der Blutdruck vom Trainer."). This
   brings back a light form of what v0.17 removed — no stamp, no "überhört", and never for the rival's shouts —
   because without it *Trau dich!* → "der Ball geht hinten rum" read as the game ignoring the coach.
2. **The 1-on-1 is not one sentence.** It produced over half the goals with a single line. Rows now have `alt`
   lines and `by` lines picked by the actor's trait, or by another man's (`'marker:schnell'`): the Nervenbündel
   scores with his eyes shut or thinks of his tax return, the kaltschnäuzig one waits until the keeper lies down,
   a fast defender who is outrun gets a line that admits it. Prompts can be lists. `Row.carry`: the man who beat
   his man is the man on the ball in the next panel (Sascha outran Kofi, then Moussa was through — no more).
3. **Defence closes, it does not just barely pull.** Cards without the ball pull at half their strength instead
   of a quarter (`DEFENCE_DAMP` 0.5), and `guard` 0.7 of the danger they take away becomes a **half-chance** of the
   same table (`Row.half`: the shot from distance, the man who has to take his man on, the ball laid off, the
   second ball at the Sechzehner) instead of a ball won. When that is what came, the panel says so
   (`Row.blocked`: "Vorne ist alles zu. Kosta probiert es halt aus der Distanz."). The safe shouts with the ball
   keep their old damp. Headless: 4.4 goals a match (Nachspielzeit included).
4. **A card fits the picture.** A card that names rows (`up`) is only offered where one of them is in the table
   (the Kleiner Schiri with no wall, *Lang!* in their box); never the card the bench was shown the panel before (a
   card sits in several slots: *Absichern!* came three panels running); the kick-off is `exclusive` — only cards
   written for it (*Vom Anstoß!*, *Kirchenglocken*, *Maisfeld*, *Eisspray!*), and its goal row is rarer for it;
   at the end of a half only cards whose rows lead to a goal or a chance. *Doppeln!* only in a challenge,
   *Zustellen!* not at a man already through, *Pfütze*/*Wespe*/*Kontaktlinse* no longer name a place or a man.
5. **Form moves.** Every number that moves a gauge is bigger, the drift back to the middle smaller (§2.5), and
   the word a gauge reads as has a margin (`F.margin`, `TeamState.shown`) so "schaut weg" / "schaut wieder zu" no
   longer alternate. *Freibier!* costs the god a little (it was the one free card). `?form=gunst` parks Puste and
   Moral — no cost, no tilt, no bar — to try the match with Gunst as the only price. Parking them for good was
   the playtest's first idea; not done, because shouts would be free yeses again and the Kabine talks (Moral)
   would do nothing. Try both and decide.
6. **Whose words.** Every line is written in SVH's voice ("Freistoß für die", "drüben"); `voice.ts` turns it
   round when the other bench or the other side speaks, and names the benches: "Von unserer Bank" / "Von
   drüben". Every place is named from SVH's side (`whereHome`, `placeName`: "in unserer Hälfte", "vor deren
   Sechzehner", "links hinten", "an deren Eckfahne") — "in der gegnerischen Hälfte" said from RWK's side was our
   half. A trait can say something else for another slot (`firesAs`): a fast defender "holt jeden wieder ein".
7. **The end is a moment.** A half does not end with the ball where a goal can come from: Nachspielzeit, up to
   `K.stoppage` panels, while the next panel is a chance ("Der Schiri hat die Pfeife schon im Mund. Noch
   nicht."). And the match's last regular panel, if it is not a chance already, is a last attack — a corner or a
   free kick at the box for the side that is behind, or for the side with the ball at a draw (`Scene.note`).
   Panels carry `index` and `extra`; the clock reads "Nachspielzeit +1".
Open after v0.25: `--values` shows small negative minimums (−1…−3) for four defending cards — a closed through
ball becoming a long shot is sometimes worth more to the attackers in the model; the attacking shouts' larger
negatives (*Schieß!*, *Doppelpass!*, *Leg quer!* at odd places) are older. Not tuned (priority rule).

v0.26 (2026-09-27): **skills, not cards — an RPG loadout.** The single card and its yes/no are gone, and so is the
card framing. Before kick-off the coach picks **three skills for each of the six situations** (ball action,
challenge, set piece — with the ball and without it), and in the match those three stand under every panel of
that situation: he uses **one of them, or none** ("Nichts sagen"; the clock running out is none). Nothing rotates,
nothing is drawn: the same *Steil!* is there every time the ball action with the ball comes up, and using it
again is his call. What a skill does, how it pulls, what it costs, is unchanged — a card in the code is a skill
on screen.
- **The draft** (`src/engine/loadout.ts`, the screen *Vor dem Anpfiff*). Per situation a list of six is dealt
  from the pool (`POOL` in `cards.ts`, the v0.16 playtest deck), three of it already picked; tap to put one back,
  tap another to take it, ↻ deals the rest of a list again. The deal is weighted by **reach** — the share of
  that situation's panels in which a skill does anything, measured once on twelve matches without skills
  (`npm run strip -- --reach`) — square-rooted, so *Ruhig!* comes up often without crowding out *Schieß!* and
  *Flanke!*, which only do something in a few ball actions; below 5 % a skill is not dealt. At most one drama
  picked per situation (a bench still lays one drama a match), at least one shout among the three picked by
  default (the player is the coach), and the six lists do not repeat each other while the pool allows.
  The pick numbers 1–3 are the keys in the match. After a match, *Nochmal* keeps the pick, *Neu aufstellen*
  opens the draft again.
- **In the panel** the three are big buttons (glyph, name, the one line, the price); a skill that does nothing
  in this picture lies grey (v0.11), a once-skill already used or a second drama reads *verbraucht*, one the
  god will not pay for *Gott schaut weg*. When none of the three does anything the button reads *Zuschauen*.
  Hovering a skill blinks its price on the bars. Dropped: v0.25's "never the card shown the panel before" (a
  repeat is now the coach's choice) and the rotation under the slot. Kept: the humble Gunst for a bench that
  could have used something and did not.
- **The rival** brings a loadout built around his tells (`signature` in `rival.ts`: the Schleifer always has
  *Umhauen!*, *Lang!*, *Drauf! Drauf!*, *Direkt!*, *Anlaufen!*), uses a tell whenever it is usable, otherwise
  his streak picks one of his usable three at random. His bench shows three backs; one leaves when he uses it.
- Headless (200 matches): 3.68 goals a match; A has something usable in 70 % of panels and uses it then.
Open: whether the draft wants a hint of what a skill is for (it shows name, line and price, never an effect —
v0.10); whether a skill should cool down after use; whether the coach should see the rival's loadout.

v0.27 (2026-09-27, user brief: **"completely redesign the flow of the game, only match highlights should be played,
not the full game"**): **the match is its highlights.** The strip no longer plays 18 panels a half in a row — the goal
kicks, the square passes in midfield and the throw-ins in our own half are gone. A match is about ten *Szenen*, like
the Sportschau shows a Kreisklasse match, and between two of them the clock jumps.
- **A highlight** (`src/engine/highlights.ts`) opens at a hot moment for one side: an attack in their half, a run down
  the wing, a counter, a free kick near the box, a corner, a throw-in deep in their half — or the other side's back line
  wobbling (their keeper or a defender on the ball in front of their own box). Its headline names it: *Konter RWK*,
  *Ecke für SVH*, *Wackeln hinten bei RWK*. It then runs panel by panel with the sim as before, and goes on while the
  ball is **hot** (`hot`: a chance, a counter, a drama, anything in a box, open play, a throw-in or a free kick in the
  last 40 % of the pitch) — so a lost ball that becomes their counter carries on the other way. It ends when the ball
  is cold (the keeper has it, a goal kick, back in midfield), when it is in the net, or after five panels. Many are two
  or three panels; some fizzle after one.
- **Whose highlight** is next: even, leaned by the form (fresher legs and higher heads get more of the ball), and from
  the 70th minute towards the side that is behind.
- **The Zeitraffer.** Between two highlights the screen fast-forwards: the clock runs 4–12 minutes, one to three lines
  say what happened off camera (`data/gaps.ts`: the ball in the Maisfeld, a yellow for Meckern, the Durchsage for the
  white Passat; early lines at the start, tired ones late, after a goal what the goal did), the gauges that changed
  word say so, and the next headline bursts in. Tap or Enter skips it. Under it, locked, lie the three skills you will
  have for the scene it opens with, so you can think while the clock runs. Off camera nothing is rolled: **no goal
  ever falls off camera**, the football only exists in the highlights. The form keeps moving there (`afterGap`: legs
  per minute, Moral and Gunst drift as they would have over the panels nobody watched).
- **The clock** is the match minute (*34'*, *45+2'*). The match opens off camera (Anpfiff → the first highlight), and so
  does the second half after the Kabine. The kick-off is no longer played, so the kick-off skills (*Vom Anstoß!*,
  *Kirchenglocken* …) and the goal-kick ones are not dealt any more — the draft's `reach` is measured on highlight
  panels, so the draft follows the new flow by itself.
- **Nachspielzeit** is one more highlight past 45 or 90, sometimes (30 % in the first half, 45 % in the second, 85 % when
  it is close); at the end of the match it is v0.25's last attack, a corner or a free kick for the side that is behind.
  After it, the whistle.
- The strip at half-time and full time is grouped by highlight, each opening with its minute and headline.
- Gone: `K.scenesPerHalf`, `K.stoppage`, the end-of-half "only what still matters" rule (v0.25 `lastCall`), the
  kick-off panel after a goal (a goal ends its highlight; the gap starts with the kick-off). The rival's
  `never_first` tell now means the first panel of a highlight.
- Headless, once after the change (100 matches): 11.3 highlights and 28.5 panels a match, 4.3 goals; without skills
  A 92 · draw 40 · B 68 of 200.
Open: whether ten highlights is the right length (`H.gap`); whether the coach should get a say between highlights
(nothing to decide there now, on purpose — no plan cards); whether a highlight that fizzles after one panel should
be rarer.

## 1. Vision

A match is a sequence of comic scenes. Every scene has a **type** (a corner, a wing run, an
argument with the ref, a keeper throwing the ball out) and a **cast** of acting players. Scenes
run automatically, ten seconds each, nobody presses "next". The coach holds a hand of cards per
half and may slide one card into a scene if it fits the scene type. At the panel change both
coaches' cards flip and do their thing, then the world decides what the next scene is. No odds
are ever shown — the coach reads the strip, not a table.

### Pillars

1. **The strip never waits for you.** Ten seconds, next panel. A card is a reaction, never a turn —
   but since v0.7 there is always one worth laying, and the question is which.
2. **Cards fit scenes, not moments.** A shout says what it wants ("Flanke!"); it is worth most in the
   panel where that can happen and a little anywhere else. The tension is spending it here or holding it.
3. **Shouts lean, drama forces, dice resolve.** A shout makes what the coach wants likelier and never
   costs football; a drama card decides what the next panel is. Dice decide what happens inside a
   panel, tilted by who is in it. The coach can always see what a card did, and never sees a number.
4. **Hidden dice, visible faces.** The transition tables exist but are never shown. Feedback is
   the drawing and the commentary: the striker's grin, the ref's hand on the pocket.
5. **The cast matters.** Who is in the panel is decided by role and scene type; what they do
   there is decided by their traits and the card that names them.
6. **Collect people, not numbers.** Players, club personalities and rival coaches are cards you
   gather; the club grounds are what let you field more of them.

## 2. The match (Prototype)

### 2.1 Structure

- Two halves, **18 scenes each**, 10 s per scene → about 6 min per match plus half-time.
- **Three situation types (v0.14).** Every scene is one of three, seen from the side with the ball:
  - **Ballaktion** (ball action): our man has the ball and time, nobody is on him; he picks what to do —
    pass, long ball, cross, shot. Scene types: `play`, `shot`, `keeperball`.
  - **Zweikampf** (challenge): a man of theirs is directly involved — a dribble, a tackle, an aerial duel, a
    man against the keeper. Scene types: `duel`, `counter`, `cross`, `header`, `through_on_goal`.
  - **Standard** (set piece): a dead ball — `kickoff`, `goalkick`, `throwin`, `freekick`, `corner`, `penalty`.
  For the bench without the ball it is the same situation mirrored: their ball action, their challenge, their
  set piece. Open play moves between the first two: a pass into their half usually lands in a challenge,
  beating the man buys a ball action. Drama scenes carry a type too (the dog is a challenge, the mayor a set
  piece). The type is `SceneType.situation`; the piles stay the two of the ball.
- **The pitch (v0.13).** The ball has a position `{x, y}` seen from the side that has it (x from its own goal
  line to the goal it attacks), mirrored whenever the ball changes hands. A scene type is a function from that
  position to a table (`src/engine/sim.ts`): open play (`play`, labelled by zone — Spielaufbau, Mittelfeld,
  Flügellauf, Vor dem Strafraum, Im Strafraum), `counter`, `cross`, `shot`, `header`, `through_on_goal`,
  `keeperball`, and the dead balls `kickoff`, `goalkick`, `throwin`, `freekick`, `corner`, `penalty`. Open play
  alone has up to seventeen outcomes, and the place decides which exist and how likely they are: shots only
  within thirty metres and a sane angle, crosses only from wide in their half, through balls only past our
  own third; a shot's chance is a Kreisklasse xG by distance and angle. Every row says where the ball goes
  (`to`), so the next panel is built at the next place — the strip is a path over the pitch. Traits tilt rows
  by slot (the man on the ball is `carrier`, his opponent `marker`), so a Treter's foul costs a free kick in
  midfield and a penalty in the box. The drama scenes keep fixed tables and inherit the ball's place.
  The paragraphs below that speak of fixed tables per scene type describe v0.12 and earlier.
- A scene = `{ type, cast, side }`. `side` is who has the initiative (attacking side, or the
  side whose player caused the drama). The initiative side is "the attacker" below even in
  drama scenes.
- Scene types carry **tags** from a small set: `attack`, `defence`, `setpiece`, `keeper`,
  `drama`, `offball`, plus two that say what *kind of moment* fits: `duel` (a man faces a man:
  buildup, wingrun, counter, through ball) and `box` (in front of goal: cross, shot, through
  ball, corner, penalty). Every type also names an **`advance`** target: the panel you reach by
  beating your man here (wingrun → cross, cross → shot, through ball → goal). Examples:
  - `kickoff` (offball) · `buildup` (attack) · `wingrun` (attack) · `cross` (attack) ·
    `shot` (attack) · `through_on_goal` (attack) · `counter` (attack, defence)
  - `offsidetrap` (defence) · `corner`, `freekick`, `penalty` (setpiece) · `keeperthrow` (keeper)
  - `hund`, `buergermeister`, `schwalbe` (drama) — reached only through a card, never by the dice
- Every type also carries a **`spot`**: where on the pitch it happens, as `{ x, y, where }` seen from
  the side with the initiative — `x` from its own goal line (0) to the goal it attacks (1), `y` from
  touchline to touchline, `where` the German place name ("im Strafraum", "an der Eckfahne"). A few
  spots are off the pitch on purpose (`buergermeister` at the fence, `feuerwehr` towards the
  Gerätehaus), and a wing spot is marked `flank`: the drawing picks a wing from the cast, the same
  one all panel. Only the picture uses it; the dice never look at it.
- Each type has a hidden **table**: rows of `{ id, weight, next type, flip?, word, actor, text }`,
  incl. `goal`. A `flip` row hands the initiative to the other side; `word` is the panel's one- or
  two-word headline and `actor` the slot it belongs to (§2.4). Tables are data
  (`src/engine/data/scenes.ts`), not code.
- The **cast** is filled per type from role slots (`wingrun` → one winger of the attacker + one
  defender of the other side; `corner` → taker, target, marker, keeper). Players have no
  numbers, only **traits** (`schnell`, `Treter`, `Rentner`, `Kopfballungeheuer`,
  `Fliegenfänger`…). A trait is a list of tilts on specific rows of specific scene types, and
  only fires when its owner is in that slot. Traits and shouts are the only things that touch the
  dice. A coach who knows their people knows which panels to shout in.

### 2.2 Who is in the picture, and what the bench shouts

Second playtest verdict on v0.3/v0.4 cards: unfun. A card only ever said "the next panel is X",
then hidden dice ate X; half the hand was dead in most panels; Answers and Tricks were coin-flip
guesses against a face-down card; every card was the same size. Third verdict, on v0.5/v0.6 (few big
cards with cost rows, three a half): too little to do — most panels were watched, not coached, and a
shout with a price was a sum to work out under a ten-second clock. v0.7 is built around one sentence:

**The coach lays a card in most panels, and every card he can lay is a plus.** What balances it is the
opportunity cost: the card is gone and the slot holds something random now.

**A card is playable only where it does something (v0.11).** Note on v0.10: half the hand could be laid
in any panel and did nothing there — "Flanke!" at the goal kick was legal, cost a card and bought a shrug.
Cheering is gone. A shout is playable when it leans at least one row of *this* table and leaves at least
one alone; anything else lies grey in the hand and cannot be laid. Two things follow. One: the hand is
honest — what you can lay is what will do something, and the card still never says *what* (v0.10), only
whether it has anything to say here. Two: the deck has to speak to every picture, or the bench stands
there mute. That is what row tags are for: every row carries what it *is*, seen from the side with the
ball — `#pfiff`, `#gegenpfiff`, `#gefahr`, `#fehler`, `#geklaert` — and a shout names a kind rather than a
list of scenes. *Schiri!!* leans `#pfiff` and therefore works at a penalty, at a Rudelbildung and at the
Schwager alike. Headless: the bench has nothing to lay in 23 % of panels, and they are the panels where
that is right — the kick-off, the goal kick, and the drama scenes where the village decides and no shout
reaches the dog. A bench with nothing playable digs: cards go under the pile until one comes up that would
have worked, so a hand of specialists never sticks.

**The picture decides, and everyone can read the picture.** A scene is a type and a cast. Every
cast member with a trait that *fires* in this scene type and slot shows it on the panel as a
trigger line — "⚡ kommt an den Ball, oder es pfeift", "⚡ fliegt, fängt aber selten". Both benches
see the same triggers before they lay anything. Seven traits (`schnell`, `Treter`, `Rentner`,
`Kopfballungeheuer`, `Fliegenfänger`, `kaltschnäuzig`, `Nervenbündel`), a coach knows all of them.

**The deck, v0.15.** Three cards per situation, picked so that each situation has one card that is usually
right and at least one that is sometimes wrong — saying no has to be a real answer:

| | Ballaktion | Zweikampf | Standard |
|---|---|---|---|
| **mit Ball** | Lang!, Steil!, Freibier! | Lauf!, Schiri!!, Schwalbe! | Schnell!, Direkt!, Auf den Kopf! |
| **ohne Ball** | Drauf! Drauf!, Zustellen!, Hund | Umhauen!, Stellen!, Abseitsfalle! | Anlaufen!, Mauer!, Bürgermeister |

The other cards in `cards.ts` are the pool. Gaps (`npm run strip -- --cover`): nobody has a card at a header,
and the side taking a kick-off, goal kick or penalty has none — those are panels to watch. Open: whether a no
should keep the card on top instead of sending it under (then passing is saving it for a better picture).

**v0.16: 24 more shouts in the pool, not yet in the deck.** With the ball: *Über außen!*, *Doppelpass!*,
*Tempo raus!*, *Nachsetzen!* (ball action); *Tunnel!*, *Körper rein!*, *Zieh das Foul!*, *Drück ihn runter!*
(challenge, the last one at the header); *Die Variante!*, *Einwurf lang!*, *Zweiter Pfosten!*, *Mitte!*
(penalty), *Vom Anstoß!* (kick-off), *Torwart spielt mit!* (goal kick) (set piece). Without it: *Fallen lassen!*,
*Linie halten!*, *Schlafmütze!* (ball action); *Taktisches Foul!* (counter only), *Doppeln!*, *Nicht springen!*,
*Kopf dazwischen!* (challenge, at cross and header); *Pfosten besetzen!*, *Nicht drehen!*, *Zappeln!* (set piece).
Two need rows of their own in `sim.ts`: the trick free kick (`fk_variante` / `fk_verstolpert`, central and in
their third only) and the shot from the kick-off (`anstoss_tor` / `_gefangen` / `_drueber`, 3 % of kick-offs
without a shout). The header, kick-off, goal-kick and penalty cards close the gaps above once they are dealt in.

**v0.16: events, a third kind of card.** Small absurd things from the village that do not stop the match: the
Gülle wind, a wasp from the cake stall, a phone ringing in the wall, the Pfarrer at the fence. An event pulls the
table exactly like a shout (same six situations, same yes/no, same `pull`); the difference is the voice. Nobody
shouts it, it happens, and its line says so (*„Vom Kuchenstand kommt eine Wespe.“*). Green card head, label
„Ereignis“. 26 in the pool: with the ball *Gülle*, *Rückenwind*, *Erwin am Ausschank*, *Blaskapelle*, *Durchsage*,
*Tiefe Sonne* (ball action), *Wochenblatt*, *Freundin am Zaun*, *Plastiktüte*, *Deren Stollen* (challenge), *Handy
in der Mauer*, *Aufgepumpt an der Tankstelle*, *Taube auf der Latte*, *Mückenschwarm* (set piece); without it
*Wespe*, *Falsches Trikot*, *Pfütze*, *Bus hupt* (ball action), *Brille im Auto*, *Pfarrer am Zaun*, *Bratwurst*,
*Dackel am Zaun* (challenge), *Böller*, *Schief gekalkt*, *Oma am Zaun*, *Kirchenglocken* (set piece).

**v0.16 playtest deck: big slots.** For now every card that can do something in a situation is dealt into
that slot (`DECK` in `cards.ts`, ~20–30 per slot; a card that fits several situations is in several slots).
The offer rule is unchanged: the first card of the slot that moves this panel, then it goes under. The three-card
v0.15 deck is kept as `DECK_V15`. Plan: play, then cut the slots back to the cards that are fun.

**v0.13: three piles — withdrawn in v0.14.** The set-piece cards are now in the two piles of the ball (taking
side: with the ball; defending side: without) and gated to `setpiece`. What follows is the v0.13 text.
Open play with the ball, open play without it, and the dead ball. At a kick-off,
goal kick, throw-in, free kick, corner or penalty both benches play from their set-piece pile; a set card is
`for` the side taking it (*Direkt!*, *Auf den Kopf!*, *Kurz ausführen!*, *Hoch und weit!*, *Schnell!*,
*Verladen!*, and the drama *Handspiel!*, *Torwart nach vorne!*, *Eisspray!*) or the side defending it (*Mauer!*,
*Manndeckung!*, *Immer links!*, *Anlaufen!*, *Bürgermeister*, *Psychospiel!*). The hand shows the pile that
fits the panel; the other two lie closed.

**Shouts pull (v0.13).** A shout's rows get `pull` of the way from their share to certain — 0.6 turns a 10 %
cross into a 64 % cross and a 40 % one into 76 % — and its `down` rows lose `pull` of their weight. So the
simple shouts make one or two outcomes very likely, and the place decides which outcomes exist: *Flanke!*
is live on the wing in their half and grey in our own. A shout names what the man *does*, not how it ends:
*Schieß!* makes the shot likely, the distance decides whether it goes in; the few result cards (*Freibier!*,
*Auf der Linie!*, *Verladen!*) pull softly. Shouts without the ball pull softer (0.35–0.5): defending is
preventing. Two shouts in one panel are a tug of war — each pulls the table on its own and the two results
are averaged, so neither bench wins by revealing last. Since the place now decides, a shout can be a minus
where no coach would shout it (*Schieß!* from the byline, *Direkt!* from wide out); a negative min in
`--values` is a question of where the row should exist at all.

**The deck is two piles, the hand is five of each — but only one pile is ever on the table.** (v0.12) Cards for
when you have the ball (`ball`) and cards for when you do not (`noball`); the ball decides which of the
two you are holding, the other lies closed until it changes hands (§2.4). A laid card draws the next from
its pile; an empty pile is the shuffled discard. A bench that lays nothing cycles the oldest card of the side that fits the panel
(leftmost, under its pile) — so a hand never clogs with narrow cards, and passing is a way to dig for
the dog. Both benches play the same 45 cards: 17 shouts with the ball, 13 without, 15 drama.

Two kinds of card:

- **Shouts** are what a Kreisklasse coach actually yells: *Schieß!*, *Flanke!*, *Steil!*, *Kopf!*,
  *Lang!*, *Ruhig!*, *Schiri!!* with the ball; *Umhauen!*, *Drauf! Drauf!*, *Torwart raus!*, *Weg
  damit!*, *Mauer!* without. A shout makes its rows likelier (×5) and nothing else. Most of the time
  the man does what was shouted — stamp **"gehört"** — and sometimes the dice go elsewhere anyway —
  stamp **"überhört"**, plus one line of what that looked like ("*Steil*, hat die Bank gerufen. Steil war
  dann höchstens der Blutdruck vom Trainer."). Not shouting would only have made the nonsense likelier;
  that is why a shout is never a mistake, only a choice. A shout on a panel it does not reach (Flanke! at
  the kick-off) cannot be laid at all (v0.11): it lies grey in the hand until a picture comes that it has
  something to say about. The hand shows that much and no more — whether a card is live here, never how
  well it fits or what it would do (v0.10): the coach knows what "Flanke!" is for, and if he is wrong, the
  panel tells him (§2.4).
- **Drama** happens to the match and forces a scene of its own: *Hund auf dem Platz* (the dog eats their
  attack; whose throw it is, is a coin), *Bürgermeister am Zaun* (only at their dead ball; the ref sends
  the other coach to the stands for three panels, sometimes both; the ball is yours after), *Abseitsfalle!*
  (the chain steps up; flag or their man is through, decided by who runs and who is last man), *Schwalbe!*
  (your man goes down in the box: penalty, or yellow and a free kick for them). One copy each; the dog
  and the mayor are `once` — laid, they leave the deck for the match (the dog is tied up, Hubert has
  appointments), the other two shuffle back.

v0.9 adds, as sidegrades of the twelve above — a sidegrade leans different rows, or the same rows with a
different width, never the same rows harder:

- With the ball: *Kurz!* (the safe brother of *Lang!*: short at the kick-off and the throw, back pass rather
  than lost ball), *Trau dich!* (one weak lean, ×3, on every direct option: Steilpass, Schuss vom Flügel,
  Freistoß direkt, durch), *Lauf!* (for the runner: durch, and past the full-back), *Absichern!* (leans only
  away from the rows that lead to a counter — heard unless the counter came), *Freibier!* (×7 on the goal,
  nothing else: the narrow, loud brother of *Schieß!*).
- Without the ball: *Stellen!* (the clean brother of *Umhauen!*: ball won, no whistle — it also talks a Treter
  out of his foul), *Auf der Linie!* (the keeper card for the shots and penalties *Torwart raus!*
  cannot reach), *Reinwerfen!* (*Weg damit!* for the box: blocked, or to the corner), *Zustellen!* (no through
  ball; *Drauf!* goes for the ball, this one closes the gap).
- Drama, each with its own scene: *Sirene!* (fire alarm; three of theirs are in the Freiwillige Feuerwehr —
  60 % they run to the Gerätehaus and we counter, 40 % false alarm; once), *Rudelbildung!* (your man
  shoves, twenty men arrive: yellow for theirs and our free kick, yellow for ours and theirs, or the ref
  breaks it up and gives them the ball; comes back with the shuffle, outside the box only), *Fahne!* (the
  linesman is our landlord; their man is through and Erwin lifts the flag — or the ref waves it away and the
  man is already shooting; once, +19 in front of goal, the answer to the scariest panel), *Trainer rein!* (the
  coach subs himself on: Außenrist and a man through, cramp in both calves, or a yellow for the first
  tackle — a coin, the joke is the point; once — **the one card that bends the "you are never the footballer"
  pillar, drop it if it grates**), *Handspiel!* (the lower-variance sibling of *Schwalbe!* at a cross or
  corner: penalty, "Brust" and a corner, or yellow for screaming).
- Drama, v0.9b: *Bierbank!* (before their finish, a spectator with a Becher is on the pitch: Schiedsrichterball
  for us, or the Ordner is quick and they still shoot, or the ref saw who toasted him — penalty for them; once),
  *Torwart nach vorne!* (at our corner: the keeper heads it in, or their man runs seventy metres at an empty
  goal, or it is cleared; −3 on paper and the widest swing on the ball side; once), *Torlinie!* (at a shot:
  bar, line, Erwin says drin; once), *Eisspray!* (a man lies down, the Zeugwart comes, **a panel is burned with
  the ball** — worth −3 to −5 on paper because `--values` has no clock, and worth a lot with a lead in the last
  panels; comes back with the shuffle), *Schwager!* (the ref is the captain's brother-in-law: free kick, now and
  then a penalty, or he proves how impartial he is; once), *Psychospiel!* (at their penalty, our keeper talks and
  points: into the Bach, into the pointed corner, or the shooter was not listening and takes it anyway).

Rules for writing a card, v0.7: the shout is the name; one line of text that is the picture and never the
rule (v0.10 — no "eher X", no "nur bei Ecke", no "einmal pro Spiel"; the engine keeps the rules, the card keeps
the joke); the `miss` line must be funny
and must fit *any* outcome (it says the shout was not followed, never what happened instead — the row
says that); row selectors are row ids (shared across scene types on purpose: `vorbei` is a miss
anywhere) or `flip`/`stay`; every shout must be a plus in every panel it touches (`npm run strip --
--values` prints min/median/max — a negative min is a selector bug, not a balance question); no
numbers the player can see. Cost rows are gone: v0.6 showed they only bite where they lead to a goal
against, and the sum was not fun under the clock. Added v0.9: a drama scene's rows get **their own ids** when
the shared id would mean the opposite there — in the Fahne scene the side without the ball is the *attacker*,
so a row called `abseits` would let *Weg damit!* lean it against its own bench (`--values` catches this as a
negative min; it caught two on the first run).

### 2.3 Commit and reveal

Each bench lays at most one card face down per panel; the attacker's reveals first, the defender's
last.

1. **Drama** decides the panel: the next scene is the card's. If both benches laid drama, the
   defender's has the last word and the attacker's is overruled; a shout against drama is overruled
   too (rare: about one panel in fifty).
2. Otherwise the **dice**, tilted by the triggers in the picture and by both shouts (two shouts
   against each other simply pull the table both ways). Whether a shout's row came up is never said
   (v0.17): the card is played, it does something, something happens. The engine keeps it as
   `result` for the strip tool only.
3. Goal, bans (three panels on the stands, hand kept, no cards); then the clock. The hand stays
   across half-time: it is always full anyway.

Cancels and blackouts are gone from the engine (no card used them).

### 2.4 What the screen shows

Built for one rule (v0.7): **the match must be followable as text, one word at a time, and the men in
the picture are the picture.**

- **The situation badge (v0.14).** The first thing on the panel: the situation type — ⚽ Ballaktion, ⚔
  Zweikampf, ⛳ Standard — in the colour of the side with the ball, and "wir am Ball" or "RWK am Ball" beside it.
  Under it the title: the zone for open play ("Im Mittelfeld", "Vor dem Strafraum"), the set piece or scene
  otherwise ("Ecke", "Konter").
- **The stage.** The cast as big figures — face, name, role, side colour — the initiative side on the
  left, "gegen", the other side on the right. Under a man, the trait line that fires here. One line of
  prompt under the stage, the 10 s bar on top, the laid cards as small chips in the title caption.
- **The word.** Every row of every table carries a one- or two-word headline (`FLANKE!`, `BALL WEG`,
  `GEHALTEN!`, `TOOOR!`, `TRIBÜNE!`) and an actor. On the reveal the word bursts in under the men
  (~0.5 s), the actor's figure bounces and gets a gold ring while the others step back, then the
  commentary fades in line by line (the shout, what happened, the joke), then a chip: "→ Flanke ·
  SVH am Ball", with a black **"Ballwechsel"** chip when the initiative flipped, or "⚽ TOR für …".
  A goal turns the word black-and-gold and pops the score.
- **The pitch (v0.12).** A chalk sketch of the field beside the men, with one mark on it: where this
  panel is happening. It never turns — **SVH attacks to the right, both halves** — so the coach reads
  one picture all match: a mark deep on the right is their box, a mark on our line is trouble. The
  goals are in club colours, a small arrow over the halfway line says who is playing which way, and a
  hollow dot with a dashed run says where the ball came from. When the panel resolves, the mark runs
  from the scene's place to where the next panel opens, in the colour of whoever has the ball then, and
  the place line reads "Mittelkreis → links auf dem Flügel" — the reveal ends on the picture the next
  panel starts with. On a goal the mark goes into the net, gold; after a goal or at the whistle there
  is no run into the kick-off. Under the sketch the place in words ("am Sechzehner", "am Zaun"), because the match must be
  followable as text — the headless strip prints it too. The thumbnails carry the same mark, so the
  strip along the top doubles as a map of where the match was played.
- **Laid cards, v0.17.** A small chip beside the situation badge: yours face up (art and name) the
  moment you say yes, the rival's as a small back when he lays, turned face up on the reveal. Nothing
  laid, nothing shown — no "nichts gelegt", no "nicht gespielt" (the hand already shows your no). No
  verdict either: the GEHÖRT / ÜBERHÖRT stamps and the `miss` lines got tiring fast, and the player
  does not need to know how a card worked, only that it was played and something happened. The
  "wegen Hund (SVH)" line under the next panel's title still says what a drama card forced.
- **The skills, v0.26** (replaces the hand): your three for this situation, framed blue with the ball and red
  without, keys 1–3, and *Nichts sagen* (N) under them; see the v0.26 entry at the top. The two bullets below are
  v0.15 and earlier.
- **The hand, v0.15: one card and two buttons.** Framed in blue with the ball, red without, labelled with the
  situation ("Zweikampf · ohne Ball"); the card deals in face up, the other two of the situation lie face down
  beside it. **Spielen** (1) sends it flying to its chip in the caption; **Nicht spielen** (2) greys it. Either answer ends the panel early; the clock running out is a no. No
  card: "Hier hilft kein Zuruf". The rival's bench shows the one back he was dealt; it leaves when he lays it,
  and his no is never shown. The rest of this bullet is v0.14.
- **The hand: one pile at a time, never both (v0.10c).** Only the pile that fits the ball lies open,
  five cards, framed in your colour — blue "Mit Ball", red "Ohne Ball". The other pile lies closed beside
  it as a small stack of backs: you see it waits, not what is in it. When the ball changes hands the table
  turns over — the new cards flip up one after the other, the label pops with a "↻", and the closed stack
  slides in from the other side. The switch happens at the whistle of the new panel, not during the reveal:
  through the reveal you still see the pile you just played from. A card that would do nothing here is greyed
  and cannot be laid (v0.11), and that is all the hand says (v0.10); when the whole open pile is grey the
  label reads "Hier hilft kein Zuruf" instead of naming the pile — this is a panel you watch. A card is name, picture, one line of flavour — never what it does,
  never how well it fits; the stamp on the reveal is the only place a card is read. The leftmost card is
  tagged "⌛ älteste": it is the one that goes under the pile if you lay nothing. Keys 1–5 lay the open
  pile; the card flies to your corner and lies face up. The rival's card lands face down on his corner at
  the moment he decides — early or late is his tell. Above the panel: his name, one line of flavour, and
  his two hands as card backs, the one the ball shuts greyed out.
- The strip along the top: one thumbnail per panel with its word, the match's own replay.
- The reveal stays 7 s (0.7 × panel time); a tap or Enter skips it; Space pauses without restarting
  the animations. No numbers anywhere except the score and the clock.

### 2.5 Form: Puste, Moral, Gunst (v0.22)

Three gauges per bench, team-level, 0..1 in the engine (`src/engine/form.ts`) and three words on screen. They
tilt the dice the way a trait does, only for the whole side, and they give the yes/no a price.

| | high | middle | low | moves when | tilts |
|---|---|---|---|---|---|
| **Puste** (legs) | frisch | geht so | platt | every panel drains a little (challenges most, a dead ball gives some back); every shout costs; half-time gives back a good part | a tired side with the ball makes more mistakes (`#fehler`) and fewer chances; a tired side without it lets more through (`#gefahr`, dribbling, through balls) |
| **Moral** (heads) | heiß | normal | Köpfe hängen | goals, whistles for and against, blunders, chances; drifts back to normal — a bit above for the side behind (*jetzt erst recht*), a bit below for a side two up | how hard the men follow a shout (pull ×0.7 at 0 … ×1.3 at 1); chances against mistakes |
| **Gunst** (the god) | lächelt | schaut zu | schaut weg | events and drama spend it; a card offered and not laid earns a little back; bad luck (a goal conceded, a whistle against) earns some back; it drifts slowly back to the middle (the god forgets, both ways) | the bounces (Abpraller, Flutscher, Eigentor against Latte, Pfosten, Patzer) and the whistle lean towards the side he likes more |

- **Prices follow strength (v0.23).** After the first playtest ("cards cost a lot of favour, sometimes legs or
  mood, and aren't all that strong for it"): the defending cards and the safe shouts pull at a quarter of
  their written strength (`DEFENCE_DAMP`, `SAFE`), yet they cost as much as an attacking shout that pulls
  twice as hard. Now a shout's or event's Puste and Gunst price is its kind's price × pull / 0.8 (never under
  0.35 of it), so a *Drauf! Drauf!* costs a third of a *Schieß!*. Moral and gifts stay as written. The
  shouts that cost Moral cost it *instead* of Puste, not on top. Base prices down a bit (shout 0.03,
  event 0.06, drama 0.2), and Gunst drifts 3 % a panel back to the middle, so one drama is not the rest of
  the match in *schaut weg*.
- **Prices.** A shout costs Puste, an event or a drama costs Gunst (a drama about three events). Exceptions,
  where the picture says so (`COSTS` in `cards.ts`): shouts nobody runs for are free (*Schiri!!*, *Nie im
  Leben!*), *Ruhig!* and *Tempo raus!* give legs back, the running shouts cost more (*Drauf! Drauf!*, *Lauf!*),
  the shouts the men do not like cost Moral (*Fallen lassen!*, *Hoch und weit!*, *Kurz!* with the Bierbank
  whistling), *Freibier!* gives Moral, the god has nothing against the *Pfarrer* or the *Kirchenglocken*, and
  among the drama *Schwalbe!* and *Trainer rein!* cost Moral, *Rudelbildung!* gives it (nothing welds a team
  like a brawl) and *Eisspray!* gives everybody a breather.
- **The god does not lend.** A card that costs more Gunst than the bench has is not offered; the next of the
  slot is. Puste and Moral have no such gate: a coach may run his men into the ground.
- **Shown as bars (after the first look: "I don't understand the levels at all").** Your form is three
  labelled bars under the score — Puste, Moral, Fußballgott — each with its word and two marks where the
  word changes, and a **?** that explains all three in a line each (it pauses the match). The rival's three
  are small bars on his bench. While a card is on offer, the part of a bar it would cost blinks red (green for
  what it gives), and the card says at its foot what it costs in words ("Kostet 💨 Puste · gibt 💪 Moral").
  This is a deliberate exception to "never a number": the bar is how much, and the coach has to be able to
  see a price to weigh it. On the men: 💦 when the legs are gone, 🔥 when the heads are up, the chin down when
  they hang. A word that changes is a line in the panel's text ("RWK pfeift aus dem letzten Loch.").
- **Half-time.** The tea gives Puste back. The talk (`talks.ts`) moves the gauges: the team talks and the
  talks to one man lift Moral (an Anschiss can flop and drop it), *Hinten dicht* saves legs, and the
  *Lebensweisheit* does nothing for the men — but the football god likes to hear his own proverbs.
- **Rival.** He knows his men: when they are platt he says yes to a running shout half as often.

Not tuned (§ priority rule): the numbers in `F` are first guesses. What a playtest should look at: whether a
no now feels like a choice, whether one drama card (0.2 of the starting 0.5 Gunst) is too dear or now too cheap, whether the cheap defending cards are laid every time, and whether Puste
makes the last twenty minutes feel different.

## 3. Metagame (Prototype-light, Later-full)

Roguelite lower-league manager, as before. A **run** is one season with a club drawn from a
handful of starting clubs.

- **Week loop**: one or two decisions (narrative, German, Kreisklasse humour), then the match.
- **Rewards** after a match: pick 1 of 3 — a player, a personality, a shout, or a building step.
- **Players** (roster, max 16): role + 1–2 traits + signature card. No strength values.
- **Personalities** (max slots from infrastructure): passive club effect + their cards.
- **Rival coaches are people with tells.** Bluffing only works against someone who can be
  read, so every AI coach has two or three fixed habits and one random streak: *der
  Schleifer* answers every wing run with "Umhauen!", *der Taktikfuchs* never plays the first
  card of a half. Habits are written into the commentary so the player learns a rival the way
  they learn a real one. Beaten rivals join the collection and can be studied.
- **Infrastructure**: Vereinsheim (personality slots), Trainingsplatz (hand size, +1 max),
  Flutlicht (extra scene types unlocked, e.g. night-match drama), Tribüne (fan scenes tilt
  toward you), Kabine (keep 1 card across half-time).
- **Run end**: season over → collection persists (players, personalities, rivals seen once are
  unlocked for future starting pools); the club and buildings reset. Relegation ends a run
  early.

## 4. Tech

- Vite, one entry (`index.html`). Until 2026-09-25 this lived under `scenes/` next to the Football God line.
- `src/engine/` pure: `step(state, laid) → { state, panel }`. Scene types (rows with `word` and
  `actor`), traits, rosters and cards are data files under `src/engine/data/`. Engine has no
  timers; the 10 s clock lives in the UI. RNG state is part of the match state. `fits` gates a card by
  the side of the ball and its `playableIn`; `moves` says whether it changes this panel's odds at all,
  and since v0.11 that is what `playable` means, for the rival as much as for you.
- `src/engine/rival.ts` — AI coaches. A rival is data: tells (`always` a card the moment
  it is live, `never_first` panel of a half, `never_in` a scene type), a random streak, and a
  window for when a random card goes down. `decide(state, side, rival, rng)` → card + timing.
- `src/ui/` — DOM, one panel, your hand as a fan of cards, the rival's hand as backs.
  `pitch.ts` is the pitch inset: pure geometry over a scene's `spot`, no engine state, one inline SVG
  (a turbulence filter does the chalk wobble). It also draws the thumbnail-sized mark for the strip.
- `src/strip.ts` — headless runner that prints a whole match as a text strip: A lays whenever it
  can (a fitting card if there is one), B the rival. Run once after structural changes to read
  whether the strip still reads as a match (no tuning loops). `--stats N` for distributions, how
  often A lays, how often a shout is heard. `--values` prints what each scene is worth (P(the side
  at the ball scores the next goal), Markov over the tables, cast averaged) and what each shout is
  worth per panel as min / median / max over casts with the triggers at the extremes. `--cover` lists how
  many cards of each pile move something in each scene type, and in how many scene types each card does
  anything: the v0.11 health check of the deck, to be read after writing or widening a card. Since v0.7
  every min must be ≥ 0; a negative one is a selector bug.

## 5. Prototype scope

- **Phase 0 (done 2026-09-20): the text strip.** Scene types, cards, two 11-man rosters with
  traits, `step()`, and `npm run strip`.
- **Phase 1 (playable 2026-09-20, then `/scenes.html`, now `/`):** one match, auto-running, 10 s scenes,
  face-down cards, reveal at transition, stamps and captions. 15 scene types, 20 cards
  (12 moments, 4 personality, 4 player). Placeholder art.
- **Phase 1b (2026-09-20):** single player against a rival with tells (two rivals: der
  Schleifer, der Taktikfuchs), real cards in a fan.
- **Phase 1c (2026-09-21, v0.5):** visible triggers, eight cards, three per half, shouts tilt the
  dice, events force scenes; `Row.banned` can bench either or both coaches; blackout state.
- **Phase 1d (2026-09-21, v0.6):** headless analysis answered v0.5's questions before a playtest
  could: triggers did *not* make a shout a decision (spread over casts ≤ 3 points, spread over
  scene types 1–19 points), Bürgermeister was just match-deciding (+5 win points laid in panel 1, one
  bench out for half the match in the median game). Cost rows, card rewrite, five-panel bans,
  odds-based stamps, `--values`.
- **Phase 1e (2026-09-21, v0.7):** play almost every panel. Two piles, hand 3+3, draw on lay, cycle
  on pass, no cost rows, cheer fallback, 16 cards (12 shouts + 4 drama, 25 in the deck), row words
  and actors, the stage UI with the word burst, two-tier hand. Headless: A lays in 92 % of panels
  (3 % nothing fits, 5 % on the stands), shouts heard 55 %, 35 % of laid cards only cheer, 1.1
  goals a match.
- **Phase 1f (2026-09-21, v0.8):** goals. Keeper card limited, once-cards, tables steepened, 18 panels a
  half. `Card.once`.
- **Phase 1g (2026-09-21, v0.9):** 14 more cards, five drama scenes, two rival tells (the Schleifer starts
  brawls, the Taktikfuchs calls the linesman). Headless with all 39 in the deck: 1.9 goals a match (was 2.5),
  A wins 62 % (was 55 %), and 23 % of panels are drama scenes (was 16 %). v0.9b, six more drama cards
  and two more tells (the Schleifer plays for time, the Taktikfuchs talks at penalties): 45 in the deck, 1.7
  goals a match, A lays in 85 % of panels — 11 % nothing fits, because a hand fills up with cards that wait
  for a corner, a shot or a penalty.
- **Phase 1h (2026-09-22, v0.10b):** hands of five instead of three, per pile. More to read and more to
  choose from on the table, and a hand no longer clogs with cards that wait for a corner: headless A now
  lays in 91 % of panels (was 85 %, 5 % nothing fits instead of 11 %), shouts heard 54 %, 36 % only cheer,
  1.45 goals a match (was 1.7) — more panels get a fitting card on both benches, so more of them are steered.
- **Phase 1i (2026-09-22, v0.11):** a card is playable only where it moves the dice. The cheer fallback
  and the "angefeuert" stamp are gone; `Row.tags` (`#pfiff`, `#gegenpfiff`, `#gefahr`, `#fehler`,
  `#geklaert`) give the shouts a vocabulary that reaches the drama scenes too; the broad shouts are doubled
  in the deck; two new no-ball cards (*Nie im Leben!*, *Aufstehen!*); *Mauer!* is gated to set pieces; the
  Psychospiel panel now reads from the penalty taker's side like every other penalty; a bench with nothing
  playable digs through its pile. Headless: A lays in 72 % of panels (was 91 %, but a third of those lays
  were empty cheers), 23 % of panels have nothing playable — kick-off, goal kick and the drama scenes,
  where that is the right answer — shouts heard 53 %, 1.91 goals a match (was 1.45), A wins 48 % · 33 %
  draws. `--values` again shows no shout with a negative min in any panel it is playable in: the rows a
  card leans have to be rows the shouting bench actually wants, which is what the tag vocabulary makes
  easy to get wrong and easy to check.
- **Phase 1j (2026-09-22, v0.12):** the pitch inset. Every scene type gained a `spot` (§2.1) and every
  panel now shows a chalk sketch of the field with one mark on it, fixed orientation, with the run from
  the panel before and the place in words under it; the thumbnails carry the same mark. Presentation only
  — `src/ui/pitch.ts`, no engine change, no dice touched. Open: whether the mark should travel inside
  a panel (kick-off → long ball is one mark today, not two), and whether a scene wants more than one
  place (a cross is a wing and a box).
- **Phase 1k (2026-09-25, v0.13):** the football simulation and the set-piece pile. `sim.ts` builds every
  open-play and dead-ball table from the ball's position; scenes carry their table, label, prompt and spot;
  rows carry `to`; shouts pull instead of multiplying; three piles with `Card.for` on set cards; `playableIn`
  entries can require several tags (`play+box`); new tag `upfield` (offside only exists in their half). The dog
  now restarts with a Schiedsrichterball where the ball was. `--values` runs a Markov chain over (type ×
  place) on a 20 × 7 grid and only counts places a match can reach; `--stats --nobody` plays without cards.
  Headless (400 matches): without cards 1.7 goals a match and 4 shooting panels; with both benches laying
  (A random, B the Schleifer) 1.3 goals, A lays in 77 % of panels, 18 % have nothing playable, shouts heard
  40 %. Shouts alone are balanced (attack shouts +1 goal, defence shouts −0.8, both 1.6); the drama cards
  are what costs goals, because the defensive ones each erase a big chance — Sirene!, Fahne! and Bierbank! are
  out of the default deck for that reason (still in the pool).
- **Phase 1l (2026-09-25, v0.14):** three situation types, mirrored; open play split into `play` (ball action)
  and `duel` (challenge); set-piece pile withdrawn; situation badge on every panel. No tuning.
- **Next:** make playing one situation fun (see the priority rule at the top). Not fun yet. No balancing
  until it is.
- **Earlier next:** playtest v0.8 in the UI. Does "überhört" read as a joke or as a punishment? Is 55 %
  "most of the time"? Do two tiers in the hand read at a glance? Then commentary variety (more
  than one `miss` line per shout).
- **Phase 2:** the 4 min match as the loop's centre; more rivals.

## 6. Open questions

- **v0.13: the drama load.** With every bench laying whatever fits, a fifth of the panels are drama scenes and
  the defensive drama cards cancel the big chances: 1.7 goals a match without cards, 1.3 with. Kreisklasse
  football has about four. Levers, in order: fewer drama cards in the default deck; the ref adds a panel of
  Nachspielzeit for every drama scene, so drama no longer eats football panels; then steeper finishing.
- **v0.13: *Direkt!* is about neutral** (−3…+2 by place): the model values a free-kick cross or a short pass at
  the box about as high as the shot. Decide after a playtest whether a Kreisklasse taker should simply
  always be better off shooting from 20 m.
- **v0.13: the value map is still flatter than football** (open play 49 % at our goal, ~60 % at theirs, 70 % in
  the box): without a clock, keeping the ball is worth a lot everywhere. A lost ball in our own third now
  costs something, which is new.

- Does 10 s feel like pressure or like waiting? Alternative: 6 s with a "hold" button.
- One card per scene per coach — or allow zero-cost "passes" that draw?
- Decided: the opponent's face-down card is visible (Snap precedent, and it makes timing a
  tell). Open: should the *family* be visible (steer/answer/trick colour on the card back)?
- Cast selection: deterministic from roles, or weighted so stars appear more often?
- Are whiffs harsh enough that Answers are a decision, without making defending a losing game?
  Read the strip, then decide; do not tune weights.
- Three cards a half: too few to feel like a hand, or exactly the scarcity that makes a shout
  a decision? Trainingsplatz (+1) is the metagame knob if it is too few.
- Events cost two panels (the panel they are laid in says "a dog", the next panel is the dog).
  Fine while the drama panel is worth drawing; fold them into one panel if it drags.
- **The table is flat** (found 2026-09-21, not fixed). Outside the box every scene is worth 50–59 %
  for the side at the ball — possession is a random walk, and a lost ball costs almost nothing
  because the other side's buildup is worth just as little. Consequences: a shout's cost rows can
  only bite when they lead to a goal against or a penalty, so Drauf! and Hinten dicht! stay
  always-positive (smaller now: +6 on a shot instead of +13) and only Torwart raus!, Hoch rein! and
  Umhauen! flip sign with the cast, all at low magnitude; 40 % of panels are Anstoß/Spielaufbau
  where nothing is at stake; 55 % of card-less matches end with exactly one goal, 17 % 0:0. If the
  strip feels like waiting, the fix is steeper tables (a lost ball in your half should hurt),
  not stronger cards. Decide after a playtest, then change the tables once.
- **Hund dominates**: as a defender's card it is worth +16 on a shot and +23 alone in front of goal,
  two to three times any shout. Kept for now because it is the one card that answers a moment
  instead of leaning it, and both benches hold it. If it is the only card anyone waits for, it goes
  to a corner-only or once-per-match card.
- **The rosters are lopsided**: with no cards A wins 41 % and loses 26 % (mirror A–A: 29/31). Torte
  alone (Fliegenfänger, in every keeper panel of B) is +0.2 goals a match for A. The player's team
  is the better one, which may be right for a first match and wrong for a league.
- Cards decide about the right amount: optimal play is worth +10 win points over never laying and
  still loses one match in five. That is the pillar; do not push it.
- **v0.7 → fixed in v0.8:** both benches shouting every panel with *Torwart raus!* on every shot and
  penalty, plus a dog per attack, gave ~1.1 goals a match and 43 % draws. v0.8 took the keeper card off
  shots and penalties (row `breit_gemacht` on Allein vor dem Tor is the one it leans there), made dog and
  mayor once-a-match, and steepened the tables once (Kreisklasse: shot 40 % in, through 50 %, more
  Steilpässe and Abschläge). 36 panels, 2.5 goals a match, 23 % draws. The tables are now the way they are;
  the next lever, if it is still too few, is more box panels (a `wingrun` → `shot` shout), not more ×.
  Watch: 2 dogs + 2 mayors a match is still ~10 % of panels without football.
- **v0.9 deck is fat** (found 2026-09-21, not fixed): with all 39 cards in the default deck, drama scenes are
  23 % of panels and goals drop to 1.9 a match — the new noball cards (*Sirene!*, *Fahne!*, *Stellen!*, *Auf der
  Linie!*) are all defensive, and the headless A lays them whenever they fit. The pool is the deliverable, the
  deck is the knob: the metagame hands out shouts one at a time anyway (§3). If the strip drags, cut the
  default deck back to ~25 (say four drama a bench) rather than weakening cards. Decide after a playtest.
  v0.9b made it fatter (15 drama of 45): a third of the noball hand is now cards that wait for one panel type.
  A drama card also bypasses the "always a plus" rule on purpose — `--values` shows *Torwart nach vorne!*,
  *Eisspray!*, *Schwager!* and *Trainer rein!* at −5…0 on paper; that is the coin, not a selector bug. Keep
  the rule: a negative min on a **shout** is a bug, a negative on drama is a design choice to be written down. *Bürgermeister* at their penalty is worth +38 — the biggest swing in the game; kept because it
  is exactly the "drama that changes everything", watch whether it feels cheap. Shouts on low-weight
  rows (Steil! on a buildup, Schieß! from the wing) are heard well under half the time even at ×5;
  the miss line has to carry those.

## 7. Prior art

Research pass 2026-09-20 (web, ~20 searches). Nothing found combines all four pillars — an
auto-advancing scene strip, scene-typed face-down cards, hidden transition tables, and collecting
people instead of numbers. Every pillar has a close neighbour though, and two games are close
enough to study before building. Grouped by what they share with us.

### 7.1 Closest overall: football + cards + narrative

**NUTMEG! A Nostalgic Deckbuilding Football Manager** (Sumo Digital / Secret Mode, Mar 2026,
Steam, 89% positive). Roguelite lower-league manager with a deckbuilder inside. Start in Div 4,
relegation or the sack ends the run. Matches are a "fast-paced card battler": the match throws
"encounters" at you and you play cards from hand to tilt them; staff training decides which
cards you can play (their version of our personality cards). Retro 80s/90s British nostalgia,
teletext aesthetic. Reviewers' main complaint: only one match per matchday is actually
contested, the rest is simulated — "detached from my progress up the league table". Turn-based,
numbers visible.
→ Biggest competitor risk: it owns "football deckbuilder roguelite" in players' heads. Our
differentiators are the strip that plays itself, the German Kreisklasse tone, every match being
a strip, and people-not-numbers.

**Football Drama** (Open Lab / Demigiant, 2019, PC/mobile). Narrative football manager, you are
the existentially troubled coach Rocco Galliano; 18 matches a season sandwiched between story
interludes; cards earned via story choices are deployed in turn-based matches. Match view is a
bird's-eye pitch with dots and an attack/defend stamina toggle; cards are team-stat boosts
("fake a foul", "offside trap"), not scene-fitting. Criticised for repetitive commentary lines
and for having no relationships with your own players (story is about press, president, wife).
→ Two direct warnings: commentary variety is a first-class feature, and "collect people" must
include the squad.

**Sunday League Manager: Horse and Spoon** (solo dev christianosway, Aug 2025, Steam, 93%
positive, €9). Pub team in fictional Bannockshire; veteran plumbers, sparkies with two left
feet, prima donnas; poker nights and horse betting as metagame. Classic text manager, no cards,
no comic. → Proof the Kreisklasse/Sunday-league tone sells on Steam as its own genre, in
English. We are the German, card-based, comic version of this.

**Match Cards: Football** (PlayeRom, Jun 2026) and **Match Deck: Football** (One Joyful Day,
prototype, TBA). Card-driven match simulations, 3–4 minute matches, turn-based, tactical,
no narrative. → "Cards replace the match engine" is in the air right now; neither has scenes,
timers or a world.

**Squiggle Football** (Max Barry, Aug 2025, 93% positive). Aussie-rules roguelite; matches
auto-resolve with no intervention, coaches and gameplans fuse with players for synergies. Very
numbers-heavy (Squiggle analytics engine). → Interesting "collect coaches" angle; opposite of us
on numbers.

**Non-League Football Manager** (Steam). 1000+ real English non-league clubs, day jobs, ground
grading, mini-storylines. Realistic sim. → Same bottom-of-the-pyramid setting, no overlap in
mechanics.

### 7.2 German lineage

- **Anstoss** (Ascaron 1993–, reboot 2022): the reference for "Fußballmanager mit Humor"; the
  reboot's pitch is literally the series' charm and humour.
- **Boeckham's Football Manager** (Olipool, Mar 2025, Steam, 91% positive): retro
  Anstoss/Bundesliga-Manager successor, deliberately simplified so a season fits in an evening.
  Its selling point is multi-week dynamic narrative events around players and the coach —
  the closest German cousin to our week loop.
- **Kreisliga Football Manager** (Android): full realistic sim of 35k clubs including all German
  amateur leagues. Not humour, not comparable in feel — but it occupies the name "Kreisliga
  Manager".

### 7.3 Tabletop — structurally the closest matches

**Football Highlights 2052** / **Baseball Highlights 2045** (Eagle-Gryphon). Explicitly "watching
the TV highlights of a game": 10 cards per half, 20 per game, mandatory half-time draft, each
card is both an offensive and a defensive play. Defence must match the offence's play type
*and* zone or the offence runs — i.e. the card only works if it fits the situation. → Almost our
skeleton (12 scenes per half, fresh hand at half-time, cards fit scenes). Study the card
anatomy and the half-time draft as a possible replacement for "discard everything".

**Blood Bowl: Team Manager – The Card Game** (FFG 2011). Rounds are "highlights" (matchups);
managers commit player cards to them, cheat tokens go face down and are revealed at scoring;
you win fans, not goals, and collect star players and staff upgrades between rounds. → Face-down
commit + reveal + collect people, all in one 2011 card game. Also evidence that "football rules
don't matter, the theme carries it" works for non-fans.

**Blood Bowl Special Play cards** (GW). Every card names its timing window — "start of the
opposition's turn", "when declaring a foul", "turns 2–4 of either half". → The paper original of
our `playableIn` tags; their design note "make cards usable by all teams, not one" applies to
shouts vs. player cards.

**Eleven: Football Manager Board Game** (Portal, Thomas Jansen, 2022). Staff, board members and
sponsors as cards; a tactics card plus a hidden opponent card flipped on matchday. Reviewers
love the club management and call the matchday resolution "overcomplicated to the point of
comedy" (five rulebook pages to score a match). → Lesson: hidden dice are fine, hidden *rules*
are not. The player must always understand why a card made sense, even if not how much.

**Counter Attack** (2020). Hex-and-dice football with a **sand timer** during movement phases to
keep pace — consistently praised. → Support for the 10 s bar as a feature, not a constraint.

**Sunday Manager** (Viktor Asimov, Kickstarter Sep 2025: funded in 20 min, €117k, 1590 backers).
Amateur-club humour, deliberately no dice, auctions and sabotage, 45 min. → Same audience as
ours; the humour + amateur football combination has a paying crowd.

### 7.4 "The strip never waits for you" — indirect-control analogues

- **Loop Hero** (Four Quarters, 2021): the hero walks the loop and fights on its own; you only
  place cards that shape what it meets. The cleanest existing articulation of "a card is a
  reaction, never a turn", and it found a large audience. Its tension — build the world hard
  enough to reward, not hard enough to kill — maps onto our "hold the card or play it now".
- **Blaseball** (The Game Band, 2020–23): "you don't play it, you watch it". Text-only auto
  simulation, one game an hour, fans bet and vote on rule changes. Proved a self-running match
  with hidden dice and visible faces generates community lore when the randomness is
  *expressive* (incinerations, peanut allergies). → Our drama scene types are the expressive
  randomness; make them memorable rather than frequent.
- **Nintendo Pocket Football Club** (3DS, 2014) and **Kairosoft Pocket League Story**: matches
  run automatically, you intervene only at half-time and via substitutions. Pocket Football
  Club's ~10 minute unskippable matches were a common complaint. → Our ~4 min per match with
  10 s panels is the right scale; anything unskippable must be short.
- **Cultist Simulator** / **Stacklands**: real-time cards on timers; the whole game is putting
  the right card in the right slot before the clock runs out. → The same feel we want for
  laying a card under the panel. Note Cultist Simulator's most common negative review is the
  timer pressure — keep the pause/hold question (§6) open.
- **Football Manager touchline shouts**: SI's own design note is that shouts do not change
  tactics, they change *mood under matchday pressure* and are contextual (Encourage, Demand
  More, Calm Down…). → Our Zurufe are the card version of exactly this; the cast's traits
  should decide how a shout lands.

### 7.5 Comic-strip presentation

- **Wildermyth** (Worldwalker, 2021): the strongest presentation analogue. Procedural story
  beats are rendered as comic panels with *your current characters substituted into pre-written
  beats*; the studio alternates "layers of handcrafted and procedural content". That is our
  "cast filled per scene type from role slots, traits tilt the outcome" almost verbatim. Their
  public "Event design philosophy" wiki page — say as much as possible in as few words as
  possible so the player can act quickly — is directly applicable to writing scene commentary.
- **Framed** (2014), **Storyteller** (2023), **Liberated** (2020): panels as the game object
  (rearranging or filling them). Different mechanic, but they define what "a panel changes" can
  look like on screen; Liberated's note on eye movement across a page (see the whole, then zoom
  to a panel) is relevant for the thumbnail strip along the top.
- **Captain Tsubasa: Dream Team** and **Inazuma Eleven: Victory Road**: football as a chain of
  anime duel scenes — dribble vs. tackle resolved rock-paper-scissors style, Focus battles when
  players collide. Scene-based football with the cast in frame, but you *are* the players and it
  never runs itself.

### 7.6 What this means for the design

1. The gap is real: auto-running comic scenes + scene-typed cards + hidden transition tables is
   unoccupied. Nearest digital neighbour (NUTMEG) is turn-based and stat-visible; nearest analog
   neighbour (Football Highlights 2052) is a two-player card duel with no world.
2. Pitch on the differentiators, not the genre: "the match is a comic that plays itself", German
   Kreisklasse humour, people instead of ratings. "Football deckbuilder roguelite" as a label is
   taken.
3. Three review-derived rules to keep: resolution logic stays legible even when dice are hidden
   (Eleven); commentary variety is a launch feature, not polish (Football Drama); every match is
   a strip, none is simulated away (NUTMEG).
4. Two §6 questions have external evidence: a visible timer helps pace and is liked when the
   step is short (Counter Attack, Pocket Football Club); face-down commit with reveal works as a
   bluff layer (Blood Bowl: Team Manager cheat tokens). The 10 s vs. "hold" question stays open —
   Cultist Simulator shows timer pressure splits players.
5. Worth a closer look before phase 1: Football Highlights 2052 card anatomy (one card, two
   uses; half-time draft), Wildermyth's event writing guidelines, Blood Bowl Special Play timing
   windows as a template for `playableIn`.

### 7.7 Commit and reveal (added v0.2)

- **Marvel Snap** (Second Dinner, 2022): simultaneous secret commit each turn, sequential
  reveal with a known priority rule (the leader reveals first), opponent's cards visible
  face down during the turn, 12-card decks so what is left can be counted. Cards are designed
  for one reveal slot or the other ("On Reveal" wants to go last). → Our §2.3 almost verbatim,
  with attacker/defender as the priority rule instead of the score.
- **Yomi** (Sirlin Games) and Sirlin's writing on "yomi layers": a known counter loop with a
  pass option stays interesting because the game is reading the person, not the cards.
  **Cosmic Encounter**: hidden simultaneous attack/negotiate cards, the classic bluff via a
  dud card.
- **Football Highlights 2052**: the defence card only works if it matches the offence's play
  type — the Answer family.
- **The penalty kick** itself: kicker and keeper commit simultaneously; game theory treats it
  as a textbook mixed-strategy game (Palacios-Huerta). Our penalty scene should be exactly
  that and nothing more.
- Warning from Snap's own design: bluffing against an AI needs a readable opponent. Their
  bots are deliberately predictable. → Rival coaches with tells (§3).
