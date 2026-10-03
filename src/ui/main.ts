// Thin DOM layer over src/engine. Single player: you coach SV Hinterdupfing (A), a rival with tells
// coaches the other bench (B). The 10 s clock lives here, the engine has no timers. One render() from
// state; the bar and the rival's face-down card are driven by rAF without re-rendering.
// The screen is built to be read in one glance (DESIGN §2.4): the men in the picture are big figures,
// every panel resolves to one word that pops in over them, and the man it belongs to lights up. Beside
// them a chalk pitch says where the panel is happening, with the run from the panel before (pitch.ts).
// v0.14: every panel says which of the three situations it is — ball action, challenge, set piece — and
// whose: ours or theirs. That badge is the panel's first read.
// v0.15: no hand. Each panel deals you one card from the three of this situation, and you say Spielen or
// Nicht spielen; the clock running out is a no.
// v0.21: half-time is the Kabine. You pick one thing to say (talks.ts), the rival says his through the
// wall. v0.22: form (form.ts). Both benches' Puste, Moral and Gunst are three words in the top bar, the
// men wear them (sweat when the legs go, fire when the heads are up, chins down when they hang), and a
// word that changes is a line in the panel's text. After the first playtest ("I don't understand the
// levels at all"): your form is three labelled bars under the score, with a ? that explains them; the
// card says in words what it costs, and the bar shows how much of it will go.
// v0.26: no cards. Before kick-off you pick three skills for each of the six situations (the draft,
// loadout.ts); in a panel the three of its situation stand under it and you use one (1–3) or say nothing
// (N); the clock running out is nothing. Hovering a skill shows its price on your bars.
// v0.27: only the highlights are played. A highlight is a few panels while the ball is somewhere a goal can
// come from; between two of them the screen fast-forwards (the Zeitraffer): the clock runs to the next
// minute, a few lines say what happened off camera, and the next highlight's headline comes up. The top bar
// shows the match minute, the strip groups its panels by highlight.

import { cardById } from '../engine/data/cards';
import { sceneById } from '../engine/data/scenes';
import { TEAM_A, TEAM_B } from '../engine/data/rosters';
import { traitById } from '../engine/data/traits';
import { activeGauges, costOf, CUTS, setActive, WORDS } from '../engine/form';
import { firesLine, fmt, K, newMatch, pileFor, skillsFor, slotFor, step, triggers, whyNot } from '../engine/match';
import { minuteLabel } from '../engine/highlights';
import type { WhyNot } from '../engine/match';
import { cannotPick, complete, dealDraft, PER_SLOT, redeal, SLOTS, toggle, toLoadout } from '../engine/loadout';
import type { Draft } from '../engine/loadout';
import { pitchLayers, pitchMini } from './pitch';
import { decide, RIVALS, rivalById, rivalTalk, signature } from '../engine/rival';
import { halftime, talksFor } from '../engine/talks';
import type { Said, TalkOffer } from '../engine/talks';
import type { Rival } from '../engine/rival';
import type { Card, CardSide, Gap, Gauge, Laid, MatchState, Panel, Role, Scene, Side, Situation, Slot } from '../engine/types';

// The panel is live SCENE_MS, then the cards flip and the resolved panel stays REVEAL_MS.
// ?tempo=4000 shortens a panel for playtesting (reveal scales with it). ?seed=7 replays a match.
// ?rival=taktikfuchs picks the other bench.
const Q = new URLSearchParams(location.search);
const TEMPO = Number(Q.get('tempo')) || 10000;
const SCENE_MS = TEMPO;
const REVEAL_MS = Math.round(TEMPO * 0.7);   // a tap on the panel skips it
// Once you have laid, the panel does not wait out its clock: the card flies, one beat, whistle.
const LAID_MS = Math.max(500, Math.round(TEMPO * 0.09));
// v0.27: the Zeitraffer between two highlights: a beat for the clock, one per line, one for the headline.
// A tap or Enter skips it.
const GAP_BEAT = Math.round(TEMPO * 0.09);
const gapMs = (g: Gap) => GAP_BEAT * (5 + 3 * (g.lines.length + g.shifts.length));
const RIVAL: Rival = rivalById.get(Q.get('rival') ?? '') ?? (RIVALS[0] as Rival);
// v0.25: ?form=gunst parks Puste and Moral — the football god is the only price, and the only bar.
if (Q.get('form') === 'gunst') setActive(['gunst']);
const GAUGES = activeGauges();

const app = document.getElementById('app')!;
// A tall screen stands the pitch up (SVH plays upwards), a wide one lays it down (SVH plays right).
const TALL = matchMedia('(max-aspect-ratio: 4/5)');
const ME: Side = 'A';
const THEM: Side = 'B';
const SIDES: Side[] = ['A', 'B'];
const TEAM = { A: TEAM_A, B: TEAM_B };
const KIND_LABEL: Record<Card['kind'], string> = { shout: 'Zuruf', drama: 'Drama', event: 'Ereignis' };
const PILE_LABEL: Record<CardSide, string> = { ball: 'Mit Ball', noball: 'Ohne Ball' };
const SITUATION_LABEL: Record<Situation, string> = { action: 'Ballaktion', challenge: 'Zweikampf', setpiece: 'Standard' };
const GAUGE_ICON: Record<Gauge, string> = { puste: '💨', moral: '💪', gunst: '✨' };
const GAUGE_LABEL: Record<Gauge, string> = { puste: 'Puste', moral: 'Moral', gunst: 'Fußballgott' };
/** Why a skill lies grey, in a word under it. Nothing when it just does nothing in this picture. */
const WHY_LABEL: Record<WhyNot, string> = { here: '', spent: 'verbraucht', gunst: 'Gott schaut weg' };
/** One line per gauge: what it is, what moves it, what it does. The tooltip and the help say the same. */
const GAUGE_HELP: Record<Gauge, string> = {
  puste: 'Die Beine. Jedes Bild kostet ein bisschen, jeder Zuruf mehr. Wer platt ist, macht Fehler und lässt die anderen durch. In der Halbzeit kommt ein Teil zurück.',
  moral: 'Die Köpfe. Tore, Pfiffe und Patzer bewegen sie. Heiße Spieler setzen deine Zurufe besser um; hängen die Köpfe, hören sie kaum hin.',
  gunst: 'Die Gunst des Fußballgotts. Ereignisse und Drama kosten sie. Sagst du nichts, obwohl du könntest, gibt er dir ein bisschen zurück, bei Pech auch, und mit der Zeit vergisst er, was du ihm schuldest. Er lenkt Abpraller, Pfosten und Pfiffe. Reicht seine Gunst nicht, geht so etwas gar nicht erst.',
};
const ROLE_LABEL: Record<Role, string> = { keeper: 'Torwart', defender: 'Verteidiger', midfielder: 'Mittelfeld', winger: 'Flügel', striker: 'Stürmer' };
// the position as the line-up board writes it, big beside the name
const ROLE_SHORT: Record<Role, string> = { keeper: 'TW', defender: 'IV', midfielder: 'ZM', winger: 'FL', striker: 'ST' };
// placeholder art until somebody draws it: one glyph per card
const ART: Record<string, string> = {
  schiess: '💥', flanke: '🌙', steil: '➡️', kopf: '🗣️', lang: '🚀', ruhig: '🧘', schiri: '🙌',
  umhauen: '🦵', pressing: '🏃‍♂️', torwart_raus: '🧤', weg_damit: '🥾', mauer: '🧱',
  hund: '🐕', buergermeister: '🎩', abseitsfalle: '🚩', schwalbe: '🕊️',
  kurz: '👟', leg_quer: '↔️', lauf: '💨', trau_dich: '🎲', absichern: '🔒', freibier: '🍺',
  stellen: '🧍', linie: '🥅', reinwerfen: '🤸', zustellen: '🚧', nie_im_leben: '☝️', aufstehen: '🙄',
  direkt: '🎯', auf_den_kopf: '🦒', kurz_ausfuehren: '🤏', hoch_und_weit: '☁️', schnell: '⚡', verladen: '🙈',
  manndeckung: '🤼', immer_links: '👈', anlaufen: '🐂',
  ueber_aussen: '↗️', doppelpass: '🔁', tempo_raus: '🐢', nachsetzen: '🦶', tunnel: '🕳️', koerper_rein: '🍑',
  foul_ziehen: '🤕', drueck_ihn_runter: '⬇️', fallen_lassen: '🔙', linie_halten: '📐', schlafmuetze: '😴',
  taktisches_foul: '🟨', doppeln: '👬', nicht_springen: '🦘', kopf_dazwischen: '🤕', variante: '🎩', einwurf_lang: '💪',
  zweiter_pfosten: '📍', mitte: '⏺️', vom_anstoss: '🌠', torwart_spielt_mit: '🧤', pfosten_besetzen: '🧍‍♂️',
  nicht_drehen: '🔄', zappeln: '🙆',
  guelle: '💩', rueckenwind: '🌬️', ausschank: '🍺', blaskapelle: '🎺', durchsage: '📢', tiefe_sonne: '🌅',
  wochenblatt: '📸', freundin: '💘', plastiktuete: '🛍️', stollen: '👞', handy_mauer: '📱', aufgepumpt: '⛽',
  taube: '🕊️', muecken: '🦟', wespe: '🐝', falsches_trikot: '👕', pfuetze: '💧', bus_hupt: '🚌',
  brille: '👓', pfarrer: '⛪', bratwurst: '🌭', dackel_zaun: '🐶', boeller: '🧨', schief_gekalkt: '📏',
  oma: '👵', kirchenglocken: '🔔',
  sturmboee: '🌪️', maulwurf: '🐀', geburtstag: '🎂', handy_torwart: '📳', hochzeit: '💒',
  sirene: '🚒', rudelbildung: '🤜', fahne: '🏳️', trainer_rein: '👴', handspiel: '✋', bierbank: '🍻',
  torwart_vorne: '🧤', torlinie: '📏', eisspray: '🧊', schwager: '👨‍👩‍👦', psychospiel: '🌀',
  stromausfall: '💡', auf_den_torwart: '🏃',
  flach: '〰️', nach_vorne: '⏩', aufs_tor: '🎳', pike: '📌', scout: '📝', konferenz: '📻', frisch_gemaeht: '🌱',
  neue_handschuhe: '✨', dreh_dich: '🔃', fallrueckzieher: '🙃', schiess_ihn_an: '🦴', hintermann: '👀', leo: '🦁',
  kuehe: '🐄', fruehschoppen: '🥨', schwiegermutter: '👒', winkel: '🕸️', erster_pfosten: '1️⃣', langer_schiri: '🦩',
  balljunge: '🧒', nieselregen: '🌧️', geschirrtuch: '🦆', glueckssocken: '🧦', nasse_pfeife: '💦',
  rasensprenger: '🚿', maisfeld: '🌽', huepfburg: '🏰', grillrauch: '🔥', keine_flanke: '🚫', mitgehen: '🧲',
  meiner: '🙋', kontaktlinse: '👁️', maibaum: '🌲', hahn: '🐓', hitze: '🥵', balljunge_troedelt: '🐌',
  maehroboter: '🤖', kleiner_schiri: '👣', brennnesseln: '🌿', kuhfladen: '🐮',
};

// ---- UI state -----------------------------------------------------------

type Phase = 'draft' | 'live' | 'reveal' | 'gap' | 'halftime' | 'over';
let match: MatchState;
let phase: Phase = 'live';
let laid: Laid = { A: null, B: null };
let lastPanel: Panel | null = null;
let viewing: Panel | null = null;          // a thumbnail opened from the strip
let paused = false;
let said: string | 'none' | null = null;   // the skill you used this panel, or 'none'; the clock running out is none
let hovered: string | null = null;         // the skill under the pointer: its price shows on your bars
let dealt = false;                         // consumed by the next skillsHtml(): the three slide in once per panel
let draft: Draft | null = null;            // your pick before kick-off; kept for the next match
let draftRng = 1;
let seed = 1;
let info: string | null = null;            // the skill last tapped in the draft: its line and price at the foot
let rivalRng = 1;
let plan: { cardId: string | null; at: number } = { cardId: null, at: 0 };   // what the rival will lay this panel, and when
let help = false;                          // the ? overlay that explains the form
let pausedForHelp = false;
let talks: TalkOffer[] = [];               // what you can say in the Kabine this half-time
let spoken: Record<Side, Said | null> | null = null;   // what both benches said, once you have
let gap: Gap | null = null;                // v0.27: the Zeitraffer on screen

// one pending transition at a time, pausable
let pending: { fn: () => void; due: number; total: number; remaining: number } | null = null;
let timeout: ReturnType<typeof setTimeout> | null = null;

function schedule(ms: number, fn: () => void): void {
  if (timeout) clearTimeout(timeout);
  pending = { fn, due: performance.now() + ms, total: ms, remaining: ms };
  timeout = setTimeout(() => { timeout = null; pending = null; fn(); }, ms);
}

/** Cut the rest of the panel short. The bar keeps its scale, so the clock visibly leaps forward. */
function hurry(ms: number): void {
  if (!pending || paused) return;
  if (pending.due - performance.now() <= ms) return;
  const p = pending;
  if (timeout) clearTimeout(timeout);
  p.due = performance.now() + ms;
  p.remaining = ms;
  timeout = setTimeout(() => { timeout = null; pending = null; p.fn(); }, ms);
  document.getElementById('bar')?.classList.add('hurry');
}

/** Skip the rest of the reveal (or the Zeitraffer): run the pending transition now. */
function skipReveal(): void {
  if ((phase !== 'reveal' && phase !== 'gap') || !pending || paused) return;
  if (timeout) clearTimeout(timeout);
  const fn = pending.fn;
  timeout = null; pending = null;
  fn();
}

function togglePause(): void {
  if (!pending) return;
  paused = !paused;
  if (paused) {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    pending.remaining = Math.max(0, pending.due - performance.now());
  } else {
    const p = pending;
    p.due = performance.now() + p.remaining;
    timeout = setTimeout(() => { timeout = null; pending = null; p.fn(); }, p.remaining);
  }
  // no re-render: that would restart the reveal's animations. Just the button and the hand lock.
  const btn = app.querySelector<HTMLElement>('[data-action="pause"]');
  if (btn) { btn.textContent = paused ? '▶' : '⏸'; btn.setAttribute('aria-label', paused ? 'Weiter' : 'Pause'); }
  const off = paused || phase !== 'live' || !!said;
  app.querySelector('.hand')?.classList.toggle('locked', off);
  app.querySelectorAll<HTMLButtonElement>('[data-skill],[data-pass]').forEach(b => { b.disabled = off || b.classList.contains('grey'); });
}

// ---- Flow ---------------------------------------------------------------

/**
 * Before kick-off: the draft. The first time a fresh one (from ?seed if given), after a match the one you
 * played with, so "Nochmal" is one tap away from the same eleven and the same skills.
 */
function openDraft(): void {
  seed = Number(Q.get('seed')) || Math.floor(Math.random() * 1e6);
  if (!draft) { const d = dealDraft(seed * 31 + 5); draft = d.draft; draftRng = d.rng; }
  phase = 'draft';
  info = null;
  render();
}

/** Anpfiff: your pick, the rival's (built around his tells), and the match. */
function kickOff(): void {
  if (!draft || !complete(draft)) return;
  const theirs = dealDraft(seed * 131 + 7, signature(RIVAL));
  match = newMatch({ ...TEAM_A, loadout: toLoadout(draft) }, { ...TEAM_B, loadout: toLoadout(theirs.draft) }, seed);
  rivalRng = seed * 7919 + 17;
  lastPanel = null;
  viewing = null;
  paused = false;
  showGap(match.gap);
}

/**
 * v0.27: the Zeitraffer. The clock runs from the last highlight to the next one, what happened off camera
 * comes up line by line, then the next headline — or the whistle. Then the highlight, the Kabine or the end.
 */
function showGap(g: Gap | null): void {
  if (!g) { goLive(); return; }
  phase = 'gap';
  gap = g;
  laid = { A: null, B: null };
  schedule(gapMs(g), afterGap);
  render();
}

function afterGap(): void {
  const g = gap;
  gap = null;
  if (g?.whistle === 'end' || match.over) { phase = 'over'; render(); return; }
  if (g?.whistle === 'halftime') { phase = 'halftime'; talks = talksFor(match, ME); spoken = null; render(); return; }
  goLive();
}

function goLive(): void {
  phase = 'live';
  laid = { A: null, B: null };
  said = null;
  dealt = true;
  const d = decide(match, THEM, RIVAL, rivalRng);
  rivalRng = d.rng;
  plan = { cardId: d.cardId, at: d.at };
  schedule(SCENE_MS, resolve);
  render();
}

function resolve(): void {
  if (plan.cardId && !laid[THEM]) laid = { ...laid, [THEM]: plan.cardId };   // a card planned for the last instant still counts
  const r = step(match, laid);
  match = r.state;
  lastPanel = r.panel;
  phase = 'reveal';
  schedule(REVEAL_MS, afterReveal);
  render();
}

/** Inside a highlight the next panel; at its end the Zeitraffer to the next one (or to the whistle). */
function afterReveal(): void {
  if (lastPanel?.closes) { showGap(match.gap); return; }
  goLive();
}

/** Out of the Kabine: the second half's own run from its kick-off to its first highlight. */
function secondHalf(): void {
  if (phase !== 'halftime' || !spoken) return;
  showGap(match.gap?.then ?? null);
}

/** You say one thing in the Kabine; the rival says his. The men carry it into the second half. */
function talk(i: number): void {
  const mine = talks[i];
  if (phase !== 'halftime' || spoken || !mine) return;
  const r = halftime(match, { [ME]: mine, [THEM]: rivalTalk(match, THEM, RIVAL) } as Record<Side, TalkOffer | null>);
  match = r.state;
  spoken = r.said;
  render();
}

/**
 * Use one of the three (its id), or none (null). Either ends the panel early; a skill flies to its chip in
 * the caption. A grey one does nothing.
 */
function use(id: string | null): void {
  if (phase !== 'live' || paused || said) return;
  if (id && whyNot(match, ME, id) !== null) return;
  if (id && match.teams[ME].banned > 0) return;
  const from = id ? app.querySelector<HTMLElement>(`.skill[data-skill="${id}"]`)?.getBoundingClientRect() : undefined;
  said = id ?? 'none';
  hovered = null;
  if (id) laid = { ...laid, [ME]: id };
  render();
  if (id && from) flyCard(id, from);
  // The rest of the panel is dead time once you have answered. tick() drops the rival's card on the
  // way past his moment, and resolve() gives him his planned card anyway if it never came.
  hurry(LAID_MS);
}

/** The rival's card goes face down into the caption partway through the panel. Called from tick(). */
function rivalLays(): void {
  laid = { ...laid, [THEM]: plan.cardId };
  const chip = app.querySelector('.laid.B');
  if (chip) chip.outerHTML = laidHtml(THEM, null, true);
  app.querySelectorAll('.bench .pile .back')[1]?.classList.add('gone');
}

document.addEventListener('keydown', e => {
  if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePause(); return; }
  if (e.key === 'Escape' && help) { toggleHelp(); return; }
  if (e.key === 'Escape' && viewing) { viewing = null; render(); return; }
  if (help) return;
  if (phase === 'halftime') {
    if (!spoken && /^[1-9]$/.test(e.key)) talk(Number(e.key) - 1);
    else if (spoken && e.key === 'Enter') secondHalf();
    return;
  }
  if (phase === 'draft') { if (e.key === 'Enter') kickOff(); return; }
  if (e.key === 'Enter') { skipReveal(); return; }
  if (/^[1-9]$/.test(e.key)) { const id = skillsFor(match, ME)[Number(e.key) - 1]; if (id) use(id); }
  if (e.key === 'n' || e.key === '0') use(null);
});

// ---- Render -------------------------------------------------------------

const h = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const card = (id: string) => cardById.get(id) as Card;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The stage: the men in the picture as big figures. SVH always on the left, RWK always on the right —
 * the same as the chips in the caption and the pitch, where SVH plays to the right — each side under its
 * name, the ball beside whoever has it. Under each man the trait that fires here — both benches see the
 * same picture. On the reveal the actor lights up.
 */
/** The full name with the nickname slotted in after the first name: Rainer „Opa" Ludwig. Plain when they match. */
function shownName(pl: Scene['cast'][number]['player']): string {
  const [first, ...rest] = pl.name.split(' ');
  return pl.short === first ? pl.name : [first, `„${pl.short}“`, ...rest].join(' ');
}

/**
 * How a side's men look: sweat when the legs are gone, fire when the heads are up, chins down when they
 * hang. A resolved panel shows them as they were after it, the live one as they are now.
 */
function looks(side: Side, p: Panel | null): string {
  const lv = p?.levels?.[side] ?? match.teams[side].shown;
  const puste = GAUGES.includes('puste') ? lv.puste : 'mittel';
  const moral = GAUGES.includes('moral') ? lv.moral : 'mittel';
  return [puste === 'tief' ? 'platt' : '', moral === 'hoch' ? 'heiss' : moral === 'tief' ? 'down' : ''].join(' ');
}

/**
 * One gauge as a bar: its name, how full it is, the two marks where its word changes, and the word.
 * `delta` is what the card on offer would do to it: the part it costs is striped red on the bar, the
 * part it gives striped green. `mini` is the rival's: icon and bar only, the rest in the tooltip.
 */
function meterHtml(side: Side, g: Gauge, delta = 0, mini = false): string {
  const v = match.teams[side].gauges[g];
  const lv = match.teams[side].shown[g];
  const after = Math.min(1, Math.max(0, v + delta));
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const change = delta < 0
    ? `<i class="pay" style="left:${pct(after)};width:${pct(v - after)}"></i>`
    : delta > 0 ? `<i class="give" style="left:${pct(v)};width:${pct(after - v)}"></i>` : '';
  const tip = `${GAUGE_LABEL[g]}: ${WORDS[g][lv]}. ${GAUGE_HELP[g]}`;
  return `<div class="meter ${g} ${lv} ${mini ? 'mini' : ''}" title="${h(tip)}">
    <span class="name">${GAUGE_ICON[g]}${mini ? '' : `<em> ${GAUGE_LABEL[g]}</em>`}</span>
    <span class="track"><i class="fill" style="width:${pct(delta < 0 ? after : v)}"></i>${change}${CUTS[g].map(c => `<b style="left:${pct(c)}"></b>`).join('')}</span>
    ${mini ? '' : `<span class="word">${h(WORDS[g][lv])}</span>`}
  </div>`;
}

/** What the skill under the pointer (or the one you used) would do to your form, while the panel is live. */
function pendingCost(): Partial<Record<Gauge, number>> {
  const id = said && said !== 'none' ? said : !said ? hovered : null;
  if (phase !== 'live' || !id) return {};
  const cost = costOf(card(id));
  return Object.fromEntries(GAUGES.map(g => [g, -(cost[g] ?? 0)]));
}

/** Your form, under the score: three labelled bars and a ? that says what they mean. */
function formBoardHtml(): string {
  const d = pendingCost();
  return `<div class="formboard">
    ${GAUGES.map(g => meterHtml(ME, g, d[g] ?? 0)).join('')}
    <button class="help" data-action="help" title="Was heißt das?" aria-label="Was heißt das?">?</button>
  </div>`;
}

/** The ? overlay: the three gauges in one line each, and how cards pay into them. */
function helpHtml(): string {
  return `<div class="overlay" data-close-help="1"><div class="box help">
    <h2>Die Form deiner Mannschaft</h2>
    ${GAUGES.map(g => `<div class="helpline">${meterHtml(ME, g)}<p>${h(GAUGE_HELP[g])}</p></div>`).join('')}
    <p class="rule"><b>Alles hat seinen Preis.</b> ${GAUGES.includes('puste') ? 'Ein Zuruf kostet Puste, ein' : 'Ein Zuruf kostet nichts, ein'} Ereignis oder ein Drama die Gunst des Fußballgotts. Was viel bewegt, kostet viel; was wenig bewegt, fast nichts. Manche kosten Moral statt Puste, manche geben etwas zurück. Was etwas kostet, steht darunter; zeigst du darauf, blinkt auf dem Balken, wie viel davon weggeht.</p>
    <p class="rule"><b>Die Striche</b> auf den Balken sind die Grenzen: darüber frisch / heiß / lächelt, darunter platt / Köpfe hängen / schaut weg.</p>
    <p class="rule">Drüben geht es ${h(RIVAL.name)} genauso: seine Balken stehen oben rechts.</p>
    <div class="row"><button data-close-help="1">Verstanden</button></div>
  </div></div>`;
}

function toggleHelp(): void {
  help = !help;
  if (help && !paused && pending) { togglePause(); pausedForHelp = true; }
  if (!help && pausedForHelp) { pausedForHelp = false; if (paused) togglePause(); }
  render();
}

function stageHtml(scene: Scene, p: Panel | null): string {
  const fires = triggers(scene);
  const fig = (m: Scene['cast'][number]) => {
    const mine = fires.filter(f => f.member === m);
    const quiet = m.player.traits.filter(t => !mine.some(f => f.trait.id === t)).map(t => traitById.get(t)?.label ?? t);
    const isActor = p?.actor?.player.name === m.player.name;
    return `
    <div class="fig ${m.side} ${looks(m.side, p)} ${isActor ? 'actor' : p ? 'extra' : ''}">
      <div class="face" title="${ROLE_LABEL[m.player.role]}">${ROLE_SHORT[m.player.role]}</div>
      <div class="txt">
        <b>${h(shownName(m.player))}</b>
        ${quiet.length ? `<small>${h(quiet.join(', '))}</small>` : ''}
        ${mine.map(f => `<em class="fires">⚡ ${h(firesLine(f))}</em>`).join('')}
      </div>
    </div>`;
  };
  const group = (side: Side) => `<div class="group ${side}">
      <div class="team ${side}">${side === scene.side ? '<i>⚽</i>' : ''}${h(TEAM[side].short)}</div>
      ${scene.cast.filter(m => m.side === side).map(fig).join('')}
    </div>`;
  return `<div class="stage">${group('A')}<div class="vs">${p ? '' : 'vs'}</div>${group('B')}</div>`;
}

/** The panel's word: bursts in beside the men once the picture is resolved. */
function wordHtml(scene: Scene, p: Panel): string {
  return `<div class="word ${p.goal ? 'goal' : ''} ${p.nextSide !== scene.side ? 'flip' : ''}"><span>${h(p.word)}</span></div>`;
}

/** A face-down card: what the other bench sees. */
const backHtml = (side: Side, cls = '') => `<div class="back ${side} ${cls}"><span>${h(TEAM[side].short)}</span></div>`;

/**
 * What a bench laid this panel, as a small chip in the title caption (v0.17): ours face up, theirs face
 * down until the reveal. Nothing laid, nothing shown — and no word on whether it worked.
 */
function laidHtml(side: Side, p: Panel | null, live: boolean): string {
  const id = live ? laid[side] : p?.laid[side] ?? null;
  if (!id) return `<span class="laid ${side} none"></span>`;
  if (live && side !== ME) return `<span class="laid ${side} down">${backHtml(side)}</span>`;
  return `<span class="laid ${side}"><i>${ART[id] ?? '🃏'}</i>${h(card(id).name)}</span>`;
}

/**
 * The panel's first read (v0.14): which of the three situations this is, and whose. The same situation
 * mirrored for the other bench — their ball action, their challenge, their set piece — in their colour.
 */
function situationHtml(scene: Scene, p: Panel | null, live: boolean): string {
  const who = scene.side === ME ? 'wir am Ball' : `${TEAM[scene.side].short} am Ball`;
  return `<div class="sitline"><span class="sit ${scene.side} ${scene.situation}">${SITUATION_LABEL[scene.situation]}</span><span class="who ${scene.side}">${h(who)}</span>${laidHtml('A', p, live)}${laidHtml('B', p, live)}</div>`;
}

/** v0.27: which highlight this is: its minute and its headline, over the situation badge. */
function kickerHtml(minute: number, half: 1 | 2, title: string): string {
  return `<p class="kicker"><b>${h(minuteLabel(minute, half))}</b> ${h(title)}</p>`;
}

/** v0.25: why this panel is here, when the clock says so: "Nachspielzeit", "Letzte Minute". */
function noteHtml(scene: Scene): string {
  return scene.note ? `<p class="note">⏱ ${h(scene.note)}</p>` : '';
}

function causeHtml(p: Panel | null): string {
  if (!p?.cause || p.closes) return '<p class="cause"></p>';
  return `<p class="cause ${p.cause.side}">wegen <b>${h(card(p.cause.cardId).name)}</b> (${h(TEAM[p.cause.side].short)})</p>`;
}

/**
 * The panel is drawn on the pitch (v0.16): the grass and chalk fill it, the title and the text sit on
 * it as comic captions, and the men stand on the field beside the mark (placeStages). The captions go
 * to whichever end the ball is not at — top when it is in the lower half, bottom when it is up high —
 * and the mark lies over everything, so nothing ever hides where the ball is.
 */
function livePanelHtml(): string {
  const scene = match.scene;
  const prev = lastPanel && nextOf(lastPanel) ? lastPanel.scene : null;
  const pitch = pitchLayers(scene, prev, null, null, TEAM, TALL.matches);
  return `<div class="frame"><div class="panel live ${scene.situation} ${pitch.low ? 'low' : 'high'}">
    ${pitch.back}
    <div class="bar"><i id="bar"></i></div>
    <div class="head">${kickerHtml(match.minute, match.half, match.title)}${situationHtml(scene, null, true)}<h2>${h(scene.label)}</h2><p class="where">${h(pitch.where)}</p>${causeHtml(lastPanel)}${noteHtml(scene)}</div>
    <div class="field">${stageHtml(scene, null)}</div>
    <div class="say"><p class="prompt">${h(fmt(scene.prompt, scene))}</p></div>
    ${pitch.front}
  </div></div>`;
}

/**
 * v0.27: the Zeitraffer. Fast-forward over the pitch: the clock runs from the last highlight to the next,
 * what happened off camera comes up line by line, and then the next headline — "Konter RWK", "Ecke für
 * SVH" — or the whistle. The clock is driven from tick(); the lines by CSS delays, in GAP_BEAT steps.
 */
function gapHtml(g: Gap): string {
  const beat = (i: number) => `style="animation-delay:${(GAP_BEAT * (2 + 3 * i)) / 1000}s"`;
  const lines = [
    ...g.lines.map(l => `<li>${h(l)}</li>`),
    ...g.shifts.map(x => `<li class="shift ${x.side} ${x.gauge} ${x.level}">${GAUGE_ICON[x.gauge]} ${h(x.line)}</li>`),
  ];
  const n = lines.length;
  const whistle = g.whistle === 'halftime' ? 'Halbzeitpfiff' : g.whistle === 'end' ? 'Abpfiff' : null;
  const next = whistle
    ? `<div class="next whistle" ${beat(n)}>${whistle}</div>`
    : `<div class="next" ${beat(n)}><b>${h(minuteLabel(g.to, g.half))}</b> ${h(g.title)}</div>`;
  return `<div class="frame"><div class="panel gap" data-skip="1" title="Weiter: Klick oder Enter">
    <div class="bar"><i id="bar"></i></div>
    <div class="ffwd">⏩ Zeitraffer</div>
    <div class="clockface" id="gapclock">${h(minuteLabel(g.from, g.half))}</div>
    <ul class="gaplines">${lines.map((l, i) => l.replace('<li', `<li ${beat(i)}`)).join('')}</ul>
    ${next}
  </div></div>`;
}

/** "Zweikampf: " in front of the next panel's title, unless the title already says it (Ecke, Freistoß…). */
function nextSituation(p: Panel): string {
  const t = sceneById.get(p.next);
  return t && (t.id === 'play' || t.id === 'duel') ? `${SITUATION_LABEL[t.situation]} ` : '';
}

/**
 * The scene a panel led to, if the ball really ran there: not after a goal (kick-off) and not out of
 * its highlight (v0.27: the next panel on screen is minutes later, somewhere else). Drawn as the run out of the resolved panel and the run into the next one.
 */
function nextOf(p: Panel): Scene | null {
  if (p.goal || p.closes) return null;
  const after = match.strip[p.n];
  if (after) return after.hl === p.hl ? after.scene : null;
  return p === lastPanel && !match.over && match.hl === p.hl ? match.scene : null;
}

function resolvedPanelHtml(p: Panel, withBar: boolean): string {
  const lines = p.lines.map(l => `<li class="${l === p.what ? 'what' : 'bycard'}">${h(l)}</li>`);
  for (const x of p.shifts) lines.push(`<li class="shift ${x.side} ${x.gauge} ${x.level}">${GAUGE_ICON[x.gauge]} ${h(x.line)}</li>`);
  for (const side of p.banned) lines.push(`<li class="banned">🟥 Trainer ${h(TEAM[side].short)} auf die Tribüne. ${plural(K.banPanels, 'Bild', 'Bilder')} lang keine Karten.</li>`);
  const flip = p.nextSide !== p.scene.side;
  const next = p.goal
    ? `<span class="chip goal">⚽ TOR für ${h(TEAM[p.goal].name)}</span>`
    : p.closes ? `<span class="chip over">⏩ Szene vorbei</span>`
    : `${flip ? `<span class="chip flip ${p.nextSide}">Ballwechsel</span>` : ''}<span class="chip next ${p.nextSide}">→ ${h(nextSituation(p))}${h(p.nextLabel)} · ${h(TEAM[p.nextSide].short)} am Ball</span>`;
  const pitch = pitchLayers(p.scene, null, p, nextOf(p), TEAM, TALL.matches);
  return `<div class="frame"><div class="panel reveal ${p.goal ? 'scored' : ''} ${pitch.low ? 'low' : 'high'}" ${withBar ? 'data-skip="1" title="Weiter: Klick oder Enter"' : ''}>
    ${pitch.back}
    ${withBar ? '<div class="bar"><i id="bar"></i></div>' : ''}
    <div class="head">${kickerHtml(p.minute, p.half, p.title)}${situationHtml(p.scene, p, false)}<h2>${h(p.scene.label)}</h2><p class="where">${h(pitch.where)}${pitch.to ? ` → <b>${h(pitch.to)}</b>` : ''}</p>${noteHtml(p.scene)}</div>
    <div class="field">${stageHtml(p.scene, p)}</div>
    <div class="say">${wordHtml(p.scene, p)}<div class="talk"><ul class="lines">${lines.join('')}</ul>
      <p class="after">${next}</p></div></div>
    ${pitch.front}
  </div></div>`;
}

/** What using a skill costs, in words at its foot: "Kostet 💨 Puste · gibt 💪 Moral". How much, the bar shows. */
function priceHtml(c: Card): string {
  const cost = costOf(c);
  const pays = GAUGES.filter(g => (cost[g] ?? 0) > 0).map(g => `<span class="pay">${GAUGE_ICON[g]} ${GAUGE_LABEL[g]}</span>`);
  const gives = GAUGES.filter(g => (cost[g] ?? 0) < 0).map(g => `<span class="give">${GAUGE_ICON[g]} ${GAUGE_LABEL[g]}</span>`);
  const parts = [pays.length ? `Kostet ${pays.join(' + ')}` : 'Kostet nichts', gives.length ? `gibt ${gives.join(' + ')}` : ''].filter(Boolean);
  return `<div class="price">${parts.join(' · ')}</div>`;
}

/**
 * One skill under the panel: key, glyph, name, its line, its price. Nothing says what it does (v0.10);
 * grey when it cannot be used here, with a word when that is not just the picture (used up, no Gunst).
 */
function skillHtml(id: string, key: number, why: WhyNot | null | 'off', state: '' | 'used' | 'unused'): string {
  const c = card(id);
  const grey = why !== null && why !== 'off';
  const off = why !== null;
  const note = grey ? WHY_LABEL[why as WhyNot] : '';
  return `<button class="skill ${c.kind} ${grey ? 'grey' : ''} ${state}" data-skill="${id}" ${off ? 'disabled' : ''}>
      <kbd>${key}</kbd>
      <span class="art">${ART[id] ?? '•'}</span>
      <b>${h(c.name)}</b>
      <p>${h(c.text)}</p>
      ${note ? `<em class="why">${h(note)}</em>` : priceHtml(c)}
    </button>`;
}

/**
 * Your three for the situation on screen (v0.26): with or without the ball, ball action, challenge or set
 * piece, as picked before kick-off. Use one, or say nothing. On the reveal the one you used stays lit.
 * v0.27: `preview` in the Zeitraffer: the three for the scene the next highlight opens with, locked, so
 * the coach can think while the clock runs.
 */
function skillsHtml(preview = false): string {
  const team = match.teams[ME];
  const live = phase === 'live';
  const p = live || preview ? null : lastPanel;
  const scene = p?.scene ?? match.scene;
  const pile = pileFor(scene, ME);
  const deal = dealt;
  dealt = false;                             // the three slide in once per panel, not on every render
  if (team.banned > 0 && live) return `<div class="hand noball mute locked"><div class="banned">Du sitzt auf der Tribüne. Noch ${plural(team.banned, 'Bild', 'Bilder')}.</div></div>`;
  const label = `${SITUATION_LABEL[scene.situation]} · ${PILE_LABEL[pile]}`;
  const ids = team.loadout[slotFor(scene, ME)];
  const used = live ? (said && said !== 'none' ? said : null) : p?.laid[ME] ?? null;
  const answered = live ? !!said : true;
  const whyOf = (id: string): WhyNot | null | 'off' => {
    if (preview) return whyNot(match, ME, id) ?? 'off';
    if (live) return whyNot(match, ME, id) ?? (paused || said ? 'off' : null);
    return p?.usable[ME].includes(id) ? 'off' : 'here';
  };
  const anyUsable = live || preview ? ids.some(id => whyNot(match, ME, id) === null) : !!p?.usable[ME].length;
  const stateOf = (id: string) => (preview || !answered ? '' : id === used ? 'used' : 'unused');
  const passLabel = preview ? 'Gleich geht’s los' : !anyUsable ? 'Zuschauen' : live && said === 'none' ? 'Nichts gesagt' : 'Nichts sagen';
  const off = !live || paused || !!said;
  return `<div class="hand skills ${pile} ${off ? 'locked' : ''} ${deal ? 'dealt' : ''} ${anyUsable ? '' : 'quiet'} ${preview ? 'preview' : ''}">
    <span class="label">${preview ? 'Gleich: ' : ''}${h(label)}</span>
    <div class="three">${ids.map((id, i) => skillHtml(id, i + 1, whyOf(id), stateOf(id))).join('')}</div>
    <button class="pass ${live && said === 'none' ? 'used' : ''}" data-pass="1" ${off ? 'disabled' : ''} title="Läuft die Zeit ab: nichts gesagt.">${passLabel} <kbd>N</kbd></button>
  </div>`;
}

/**
 * The other bench: the rival, and his three for this situation as backs — one leaves when he uses it. His
 * tells are not written here; read him.
 */
function benchHtml(): string {
  const team = match.teams[THEM];
  const live = phase === 'live';
  const n = live ? skillsFor(match, THEM).length : 0;
  const backs = team.banned > 0
    ? `<span class="banned">🟥 auf der Tribüne, noch ${plural(team.banned, 'Bild', 'Bilder')}</span>`
    : `<span class="pile ${n ? 'open' : 'shut'}">${Array.from({ length: n || PER_SLOT }, (_, i) => backHtml(THEM, laid[THEM] && i === 1 ? 'gone' : '')).join('')}</span>`;
  return `<div class="bench" title="${h(RIVAL.text)}">
    <div class="coach"><b>${h(RIVAL.name)}</b> <small>${h(RIVAL.nick)}</small><div class="rivalform">${GAUGES.map(g => meterHtml(THEM, g, 0, true)).join('')}</div></div>
    <div class="backs">${backs}</div>
  </div>`;
}

function stripHtml(): string {
  const thumbs = match.strip.map(p => {
    const first = p.n === 1 || match.strip[p.n - 2]?.hl !== p.hl;
    const tag = first ? `<div class="thumb min ${p.scene.side}" title="${h(p.title)}"><b>${h(minuteLabel(p.minute, p.half))}</b><small>${h(p.title)}</small></div>` : '';
    const marks = SIDES.map(s => (p.laid[s] ? '●' : '·')).join('');
    const tip = SIDES.filter(s => p.laid[s]).map(s => `${TEAM[s].short}: ${card(p.laid[s] as string).name}`).concat(p.lines).join(' · ');
    return tag + `<div class="thumb ${p.scene.side} ${p.goal ? 'scored' : ''}" data-panel="${p.n}" title="${h(tip)}">
      ${pitchMini(p.scene, p.goal)}<span class="n">${p.n}</span><b>${h(p.word)}</b><small>${h(SITUATION_LABEL[p.scene.situation])}</small>
      <span class="cards">${marks}</span>
    </div>` + (p.half === 1 && (match.strip[p.n]?.half === 2 || (!match.strip[p.n] && match.half === 2)) ? `<div class="thumb ht">Halb-<br>zeit</div>` : '');
  });
  return `<div class="strip">${thumbs.join('') || '<div class="thumb ht">Anpfiff</div>'}</div>`;
}

/**
 * The Kabine: tea, orange slices, and one thing to say. Before you speak, the menu the half gave you —
 * each talk is only what the coach says, never what it does (like a card). After, what it looked like,
 * what came through the wall from the other Kabine, and the kick-off.
 */
function kabineHtml(): string {
  if (!spoken) {
    return `<h3 class="kabine">In der Kabine. Tee, Orangenschnitze. Alle schauen dich an.</h3>
    <div class="talks">${talks.map((t, i) => `<button class="talk ${t.talk}" data-talk="${i}">
      <small>${h(t.label)} <kbd>${i + 1}</kbd></small><span>${h(t.say)}</span></button>`).join('')}</div>`;
  }
  const mine = spoken[ME];
  const theirs = spoken[THEM];
  return `<div class="said">
      ${mine ? `<p class="quote">${h(mine.offer.say)}</p><p>${h(mine.react)}</p>` : ''}
      ${theirs ? `<p class="wall">🚪 ${h(theirs.heard)}</p>` : ''}
    </div>
    <div class="row"><button data-action="second">Anpfiff 2. Halbzeit <kbd>⏎</kbd></button></div>`;
}

function overlayHtml(): string {
  const score = `${h(TEAM_A.name)} ${match.score.A} : ${match.score.B} ${h(TEAM_B.name)}`;
  if (viewing) return `<div class="overlay" data-close="1"><div class="box wide">${resolvedPanelHtml(viewing, false)}<div class="row"><button data-close="1">Zurück</button></div></div></div>`;
  if (phase === 'halftime') return `<div class="overlay"><div class="box">${stripHtml()}
    <h2>Halbzeit</h2><p>${score}</p>
    ${kabineHtml()}</div></div>`;
  if (phase === 'over') {
    const d = match.score.A - match.score.B;
    const word = d > 0 ? 'Gewonnen. Die Bierbank steht.' : d < 0 ? `Verloren. ${h(RIVAL.name)} grinst.` : 'Unentschieden. Keiner ist zufrieden.';
    return `<div class="overlay"><div class="box">${stripHtml()}
    <h2>Abpfiff</h2><p>${score}</p><p>${word}</p>
    <p>${plural(new Set(match.strip.map(p => p.hl)).size, 'Szene', 'Szenen')}, ${match.strip.length} Bilder. Eingesetzt: du ${match.teams.A.played.length}, ${h(RIVAL.name)} ${match.teams.B.played.length}.</p>
    <div class="row"><button data-action="restart">Nochmal</button><button data-action="redraft">Neu aufstellen</button></div></div></div>`;
  }
  return '';
}

/** The situations as the draft names them, with the ball first. */
const SLOT_LABEL = (slot: Slot) => {
  const [pile, sit] = slot.split(':') as [CardSide, Situation];
  return { pile, sit: SITUATION_LABEL[sit] };
};

/**
 * Before kick-off (v0.26): for each of the six situations a short list of skills, three of it picked. Tap
 * to put one back, tap another to take it; ↻ deals the rest of a list again. The numbers on the picked ones
 * are the keys they will have in the match. Nothing says what a skill does — the name does.
 */
function draftHtml(): string {
  const d = draft as Draft;
  const row = (slot: Slot) => {
    const { sit } = SLOT_LABEL(slot);
    const { choices, picked } = d[slot];
    return `<div class="draftrow">
      <div class="sitname"><b>${h(sit)}</b><small>${picked.length}/${PER_SLOT}</small><button class="redeal" data-redeal="${slot}" title="Die anderen neu mischen" aria-label="Neu mischen">↻</button></div>
      <div class="choices">${choices.map(id => {
        const c = card(id);
        const at = picked.indexOf(id);
        const no = cannotPick(d, slot, id);
        return `<button class="pick ${c.kind} ${at >= 0 ? 'on' : no ? 'no' : ''}" data-pick="${slot}|${id}" title="${h(`${c.text} (${KIND_LABEL[c.kind]})`)}">
          ${at >= 0 ? `<kbd>${at + 1}</kbd>` : ''}<span class="art">${ART[id] ?? '•'}</span><b>${h(c.name)}</b></button>`;
      }).join('')}</div>
    </div>`;
  };
  const group = (pile: CardSide) => `<section class="draftgroup ${pile}"><h3>${PILE_LABEL[pile]}</h3>${SLOTS.filter(s => s.startsWith(pile)).map(row).join('')}</section>`;
  const c = info ? card(info) : null;
  const ready = complete(d);
  return `<div class="draft">
    <header>
      <h1>Vor dem Anpfiff</h1>
      <p>Such dir für jede Situation <b>drei</b> Sachen aus, die du draufhast. Im Spiel stehen in jeder Situation genau diese drei unter dem Bild: eine davon einsetzen, oder nichts sagen.</p>
      <p class="them">Drüben: <b>${h(RIVAL.name)}</b>, ${h(RIVAL.nick)}. ${h(RIVAL.text)}</p>
      <p class="them"><a href="./heilige.html">Spielidee ausprobieren: Die Heiligen →</a></p>
    </header>
    ${group('ball')}${group('noball')}
    <footer>
      <div class="info">${c ? `<span class="art">${ART[c.id] ?? '•'}</span><div><b>${h(c.name)}</b> <em>${KIND_LABEL[c.kind]}</em><p>${h(c.text)}</p>${priceHtml(c)}</div>` : '<p class="hint">Tipp eine an, um sie zu sehen. Drama geht nur einmal pro Spiel.</p>'}</div>
      <button class="go" data-action="kickoff" ${ready ? '' : 'disabled'}>${ready ? 'Anpfiff' : 'Noch nicht komplett'} <kbd>⏎</kbd></button>
    </footer>
  </div>`;
}

function render(): void {
  if (phase === 'draft') {
    app.classList.add('drafting');
    app.innerHTML = draftHtml();
    return;
  }
  app.classList.remove('drafting');
  // behind the Kabine and the final whistle lies the last panel played, not the next one
  const shown = (phase === 'reveal' || phase === 'halftime' || phase === 'over') && lastPanel ? lastPanel : null;
  const inGap = phase === 'gap' && gap;
  const minute = shown ? shown.minute : inGap ? gap!.from : match.minute;
  const half = shown ? shown.half : inGap ? gap!.half : match.half;
  const extra = minute > (half === 1 ? 45 : 90);
  const hl = shown ? shown.hl : match.hl;
  app.innerHTML = `
    <div class="top">
      <div class="tally">
        <div class="score ${shown?.goal ? 'scored' : ''}"><span class="A">${h(TEAM_A.short)}</span> ${match.score.A} : ${match.score.B} <span class="B">${h(TEAM_B.short)}</span></div>
        <div class="clock ${extra ? 'extra' : ''}"><b id="minute">${phase === 'halftime' ? 'Halbzeit' : phase === 'over' ? 'Abpfiff' : h(minuteLabel(minute, half))}</b>${phase === 'halftime' || phase === 'over' ? '' : ` · ${half}. HZ${inGap ? ' · Zeitraffer' : ` · Szene ${hl}`}`}</div>
      </div>
      ${benchHtml()}
      <button class="pause" data-action="pause" title="Pause (Leertaste)" aria-label="${paused ? 'Weiter' : 'Pause'}">${paused ? '▶' : '⏸'}</button>
    </div>
    ${formBoardHtml()}
    ${inGap ? gapHtml(gap as Gap) : shown ? resolvedPanelHtml(shown, phase === 'reveal') : livePanelHtml()}
    ${inGap ? (gap!.whistle || match.teams[ME].banned > 0 ? '<div class="hand skills quiet locked gapwait"></div>' : skillsHtml(true)) : skillsHtml()}
    ${help ? helpHtml() : overlayHtml()}
  `;
  placeStages();
}

/**
 * Stand the men on the pitch beside the mark: just above it if there is room, else just below, kept
 * inside the free field between the title and the text. On a phone the men take the full width, so
 * only the height moves — and on a standing pitch the height is the one that matters: how deep we are.
 */
function placeStages(): void {
  app.querySelectorAll<HTMLElement>('.panel').forEach(panel => {
    const field = panel.querySelector<HTMLElement>('.field');
    const stage = field?.querySelector<HTMLElement>('.stage');
    const dot = panel.querySelector('.pitch.over .anchor');   // the scene's place, wherever the ball runs to
    if (!field || !stage || !dot) return;
    const f = field.getBoundingClientRect();
    const d = dot.getBoundingClientRect();
    const sh = stage.offsetHeight, sw = stage.offsetWidth;
    const y = d.top + d.height / 2 - f.top;
    const x = d.left + d.width / 2 - f.left;
    const gap = 26;                          // clear of the ping around the mark
    const room = Math.max(0, f.height - sh);
    const top = y - gap - sh >= 0 ? y - gap - sh : y + gap;
    stage.style.top = `${Math.round(Math.min(room, Math.max(0, top)))}px`;
    stage.style.left = `${Math.round(Math.min(Math.max(0, f.width - sw), Math.max(0, x - sw / 2)))}px`;
  });
}

addEventListener('resize', placeStages);
TALL.addEventListener('change', () => { if (match) render(); });

app.addEventListener('click', e => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-skill],[data-pass],[data-pick],[data-redeal],[data-panel],[data-action],[data-close],[data-skip],[data-talk],[data-close-help]');
  if (!el) return;
  if (el.dataset.pick && draft) {
    const [slot, id] = el.dataset.pick.split('|') as [Slot, string];
    draft = toggle(draft, slot, id);
    info = id;
    render();
    return;
  }
  if (el.dataset.redeal && draft) {
    const r = redeal(draft, el.dataset.redeal as Slot, draftRng);
    draft = r.draft; draftRng = r.rng;
    render();
    return;
  }
  if (el.dataset.skill) { use(el.dataset.skill); return; }
  if (el.dataset.pass) { use(null); return; }
  if (el.dataset.closeHelp) { if (el === e.target || el.tagName === 'BUTTON') toggleHelp(); return; }
  if (el.dataset.talk) { talk(Number(el.dataset.talk)); return; }
  if (el.dataset.skip) { skipReveal(); return; }
  if (el.dataset.panel) { viewing = match.strip[Number(el.dataset.panel) - 1] ?? null; render(); return; }
  if (el.dataset.close) { if (el === e.target || el.tagName === 'BUTTON') { viewing = null; render(); } return; }
  if (el.dataset.action === 'pause') togglePause();
  if (el.dataset.action === 'help') toggleHelp();
  if (el.dataset.action === 'second') secondHalf();
  if (el.dataset.action === 'restart') { seed = Math.floor(Math.random() * 1e6); kickOff(); }
  if (el.dataset.action === 'redraft') openDraft();
  if (el.dataset.action === 'kickoff') kickOff();
});

/** Hovering a usable skill shows its price on your bars; only the bars re-render. */
app.addEventListener('pointerover', e => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('.skill');
  const id = el && !el.classList.contains('grey') ? el.dataset.skill ?? null : null;
  if (id === hovered || phase !== 'live' || said) return;
  hovered = id;
  const board = app.querySelector('.formboard');
  if (board) board.outerHTML = formBoardHtml();
});

/** A used skill flies from under the panel to its chip in the caption: a clone on top of everything, one transition. */
function flyCard(cardId: string, from: DOMRect): void {
  const to = app.querySelector<HTMLElement>('.laid.A')?.getBoundingClientRect();
  if (!to) return;
  const ghost = document.createElement('div');
  ghost.className = `skill ${card(cardId).kind} ghost`;
  ghost.innerHTML = `<span class="art">${ART[cardId] ?? '•'}</span><b>${h(card(cardId).name)}</b>`;
  Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  requestAnimationFrame(() => { ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${to.width / from.width}) rotate(-4deg)`; ghost.style.opacity = '0.2'; });
  setTimeout(() => ghost.remove(), 420);
}

/** The Zeitraffer's clock: it runs through the minutes over the first part of the gap, then stands. */
function runClock(g: Gap, t: number): void {
  const m = Math.round(g.from + (g.to - g.from) * Math.min(1, t / 0.45));
  const label = m === g.from ? minuteLabel(g.from, g.half) : minuteLabel(m, g.half);
  for (const id of ['gapclock', 'minute']) {
    const el = document.getElementById(id);
    if (el && el.textContent !== label) el.textContent = label;
  }
}

// the clock bar: no re-render, just width. The rival's card lands when its moment comes.
function tick(): void {
  const bar = document.getElementById('bar');
  if (bar && pending) {
    const left = paused ? pending.remaining : Math.max(0, pending.due - performance.now());
    bar.style.width = `${(100 * left) / pending.total}%`;
    if (phase === 'live' && plan.cardId && !laid[THEM] && 1 - left / pending.total >= plan.at) rivalLays();
    if (phase === 'gap' && gap) runClock(gap, 1 - left / pending.total);
  }
  requestAnimationFrame(tick);
}

openDraft();
requestAnimationFrame(tick);
