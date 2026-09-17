// Thin DOM layer over the engine. One render() from state; all game logic lives in src/engine.

import { BENCH_A, BENCH_B, DEFAULT_DECK, DEFAULT_PLAN, LINEUP_A, LINEUP_B, PLAN_LABEL, cardById, situationById } from '../engine/data';
import { fullTimeLine } from '../engine/commentary';
import { activeSpecial, actor, availableSubs, canPlay, computeOdds, createMatch, other, reduce, subTarget } from '../engine/match';
import { greedy } from '../engine/policy';
import type { MatchState, OddsRow, Plan, Player, Resolution, Role, Side, TeamSetup } from '../engine/types';
import { GOAL, ORIGIN, OVER } from '../engine/types';

const app = document.getElementById('app')!;

const SITUATION_SHORT: Record<string, string> = {
  build_up: 'Spielaufbau', midfield: 'Mittelfeld', flank: 'Flügel',
  through_on_goal: 'Allein vorm Tor', header: 'Kopfball', edge_shot: 'Distanzschuss', counter: 'Konter',
  penalty: 'Elfmeter', free_kick: 'Freistoß', corner: 'Ecke', long_ball: 'Langer Ball', cynical_foul: 'Foul',
  draw_foul: 'Foul gezogen', dive: 'Schwalbe', early_cross: 'Frühe Flanke', long_shot: 'Weitschuss',
  possession: 'Ballbesitz', trick_free_kick: 'Variante', offside_trap: 'Abseitsfalle', double_team: 'Gedoppelt',
  last_ditch: 'Grätsche', provoke: 'Provokation', square_ball: 'Querpass', press_build_up: 'Angelaufen',
  wall: 'Mauer', keeper_dance: 'Torwart tanzt',
  keeper_rushes_out: 'Torwart raus', crowded_box: 'Voller Sechzehner', trainer_tobt: 'Ausraster',
  dog_on_pitch: 'Waldi', floodlights: 'Flutlicht', no_whistle: 'Kein Pfiff', flag_up: 'Fahne',
  injury: 'Verletzung', bratwurst: 'Bratwurst', platzwart: 'Platzwart', maulwurf: 'Maulwurf', spaet_dran: 'Zu spät',
};

const ROLE_LABEL: Record<Role, string> = { keeper: 'Tor', defender: 'Abwehr', midfielder: 'Mittelfeld', winger: 'Flügel', striker: 'Sturm' };
const ROLES: Role[] = ['keeper', 'defender', 'midfielder', 'winger', 'striker'];

const AI_SIDE: Side = 'B';
const AI_DELAY = 2200;               // the human needs to read the new situation before the computer's move lands on it
const REVEAL_MS = 1100;
const BANNER_MS = 1400;              // "Angriff 3 von 12" between attacks

// ---- UI state (not game state) -----------------------------------------

let match: MatchState | null = null;
let selected: string | null = null;   // card id highlighted in hand
let revealing = false;                // "der Fußballgott würfelt…" moment before the outcome shows
let revealToken = 0;
let aiPending = false;
let showLineups = false;             // overlay with both squads, opened from the divider
let banner = false;                  // attack-change interstitial; nobody acts while it shows
let lastSituationKey = '';           // which situation was on screen last render — a new one animates in
let aiChoice: { cardId: string | null } | null = null;   // the computer has chosen but the human has not let the god roll yet
let trail: Resolution[] = [];        // every resolved situation of the current attack, oldest first

const setup = {
  seed: Math.floor(Math.random() * 1e6),
  ai: true,
  A: { name: 'SV Hintertupfingen 1921', favor: 5, motivation: 5, fitness: 5, plan: { ...DEFAULT_PLAN } as Plan },
  B: { name: 'TuS Oberdorf II', favor: 5, motivation: 5, fitness: 5, plan: { ...DEFAULT_PLAN } as Plan },
};

const isAi = (side: Side) => setup.ai && side === AI_SIDE;

// ---- helpers ------------------------------------------------------------

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const html = (strings: TemplateStringsArray, ...vals: unknown[]) =>
  strings.reduce((out, s, i) => out + s + (i < vals.length ? String(vals[i]) : ''), '');
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const cardName = (id: string | null) => (id ? cardById.get(id)!.name : null);
const withPlayer = (text: string, name: string) => esc(text).replace(/\{player\}/g, `<b>${esc(name)}</b>`);
const short = (id: string) => SITUATION_SHORT[id] ?? id.replace(/_/g, ' ');

function dispatch(action: Parameters<typeof reduce>[1]) {
  if (!match) return;
  const phaseBefore = match.phase, attackBefore = match.attackIndex;
  match = reduce(match, action);
  selected = null;
  aiChoice = null;
  if (match.phase === 'resolved' && phaseBefore === 'choose') { trail = [...trail, match.last!]; startReveal(); }
  if (match.attackIndex !== attackBefore) { trail = []; if (match.phase === 'choose') startBanner(); }
  render();
}

function startBanner() {
  banner = true;
  setTimeout(() => { banner = false; render(); }, BANNER_MS);
}

function startReveal() {
  revealing = true;
  const t = ++revealToken;
  setTimeout(() => { if (t === revealToken) { revealing = false; render(); } }, REVEAL_MS);
}

/** The computer thinks, then shows its choice. The roll waits for the human — see the "Würfeln lassen" button. */
function scheduleAi() {
  if (!match || aiPending || aiChoice || banner || match.phase !== 'choose' || !isAi(actor(match))) return;
  aiPending = true;
  setTimeout(() => {
    aiPending = false;
    if (!match || match.phase !== 'choose' || !isAi(actor(match))) return;
    aiChoice = { cardId: greedy(match) };
    render();
  }, AI_DELAY);
}

function rollAi() {
  if (!aiChoice) return;
  const c = aiChoice.cardId;
  dispatch(c ? { type: 'play', cardId: c } : { type: 'let_play' });
}

// ---- screens ------------------------------------------------------------

function renderSetup() {
  const team = (side: Side) => {
    const t = setup[side];
    const slider = (key: 'favor' | 'motivation' | 'fitness', label: string) => html`
      <label>${label}
        <span class="row"><input type="range" min="0" max="10" data-side="${side}" data-key="${key}" value="${t[key]}">
        <span class="val">${t[key]}</span></span>
      </label>`;
    const dial = (dial: 'tempo' | 'press', label: string, a: 'patient' | 'deep', b: 'direct' | 'high') => html`
      <label>${label}
        <span class="seg">
          <button type="button" class="${t.plan[dial] === a ? 'on' : ''}" data-side="${side}" data-dial="${dial}" data-value="${a}">${PLAN_LABEL[a]}</button>
          <button type="button" class="${t.plan[dial] === b ? 'on' : ''}" data-side="${side}" data-dial="${dial}" data-value="${b}">${PLAN_LABEL[b]}</button>
        </span>
      </label>`;
    return html`
      <div class="panel setup">
        <h2><i class="swatch ${side}"></i>Mannschaft ${side}${side === AI_SIDE && setup.ai ? ' · Computer' : ''}</h2>
        <label>Verein <input type="text" data-side="${side}" data-key="name" value="${esc(t.name)}"></label>
        ${dial('tempo', 'Tempo (im Angriff)', 'patient', 'direct')}
        ${dial('press', 'Pressing (in der Abwehr)', 'deep', 'high')}
        <details><summary>Platzhalter-Werte</summary>
        ${slider('favor', 'Gunst des Fußballgotts')}
        ${slider('motivation', 'Motivation')}
        ${slider('fitness', 'Fitness')}
        </details>
      </div>`;
  };
  app.innerHTML = html`
    <h1>Fußballgott</h1>
    <p class="lead">Kreisklasse B, Sonntag, 15 Uhr. Sechs Angriffe pro Seite. Du bist der Trainer: spielen lassen, einmal reinbrüllen oder wechseln — der Fußballgott würfelt, die Situation kippt, die andere Bank ist dran. Ballverlust heißt Konter. Rot bleibt Rot. Und ab und zu mischt sich der Fußballgott selbst ein: Hund, Bratwurst, Flutlicht.</p>
    ${team('A')}
    ${team('B')}
    <div class="panel setup">
      <label class="check"><input type="checkbox" id="ai" ${setup.ai ? 'checked' : ''}> Mannschaft B spielt der Computer</label>
      <label>Seed <input type="number" id="seed" value="${setup.seed}"></label>
    </div>
    <button id="start">Anpfiff</button>`;

  app.querySelectorAll<HTMLInputElement>('input[data-side]').forEach(inp => {
    inp.addEventListener('input', () => {
      const side = inp.dataset.side as Side, key = inp.dataset.key!;
      if (key === 'name') setup[side].name = inp.value;
      else {
        (setup[side] as unknown as Record<string, unknown>)[key] = Number(inp.value);
        inp.parentElement!.querySelector('.val')!.textContent = inp.value;
      }
    });
  });
  app.querySelectorAll<HTMLButtonElement>('button[data-dial]').forEach(b => b.addEventListener('click', () => {
    const side = b.dataset.side as Side;
    (setup[side].plan as unknown as Record<string, string>)[b.dataset.dial!] = b.dataset.value!;
    render();
  }));
  app.querySelector<HTMLInputElement>('#ai')!.addEventListener('change', e => {
    setup.ai = (e.target as HTMLInputElement).checked;
    render();
  });
  app.querySelector('#start')!.addEventListener('click', () => {
    setup.seed = Number((app.querySelector('#seed') as HTMLInputElement).value) || 0;
    const mk = (side: Side, lineup: Player[], bench: Player[]): TeamSetup => ({
      name: setup[side].name || `Mannschaft ${side}`,
      stats: { favor: setup[side].favor, motivation: setup[side].motivation, fitness: setup[side].fitness },
      plan: { ...setup[side].plan },
      lineup, bench, deck: DEFAULT_DECK,
    });
    match = createMatch(mk('A', LINEUP_A, BENCH_A), mk('B', LINEUP_B, BENCH_B), setup.seed);
    trail = []; aiChoice = null;
    startBanner();
    render();
  });
}

function oddsList(rows: OddsRow[], base: OddsRow[] | null, hit: OddsRow | null, player: string) {
  const baseBy = new Map((base ?? []).map(r => [r.label, r]));
  // rows the card took off the table stay visible, struck through
  const gone = (base ?? []).filter(b => !rows.some(r => r.label === b.label)).map(b => html`<li class="${b.side} gone">
      <span>${withPlayer(b.label, player)}</span><span class="pct">${b.pct.toFixed(0)}%<span class="delta down">−${b.pct.toFixed(0)}</span></span>
    </li>`).join('');
  return html`<ul class="odds">${gone}${rows.map(r => {
    const b = base ? baseBy.get(r.label) : undefined;
    const d = base ? r.pct - (b?.pct ?? 0) : 0;
    const delta = Math.abs(d) >= 0.5 ? html`<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d.toFixed(0)}</span>` : '';
    const changed = base && b && b.next !== r.next;
    const arrow = r.next === GOAL ? '⚽' : r.next === OVER ? 'Angriff vorbei' : r.next === ORIGIN ? '→ weiter' : r.turnover ? (r.next === 'counter' ? '⇄ Konter' : `⇄ Konter, ${short(r.next)}`) : `→ ${short(r.next)}`;
    const cls = hit ? (hit.label === r.label ? ' hit' : ' miss') : (base && !b ? ' new' : '');
    return html`<li class="${r.side}${cls}">
      <span class="bar" style="width:${r.pct.toFixed(1)}%"></span>
      <span>${withPlayer(r.label, player)} <span class="arrow${changed ? ' changed' : ''}">${arrow}</span></span>
      <span class="pct">${r.pct.toFixed(0)}%${delta}</span>
    </li>`;
  }).join('')}</ul>`;
}

/** The attack so far, step by step: situation, player, what the acting bench did, what came of it. The current step last. */
function renderTrail(m: MatchState, steps: Resolution[], now: { situationId: string; playerName: string } | null) {
  if (!steps.length && !now) return '';
  const rows = steps.map((r, i) => {
    const actorSide = r.turn === 'att' ? r.attacker : other(r.attacker);
    const what = r.cardId ? `„${cardById.get(r.cardId)!.name}“` : r.subLine ?? 'lässt spielen';
    const chain = [r.originId, r.actedId, r.situationId].filter((id, i, a) => i === 0 || id !== a[i - 1]);
    const where = chain.map(short).join(' → ');
    return html`<li>
      <span class="n">${i + 1}</span>
      <span class="where">${esc(where)}</span> <b>${esc(r.playerName)}</b>
      <span class="did ${r.turn}">${esc(m.teams[actorSide].name)}: ${esc(what)}</span>
      <span class="got">→ ${esc(r.outcome.label.replace(/\{player\}/g, r.playerName))}${r.outcome.next === GOAL ? ' ⚽' : r.outcome.turnover ? ' ⇄' : ''}</span>
    </li>`;
  });
  if (now) rows.push(html`<li class="now"><span class="n">${steps.length + 1}</span><span class="where">${esc(short(now.situationId))}</span> <b>${esc(now.playerName)}</b> <span class="did">jetzt</span></li>`);
  return html`<ol class="trail">${rows.join('')}</ol>`;
}

/** What a bench did in this situation — the card with its text, the sub, or nothing. Readable from the other half. */
function moveBlock(m: MatchState, side: Side, turn: 'att' | 'def', cardId: string | null, subLine: string | null) {
  const name = esc(m.teams[side].name);
  if (cardId) {
    const c = cardById.get(cardId)!;
    return html`
      <div class="move ${turn} shout">
        <span class="by">${name} brüllt</span>
        <b>${esc(c.name)}</b>
        <span class="desc">${esc(c.text)}</span>
      </div>`;
  }
  return html`<div class="move ${turn} plain"><span class="by">${name}</span><b>${esc(subLine ?? 'lässt spielen')}</b></div>`;
}

/** The world happened: the god drew an event on this situation. Shown above the situation it made. */
function eventBlock(eventId: string | null) {
  if (!eventId) return '';
  const c = cardById.get(eventId)!;
  return html`
    <div class="move event">
      <span class="by">Der Fußballgott</span>
      <b>${esc(c.name)}</b>
      <span class="desc">${esc(c.text)}</span>
    </div>`;
}

/** The computer's side of the table: how many cards it holds, and what it has played so far. */
function renderAiBench(m: MatchState, side: Side, isActor: boolean) {
  const me = m.teams[side];
  const played = me.played.slice().reverse();
  return html`
    <div class="hand-title"><h2 class="${isActor ? 'pulse' : ''}">${isActor ? 'Überlegt…' : aiChoice ? 'Wartet auf den Fußballgott' : 'Computer'}</h2><small>${me.hand.length} auf der Hand · ▲ ${me.attPile.length} ▼ ${me.defPile.length} im Stapel</small></div>
    ${played.length ? html`<div class="played">${played.map(id => {
      const c = cardById.get(id)!;
      return html`<span class="chip ${c.kind}" title="${esc(c.text)}">${esc(c.name)}</span>`;
    }).join('')}</div>` : html`<div class="hand-empty">Noch keine Karte gespielt.</div>`}`;
}

const situationKey = (m: MatchState) => `${m.attackIndex}:${m.step}:${m.phase === 'choose'}`;

/** One bench's half of the screen. Everything they need to act, from their own perspective. */
function renderHalf(m: MatchState, side: Side, enter: boolean) {
  const sitCls = enter ? 'panel situation enter' : 'panel situation';
  const me = m.teams[side], them = m.teams[other(side)];
  const attacking = m.attacker === side;
  const ai = isAi(side);
  const isActor = m.phase === 'choose' && actor(m) === side;
  const sit = situationById.get(m.situationId)!;

  const head = html`
    <div class="head">
      <div class="who">
        <div class="name"><i class="swatch ${side}"></i>${esc(me.name)}</div>
        <div class="stats"><span>${PLAN_LABEL[me.plan.tempo]}</span> <span>${PLAN_LABEL[me.plan.press]}</span> <span>${me.subsLeft} Wechsel</span>${me.menDown ? html` <span class="warn">${11 - me.menDown} Mann</span>` : ''}${me.coachBanned ? html` <span class="warn">Trainer auf der Tribüne</span>` : ''}</div>
      </div>
      <div class="sc">${m.score[side]}<small>:</small>${m.score[other(side)]}</div>
      <div class="meta">${m.phase === 'finished' ? 'Abpfiff' : html`<b>${attacking ? 'Angriff' : 'Abwehr'}</b><br>Angriff ${m.attackIndex + 1} von ${m.attacksTotal}`}</div>
    </div>`;

  let body = '';
  if (m.phase === 'finished') {
    const won = m.score[side] > m.score[other(side)], draw = m.score.A === m.score.B;
    body = html`
      <div class="panel" style="text-align:center">
        <div class="result${won ? ' goal' : ''}">${draw ? 'Unentschieden.' : won ? 'Gewonnen!' : `${esc(them.name)} gewinnen.`}</div>
        <p class="zaun">${esc(fullTimeLine(m.seed, won, draw))}</p>
      </div>
      <details class="panel bericht"><summary>Spielbericht fürs Dorfblatt</summary>
        ${m.log.map(l => html`<p class="${l.startsWith('—') ? 'attack' : l.startsWith('„') ? 'zaun' : ''}">${esc(l)}</p>`).join('')}
      </details>
      <button class="again">Neues Spiel</button>`;
  } else if (m.phase === 'resolved') {
    const r = m.last!;
    const sitR = situationById.get(r.situationId)!;
    const replaced = r.situationId !== r.actedId;
    const goal = r.outcome.next === GOAL;
    const actorSide = r.turn === 'att' ? r.attacker : other(r.attacker);
    body = html`
      <div class="${sitCls}">
        ${renderTrail(m, trail.slice(0, -1), { situationId: r.originId, playerName: r.playerName })}
        ${r.eventId ? html`${r.actedId !== r.originId ? html`<p class="was">${withPlayer(situationById.get(r.originId)!.text, r.playerName)}</p>` : ''}${eventBlock(r.eventId)}` : ''}
        ${replaced ? html`<p class="was">${withPlayer(situationById.get(r.actedId)!.text, r.playerName)}</p>` : ''}
        <p class="text">${withPlayer(sitR.text, r.playerName)}</p>
        ${moveBlock(m, actorSide, r.turn, r.cardId, r.subLine)}
        ${oddsList(r.odds, r.cardId && !replaced ? r.base : null, revealing ? null : r.outcome, r.playerName)}
        ${revealing ? html`<p class="rolling">Der Fußballgott würfelt…</p>` : html`
          <p class="result${goal ? ' goal' : ''}" style="margin:12px 0 0">
            ${goal ? (r.attacker === side ? '⚽ TOOOR!' : '⚽ Gegentor.') : cap(withPlayer(r.outcome.label, r.playerName)) + (r.outcome.next === OVER ? (/Angriff vorbei/.test(r.outcome.label) ? '.' : ' — Angriff vorbei.') : r.outcome.next === ORIGIN ? ' — weiter geht\'s.' : r.outcome.turnover ? ` — Konter für ${esc(m.teams[other(r.attacker)].name)}.` : ` → ${short(r.outcome.next)}.`)}
          </p>
          <p class="zaun">${esc(r.comment)}</p>
          ${r.lines.map(l => html`<p class="god">${esc(l)}</p>`).join('')}`}
      </div>
      ${ai ? renderAiBench(m, side, false) : html`<button class="continue" ${revealing ? 'disabled' : ''}>Weiter</button>`}`;
  } else {
    // the waiting side never sees the actor's unplayed selection — except the computer's, which is final
    const aiActs = isAi(actor(m));
    const preview = aiActs ? (aiChoice ? aiChoice.cardId : null) : isActor ? selected : null;
    const base = computeOdds(m, null);
    const odds = preview ? computeOdds(m, preview) : base;
    const replaced = odds.situationId !== m.situationId;
    const special = activeSpecial(m);
    const subs = isActor ? availableSubs(m) : [];
    const aiMove = aiActs && aiChoice ? moveBlock(m, actor(m), m.turn, aiChoice.cardId, null) : '';
    const rollButton = aiActs && aiChoice && !ai ? html`<button class="roll">Würfeln lassen</button>` : '';
    const cards = ai ? '' : html`
      <div class="hand-title"><h2>${isActor ? 'Du bist dran' : aiChoice ? `${esc(them.name)} haben gewählt` : `Warten auf ${esc(them.name)}`}</h2><small>Stapel: ▲ ${me.attPile.length} · ▼ ${me.defPile.length}</small></div>
      ${me.coachBanned ? html`<div class="hand-empty">Du sitzt auf der Tribüne. Keine Zurufe mehr, nur noch Wechsel.</div>` : me.hand.length ? '' : html`<div class="hand-empty">Keine Karten mehr. Spielen lassen.</div>`}
      <div class="hand">${me.hand.map(id => {
        const c = cardById.get(id)!;
        const ok = isActor && canPlay(m, c);
        return html`<button class="card ${c.kind}${selected === id && isActor ? ' selected' : ''}${isActor ? '' : ' idle'}" data-card="${id}" ${ok ? '' : 'disabled'}>
          <span class="name">${esc(c.name)}</span>
          <span class="desc">${esc(c.text)}</span>
          <span class="tag">${c.side === 'att' ? '▲ ' : c.side === 'def' ? '▼ ' : ''}${c.situations === 'any' ? 'überall' : c.situations.map(short).join(', ')}</span>
        </button>`;
      }).join('')}</div>
      ${subs.length ? html`<div class="bench">${subs.map(p => {
        const out = subTarget(m, p.name)!;
        return html`<button class="secondary sub" data-in="${esc(p.name)}">${esc(p.name)} rein für ${esc(out.name)}${p.special ? ' ★' : ''}</button>`;
      }).join('')}</div>` : ''}
      ${isActor ? html`
      <div class="actions">
        <button class="secondary letplay">Spielen lassen</button>
        <button class="play" ${selected ? '' : 'disabled'}>${selected ? `Brüllen: ${esc(cardName(selected)!)}` : 'Karte wählen'}</button>
      </div>` : ''}`;
    body = html`
      <div class="${sitCls}">
        ${renderTrail(m, trail, { situationId: m.originId, playerName: m.playerName })}
        ${m.eventId ? html`${m.situationId !== m.originId ? html`<p class="was">${withPlayer(situationById.get(m.originId)!.text, m.playerName)}</p>` : ''}${eventBlock(m.eventId)}` : ''}
        ${replaced ? html`<p class="was">${withPlayer(sit.text, m.playerName)}</p>` : ''}
        <p class="text">${withPlayer(situationById.get(odds.situationId)!.text, m.playerName)}</p>
        ${special && !replaced ? html`<p class="special">★ ${esc(m.playerName)} — ${esc(special.text)}</p>` : ''}
        ${aiMove}
        ${oddsList(odds.rows, preview && !replaced ? base.rows : null, null, m.playerName)}
      </div>
      ${rollButton}
      ${ai ? renderAiBench(m, side, isActor && !aiChoice) : cards}`;
  }

  return html`<section class="half${isActor ? ' active' : ''}${attacking ? ' attacking' : ''}">${head}${body}</section>`;
}

/** Both squads side by side: starters by role, then the bench. Specials are the only thing worth reading. */
function renderLineups(m: MatchState) {
  const player = (p: Player, onPitch: boolean) => html`
    <li class="${onPitch && p.name === m.playerName ? 'named' : ''}">
      <span class="pname">${esc(p.name)}${p.special ? ' ★' : ''}</span>
      ${p.special ? html`<span class="pspecial">${short(p.special.situation)}: ${esc(p.special.text)}</span>` : ''}
    </li>`;
  const team = (side: Side) => {
    const t = m.teams[side];
    return html`
      <div class="squad">
        <div class="squad-name"><i class="swatch ${side}"></i>${esc(t.name)}</div>
        ${ROLES.map(r => {
          const ps = t.lineup.filter(p => p.role === r);
          return ps.length ? html`<h2>${ROLE_LABEL[r]}</h2><ul>${ps.map(p => player(p, true)).join('')}</ul>` : '';
        }).join('')}
        <h2>Bank · ${t.subsLeft} Wechsel übrig</h2>
        ${t.bench.length ? html`<ul class="bench-list">${t.bench.map(p => player(p, false)).join('')}</ul>` : html`<p class="hand-empty">Keiner mehr da.</p>`}
      </div>`;
  };
  return html`
    <div class="overlay" id="lineups">
      <div class="sheet">
        <div class="sheet-head"><h1>Aufstellung</h1><button class="secondary close">Schließen</button></div>
        <div class="squads">${team('A')}${team('B')}</div>
      </div>
    </div>`;
}

function renderMatch(m: MatchState) {
  // attacks alternate, so tick i belongs to A when i is even
  const ticks = Array.from({ length: m.attacksTotal }, (_, i) =>
    html`<i class="${i % 2 ? 'B' : 'A'} ${m.phase === 'finished' || i < m.attackIndex ? 'done' : i === m.attackIndex ? 'now' : ''}"></i>`).join('');
  const mods = m.modifiers.length ? html`<div class="mods">${m.modifiers.map(x => esc(x.label)).join(' · ')}</div>` : '';
  const kickoff = m.attackIndex === 0 && m.step === 0 && m.phase === 'choose' ? html`<div class="mods">${esc(m.log[0]!)}</div>` : '';
  const att = m.phase === 'finished' ? 'Abpfiff' : html`▲ ${esc(m.teams[m.attacker].name)}`;
  const key = situationKey(m);
  const enter = key !== lastSituationKey && m.phase === 'choose';
  lastSituationKey = key;
  const bannerHtml = banner && m.phase !== 'finished' ? html`
    <div class="banner att-${m.attacker}">
      <small>${m.attackIndex === 0 ? 'Anpfiff' : 'Ballwechsel'} · Angriff ${m.attackIndex + 1} von ${m.attacksTotal}</small>
      <b><i class="swatch ${m.attacker}"></i>${esc(m.teams[m.attacker].name)}</b>
    </div>` : '';
  app.innerHTML = html`
    <div class="split att-${m.attacker}">
      <div class="divider"><div class="attacker">${att}</div><div class="ticks">${ticks}</div>${kickoff}${mods}<button class="secondary lineups">Aufstellung</button></div>
      ${renderHalf(m, 'A', enter)}
      ${renderHalf(m, 'B', enter)}
    </div>
    ${bannerHtml}
    ${showLineups ? renderLineups(m) : ''}`;

  app.querySelector('.lineups')?.addEventListener('click', () => { showLineups = true; render(); });
  const overlay = app.querySelector<HTMLElement>('#lineups');
  overlay?.addEventListener('click', e => { if (e.target === overlay || (e.target as HTMLElement).closest('.close')) { showLineups = false; render(); } });

  app.querySelectorAll<HTMLButtonElement>('.half.active .card').forEach(b => b.addEventListener('click', () => {
    selected = selected === b.dataset.card ? null : b.dataset.card!;
    render();
  }));
  app.querySelector('.play')?.addEventListener('click', () => selected && dispatch({ type: 'play', cardId: selected }));
  app.querySelector('.letplay')?.addEventListener('click', () => dispatch({ type: 'let_play' }));
  app.querySelectorAll('.roll').forEach(b => b.addEventListener('click', rollAi));
  app.querySelectorAll<HTMLButtonElement>('.half.active .sub').forEach(b => b.addEventListener('click', () => dispatch({ type: 'sub', inName: b.dataset.in! })));
  app.querySelectorAll('.continue').forEach(b => b.addEventListener('click', () => { if (!banner) dispatch({ type: 'continue' }); }));
  app.querySelectorAll('.again').forEach(b => b.addEventListener('click', () => { match = null; setup.seed = Math.floor(Math.random() * 1e6); render(); }));
}

function render() {
  if (!match) return renderSetup();
  renderMatch(match);
  scheduleAi();
}

render();
document.addEventListener('keydown', e => { if (e.key === 'Escape' && showLineups) { showLineups = false; render(); } });
