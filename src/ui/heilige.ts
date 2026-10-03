// The Heilige mode on screen (engine/heilige.ts, docs/IDEAS.md). You coach SVH against a rival with lane
// tells. Every highlight opens with the Zeitraffer, then the midfield: pick a lane (attacking) or the lane
// you press (defending; the other two drop back), maybe invoke a saint, Los. The rival has already said
// which saint he calls (or that he calls none), so you answer him; four calls a half each. The reveal shows
// both lanes, both saints, the world's card with its line if one turned, and xA as a bar with the ball
// landing on it. A chance or a counter goes to the Sturm: a saint, Los, xG and the shot. No clock: the
// panel waits for you.
// The screen is one fixed shell — score, the steps of the highlight, the picture, the dock — so nothing
// jumps between phases; only what is inside them changes. The dock always holds the chance bar and three
// card slots: your hand while you choose, the three saints that were in it on the reveal.
// ?seed=7 replays a match, ?rival=taktikfuchs picks the other bench.

import { saintById } from '../engine/data/saints';
import type { Saint } from '../engine/data/saints';
import { RIVALS, rivalById } from '../engine/rival';
import {
  current, fits, HZ, kindFor, LANE_NAME, LANE_SHORT, LANES, moody, newGame, num, openHighlight, other, playMid, playShot, rivalCall, RIVAL_LANES, rivalLane, SHORT, valueIn,
} from '../engine/heilige';
import type { Game, Highlight, Lane, MidStep, ShotStep, Step } from '../engine/heilige';
import type { Side } from '../engine/types';

const Q = new URLSearchParams(location.search);
const root = document.getElementById('hz')!;
const ME: Side = 'A';
const THEM: Side = 'B';

type Phase = 'intro' | 'gap' | 'pick' | 'reveal' | 'halftime' | 'over';
type At = 'mid' | 'shot';
let phase: Phase = 'intro';
let rivalId = rivalById.has(Q.get('rival') ?? '') ? (Q.get('rival') as string) : 'schleifer';
let seed = Number(Q.get('seed')) || (Date.now() % 100000);
let game: Game = newGame(seed, rivalId);
let lane: Lane | null = null;
let saint: string | null = null;
let peek: string | null = null;     // the saint under the pointer: his line shows in the caption
let gapTimer = 0;
let lateTimer = 0;

const h = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
const rival = () => rivalById.get(rivalId) ?? RIVALS[0]!;
const STAT: Record<At, string> = { mid: 'xA', shot: 'xG' };
const STAT_SAYS: Record<At, string> = { mid: 'Chance, dass draus eine Torchance wird', shot: 'Chance, dass er reingeht' };
const KEY: Record<Lane, string> = { 0: 'L', 1: 'M', 2: 'R' };
const halo = (x: Saint) => (x.group === 'zufall' ? '🎲' : x.name.startsWith('Erzengel') ? '👼' : '😇');

/** The rival's saint for the situation being chosen: decided before you choose, shown, no rng. */
function theirCall(): string | null {
  const n = current(game)?.next;
  return n ? rivalCall(game, THEM, n.kind, n.att !== ME) : null;
}

// ---- flow ------------------------------------------------------------------------

function kickOff(): void {
  game = newGame(seed, rivalId);
  next();
}

/** After a reveal (or at the start): the next situation in this highlight, or the next highlight. */
function next(): void {
  lane = null; saint = null; peek = null;
  const hl = current(game);
  if (hl?.next) { phase = 'pick'; render(); return; }
  const half = game.half;
  game = openHighlight(game);
  if (game.over) { phase = 'over'; render(); return; }
  if (game.half !== half) { phase = 'halftime'; render(); return; }
  showGap();
}

function showGap(): void {
  phase = 'gap';
  render();
  clearTimeout(gapTimer);
  const hl = current(game)!;
  const lines = hl.gap.length + (shoutOf(hl) ? 1 : 0);
  gapTimer = window.setTimeout(() => { if (phase === 'gap') { phase = 'pick'; render(); } }, 2200 + 1400 * lines);
}

function go(): void {
  const n = current(game)?.next;
  if (!n || phase !== 'pick') return;
  const attacking = n.att === ME;
  const theirs = theirCall();
  const mine = game.calls[ME] > 0 ? saint : null;
  if (n.kind === 'mid') {
    if (lane === null) { nudge(); return; }
    const r = rivalLane(game, THEM, !attacking);
    game = r.game;
    const us = { lane, card: mine };
    const them = { lane: r.lane, card: theirs };
    game = attacking ? playMid(game, us, them) : playMid(game, them, us);
  } else {
    game = attacking ? playShot(game, mine, theirs) : playShot(game, theirs, mine);
  }
  phase = 'reveal';
  render();
}

/** Los without a side: the pitch shakes, that is where the choice is. */
function nudge(): void {
  const p = root.querySelector('.hz-pitch');
  if (!p) return;
  p.classList.remove('nudge');
  void p.getBoundingClientRect();
  p.classList.add('nudge');
}

/** When the word bursts in on a reveal, in seconds: a steal is seen at once, a roll takes the ball's time. */
function wordAt(): number {
  const st = current(game)?.steps.at(-1);
  return st?.kind === 'mid' && st.stolen ? 0.7 : 1.3;
}

/** The rival's shout, if he changed his mind just before this highlight. */
const shoutOf = (hl: Highlight) => (hl.shout?.side === THEM ? hl.shout.text : null);

// ---- the shell ---------------------------------------------------------------------

/** The score as it stands; on a reveal, as it stood before the ball landed (late() puts the new one in). */
function scoreText(before: boolean): string {
  const sc = { ...game.score };
  const st = current(game)?.steps.at(-1);
  if (before && st?.kind === 'shot' && st.goal) sc[st.att]--;
  return `${sc.A}:${sc.B}`;
}

function topHtml(): string {
  const hl = current(game);
  const clock = phase === 'halftime' ? 'Halbzeit' : phase === 'over' ? 'Abpfiff' : hl ? `${hl.minute}' · ${game.half}. Hz.` : '';
  // while he is in one of his moods, his shout replaces his tell: that is what he does now
  const m = game.mood[THEM];
  const tell = moody(game, THEM) && m.shout && phase !== 'halftime' && phase !== 'over' ? `<small class="shouting">📣 „${h(m.shout)}“</small>` : `<small>${h(RIVAL_LANES[rivalId]?.tell ?? '')}</small>`;
  return `<header class="hz-top">
    <div class="hz-score"><span class="A">${SHORT.A}</span> <b>${scoreText(phase === 'reveal')}</b> <span class="B">${SHORT.B}</span></div>
    <div class="hz-clock">${clock}</div>
    <div class="hz-rival">gegen <b>${h(rival().nick)}</b>${tell}</div>
  </header>`;
}

/**
 * The highlight as three steps: Mittelfeld → Abschluss → Tor. The one being played is lit, the ones
 * behind carry their result. A steal turns the second step into the other side's counter.
 */
function stepsHtml(before = phase === 'reveal'): string {
  let hl = current(game);
  if (!hl || phase === 'halftime' || phase === 'over') return '<nav class="hz-steps"></nav>';
  let ph: Phase = phase;
  // on a reveal the steps first read as they did while choosing; late() swaps in the result with the word
  const last = hl.steps.at(-1);
  if (before && last) {
    hl = { ...hl, steps: hl.steps.slice(0, -1), next: { kind: last.kind, att: last.att, counter: last.kind === 'shot' && last.counter } };
    ph = 'pick';
  }
  const mid = hl.steps.find(s => s.kind === 'mid') as MidStep | undefined;
  const shot = hl.steps.find(s => s.kind === 'shot') as ShotStep | undefined;
  const at: At | 'done' | 'gap' = ph === 'gap' ? 'gap' : ph === 'pick' ? hl.next!.kind : (hl.steps[hl.steps.length - 1]!.kind);
  const step = (n: number, label: string, cls: string, result: string) =>
    `<div class="st ${cls}"><i>${n}</i><span>${label}</span>${result ? `<em>${result}</em>` : ''}</div>`;
  const midRes = mid ? (mid.stolen ? 'geklaut' : mid.chance ? 'Chance' : 'versandet') : '';
  const midCls = mid ? (at === 'mid' && ph === 'reveal' ? 'on' : 'done') : at === 'mid' ? 'on' : '';
  const counterSide = mid?.stolen ? other(mid.att) : hl.next?.counter ? hl.next.att : null;
  const shotLabel = counterSide ? `Konter ${SHORT[counterSide]}` : 'Abschluss';
  const shotDead = mid && !mid.stolen && !mid.chance;
  const shotCls = shotDead ? 'dead' : shot ? (ph === 'reveal' ? 'on' : 'done') : at === 'shot' ? 'on' : '';
  const goalCls = shot ? (shot.goal ? 'goal' : 'dead') : shotDead ? 'dead' : '';
  return `<nav class="hz-steps ${hl.side}">
    ${step(1, 'Mittelfeld', midCls, midRes)}<b class="arr">→</b>
    ${step(2, shotLabel, shotCls, shot ? (shot.goal ? '' : 'nix') : '')}<b class="arr">→</b>
    ${step(3, shot?.goal ? `Tor ${SHORT[shot.att]}!` : 'Tor?', goalCls, '')}
  </nav>`;
}

function shell(stage: string, dock: string, cls = ''): string {
  return `${topHtml()}${stepsHtml()}<section class="hz-stage ${cls}">${stage}</section><section class="hz-dock">${dock}</section>`;
}

/** Calls left this half, ours and theirs, as dots. */
function callsHtml(): string {
  const pips = (s: Side) => `<b class="pips ${s}">${Array.from({ length: HZ.calls }, (_, i) => `<i class="${i < game.calls[s] ? 'on' : ''}"></i>`).join('')}</b>`;
  return `<span class="calls" title="Heilige, die jede Bank in dieser Halbzeit noch anrufen darf">Anrufe ${pips(ME)} drüben ${pips(THEM)}</span>`;
}

const dockHead = (text: string, calls = true) => `<div class="hz-dockhead"><span class="t">${text}</span>${calls ? callsHtml() : ''}</div>`;

// ---- pictures ------------------------------------------------------------------------

interface Trail { side: Side; lane: Lane; label: string }

/**
 * The pitch from above, SVH attacking to the right, cut into the three lanes. While you choose, the lanes
 * are buttons (with their key) and a dashed trail marks where the last attack went, which is what the
 * tells are about. The attack is an arrow down its lane, the press a man in his lane; the two dropped
 * lanes say so. A steal stops the arrow at the man.
 */
function pitchSvg(o: { att: Side; lane?: Lane | null; press?: Lane | null; pickable?: boolean; stolen?: boolean; reveal?: boolean; trail?: Trail | null }): string {
  const ask = o.pickable && o.lane == null && o.press == null;
  const W = 300, H = 180, lh = H / 3;
  const dir = o.att === 'A' ? 1 : -1;
  const def = other(o.att);
  const band = (l: Lane) => {
    const y = l * lh;
    const isLane = o.lane === l, isPress = o.press === l;
    const dropped = o.press != null && !isPress;
    const tag = isPress ? 'pressen' : dropped ? 'fallen lassen' : '';
    return `<g class="lane ${o.pickable ? 'pick' : ''} ${isLane ? 'on' : ''} ${isPress ? 'press-on' : ''} ${dropped ? 'drop' : ''}" data-lane="${l}">
      <rect x="0" y="${y}" width="${W}" height="${lh}" class="band ${l % 2 ? 'odd' : ''}"/>
      <text x="8" y="${y + 16}" class="lname">${LANE_SHORT[l]}${o.pickable ? `<tspan class="lkey" dx="5">${KEY[l]}</tspan>` : ''}</text>
      ${tag ? `<text x="${W - 8}" y="${y + 16}" class="ltag ${def}">${tag}</text>` : ''}
    </g>`;
  };
  const arrow = (l: Lane) => {
    const y = l * lh + lh / 2;
    const [x1, x2] = dir > 0 ? [40, W - 46] : [W - 40, 46];
    const end = o.stolen ? W / 2 - dir * 18 : x2;
    return `<line x1="${x1}" y1="${y}" x2="${end}" y2="${y}" class="arrow ${o.att} ${o.reveal ? 'draw' : ''}" marker-end="url(#hz-head-${o.att})" pathLength="1"/>`;
  };
  const presser = (l: Lane) => {
    const y = l * lh + lh / 2;
    return `<g class="presser ${def} ${o.reveal ? 'pop' : ''}" style="--x:${W / 2}px;--y:${y}px"><circle cx="${W / 2}" cy="${y}" r="15"/><text x="${W / 2}" y="${y + 6}">${o.stolen ? '✋' : '🏃'}</text></g>`;
  };
  const trail = (t: Trail) => {
    const y = t.lane * lh + lh / 2 + 10;
    return `<g class="trail ${t.side}"><line x1="44" y1="${y}" x2="${W - 44}" y2="${y}"/><text x="${W * 0.78}" y="${t.lane * lh + lh - 5}">${h(t.label)}</text></g>`;
  };
  const hint = o.lane == null && o.press == null && !o.pickable ? '' :
    o.lane == null ? `<text x="${W / 2}" y="${H - 8}" class="dirhint">${SHORT[o.att]} spielt ${dir > 0 ? '→' : '←'}</text>` : '';
  return `<svg class="hz-pitch ${ask ? 'ask' : ''}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Spielfeld mit drei Seiten">
    <defs>
      <marker id="hz-head-A" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="A"/></marker>
      <marker id="hz-head-B" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="B"/></marker>
    </defs>
    ${LANES.map(band).join('')}
    <line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}" class="chalk"/>
    <circle cx="${W / 2}" cy="${H / 2}" r="18" class="chalk"/>
    <rect x="0" y="${H / 2 - 38}" width="30" height="76" class="chalk"/><rect x="${W - 30}" y="${H / 2 - 38}" width="30" height="76" class="chalk"/>
    <rect x="-1" y="${H / 2 - 14}" width="6" height="28" class="goal A"/><rect x="${W - 5}" y="${H / 2 - 14}" width="6" height="28" class="goal B"/>
    ${o.trail ? trail(o.trail) : ''}
    ${hint}
    ${o.lane != null ? arrow(o.lane) : ''}
    ${o.press != null ? presser(o.press) : ''}
    ${ask ? `<g class="tap"><rect x="${W / 2 - 62}" y="${H / 2 - 13}" width="124" height="26" rx="13"/><text x="${W / 2}" y="${H / 2 + 5}">👆 Seite antippen</text></g>` : ''}
    <rect x="0" y="0" width="${W}" height="${H}" class="border"/>
  </svg>`;
}

/** The goal from the front: keeper in the defenders' colour, the ball, and on the reveal where it went. */
function goalSvg(att: Side, shot?: ShotStep): string {
  const def = other(att);
  const out = shot ? (shot.goal ? 'goal' : shot.save ? 'save' : 'miss') : '';
  // where the ball ends: a corner of the net, the keeper's chest, over the bar
  const side = shot ? (shot.roll * 1000) % 2 < 1 ? -1 : 1 : 1;
  const end = out === 'goal' ? { x: 150 + side * 78, y: 62 } : out === 'save' ? { x: 150 + side * 12, y: 70 } : { x: 150 + side * 40, y: 8 };
  return `<svg class="hz-goal ${out}" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Tor">
    <rect x="0" y="118" width="300" height="32" class="turf"/>
    <g class="net">${Array.from({ length: 11 }, (_, i) => `<line x1="${60 + i * 18}" y1="30" x2="${60 + i * 18}" y2="118"/>`).join('')}${Array.from({ length: 5 }, (_, i) => `<line x1="60" y1="${30 + i * 22}" x2="240" y2="${30 + i * 22}"/>`).join('')}</g>
    <path d="M56 120 V26 H244 V120" class="gframe"/>
    <g class="keeper ${def} ${out}" style="--dx:${out === 'save' ? side * 14 : out === 'goal' ? -side * 30 : 0}px">
      <circle cx="150" cy="66" r="9"/><rect x="138" y="76" width="24" height="30" rx="6"/><line x1="138" y1="82" x2="122" y2="70"/><line x1="162" y1="82" x2="178" y2="70"/><line x1="144" y1="106" x2="140" y2="118"/><line x1="156" y1="106" x2="160" y2="118"/>
    </g>
    <text class="ball ${shot ? 'fly' : ''}" x="150" y="140" style="--ex:${end.x - 150}px;--ey:${end.y - 140}px">⚽</text>
  </svg>`;
}

// ---- the chance bar ---------------------------------------------------------------------

/** `maybe`: might still come (the Fußballgott, the lane): a dashed chip, not counted in the bar. */
interface Part { name: string; v: number; icon: string; maybe?: boolean }

/**
 * How likely, as a bar: green is "it works", the rest is "nothing". Under it what made it that big, from
 * the base on. With a roll the ball drops onto the bar: in the green it worked.
 */
function meterHtml(at: At, base: number, parts: Part[], roll?: { r: number; hit: boolean }): string {
  const raw = base + parts.filter(p => !p.maybe).reduce((a, p) => a + p.v, 0);
  const value = Math.min(HZ.ceil, Math.max(HZ.floor, raw));
  const pct = (x: number) => Math.round(x * 100);
  const chip = (p: Part) => `<span class="hz-chip ${p.maybe ? 'unk' : p.v < 0 ? 'neg' : 'pos'}">${p.icon} ${h(p.name)}${p.maybe ? (p.v ? ` ${num(p.v)}?` : ' ?') : ` ${num(p.v)}`}</span>`;
  return `<div class="hz-meter ${roll ? (roll.hit ? 'hit' : 'miss') : 'preview'}">
    <div class="mh"><b>${STAT[at]}</b><span>${STAT_SAYS[at]}</span><strong>${pct(value)} %</strong></div>
    <div class="track">
      <i class="fill" style="width:${value * 100}%"></i>
      <i class="base" style="left:${base * 100}%" title="Basis"></i>
      <span class="zone yes">${at === 'mid' ? 'Chance' : 'Tor'}</span><span class="zone no">${at === 'mid' ? 'nix' : 'vorbei'}</span>
      ${roll ? `<i class="drop" style="--at:${roll.r * 100}%">⚽</i>` : ''}
    </div>
    <div class="chips"><span class="hz-chip basechip">Basis ${num(base, false)}</span>${parts.map(chip).join('')}${raw !== value ? `<span class="hz-chip cap">${raw > value ? 'mehr geht nicht' : 'weniger geht nicht'}</span>` : ''}</div>
  </div>`;
}

const saintPart = (id: string, at: At): Part => ({ name: shortName(id), v: valueIn(id, at), icon: halo(saintById.get(id)!) });

function partsOf(st: Step): Part[] {
  const out: Part[] = [];
  for (const s of [ME, THEM]) {
    const id = st.cards[s];
    if (id) out.push(saintPart(id, st.kind));
  }
  if (st.kind === 'mid' && st.bonus) out.push({ name: st.bonus.label, v: st.bonus.v, icon: '🏃' });
  if (st.event) out.push({ name: shortName(st.event.id), v: st.event.delta, icon: '✨' });
  return out;
}

/** "Der Heilige Harry" → "Harry", for the chips. */
const shortName = (id: string) => saintById.get(id)!.name.replace(/^(Der |Die )?(Heilige|Seelige|heilige|Erzengel)\s+/, '');

// ---- cards -------------------------------------------------------------------------

/** A saint as a card in the dock: the number that counts here big, the other small, why it is grey if it is. */
function cardHtml(id: string, at: At, o: { key?: number; selectable?: boolean; owner?: string; delta?: number; note?: string; noCalls?: boolean } = {}): string {
  const x = saintById.get(id)!;
  const live = fits(id, at) && !o.noCalls;
  const v = o.delta ?? valueIn(id, at);
  const otherAt: At = at === 'mid' ? 'shot' : 'mid';
  const ov = valueIn(id, otherAt);
  const why = o.noCalls ? 'keine Anrufe mehr' : at === 'mid' ? 'zählt erst vor dem Tor' : 'zählt nur im Mittelfeld';
  return `<button class="hz-card ${x.group} ${live ? '' : 'dead'} ${o.note ? 'back' : ''} ${saint === id && o.selectable ? 'on' : ''}" ${o.selectable && live ? `data-saint="${id}"` : 'tabindex="-1"'} data-peek="${id}">
    ${o.owner ? `<small class="owner">${o.owner}</small>` : ''}
    ${o.key ? `<kbd>${o.key}</kbd>` : ''}
    <span class="halo">${halo(x)}</span>
    <b class="name">${h(x.name)}</b>
    ${live ? `<span class="big ${v < 0 ? 'neg' : 'pos'}">${x.coin && o.delta === undefined ? '±' + num(v, false) : num(v)} ${STAT[at]}</span>` : `<span class="why">${why}</span>`}
    ${o.note ? `<span class="small">${o.note}</span>` : ov && !o.owner ? `<span class="small">${num(ov)} ${STAT[otherAt]} ${otherAt === 'shot' ? 'vor dem Tor' : 'im Mittelfeld'}</span>` : ''}
  </button>`;
}

const emptySlot = (owner: string, text: string) => `<div class="hz-card empty">${owner ? `<small class="owner">${owner}</small>` : ''}<span>${text}</span></div>`;

/** A saint's line, as it is said under the picture. `who` says whose bench (or the world) called him. */
function saintLine(id: string, who: string, cls = ''): string {
  const x = saintById.get(id)!;
  return `<p class="saintline ${cls}"><span>${halo(x)}</span> <b>${who}${h(x.name)}:</b> ${h(x.text)}</p>`;
}

// ---- screens ------------------------------------------------------------------------

function introHtml(): string {
  return `<div class="hz-intro">
    <h1>Die Heiligen</h1>
    <p class="sub">Eine Spielidee zum Ausprobieren, neben dem eigentlichen Prototyp. Jede Szene hat bis zu drei Schritte:</p>
    <div class="how">
      <div class="tile">
        <div class="pic">${pitchSvg({ att: 'A', lane: 0, press: 2 })}</div>
        <b>1 · Mittelfeld</b>
        <p>Am Ball wählst du eine Seite. Ohne Ball presst du eine Seite, auf den anderen beiden lässt du dich fallen.</p>
        <p class="rule"><span class="good">Gleiche Seite</span> = Ball geklaut, und der Presser kontert direkt aufs Tor.</p>
        <p class="rule">Durch die Mitte ist der kurze Weg (+0,1 xA). Außen, während er auf der anderen Seite presst: viel Platz (+0,15).</p>
      </div>
      <div class="tile">
        <div class="pic">${meterMini(0.5, 'xA')}</div>
        <b>2 · Chance? (xA)</b>
        <p>Nicht geklaut: Der Ball fällt auf den Balken. Im Grünen wird es eine Torchance.</p>
      </div>
      <div class="tile">
        <div class="pic">${meterMini(0.35, 'xG')}</div>
        <b>3 · Tor? (xG)</b>
        <p>Vor dem Tor dasselbe nochmal mit xG. Im Grünen ist er drin.</p>
      </div>
    </div>
    <div class="saints">
      <span class="halo">😇</span>
      <p>In jedem Schritt darfst du einen <b>Heiligen</b> anrufen: Angriffsheilige machen das Grüne größer, Verteidigungsheilige machen es für den Gegner kleiner. Aber nur <b>${HZ.calls} Anrufe pro Halbzeit</b>, für beide Bänke. Der Gegner sagt zuerst, wen er anruft, du antwortest. Wird der Ball geklaut, kommen die Heiligen zurück auf die Hand. Ab und zu mischt sich <b>✨ der Fußballgott</b> von selbst ein, in welche Richtung, weiß keiner.</p>
    </div>
    <h3>Gegner</h3>
    <div class="rivals">${Object.keys(RIVAL_LANES).map(id => {
      const r = rivalById.get(id)!;
      return `<button class="rv ${id === rivalId ? 'on' : ''}" data-rival="${id}"><b>${h(r.name)}</b>, ${h(r.nick)}<small>${h(RIVAL_LANES[id]!.tell)}</small></button>`;
    }).join('')}</div>
    <p class="keys">Tasten: <kbd>L</kbd> <kbd>M</kbd> <kbd>R</kbd> Seite · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> Heiliger · <kbd>N</kbd> keiner · <kbd>⏎</kbd> Los</p>
    <div class="row"><a href="./index.html">← zum Prototyp</a><button class="go" data-action="kickoff">Anpfiff <kbd>⏎</kbd></button></div>
  </div>`;
}

function meterMini(v: number, label: string): string {
  return `<div class="hz-meter mini"><div class="track"><i class="fill" style="width:${v * 100}%"></i><span class="zone yes">${label}</span><i class="drop still" style="--at:${v * 60}%">⚽</i></div></div>`;
}

function gapHtml(): string {
  const hl = current(game)!;
  const us = hl.side === ME;
  const kind = kindFor(us);
  const shout = shoutOf(hl);
  const lines = [...hl.gap.map(l => `<p>${h(l)}</p>`), ...(shout ? [`<p class="shout">📣 ${h(rival().name)} brüllt: „${h(shout)}“</p>`] : [])];
  const stage = `<div class="hz-gap" data-action="skip">
    <div class="minute">${hl.minute}'</div>
    <div class="hz-lines">${lines.map((l, i) => l.replace('<p', `<p style="animation-delay:${0.3 + i * 1.2}s"`)).join('')}</div>
    <h2 class="${hl.side}" style="animation-delay:${0.4 + lines.length * 1.2}s">${us ? 'Angriff SVH' : `${SHORT[hl.side]} greift an`}</h2>
  </div>`;
  const theirs = theirCall();
  const parts: Part[] = [...(theirs ? [saintPart(theirs, 'mid')] : []), { name: 'Fußballgott', v: 0, icon: '✨', maybe: true }];
  const dock = `${dockHead(us ? 'Gleich: Seite wählen. Deine Angriffsheiligen:' : 'Gleich: Seite zum Pressen wählen. Deine Verteidigungsheiligen:')}
    ${meterHtml('mid', HZ.baseXA, parts)}
    <div class="hz-cards locked">${game.bench[ME].hand[kind].map(id => cardHtml(id, 'mid', { noCalls: game.calls[ME] === 0 })).join('')}</div>
    <div class="row"><button class="go" data-action="skip">Los geht's <kbd>⏎</kbd></button></div>`;
  return shell(stage, dock, 'gap');
}

function pickHtml(): string {
  const hl = current(game)!;
  const n = hl.next!;
  const attacking = n.att === ME;
  const at = n.kind;
  const kind = kindFor(attacking);
  const hand = game.bench[ME].hand[kind];
  const noCalls = game.calls[ME] === 0;
  const title = at === 'mid' ? (attacking ? 'Mittelfeld · wir am Ball' : `Mittelfeld · ${SHORT[n.att]} am Ball`)
    : n.counter ? `Konter ${SHORT[n.att]}!` : `Torchance ${SHORT[n.att]}!`;
  // the trail the tells are about: where we last got through when we attack, where they last went when they do
  const through = game.lastThrough[ME];
  const theirLast = game.lastLane[THEM];
  const trail: Trail | null = attacking
    ? (through !== null ? { side: ME, lane: through, label: 'zuletzt durch' } : null)
    : (theirLast !== null ? { side: THEM, lane: theirLast, label: `zuletzt ${SHORT[THEM]}` } : null);
  const pic = at === 'mid' ? pitchSvg(attacking ? { att: ME, lane, pickable: true, trail } : { att: n.att, press: lane, pickable: true, trail }) : goalSvg(n.att);
  const stage = `<div class="title ${n.att}"><h2>${title}</h2></div><div class="pic">${pic}</div><div class="caption">${pickCaption()}</div>`;
  const base = at === 'mid' ? HZ.baseXA : n.counter ? HZ.counterXG : HZ.baseXG;
  const theirs = theirCall();
  const parts: Part[] = [];
  if (saint && !noCalls) parts.push(saintPart(saint, at));
  if (theirs) parts.push(saintPart(theirs, at));
  if (at === 'mid' && attacking && lane === 1) parts.push({ name: 'Mitte', v: HZ.midBonus, icon: '🏃' });
  if (at === 'mid' && attacking && lane !== null && lane !== 1) parts.push({ name: 'viel Platz', v: HZ.farBonus, icon: '🏃', maybe: true });
  parts.push({ name: 'Fußballgott', v: 0, icon: '✨', maybe: true });
  const meterFor = attacking ? 'uns' : SHORT[THEM];
  const head = `${attacking ? 'Angriffsheilige' : 'Verteidigungsheilige'} · zählt hier: <b>${STAT[at]}</b> für ${meterFor}${hand.some(id => fits(id, at)) ? '' : ' · keiner hilft hier'}`;
  const needLane = at === 'mid' && lane === null;
  const hint = needLane ? 'Tasten L / M / R' : '';
  const dock = `${dockHead(head)}
    ${meterHtml(at, base, parts)}
    <div class="hz-cards">${hand.map((id, i) => cardHtml(id, at, { key: i + 1, selectable: true, noCalls })).join('')}</div>
    <div class="row"><span class="hint">${hint}</span><button class="go ${needLane ? 'wait' : ''}" data-action="go">${needLane ? (attacking ? 'Erst Seite wählen ↑' : 'Erst Pressen wählen ↑') : saint && !noCalls ? 'Los!' : 'Los, ohne Heiligen'} <kbd>⏎</kbd></button></div>`;
  return shell(stage, dock, `${n.att} ${attacking ? 'att' : 'def'}`);
}

/**
 * Under the picture while you choose: first whom the other bench calls (with his line: he has spoken),
 * then what your choice means, or the line of the saint you point at or picked.
 */
function pickCaption(): string {
  const n = current(game)!.next!;
  const attacking = n.att === ME;
  const theirs = theirCall();
  const them = theirs ? saintLine(theirs, 'Drüben: ', 'theirs')
    : `<p class="theirs none">Drüben ruft ${game.calls[THEM] > 0 ? 'diesmal keinen an' : 'keinen mehr an, keine Anrufe mehr'}.</p>`;
  const shown = peek ?? saint;
  if (shown && saintById.has(shown)) return them + saintLine(shown, '');
  const T = SHORT[THEM];
  const ask = n.kind === 'mid'
    ? (lane === null ? (attacking ? 'Tipp eine Seite an: Wo spielst du hin?' : 'Tipp eine Seite an: Wo presst du?')
      : attacking ? (lane === 1 ? `Durch die Mitte, der kurze Weg. Presst ${T} genau dort, ist der Ball weg.` : `Über ${LANE_SHORT[lane].toLowerCase()}. Presst ${T} auf der anderen Seite, hast du viel Platz. Presst er hier, ist der Ball weg.`)
      : `Pressen ${LANE_SHORT[lane].toLowerCase()}. Kommt ${T} genau dort, ist der Ball unser.`)
    : attacking ? 'Jetzt muss er rein. Rufst du einen Heiligen an?' : 'Jetzt muss er draußen bleiben. Rufst du einen Heiligen an?';
  return `${them}<p class="ask">${ask}</p>`;
}

const CONFETTI = ['🎉', '🍺', '⚽', '🎊', '📣', '🌭', '🎉', '🍺', '🎊', '⭐', '🥨', '🎉'];

function revealHtml(): string {
  const hl = current(game)!;
  const st = hl.steps[hl.steps.length - 1]!;
  const attacking = st.att === ME;
  let word: string, good: boolean, pic: string;
  if (st.kind === 'mid') {
    const m = st as MidStep;
    word = m.stolen ? 'GEKLAUT!' : m.chance ? 'CHANCE!' : 'VERSANDET';
    good = m.stolen ? !attacking : m.chance === attacking;
    pic = pitchSvg({ att: m.att, lane: m.lane, press: m.press, stolen: m.stolen, reveal: true });
  } else {
    const s = st as ShotStep;
    word = s.goal ? (attacking ? 'TOOOR!' : `TOR ${SHORT[s.att]}`) : s.save ? 'GEHALTEN!' : 'VORBEI!';
    good = s.goal === attacking;
    pic = goalSvg(s.att, s);
  }
  const stolen = st.kind === 'mid' && st.stolen;
  const goal = st.kind === 'shot' && st.goal;
  const wordAt_ = wordAt();
  const title = st.kind === 'mid' ? `Mittelfeld · ${SHORT[st.att]} am Ball` : st.counter ? `Konter ${SHORT[st.att]}` : `Torchance ${SHORT[st.att]}`;
  // the world's card comes first (it happened before the play); its line is the joke, so it is said
  const world = st.event ? [saintLine(st.event.id, '', 'world')] : [];
  const play = st.lines.map(l => `<p>${h(l)}</p>`);
  const all = [...world, ...play];
  const lines = all.map((l, i) => l.replace('<p', `<p style="animation-delay:${i === all.length - 1 ? wordAt_ + 0.2 : 0.15 + i * 0.35}s"`)).join('');
  const confetti = goal && attacking
    ? `<div class="hz-confetti">${CONFETTI.map((e, i) => {
      const a = (i / CONFETTI.length) * 2 * Math.PI;
      return `<i style="--x:${Math.round(Math.cos(a) * 290)}px;--y:${Math.round(Math.sin(a) * 120)}px;--r:${(i % 2 ? 1 : -1) * (120 + i * 25)}deg;animation-delay:${wordAt_ + (i % 3) * 0.05}s">${e}</i>`;
    }).join('')}</div>` : '';
  const flash = goal ? `<div class="hz-flash ${attacking ? 'us' : 'them'}" style="animation-delay:${wordAt_}s"></div>` : '';
  const stage = `${flash}${confetti}<div class="title ${st.att}"><h2>${title}</h2></div>
    <div class="pic">${pic}<div class="hz-word ${good ? 'good' : 'bad'} ${goal ? 'goal' : ''}" style="animation-delay:${wordAt_}s">${word}</div></div>
    <div class="caption">${lines}</div>`;
  const base = st.kind === 'mid' ? HZ.baseXA : st.counter ? HZ.counterXG : HZ.baseXG;
  const called = st.cards[ME] || st.cards[THEM];
  const meter = stolen
    ? `<div class="hz-meter stolen"><div class="mh"><b>Geklaut</b><span>${SHORT[st.att]} ${LANE_NAME[st.lane]}, ${SHORT[other(st.att)]} presst genau da. Kein xA, direkt zum Konter.${called ? ' Die Heiligen kommen zurück auf die Hand.' : ''}</span></div></div>`
    : meterHtml(st.kind, base, partsOf(st), { r: st.roll, hit: st.kind === 'mid' ? (st as MidStep).chance : (st as ShotStep).goal });
  const slot = (s: Side) => {
    const owner = s === ME ? 'Unsere Bank' : 'Drüben';
    return st.cards[s] ? cardHtml(st.cards[s]!, st.kind, { owner, note: stolen ? 'zurück auf die Hand' : undefined }) : emptySlot(owner, 'kein Heiliger');
  };
  const god = st.event ? cardHtml(st.event.id, st.kind, { owner: '✨ Fußballgott', delta: st.event.delta }) : emptySlot('✨ Fußballgott', 'hält sich raus');
  const after = hl.next ? (hl.next.counter ? `Konter ${SHORT[hl.next.att]}!` : `Zur Torchance`) : 'Weiter';
  const dock = `${dockHead(`${st.kind === 'mid' ? 'Mittelfeld' : 'Abschluss'} · was angerufen wurde`)}
    ${meter}
    <div class="hz-cards">${slot(ME)}${slot(THEM)}${god}</div>
    <div class="row"><button class="go" data-action="next">${after} <kbd>⏎</kbd></button></div>`;
  return shell(stage, dock, `${st.att} reveal`);
}

function stripHtml(half: 1 | 2): string {
  const rows = game.log.filter(hl => hl.half === half && hl.steps.length).map((hl: Highlight) => {
    const goal = hl.steps.find(s => s.kind === 'shot' && s.goal) as ShotStep | undefined;
    const end = hl.steps[hl.steps.length - 1]!;
    const what = goal ? `⚽ Tor ${SHORT[goal.att]} (${h(goal.striker)})` : end.kind === 'shot' ? `${end.counter ? 'Konter' : 'Chance'} ${SHORT[end.att]}, nichts` : (end as MidStep).chance ? 'Chance' : 'versandet';
    return `<li class="${goal ? 'goal ' + goal.att : ''}"><b>${hl.minute}'</b> ${SHORT[hl.side]} · ${what}</li>`;
  });
  return `<div class="hz-half"><h4>${half}. Halbzeit</h4><ol class="hz-strip">${rows.join('')}</ol></div>`;
}

function tally(): string {
  const c = { A: { chances: 0, steals: 0 }, B: { chances: 0, steals: 0 } };
  for (const hl of game.log) for (const st of hl.steps) {
    if (st.kind === 'shot') c[st.att].chances++;
    if (st.kind === 'mid' && st.stolen) c[other(st.att)].steals++;
  }
  return `<div class="hz-tally"><span>Torchancen <b>${c.A.chances} : ${c.B.chances}</b></span><span>Bälle geklaut <b>${c.A.steals} : ${c.B.steals}</b></span></div>`;
}

/** The world's cards that turned so far, in the row where the saints usually are. */
function godsHtml(): string {
  const ids = game.log.flatMap(hl => hl.steps.map(st => st.event?.id).filter((x): x is string => !!x));
  const chips = ids.map(id => `<span class="hz-chip">${halo(saintById.get(id)!)} ${h(shortName(id))}</span>`).join('');
  return `<div class="hz-gods"><b>✨ Vom Fußballgott geschickt</b><div>${chips || '<span class="none">Er hat sich rausgehalten.</span>'}</div></div>`;
}

function breakHtml(over: boolean): string {
  const d = game.score.A - game.score.B;
  const verdict = !over ? 'Halbzeit. Tee, Bratwurst, Gebete. Die Anrufe gibt es neu.' : d > 0 ? 'Sieg! Die Heiligen waren auf unserer Seite.' : d < 0 ? 'Verloren. Drüben wurde wohl lauter gebetet.' : 'Unentschieden. Der Fußballgott wollte sich nicht festlegen.';
  const stage = `<div class="hz-break">
    <div class="bh"><h1>${over ? 'Abpfiff' : 'Halbzeit'}</h1><p class="big"><span class="A">${SHORT.A}</span> ${game.score.A}:${game.score.B} <span class="B">${SHORT.B}</span></p></div>
    <div class="halves ${over ? 'two' : ''}">${stripHtml(1)}${over ? stripHtml(2) : ''}</div>
  </div>`;
  const dock = `${dockHead(verdict, false)}${tally()}${godsHtml()}
    <div class="row">${over ? `<button data-action="intro">Anderer Gegner</button><button class="go" data-action="again">Nochmal <kbd>⏎</kbd></button>` : `<button class="go" data-action="second">Zweite Halbzeit <kbd>⏎</kbd></button>`}</div>`;
  return shell(stage, dock, 'break');
}

function render(): void {
  root.className = `hz phase-${phase}`;
  root.innerHTML = phase === 'intro' ? introHtml() : phase === 'gap' ? gapHtml() : phase === 'pick' ? pickHtml()
    : phase === 'reveal' ? revealHtml() : breakHtml(phase === 'over');
  clearTimeout(lateTimer);
  if (phase === 'reveal') lateTimer = window.setTimeout(late, wordAt() * 1000);
}

/** When the word lands on a reveal: the steps show the result, and a goal goes on the scoreboard. */
function late(): void {
  if (phase !== 'reveal') return;
  const nav = root.querySelector('.hz-steps');
  if (nav) nav.outerHTML = stepsHtml(false);
  const sc = root.querySelector('.hz-score b');
  const st = current(game)?.steps.at(-1);
  if (sc && st?.kind === 'shot' && st.goal) { sc.textContent = scoreText(false); sc.classList.add('pop'); }
}

// ---- input ------------------------------------------------------------------------

function act(action: string): void {
  if (action === 'kickoff') kickOff();
  else if (action === 'go') go();
  else if (action === 'next') next();
  else if (action === 'skip') { clearTimeout(gapTimer); if (phase === 'gap') { phase = 'pick'; render(); } }
  else if (action === 'second') showGap();
  else if (action === 'again') { seed++; kickOff(); }
  else if (action === 'intro') { seed++; phase = 'intro'; render(); }
}

root.addEventListener('click', e => {
  const t = e.target as Element;
  const laneEl = t.closest<SVGGElement>('[data-lane]');
  if (laneEl && phase === 'pick' && laneEl.classList.contains('pick')) { lane = Number(laneEl.dataset.lane) as Lane; render(); return; }
  const s = t.closest<HTMLElement>('[data-saint]');
  if (s) { saint = saint === s.dataset.saint ? null : (s.dataset.saint as string); peek = null; render(); return; }
  const r = t.closest<HTMLElement>('[data-rival]');
  if (r) { rivalId = r.dataset.rival as string; render(); return; }
  const a = t.closest<HTMLElement>('[data-action]');
  if (a) act(a.dataset.action as string);
});

// hovering a saint shows his line in the caption (only while choosing, so the reveal text stays put)
root.addEventListener('mouseover', e => {
  if (phase !== 'pick') return;
  const id = (e.target as Element).closest<HTMLElement>('[data-peek]')?.dataset.peek ?? null;
  if (id !== peek) {
    peek = id;
    const cap = root.querySelector('.caption');
    if (cap) cap.innerHTML = pickCaption();
  }
});

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (phase === 'intro') act('kickoff');
    else if (phase === 'gap') act('skip');
    else if (phase === 'pick') act('go');
    else if (phase === 'reveal') act('next');
    else if (phase === 'halftime') act('second');
    else if (phase === 'over') act('again');
    return;
  }
  if (phase !== 'pick') return;
  const n = current(game)?.next;
  if (!n) return;
  const k = e.key.toLowerCase();
  if (n.kind === 'mid' && (k === 'arrowup' || k === 'l')) { lane = 0; render(); }
  else if (n.kind === 'mid' && (k === 'm')) { lane = 1; render(); }
  else if (n.kind === 'mid' && (k === 'arrowdown' || k === 'r')) { lane = 2; render(); }
  else if (/^[1-3]$/.test(k)) {
    const id = game.bench[ME].hand[kindFor(n.att === ME)][Number(k) - 1];
    if (id && fits(id, n.kind) && game.calls[ME] > 0) { saint = saint === id ? null : id; peek = null; render(); }
  } else if (k === 'n') { saint = null; render(); }
});

render();
