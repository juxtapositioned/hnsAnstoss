// Headless batch: npm run sim [-- games=2000 tempoA=direct pressB=high favorA=5 ...]
//
// Prints greedy-vs-greedy results plus the "decision value": how much a greedy bench beats a
// random card picker and a bench that always lets the players play. Run it after structural
// changes (rules, new cards or situations) — not after every tweak. One pass, then move on.

import { BENCH_A, BENCH_B, DEFAULT_DECK, DEFAULT_PLAN, LINEUP_A, LINEUP_B, cardById } from './engine/data';
import { actor, createMatch, playableCards, reduce } from './engine/match';
import { greedy, randomPolicy } from './engine/policy';
import type { MatchState, Press, TeamSetup, Tempo } from './engine/types';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=') as [string, string]));
const n = Number(args.games ?? 2000);
const num = (k: string, d: number) => Number(args[k] ?? d);
const str = <T extends string>(k: string, d: T) => (args[k] ?? d) as T;

const A: TeamSetup = { name: 'A', lineup: LINEUP_A, bench: BENCH_A, deck: DEFAULT_DECK,
  plan: { tempo: str<Tempo>('tempoA', DEFAULT_PLAN.tempo), press: str<Press>('pressA', DEFAULT_PLAN.press) },
  stats: { favor: num('favorA', 5), motivation: num('motA', 5), fitness: num('fitA', 5) } };
const B: TeamSetup = { name: 'B', lineup: LINEUP_B, bench: BENCH_B, deck: DEFAULT_DECK,
  plan: { tempo: str<Tempo>('tempoB', DEFAULT_PLAN.tempo), press: str<Press>('pressB', DEFAULT_PLAN.press) },
  stats: { favor: num('favorB', 5), motivation: num('motB', 5), fitness: num('fitB', 5) } };

type Policy = (s: MatchState, r: number) => string | null;
const POLICIES: Record<string, Policy> = {
  greedy: s => greedy(s),
  random: (s, r) => randomPolicy(s, r),
  letplay: () => null,
};

interface Stats {
  winA: number; draw: number; winB: number; goals: number; turns: number; dead: number; letplay: number;
  events: number; counters: number; reds: number; bans: number;
  dist: Map<string, number>; cards: Map<string, number>;
}

function run(pA: Policy, pB: Policy): Stats {
  const st: Stats = { winA: 0, draw: 0, winB: 0, goals: 0, turns: 0, dead: 0, letplay: 0, events: 0, counters: 0, reds: 0, bans: 0, dist: new Map(), cards: new Map() };
  let x = 42;
  const rnd = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x80000000; };
  for (let i = 0; i < n; i++) {
    let s = createMatch(A, B, 1000 + i);
    while (s.phase !== 'finished') {
      if (s.phase === 'choose') {
        st.turns++;
        if (playableCards(s).length === 0) st.dead++;
        const c = (actor(s) === 'A' ? pA : pB)(s, rnd());
        if (!c) st.letplay++; else st.cards.set(c, (st.cards.get(c) ?? 0) + 1);
        s = reduce(s, c ? { type: 'play', cardId: c } : { type: 'let_play' });
      } else {
        const r = s.last!;
        if (r.eventId) st.events++;
        if (r.outcome.turnover) st.counters++;
        for (const c of r.outcome.then ?? []) { if (c.kind === 'red_card') st.reds++; if (c.kind === 'coach_banned') st.bans++; }
        s = reduce(s, { type: 'continue' });
      }
    }
    st.goals += s.score.A + s.score.B;
    if (s.score.A > s.score.B) st.winA++; else if (s.score.B > s.score.A) st.winB++; else st.draw++;
    const k = `${s.score.A}:${s.score.B}`;
    st.dist.set(k, (st.dist.get(k) ?? 0) + 1);
  }
  return st;
}

const pct = (v: number, of = n) => `${(100 * v / of).toFixed(1)}%`.padStart(6);
const line = (label: string, st: Stats) =>
  console.log(`${label.padEnd(18)} A ${pct(st.winA)}  draw ${pct(st.draw)}  B ${pct(st.winB)}   goals/match ${(st.goals / n).toFixed(2)}`);

console.log(`games=${n}  A ${A.plan.tempo}/${A.plan.press}  B ${B.plan.tempo}/${B.plan.press}`);
const gg = run(POLICIES.greedy!, POLICIES.greedy!);
line('greedy vs greedy', gg);
const gr = run(POLICIES.greedy!, POLICIES.random!);
line('greedy vs random', gr);
const gp = run(POLICIES.greedy!, POLICIES.letplay!);
line('greedy vs let-play', gp);
console.log(`decision value: greedy beats random by ${(100 * (gr.winA - gr.winB) / n).toFixed(1)} pts, beats let-play by ${(100 * (gp.winA - gp.winB) / n).toFixed(1)} pts`);
console.log(`no playable card ${pct(gg.dead, gg.turns)} of turns  let-play ${pct(gg.letplay, gg.turns)}  situations/match ${(gg.turns / n).toFixed(1)}  cards played/match ${((gg.turns - gg.letplay) / n).toFixed(1)}`);
const top = [...gg.dist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`per match: events ${(gg.events / n).toFixed(2)}  counters ${(gg.counters / n).toFixed(2)}  red cards ${(gg.reds / n).toFixed(2)}  coach bans ${(gg.bans / n).toFixed(2)}`);
console.log('scores:', top.map(([k, v]) => `${k} ${(100 * v / n).toFixed(0)}%`).join('  '));
const played = [...gg.cards.entries()].sort((a, b) => b[1] - a[1]);
console.log('cards (greedy):', played.map(([k, v]) => `${cardById.get(k)!.name} ${(v / n).toFixed(2)}`).join(' · '));
