# Football God — Comparable games, by how they function

2026-09-14. Written for the earlier Football God line (deleted 2026-09-25, git 209c306); the comparisons still apply to [DESIGN.md](DESIGN.md). Two parts: a catalogue of games that share at
least one of our mechanisms (part A), then the lessons, each written as *what they do → what it
would be in Football God → why bother* (part B). Sources are linked where I read them for this;
*(memory)* marks games described from prior knowledge, not re-checked today.

Our fingerprint, for reference — the traits I looked for:

| # | trait |
|---|---|
| T1 | Match compressed to a few decisive moments, no simulation in between |
| T2 | Situation graph; exactly one actor per node; the turn alternates across the match |
| T3 | Cards tilt a weighted roll; odds shown before commit |
| T4 | Team-level stats (favor / motivation / fitness), no player ratings; players are specials |
| T5 | Cards with a delayed cost (Dive, Cynical foul → favor) |
| T6 | Hand management with dead turns; pass draws |
| T7 | Meta: calendar, narrative decisions, god's favor, no money |

Nothing I found has all seven. The closest by count are NUTMEG (T1 T3 T5-ish T7-ish), Captain
Tsubasa (T1 T2 T4-ish), Football Drama (T1 T7) and Baseball Highlights 2045 (T1 T2 T6).

---

## A. Catalogue

### A1. Football games where cards tilt the odds during a match

| game | how it functions | overlap |
|---|---|---|
| **NUTMEG! A Nostalgic Deckbuilding Football Manager** (Sumo Digital Academy, Mar 2026) | 90-min match runs on autopilot; at events (breakaway, corner, steal) you may play cards that shift the action's base success %; every card drains player stamina, low stamina → injuries; cards you played into an attack **come back if you score, are lost if you miss**; unused cards carry to the next match. Meta: four English divisions, press, youth, transfers, money. Reviews split: "brilliant sense of risk and reward" vs "rhythmic clicking… detached". [Steam](https://store.steampowered.com/app/3590560/NUTMEG_A_Nostalgic_Deckbuilding_Football_Manager/) · [Use a Potion](https://www.useapotion.com/2026/03/nutmeg-review-a-wonderful-blast-from-footballs-past/) · [Gamer Social Club](https://gamersocialclub.ca/2026/04/20/nutmeg-a-nostalgic-deckbuilding-football-manager-review/) | T1 T3 T7 — closest commercial cousin |
| **Football Drama** (Open Lab / Demigiant, 2019) | Weekday story scenes, Sunday match. Karma/chaos stat from life choices decides which cards you can earn; in the match you choose attack/defend (attacking costs stamina) and play up to five "orders from the bench" that players may or may not follow. Critics: matches repetitive, no player relationships. [Gamecritics](https://gamecritics.com/damiano-gerli/football-drama-review/) · [Kotaku](https://kotaku.com/soccer-management-sim-is-surprisingly-artsy-1838142795) · [presskit](https://www.open-lab.com/games/footballdrama/presskit/) | T1 T7 |
| **Big Win Soccer** (Hothead, 2012) *(memory + [store](https://apps.apple.com/us/app/big-win-soccer-world-football/id481896903))* | Auto-sim match; you collect "Big Impact" cards (Super Strike, Crunching Tackles, Penalty Power…) from packs and play them mid-match to swing the sim. Pure F2P collection loop. | T3 (weakly) |
| **Card Revolution Soccer** (LetsPlaymaker, Sep 2026, EA) | Reveal cards one by one; each reveal resolves the next event on the pitch. Inspired by *Premier Picks* (Amiga, 1980s). Split-screen PvP on one machine. Mostly reveal, little decision. [Steam](https://store.steampowered.com/app/5039170/Card_Revolution_Soccer/) · [PixelForge](https://pixelforgenetwork.com/card-revolution-soccer-out-on-steam/) | T1 |
| **Goaldeck** (Pro Nobis, Aug 2026) | Roguelike: place player cards in three zones (attack ×2 etc.), Manager Cards rewrite rules ("convert defense into score"); 8 cups vs AI; Reigns-style dilemmas between matches. Deterministic, solo. [Steam](https://store.steampowered.com/app/4638590/Goaldeck/) | T7 (dilemmas), zone-as-situation |
| **Olé – Card Game** (EA) | TCG-style: actions to evolve players, pass, shoot, effect and trap cards; solo roguelike + PvP. [Steam](https://store.steampowered.com/app/1329210/Ole__Card_Game/) | T2-ish |
| **Match Deck: Football** / **Match Cards: Football** (prototypes, 2026) | Deck vs AI league, shop between matches, some permanent cards across runs. [Steam](https://store.steampowered.com/app/4589640/Match_Deck_Football/) · [Steam](https://store.steampowered.com/app/4661220/Match_Cards_Football/) | T1 |
| **Soccer Manager Arena** (2017, dead) *(memory)* | Real-time PvP; player cards dropped onto a running match, Clash-Royale style. | — |
| **Soccer Duel** (Miniclip, 2024) | Auto-battler: build squad, match plays itself. The opposite pole. [App Store](https://apps.apple.com/app/id6451117869) | — |
| **Squiggle Football** (Max Barry, 2025) | Deck-building roguelike where the deck is players + coaches + gameplan + **culture**; match resolved by an analytics engine. [Steam](https://store.steampowered.com/app/1543960/Squiggle_Football/) | T4 (culture as a team-level card) |

### A2. Command-battle football (the "situation → menu → result" line)

| game | how it functions | overlap |
|---|---|---|
| **Captain Tsubasa** (Tecmo, NES 1988 → sequels) | Ball travels until two players meet, then a menu: dribble / pass / shoot vs tackle / cut pass. Stats + a **guts** meter (drained by strong actions, half regenerates at half-time) decide; named special moves belong to specific players. Game 1: the defender couldn't act; sequels added defensive commands. [HG101](https://www.hardcoregaming101.net/captain-tsubasa/) | T1 T2 T4-ish — the grandfather |
| **Captain Tsubasa: Dream Team** (KLab, 2017, mobile) | Same skeleton, live: each turn Dribble / Pass / Shoot, energy per action, technique/speed/power in a rock-paper-scissors triangle, combo chains; 22 turns per half; real-time ranked PvP. [Google Play](https://play.google.com/store/apps/details?id=com.klab.captain283.global&hl=en) | T2 — proof the structure runs as live PvP |
| **Inazuma Eleven** (Level-5, 2008→) *(memory)* | Free movement until players clash, then a command duel (each picks a move; RPS + stats + special techniques); TP/FP stamina for specials. | T2 T4-ish |
| **Football, Tactics & Glory** (Creoteam, 2018) | Turn-based grid football, 3 AP per turn, skill-check rolls. **Shipped with visible success %, removed them** because they made play conservative and boring. [Wikipedia](https://en.wikipedia.org/wiki/Football,_Tactics_%26_Glory) · [Destructoid](https://www.destructoid.com/reviews/review-football-tactics-glory/) | T3 (as a warning) |
| **Tecmo Bowl / Retro Bowl** *(memory)* | Tecmo: pick 1 of 4 plays, defense guesses; a correct guess kills the play. Retro Bowl: you play offense only, defense is simulated; only your drives are shown. | T1 (Retro Bowl); Tecmo = the simultaneous-guess design we rejected |
| **New Star Soccer** *(memory)* | Only the moments your player touches the ball; energy; relationships (boss, fans, team) *are* the stats. | T1 T4 T7 |

### A3. Sports duels compressed to highlights (tabletop)

| game | how it functions | overlap |
|---|---|---|
| **Baseball Highlights: 2045** (Fitzgerald, 2015) | A game = six cards each, alternating, visitor first, no dice. A card's hits are *threatened*; the opponent's next card is their one chance to cancel; survivors resolve after it. Deck fixed at 15; between games, revenue from cards played buys free agents, new cards push old ones out. [how to play](https://www.boardgameblitz.com/posts/112/how-to-play-baseball-highlights-2045) | T1 T2 T6 |
| **Football Highlights: 2052** (Fitzgerald, 2020) | A drive is ≤4 plays; every card is double-sided (offense / defense); your used defense card rotates into your next offense. Reviewer: "the cognitive load… loses one of the most important elements of a good sports game — flow." [Opinionated Gamers](https://opinionatedgamers.com/2020/07/28/dale-yu-review-of-football-highlights-2052/) | T1 T2 T6 |
| **Bottom of the 9th** (Greater Than Games, 2015) | Only the last inning. Each at-bat: pitcher and batter secretly pick inside/away + high/low, reveal, then dice with per-player abilities. 5–20 min. [rules](https://gamerules.com/rules/bottom-of-the-9th-card-game-rules/) | T1; hidden simultaneous choice = rejected |
| **Blood Bowl: Team Manager** (FFG, 2011) | A season of "highlights" you commit player cards to; no dice. *Cheating* draws a face-down token, usually fans/star power, sometimes an ejection, revealed at scoring. [BGG](https://boardgamegeek.com/boardgame/90137/blood-bowl-team-manager-the-card-game) | T1 T5 |
| **Card Football** (2005) / **Breakaway Football** / **1st & Goal** / **Techno Bowl** *(memory; [Card Football review](https://www.rpg.net/reviews/archive/12/12217.phtml))* | American-football card games: offense and defense each play a play card (often simultaneous), cross-reference, dice or draw for yardage. | T2-ish, all simultaneous |
| **Counter Attack** (2019) | Hex pitch, 11 counters each, seven attributes 1–6 per player, duel = attribute + d6 vs attribute + d6, sand timer. Full match. [site](https://counterattackgame.com/how-to-play-the-game/) | none — the ratings-and-positions pole, useful as contrast |
| **Streetsoccer** (Cwali) *(memory)* | Identical pieces, a d6 for movement points, no ratings at all; well-liked. | T4 |
| **Eleven: Football Manager** (Portal, 2022) | Week = Monday board-meeting card, Tue–Thu actions, Friday match; the match is an abstract zone comparison vs an opponent card and reviewers call it the weakest, hardest part. [BGQ](https://www.boardgamequest.com/eleven-football-manager-board-game-review/) · [Opinionated Gamers](https://opinionatedgamers.com/2023/01/11/dale-yu-review-of-eleven-football-manager-board-game/) | T7 |
| **Sports Dice: Soccer** (2018) | Both roll six symbol dice, majority resolves. Reviewed as "mostly random". [BGQ](https://www.boardgamequest.com/sports-dice-review/) | — (what T3 looks like without cards) |

### A4. Card duels with alternating single actions (non-sport)

| game | how it functions | overlap |
|---|---|---|
| **Legends of Runeterra** (2020) / **Star Wars: Unlimited** (2024) *(memory; [LoR round FAQ](https://support-legendsofruneterra.riotgames.com/hc/en-us/articles/360035562034-Round-FAQ))* | Players alternate *single actions*, not turns. The attack token alternates each round, use-it-or-lose-it. Both pass → round ends. Spell speeds decide whether the opponent gets a response window. | T2 — same alternation |
| **Marvel Snap** (2022) | Six turns, three *locations* whose rules are revealed over turns 1–3, simultaneous play, the **snap** (backgammon doubling cube) to raise stakes. Brode tried 5 and 7 turns, 2–9 locations. [GDC](https://gdcvault.com/play/1029024/Designing-MARVEL-SNAP) · [Guardian](https://www.pressreader.com/usa/the-guardian-usa/20221112/282024741243323) | short match; locations ≈ situation modifiers |
| **Gwent** *(memory)* | Three rounds; *pass* ends your participation in the round; win by margin. | T6 (pass as a commitment) |
| **Air, Land & Sea** *(memory)* | Rounds of 6 cards each to three theatres; *withdraw* early and lose fewer points. | conceding an attack cheaply |
| **Flesh and Blood / Radlands / Twilight Struggle** *(memory)* | Every card has a fallback use: pitch it for resources / junk it for a minor effect / dump the opponent's event into the space race. | T6 — the standard dead-hand fixes |
| **Memoir '44 / Commands & Colors** *(memory)* | Command cards playable only in one section of the board — our "playable: build_up" problem exactly; mitigated by a few play-anywhere cards and *Recon* (draw 2 keep 1). | T6 |
| **Schotten Totten / Battle Line** *(memory)* | Nine flags, alternate one card per turn, open information except the hand; claim a flag when its hand rank is provably won. | alternating one card; hand = only hidden info |

### A5. "The god rolls, you tilt" — randomness engines you can edit

| game | how it functions | overlap |
|---|---|---|
| **Gloomhaven** *(memory)* | No dice: every attack draws from a 20-card modifier deck (−1, +0, +1, ×2, null). *Bless* adds a ×2 to your deck for one draw; *Curse* adds a null to the opponent's; perks permanently remove −1s. | T3 T4 T5 — favor as a deck |
| **Arkham Horror LCG** *(memory)* | A bag of tokens is the die; difficulty = bag contents; you *commit* cards from hand to a test before drawing. | T3 |
| **Malifaux** *(memory)* | Flip from a fate deck instead of rolling, then *cheat fate*: replace the flip with a card from hand — unless the black joker was flipped. | T3 — tilt *after* the reveal |
| **Dice Forge** *(memory)* | Gods' favor; you buy faces and physically swap them onto your dice. | progression = editing the dice |
| **Citizen Sleeper** (2022) | Each die value shows its positive / neutral / negative outcome split before you commit; *glitch dice* are 80% worst, 20% best — "do you dare?" [Inverse](https://www.inverse.com/gaming/citizen-sleeper-gareth-martin-interview) | T3 — same three-outcome display |
| **Blades in the Dark** *(memory)* | Every roll changes the fiction (a written rule). *Devil's bargain*: +1d for a complication now or later. *Push yourself*: +1d for 2 stress. *Resistance*: spend stress after the fact to soften a consequence. Loop: score → payoff → heat → entanglements → downtime. | T2 T5 T7 |
| **Ironsworn** *(memory)* | *Momentum* rises with strong hits; burn it at any time to replace a bad roll. | earned reroll |
| **Blood Bowl** *(memory)* | Turnover ends your turn; one team reroll per turn from a small per-half pool; sequence safe actions first. The community calls the dice god "Nuffle". | T3; theme pre-validated |
| **Dice Throne / King of Tokyo** *(memory)* | Cards modify dice after rolling; limited rerolls. | T3 |
| **XCOM 2** | Below Legend, hidden aim bonuses on shots ≥50% and after streaks. [wiki](https://xcom.fandom.com/wiki/Game_difficulty_(XCOM_2)) Fire Emblem 2RN, BG3 karmic dice *(memory)* do the same. | what *not* to do in PvP |
| **Fallen London** | Storylets; every challenge shows a word *and* a number ("chancy, 50%"); *Second Chances* are consumable rerolls. [wiki](https://fallenlondon.wiki/wiki/Broad_difficulty) · [Second Chances](https://fallenlondon.wiki/wiki/Second_Chances_(Guide)) | T3 — words + numbers |
| **Disco Elysium** *(memory)* | Visible %, failure is a story branch not a retry. | T3 |

### A6. Meta loops: calendar, favor, no money

| game | how it functions | overlap |
|---|---|---|
| **King of Dragon Pass / Six Ages** *(memory)* | Seasonal cycle; gods you sacrifice to; advisors give conflicting narrative readings of the odds; events with hidden probabilities; clan mood. | T7 — favor as ritual-fed and never shown as a bar |
| **Reigns** *(memory)* | Four stats, one card decision at a time; you die if any hits 0 *or* max. | T7 — a ceiling on favor |
| **Darkest Dungeon** *(memory)* | Stress carried between missions; quirks as passives; town upgrades. | T4 (quirks = specials), motivation = stress |
| **Power Pros "Success" mode** *(memory)* | Weekly training choice + random events + mood; 25 years of a career mode with relationships as the stats. | T7 |
| **Heat: Pedal to the Metal / Flamme Rouge** *(memory)* | Pushing adds heat/exhaustion cards to your deck; stress cards are random draws. | fitness as deck pollution |
| **Undaunted** *(memory)* | Squad *is* the deck: bolster adds cards, casualties remove them, fog-of-war cards clog on purpose. | T4 |
| **Cyclades** *(memory)* | Gods' favor is bid for every round. | contested favor, PvP seasons |
| **Pyre** *(memory)* | Narrative + 3v3 rites; losing has story consequences, no money. | T7 tone |

---

## B. Lessons

Each: what they do → what it would be here → why bother. Ordered by how much I'd expect it to
change the feel per hour of work.

### B1. Favor as a visible pile, not a hidden multiplier
*(Gloomhaven, Arkham LCG, Dice Forge)*

**What they do.** Gloomhaven has no dice. Every attack draws one card from your 20-card modifier
deck (+1, −1, ×2, null, mostly +0). A *Curse* shuffles a null into the *opponent's* deck; a *Bless*
shuffles a ×2 into yours; XP buys perks that permanently take −1s out. Arkham does the same with
tokens in a bag, and difficulty is nothing but the bag's contents.

**Here.** Keep the weighted roll. Replace `(1 + 0.4·edge)` for the favor part with a **mood pile**
per team: e.g. six cards — blanks, "smiles" (attacking outcomes ×1.3 this situation) and "frowns"
(×0.7). Favor 5 = 2 smiles 1 frown; favor 8 = 4 smiles. Each situation draws one mood card on top of
the base weights; both sides see it drawn. Dive adds a frown to your pile for the rest of the match.
A shrine upgrade removes a frown permanently. Motivation and fitness can stay as numbers.

**Why.** Nobody can feel 0.4·e. Everyone can count "two frowns left in the pile". It also gives
every favor-touching feature in DESIGN — conduct, rituals, Dive, shrine, god cards — one concrete
verb (add/remove a card) instead of ±1 on an abstract stat.

### B2. Situation modifiers revealed per match
*(Marvel Snap locations)*

**What they do.** Snap has three locations, each with a rule ("cards here cost 1 less", "destroy
whatever is played here"), revealed on turns 1–3. Decks are 12 cards; nearly all of Snap's variety
is the locations, and Brode's GDC talk treats them as the core invention.

**Here.** At kick-off, reveal one or two match modifiers, shown as a strip under the attack ticks:
*Waterlogged* — build_up "loses it" +10 for both. *Home crowd* — header GOAL +5 for A.
*Lenient referee* — Cynical foul costs no favor. *Fog* — through_on_goal "wide" +10. Later,
weather/referee/crowd from DESIGN 3.5 are exactly these, and a modifier can be *tied to an attack*
("the god is watching attack 9").

**Why.** Six nodes are the same six nodes by match five. Football Drama, NUTMEG and Eleven all got
"repetitive" from reviewers, for this reason. Modifiers change which cards are good *this match*
without adding a single card, and they are pure data.

### B3. A standing action that costs a resource
*(Blades in the Dark "push yourself", Captain Tsubasa "guts")*

**What they do.** In Blades any roll can take +1d if you take 2 stress; stress is the character's
long-term resource and fills between scores. In Tsubasa every dribble and shot costs guts, big moves
cost more, and the real decision is "spend it on this keeper?".

**Here.** A third button beside Play and Pass: **Push** — fitness −1, your side's outcomes ×1.2
this situation. Fitness therefore drops during a match, and arrives lower at the next week's match
until rest/grounds recover it.

**Why.** It turns the 30% dead turns into a choice (push or pass) with zero new cards, and it gives
fitness an in-match meaning that comes from the player's own greed rather than from a drain
schedule.

### B4. Cards return on a goal, are lost on a miss
*(NUTMEG)*

**What they do.** Every card you play into an attack comes back if the attack scores; if it doesn't,
those cards are gone for the match. Reviewers name this as the fun.

**Here.** Variant for the sim and a playtest: the attacker's played cards go to a *pending* pile
during the attack. GOAL → back to hand. OVER → discard. (Defender mirror: defending cards return if
the attack ends OVER.) Decks stay unconsumed across matches.

**Why.** Today Tempo → Killer pass → Composure is a free sequence. With return-on-goal it is a bet:
stack three cards and win them all back, or lose a hand's worth on one "saved". *When* to commit
becomes the question, which is the question the design wants.

### B5. An earned reroll instead of reroll cards
*(Ironsworn momentum)*

**What they do.** Momentum ticks up on every strong hit and down on misses; at any moment you may
burn it to replace a bad roll with the momentum value, resetting to zero.

**Here.** Motivation moves in-match: +1 when an attacking outcome fires for you, −1 on "loses it" /
"dispossessed". At motivation ≥ 8 the side may spend 3 to reroll once. "Take a touch" and "Keep
your shape" are deleted.

**Why.** v0.1's rerolls were free and random, so holding one made everything else irrelevant. An
earned, visible, expensive one is the same drama at a price, and it is the in-match motivation
feature DESIGN 2.4 wants anyway.

### B6. Dirty cards get a chance of being caught, not a tax
*(Blood Bowl: Team Manager cheat tokens)*

**What they do.** Cheating draws a face-down token: mostly fans or star power, sometimes an
ejection. You find out at scoring.

**Here.** Dive: instead of favor −1 flat, add an outcome row "the god saw it" (weight 30): if it
fires, favor −2 and the penalty is void; otherwise the penalty stands and nothing is owed. Cynical
foul likewise: "red card" as a row that also ends *your* next attack.

**Why.** A flat cost is a price and the sim will price it in. A chance of being caught is a gamble,
which is what diving is, and it is one more roll the god makes in public.

### B7. Every card has a fallback use
*(Flesh and Blood pitch, Radlands junk, Twilight Struggle space race, Memoir '44 Recon)*

**What they do.** No card is ever dead: a Flesh and Blood card you can't play is pitched for
resources; a Radlands card is junked for a small printed effect; a Twilight Struggle card carrying
the enemy's event is dumped into the space race. Memoir's Recon cards, playable anywhere, let you
draw 2 keep 1.

**Here.** Any card may be discarded face-down as a **Shout**: your side's outcomes +5. Or make Pass
"draw 2, keep 1". Either replaces the current "pass and draw 1".

**Why.** The 30% dead-turn rate goes to zero without growing the pool, and the "should I burn
Composure as a shout now or hold it for the shot" decision is a real one.

### B8. Numbers for the actor, words for the watcher
*(Football, Tactics & Glory; Fallen London)*

**What they do.** FTG shipped with success percentages on every action and removed them: players
went conservative and matches went boring. Fallen London shows a word *and* a number
("a chancy challenge — 50%").

**Here.** The acting half keeps exact percentages and deltas (they are choosing). The waiting half
sees words: *likely / even / unlikely* per outcome. Playtest the greedy-vs-random spread both ways.

**Why.** The sim says greedy beats random by only ~5 points, i.e. the exact numbers are not yet
buying much decision, and FTG shows the cost they can carry. Keep the god a little opaque where it
costs nothing.

### B9. Fixed deck size, forced churn
*(Baseball Highlights 2045)*

**What they do.** The deck is always 15. Every free agent you buy sends a card to the minors.

**Here.** 20 stays 20 forever; a reward card must replace one. Same for lineup slots.

**Why.** Growing decks dilute; with a fixed size, every reward is also a cut, which is the whole of
squad management with no money.

### B10. Stake favor on an attack
*(Marvel Snap's snap)*

**What they do.** Either player may snap to double what the match is worth; the other may retreat
and lose only the current stake.

**Here.** Once per match, before an attack, a side may stake 1 favor on it: a goal in that attack
is +1 favor, no goal is −1. Shown on the attack tick.

**Why.** Twelve attacks have no built-in climax. For async play it is also the one notification
people open at once. Cheap: one flag on the state.

### Things I would *not* copy

- **Simultaneous hidden choice** (Bottom of the 9th, Tecmo Bowl, most American-football card
  games). The design rejected it deliberately; the catalogue confirms it is the *default* way sports
  card games get tension, which means ours has to get tension from sequencing and held cards. B4, B5
  and B7 are all about that.
- **Card-over-sim** (NUTMEG, Big Win, Football Drama). Every one of them collects the "detached"
  review. Keep zero simulation.
- **Hidden luck smoothing** (XCOM, Fire Emblem, BG3). Never in PvP. If the solo season wants mercy,
  make it a visible favor effect ("the god relents"), not a fudge.
- **Full-information deterministic duels** (Baseball Highlights, Goaldeck). They work, but they are
  solvable, and a god who doesn't roll isn't a god.
