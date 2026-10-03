// The pitch (DESIGN §2.4, v0.12; since v0.16 the whole panel's background): a chalk sketch of the
// field with one mark on it — where this panel is happening. Pure presentation: since v0.13 every scene carries the
// ball's real place (`scene.spot`, built by the sim), and everything here is geometry.
//
// The sketch never turns during a match: **SVH attacks to the right (upwards on a phone), always**,
// both halves, so the coach reads one picture all match — we are camped at their box, or we are being pushed back onto our own line. A
// scene's spot is written from the view of the side with the initiative, so a panel of the other bench
// is the same spot rotated 180° (their "own box" is the right one, their left wing is the lower line).
// Off-pitch spots (the fence, the Gerätehaus) are y outside 0..1 on purpose and land in the margin.

import type { Panel, Scene, Side } from '../engine/types';

// svg units: the pitch itself is W × H, the viewBox leaves a margin for the goals, the labels and the
// few spots that are off the pitch. Proportions are a real pitch (105 × 68) rounded to nice numbers.
const W = 200;
const H = 130;
const BOX_D = 31, BOX_H = 77;        // 16.5 m box
const SIX_D = 11, SIX_H = 35;        // 5.5 m box
const SPOT_D = 21;                   // penalty spot, 11 m out
const GOAL_H = 14;

/** Same as main.ts: everything that goes into the markup is data, but it goes in escaped. */
const h = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Where the mark sits, in pitch units, with the side whose panel it is. */
interface Mark { x: number; y: number; side: Side; where: string }

/** Stable per panel: the same cast always gets the same wing, so the mark never jumps mid-panel. */
function hash(scene: Scene): number {
  let n = 0;
  for (const s of [scene.type, ...scene.cast.map(m => m.player.name)]) {
    for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(n);
}

/** A scene's spot turned into the fixed picture: A attacks right, B attacks left. */
function markOf(scene: Scene): Mark {
  const spot = scene.spot;
  const y = spot.flank && hash(scene) % 2 === 0 ? 1 - spot.y : spot.y;
  const own = scene.side === 'A';
  return own
    ? { x: spot.x, y, side: scene.side, where: spot.where }
    : { x: 1 - spot.x, y: 1 - y, side: scene.side, where: spot.where };
}

/** The goal a side scores in. Used when a panel ends in the net: the mark flies in there. */
function goalMark(side: Side, where: string): Mark {
  return { x: side === 'A' ? 1.015 : -0.015, y: 0.5, side, where };
}

const px = (m: { x: number; y: number }, lo = -24, hi = 154) => ({
  x: Math.round(m.x * W * 10) / 10,
  // off-pitch spots stay inside the margin, however far out a scene puts them
  y: Math.min(hi, Math.max(lo, Math.round(m.y * H * 10) / 10)),
});

/**
 * Two ways to lay the same pitch into a panel (v0.16). Wide panels get it lying down, SVH playing to
 * the right. Tall panels (phones) get it standing up: SVH plays upwards, our goal at the bottom next
 * to the hand, and our left wing is on the left. Everything is drawn in the lying-down units and
 * turned by `at` (points) or `turn` (the chalk group), so the text never ends up on its side.
 */
interface Orient {
  view: string;
  top: number; height: number;           // the view's vertical extent, to tell where in the panel a mark sits
  turn: string;
  at: (p: { x: number; y: number }) => { x: number; y: number };
  margin: [number, number];              // how far off the touchline a mark may sit
  arrowY: number;                        // the lying-down y of the direction arrow
}
const WIDE: Orient = { view: '-20 -26 240 182', top: -26, height: 182, turn: '', at: p => p, margin: [-18, 148], arrowY: -13 };
const TALL: Orient = {
  view: '-14 -22 158 244',
  top: -22, height: 244,
  turn: `matrix(0 -1 1 0 0 ${W})`,
  at: p => ({ x: Math.round(p.y * 10) / 10, y: Math.round((W - p.x) * 10) / 10 }),
  margin: [-10, 140],
  arrowY: H + 8,
};

/** The chalk lines. Drawn once per panel; the wobble filter does the hand-drawn look. */
function linesSvg(): string {
  const box = (left: boolean, d: number, h: number) =>
    `<rect x="${left ? 0 : W - d}" y="${(H - h) / 2}" width="${d}" height="${h}"/>`;
  // a corner arc at each flag
  const arc = (x: number, y: number, sx: number, sy: number) =>
    `<path d="M ${x + 4 * sx} ${y} A 4 4 0 0 ${sx * sy > 0 ? 0 : 1} ${x} ${y + 4 * sy}"/>`;
  return `<g class="lines">
    <rect x="0" y="0" width="${W}" height="${H}"/>
    <path d="M ${W / 2} 0 V ${H}"/>
    <circle cx="${W / 2}" cy="${H / 2}" r="17"/>
    ${box(true, BOX_D, BOX_H)}${box(false, BOX_D, BOX_H)}
    ${box(true, SIX_D, SIX_H)}${box(false, SIX_D, SIX_H)}
    ${arc(0, 0, 1, 1)}${arc(W, 0, -1, 1)}${arc(0, H, 1, -1)}${arc(W, H, -1, -1)}
  </g>
  <g class="spots">
    <circle cx="${W / 2}" cy="${H / 2}" r="1.6"/>
    <circle cx="${SPOT_D}" cy="${H / 2}" r="1.6"/>
    <circle cx="${W - SPOT_D}" cy="${H / 2}" r="1.6"/>
  </g>`;
}

/** The two goals, in club colours, so the coach never has to ask which end is his. */
function goalsSvg(): string {
  const y = (H - GOAL_H) / 2;
  return `<g class="ends">
    <rect class="A" x="-5" y="${y}" width="5" height="${GOAL_H}"/>
    <rect class="B" x="${W}" y="${y}" width="5" height="${GOAL_H}"/>
  </g>`;
}

/** The names behind the goals, upright in either orientation. */
function endLabelsSvg(o: Orient, teams: Record<Side, { short: string }>): string {
  if (o === TALL) {
    return `<text class="end A" x="${H / 2}" y="${W + 13}">${h(teams.A.short)}</text>
      <text class="end B" x="${H / 2}" y="-13">${h(teams.B.short)}</text>`;
  }
  return `<text class="end A" x="-12" y="${H / 2}" transform="rotate(-90 -12 ${H / 2})">${h(teams.A.short)}</text>
    <text class="end B" x="${W + 12}" y="${H / 2}" transform="rotate(90 ${W + 12} ${H / 2})">${h(teams.B.short)}</text>`;
}

/**
 * Which way the side at the ball is playing: a small arrow beside the halfway line, in its colour. The
 * head is drawn by hand rather than as a marker, because a marker cannot take the line's colour.
 */
function arrowSvg(o: Orient, side: Side): string {
  const d = side === 'A' ? 1 : -1;
  const tip = W / 2 + 12 * d;
  const y = o.arrowY;
  const P = (x: number, yy: number) => { const q = o.at({ x, y: yy }); return `${q.x} ${q.y}`; };
  return `<g class="dir ${side}">
    <path d="M ${P(tip - 24 * d, y)} L ${P(tip, y)}"/>
    <path d="M ${P(tip - 5 * d, y - 4)} L ${P(tip, y)} L ${P(tip - 5 * d, y + 4)}"/>
  </g>`;
}

/** The ball's run: where it was, hollow, with a dashed line to where it is now. */
function trailSvg(o: Orient, from: Mark, to: Mark): string {
  const a = o.at(px(from, ...o.margin)), b = o.at(px(to, ...o.margin));
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 14) return '';                       // it barely moved: no run to draw
  // stop the run short of the mark, so its head stays clear of the dot sitting on top of it
  const t = (len - 11) / len;
  const hx = Math.round((a.x + (b.x - a.x) * t) * 10) / 10;
  const hy = Math.round((a.y + (b.y - a.y) * t) * 10) / 10;
  return `<g class="trail ${from.side}">
    <circle cx="${a.x}" cy="${a.y}" r="3.5"/>
    <path d="M ${a.x} ${a.y} L ${hx} ${hy}" marker-end="url(#pitch-tip)"/>
  </g>`;
}

/**
 * The pitch as the panel's background (v0.16), in two layers with the same frame: `back` is the grass
 * and the chalk, under everything; `front` is the run and the mark, over everything, so the one thing
 * that matters is never covered by a caption. `where` is the place in words, for the caption — the
 * panel says where it is even when nobody looks at the drawing (DESIGN §2.4). `low` says the place is in
 * the lower half of the panel, so the captions know to get out of its way and go to the top.
 * `prev` is the scene of the panel before, drawn as the run in; `p` the resolved panel when there is
 * one, and `next` the scene it leads to (null after a goal or at the whistle). A resolved panel shows
 * the ball's run out instead: the mark flies from here to where the next panel starts, in the colour
 * of whoever has it then, so the reveal ends on the picture the next panel opens with.
 */
export function pitchLayers(
  scene: Scene,
  prev: Scene | null,
  p: Panel | null,
  next: Scene | null,
  teams: Record<Side, { short: string }>,
  tall: boolean,
): { back: string; front: string; where: string; to: string | null; low: boolean } {
  const o = tall ? TALL : WIDE;
  const here = markOf(scene);
  const scored = p?.goal ?? null;
  const ahead = p && !scored && next ? markOf(next) : null;
  const mark = scored ? goalMark(scored, here.where) : ahead ?? here;
  const from = p ? (mark === here ? null : here) : prev ? markOf(prev) : null;
  const m = o.at(px(mark, ...o.margin));
  const h0 = o.at(px(here, ...o.margin));
  // the mark starts on the scene's place and runs to its own, so the eye follows the ball
  const fly = p ? { x: Math.round((h0.x - m.x) * 10) / 10, y: Math.round((h0.y - m.y) * 10) / 10 } : { x: 0, y: 0 };
  const state = `${p ? 'done' : 'live'} ${scored ? 'scored' : ''} ${tall ? 'tall' : 'wide'}`;
  const back = `<svg class="pitch under ${state}" viewBox="${o.view}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <filter id="pitch-chalk" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      <g transform="${o.turn}">
        <rect class="grass" x="0" y="0" width="${W}" height="${H}"/>
        <g class="mow">${[0, 1, 2, 3].map(i => `<rect x="${i * 50}" y="0" width="25" height="${H}"/>`).join('')}</g>
        <g class="chalk" filter="url(#pitch-chalk)">${linesSvg()}</g>
        ${goalsSvg()}
      </g>
      ${endLabelsSvg(o, teams)}
      ${arrowSvg(o, scene.side)}
    </svg>`;
  const front = `<svg class="pitch over ${state}" viewBox="${o.view}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Spielfeld: ${h(here.where)}">
      <defs>
        <marker id="pitch-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z"/>
        </marker>
      </defs>
      ${from ? trailSvg(o, from, mark) : ''}
      <circle class="anchor" cx="${h0.x}" cy="${h0.y}" r="5"/>
      <g class="mark ${mark.side}" transform="translate(${m.x} ${m.y})">
        <g class="fly" style="--fx:${fly.x}px;--fy:${fly.y}px">
          <circle class="ping" r="9"/>
          <circle class="dot" r="5"/>
        </g>
      </g>
    </svg>`;
  // decided on the scene's own place, not where the ball runs to, so live and reveal lay out the same
  const low = (h0.y - o.top) / o.height > 0.5;
  const to = scored ? 'ins Tor' : ahead && ahead.where !== here.where ? ahead.where : null;
  return { back, front, where: here.where, to, low };
}

/** The same mark, thumbnail-sized: the strip becomes a map of where the match was played. */
export function pitchMini(scene: Scene, goal: Side | null): string {
  const mark = goal ? goalMark(goal, '') : markOf(scene);
  const m = px(mark);
  return `<svg class="mini" viewBox="-6 -6 212 142" aria-hidden="true">
    <rect class="grass" x="0" y="0" width="${W}" height="${H}"/>
    <g class="lines"><rect x="0" y="0" width="${W}" height="${H}"/><path d="M ${W / 2} 0 V ${H}"/>
      <rect x="0" y="${(H - BOX_H) / 2}" width="${BOX_D}" height="${BOX_H}"/>
      <rect x="${W - BOX_D}" y="${(H - BOX_H) / 2}" width="${BOX_D}" height="${BOX_H}"/></g>
    <circle class="dot ${mark.side}" cx="${m.x}" cy="${Math.min(H, Math.max(0, m.y))}" r="13"/>
  </svg>`;
}
