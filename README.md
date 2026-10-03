# Kreisklasse Comic

The match is played as its highlights (v0.27): about ten scenes a match, each a few comic panels of 10 s
while the ball is somewhere a goal can come from; between them a Zeitraffer runs the clock forward and says
what happened off camera. Before kick-off you pick three skills per situation; in a panel you use one of them
or say nothing. Most cards are touchline shouts (Flanke!, Schieß!,
Umhauen!) the men try to follow — always a plus, sometimes "überhört" in a funny way; four drama
cards (the dog, the mayor, a dive, the offside trap) force a scene of their own. Dice resolve each
panel, tilted by the cast's traits and the shouts; every panel ends in one word (FLANKE!, BALL WEG,
TOOOR!) and the man it belongs to. Beside every panel a chalk sketch of the pitch marks where it is
happening, with the run from the panel before.
All in-game text is German Kreisklasse (Bolzplatz) — ids, code and docs stay English.
Design: [docs/DESIGN.md](docs/DESIGN.md). Comparable games: [docs/RESEARCH.md](docs/RESEARCH.md).

```
npm install
npm run dev            # you coach SVH (keys 1–6 lay a card), an AI rival with tells coaches the other bench
                       # space pauses, Enter skips a reveal
                       # ?tempo=3000 for 3 s panels, ?seed=7 to replay, ?rival=taktikfuchs for the other coach
npm run strip -- 7     # one match as a text strip, highlight by highlight, seed 7: A lays whenever it can, B the rival
npm run strip -- --stats 300   # scene-type and card distribution over 300 matches, how often shouts are heard
npm run strip -- --values      # what each scene and each card is worth; every shout must be ≥ 0 everywhere
npm run strip -- --reach       # per situation, how often each skill of the pool does anything (what the draft deals by)
npm run typecheck
```

- `src/engine/` — pure: `types.ts`, `match.ts` (`newMatch`, `usable`, `step`), `highlights.ts` (where a highlight
  opens, whether it goes on, what the gap between two says; lines in `data/gaps.ts`), `loadout.ts` (the pre-match
  draft: three skills per situation), `rng.ts`, `rival.ts` (AI coaches with tells: which of his three, if
  any, and when in the panel), and data in `data/` (`scenes.ts` hidden tables, `traits.ts` tilts,
  `rosters.ts`, `cards.ts` — the skill pool).
- `src/ui/` — one `render()` from state, the clock lives here; the draft before kick-off, then the cast as
  big figures, one word per panel, and your three skills for the situation with "Nichts sagen". `pitch.ts` draws the chalk pitch
  beside every panel and marks where it is happening (SVH always attacks to the right).
- `src/strip.ts` — headless runner. Run once after structural changes, read the strip.

The earlier Football God prototype (turn-based, from two benches) was deleted on 2026-09-25; it is
in git history at commit 209c306.
