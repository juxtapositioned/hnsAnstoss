// Headless runner for the Heilige mode (engine/heilige.ts): prints one match as text, then `--stats N`
// plays N more and prints goals, steals and chances. Both benches call saints by the rival logic; A presses
// and attacks at random (a player who does not read the tells), or with `--reader` plays the tells the way
// a human who has read them would: against der Schleifer press the middle and attack over a wing; against
// der Taktikfuchs press anywhere but his last lane and never attack where he last saw you get through.
// Run once after structural changes.

import { saintById } from './engine/data/saints';
import { current, LANE_NAME, LANES, newGame, num, openHighlight, playMid, playShot, rivalCall, rivalLane, SHORT } from './engine/heilige';
import type { Game, Lane } from './engine/heilige';
import { nextRandom } from './engine/rng';

const args = process.argv.slice(2);
const statsN = args.includes('--stats') ? Number(args[args.indexOf('--stats') + 1]) || 500 : 0;
const rival = args.includes('--rival') ? String(args[args.indexOf('--rival') + 1]) : 'schleifer';
const reader = args.includes('--reader');

function play(seed: number, print: boolean): Game {
  let g = newGame(seed, rival);
  let r = seed * 31 + 7;
  const rand = () => { const x = nextRandom(r); r = x.state; return x.value; };
  const randLane = (): Lane => LANES[Math.floor(rand() * 3)] as Lane;
  const among = (ls: Lane[]): Lane => ls[Math.floor(rand() * ls.length)] as Lane;
  /** A's lane: random, or read from the tells. */
  const laneA = (attacking: boolean): Lane => {
    if (!reader) return randLane();
    if (rival === 'schleifer') return attacking ? among([0, 2]) : 1;
    if (attacking) { const t = g.lastThrough.A; return among(LANES.filter(l => l !== t)); }
    const last = g.lastLane.B;
    return among(LANES.filter(l => l !== last));
  };
  for (;;) {
    g = openHighlight(g);
    if (g.over) break;
    const hl = current(g)!;
    if (print) { console.log(`\n${hl.minute}' — Angriff ${SHORT[hl.side]}`); hl.gap.forEach(l => console.log(`   … ${l}`)); }
    while (current(g)!.next) {
      const n = current(g)!.next!;
      if (n.kind === 'mid') {
        const atkA = n.att === 'A';
        const bc = rivalCall(g, 'B', 'mid', !atkA);
        const ac = rivalCall(g, 'A', 'mid', atkA);
        const b = rivalLane(g, 'B', !atkA); g = b.game;
        const a = { lane: laneA(atkA), card: ac };
        const bb = { lane: b.lane, card: bc };
        g = atkA ? playMid(g, a, bb) : playMid(g, bb, a);
      } else {
        const ac = rivalCall(g, n.att, 'shot', true);
        const dc = rivalCall(g, n.att === 'A' ? 'B' : 'A', 'shot', false);
        g = playShot(g, ac, dc);
      }
      if (print) {
        const st = current(g)!.steps.at(-1)!;
        const cards = Object.entries(st.cards).filter(([, c]) => c).map(([s, c]) => `${s}:${saintById.get(c!)!.name}`).join(', ');
        const ev = st.event ? ` ✨${saintById.get(st.event.id)!.name} ${num(st.event.delta)}` : '';
        const n2 = st.kind === 'mid' ? (st.stolen ? `presst ${LANE_NAME[st.press]} — GEKLAUT` : `xA ${num(st.xa, false)}`) : `xG ${num(st.xg, false)}${st.goal ? ' TOR' : ''}`;
        console.log(`   [${st.kind}] ${st.lines.join(' ')}  (${cards}${ev}) ${n2}`);
      }
    }
  }
  if (print) console.log(`\nEndstand ${g.score.A}:${g.score.B}`);
  return g;
}

play(Number(args.find(a => /^\d+$/.test(a))) || 1, !statsN);
if (statsN) {
  let goals = 0, steals = 0, mids = 0, chances = 0, shots = 0, events = 0, aw = 0, bw = 0, dr = 0;
  for (let i = 1; i <= statsN; i++) {
    const g = play(i, false);
    goals += g.score.A + g.score.B;
    if (g.score.A > g.score.B) aw++; else if (g.score.B > g.score.A) bw++; else dr++;
    for (const hl of g.log) for (const st of hl.steps) {
      if (st.event) events++;
      if (st.kind === 'mid') { mids++; if (st.stolen) steals++; if (st.chance) chances++; } else shots++;
    }
  }
  const f = (x: number) => (x / statsN).toFixed(2);
  console.log(`${statsN} Spiele gegen ${rival}${reader ? ' (liest die Tells)' : ''}: ${f(goals)} Tore/Spiel, ${f(shots)} Abschlüsse, ${f(steals)} geklaut von ${f(mids)} Mittelfeld, ${f(chances)} Chancen, ${f(events)} Ereignisse. A ${aw} · X ${dr} · B ${bw}`);
}
