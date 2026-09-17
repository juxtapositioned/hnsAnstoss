# Football God

Phase-1 prototype of the match: six attacks each, played from the two benches. You are the
coach: in every situation you let the players play, shout once (a card), or make a substitution;
the god rolls, the situation changes, the other bench moves. The turn alternates across the whole
match, so either side may open an attack. A lost ball is a counter for the other side, inside the
same attack. Shouts that end an attack can cost a red card or the coach's seat. Events (the dog,
the floodlights) are the god's own pile — he draws them, nobody plays them. Hot-seat or against
the computer.
All in-game text is German Kreisklasse (Bolzplatz) — ids, code and docs stay English.
Design: [docs/DESIGN.md](docs/DESIGN.md). Comparable games: [docs/RESEARCH.md](docs/RESEARCH.md).

```
npm install
npm run dev        # browser prototype
npm run sim        # headless check: win rates, goals, decision value (greedy vs random/let-play), cards played
npm run sim -- tempoA=direct pressB=high games=5000
npm run typecheck
```

Layout:

- `src/engine/` — pure game logic, no DOM. `types.ts`, `data.ts` (situations incl. card-only
  ones, plan tables, cards, lineups, tuning knobs `K`), `match.ts` (`createMatch`, `reduce`,
  `computeOdds`), `policy.ts` (greedy bench, used by the sim and the AI), `rng.ts` (seeded).
- `src/ui/` — one `render()` from state. Split screen for playtesting (the two benches side by
  side), AI opponent (greedy policy), roll reveal.
- `src/sim.ts` — batch runner. Run it after structural changes (rules, new cards or
  situations), not after every tweak; one pass, then move on.
