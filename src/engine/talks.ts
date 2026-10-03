// The half-time talk (DESIGN §2.5, v0.21). The one moment the strip stops, and the coach says one thing
// in the Kabine. After Anstoss 3: what he can say depends on how the half went — the score picks the
// talk to the team, the men who scored, missed or blundered get a talk of their own — and a telling-off
// can go wrong. v0.22: a talk moves the team's form (form.ts) — the heads mostly, the legs if it keeps
// them at home, and the god's favour if all the coach says is that the ball is round. What it did shows
// in the second half the way all form does: on the men and in the top bar, as a word, never a number.
// And like a card, a talk never says what it does.
// Pure: talksFor() reads the first half off the strip, halftime() applies both benches' choices.

import { move } from './form';
import { nextRandom } from './rng';
import type { Gauges, MatchState, Panel, Player, Side } from './types';

export type TalkId = 'donnerwetter' | 'kiste' | 'hinten_dicht' | 'loben' | 'aufbauen' | 'anschiss' | 'lebensweisheit';

/** One thing the coach can say, to one man or to the team. `{man}` is the man's short name. */
export interface TalkOffer {
  talk: TalkId;
  label: string;             // what kind of talk it is: "Anschiss", "Loben"
  say: string;               // what the coach says, already filled in
  man?: string;              // Player.name of the man it is aimed at
}

interface Talk {
  id: TalkId;
  label: string;
  say: string[];             // what the coach says; one at random
  react: string[];           // what it looks like in the Kabine; one at random
  flop?: string[];           // Anschiss only: what it looks like when it goes wrong
  heard: string[];           // what the other bench hears through the wall
}

const TALKS: Record<TalkId, Talk> = {
  donnerwetter: {
    id: 'donnerwetter', label: 'Donnerwetter',
    say: ['„So nicht, Männer. SO NICHT!“', '„Wer so weiterspielt, kann nächste Woche die Eckfahnen aufstellen!“'],
    react: ['Die Teekanne fliegt. Keiner schaut hoch, alle ziehen die Schuhe fester.', 'Es ist still. Dann steht {captain} auf und haut gegen die Spindtür.'],
    heard: ['Aus der Gästekabine knallt eine Tür. Dann fliegt etwas Blechernes.', 'Durch die Wand hört man nur Wortfetzen. Keiner davon ist nett.'],
  },
  kiste: {
    id: 'kiste', label: 'Kiste Bier',
    say: ['„Gewinnen wir, stell ich eine Kiste hin.“', '„Männer. Eine Kiste. Kalt. Wenn wir gewinnen.“'],
    react: ['Vorne wird genickt. Hinten wird schon gerechnet, wie viele Flaschen das pro Mann sind.', 'Der Sturm klatscht sich ab. Die Abwehr fragt, ob Radler auch zählt.'],
    heard: ['Drüben wird gejubelt, als wäre schon Abpfiff. Da hat einer was versprochen.', 'Aus der Gästekabine: „Aber kein Pils aus der Dose!“'],
  },
  hinten_dicht: {
    id: 'hinten_dicht', label: 'Hinten dicht',
    say: ['„Jetzt hinten zumachen. Keiner geht mehr über die Mittellinie, außer der Ball.“', '„Das bringen wir heim. Hinten dicht, Männer.“'],
    react: ['Die Abwehr nickt ernst. Der Sturm schaut, als hätte man ihm das Bier weggenommen.', '{keeper} klopft sich zweimal auf die Handschuhe. Das heißt was.'],
    heard: ['Drüben wird es ruhig. Dann: „Hinten dicht!“, und alle sagen es nach.', 'Aus der Gästekabine hört man Stollen auf Fliesen. Die üben die Viererkette.'],
  },
  loben: {
    id: 'loben', label: 'Loben',
    say: ['„{man}, genau so weiter!“', '„{man}! Das war Weltklasse. Kreisklasse-Weltklasse, aber Weltklasse.“'],
    react: ['{man} wird rot und isst drei Orangenschnitze auf einmal.', '{man} nickt. Man sieht, wie er größer wird.'],
    heard: ['Drüben wird geklatscht. Einer ruft seinen eigenen Namen.', 'Aus der Gästekabine: „Und das war ERST die erste Halbzeit!“'],
  },
  aufbauen: {
    id: 'aufbauen', label: 'Aufbauen',
    say: ['„{man}, vergiss das. Der nächste ist deiner.“', '„{man}, komm her. Das passiert jedem. Mir auch, früher. Oft.“'],
    react: ['{man} schaut zum ersten Mal seit dem Pfiff vom Boden hoch.', '{man} zieht die Nase hoch und nickt. Einmal.'],
    heard: ['Drüben ist es sehr ruhig. Einer schnäuzt sich.', 'Durch die Wand, gedämpft: „… das passiert jedem.“'],
  },
  anschiss: {
    id: 'anschiss', label: 'Anschiss',
    say: ['„{man}, was war DAS?!“', '„{man}! Wenn ich so spiele, spiel ich bei den Alten Herren!“'],
    react: ['{man} beißt die Zähne zusammen und ist als Erster wieder draußen.', '{man} knallt die Trinkflasche hin. „Dem zeig ich’s.“'],
    flop: ['{man} sagt nichts mehr. Zu niemandem. Er sitzt mit dem Rücken zur Tafel.', '{man} zieht beleidigt die Jacke an. Dann doch wieder aus. Aber beleidigt.'],
    heard: ['Durch die Wand hört man nur ein Wort, sehr laut. Einen Namen.', 'Aus der Gästekabine: „… und DU!“ Dann eine Spindtür.'],
  },
  lebensweisheit: {
    id: 'lebensweisheit', label: 'Lebensweisheit',
    say: ['„Männer: Der Ball ist rund.“', '„Hinten werden die Enten fett.“', '„Das Runde muss ins Eckige. Mehr sag ich nicht.“', '„Wer nicht schießt, trifft nicht.“'],
    react: ['Keiner sagt was. {captain} schält eine Orange.', 'Kurzes Nicken. Dann reden alle über das Wetter.'],
    heard: ['Drüben ist es still. Sehr still.', 'Aus der Gästekabine: Gelächter. Unklar, über wen.'],
  },
};

/**
 * What a talk does to the team's form. A telling-off that goes wrong takes the heads down instead of up.
 * The Lebensweisheit does nothing for the men — but the football god likes to hear his own proverbs.
 */
const GIVES: Record<TalkId, Partial<Gauges>> = {
  donnerwetter: { moral: 0.15 },
  kiste: { moral: 0.12 },
  hinten_dicht: { puste: 0.15, moral: -0.03 },
  loben: { moral: 0.08 },
  aufbauen: { moral: 0.1 },
  anschiss: { moral: 0.15 },
  lebensweisheit: { gunst: 0.15 },
};
const FLOPPED: Partial<Gauges> = { moral: -0.15 };

/** How likely an Anschiss goes wrong, by what kind of man he is (Anstoss: not for the sensitive ones). */
const FLOP: Record<string, number> = { nervenbuendel: 0.6, rentner: 0.5, treter: 0.1 };
const FLOP_BASE = 0.3;

// ---- Reading the half ---------------------------------------------------

const SHOOTER = new Set(['shooter', 'runner', 'target', 'taker']);
const MISS = new Set(['vorbei', 'breit_gemacht', 'latte', 'pfosten', 'fk_drueber']);
const GIFT = new Set(['eigentor', 'flutscher', 'elfmeter_foul', 'elfmeter', 'gefoult', 'querpass_fehler', 'rueckpass_kurz', 'verstolpert', 'patzer']);

/** The man of `side` who shot in this panel, if his side had the ball. */
const shooterOf = (p: Panel, side: Side) =>
  p.scene.side === side ? p.scene.cast.find(m => m.side === side && SHOOTER.has(m.slot)) : undefined;

/** The one man a half is about, for each kind of talk: most goals, the worst miss, the worst gift. */
function menOfTheHalf(panels: Panel[], side: Side): Partial<Record<'loben' | 'aufbauen' | 'anschiss', string>> {
  const score = { loben: new Map<string, number>(), aufbauen: new Map<string, number>(), anschiss: new Map<string, number>() };
  const add = (k: keyof typeof score, name: string | undefined, n: number) => { if (name) score[k].set(name, (score[k].get(name) ?? 0) + n); };
  for (const p of panels) {
    const shooter = shooterOf(p, side);
    if (p.goal === side) add('loben', shooter?.player.name ?? (p.actor?.side === side ? p.actor.player.name : undefined), 3);
    else if (p.row && p.actor?.side === side && p.scene.side === side && p.scene.tags.includes('box')) add('loben', p.actor.player.name, 0.5);
    if (p.row && shooter && !p.goal && MISS.has(p.row)) add('aufbauen', shooter.player.name, p.scene.type === 'through_on_goal' || p.scene.type === 'penalty' ? 3 : 1);
    if (p.row && p.actor?.side === side && GIFT.has(p.row)) add('anschiss', p.actor.player.name, p.goal ? 3 : 2);
    // a man of ours who lost the ball where it hurts: the other side's actor took it off him
    if (p.row && p.scene.side === side && p.actor?.side !== side && p.nextSide !== side && p.scene.tags.includes('deep')) {
      add('anschiss', p.scene.cast.find(m => m.side === side && m.slot !== 'keeper')?.player.name, 1);
    }
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const out: Partial<Record<'loben' | 'aufbauen' | 'anschiss', string>> = {};
  for (const k of ['loben', 'aufbauen', 'anschiss'] as const) {
    const name = top(score[k]);
    if (name) out[k] = name;
  }
  return out;
}

// ---- The menu -----------------------------------------------------------

function pick<T>(items: T[], rng: number): { item: T; rng: number } {
  const r = nextRandom(rng);
  return { item: items[Math.floor(r.value * items.length)] as T, rng: r.state };
}

const shortOf = (roster: Player[], name?: string) => roster.find(p => p.name === name)?.short ?? '';
const fill = (text: string, roster: Player[], man?: string) => text
  .replace(/\{man\}/g, shortOf(roster, man))
  .replace(/\{captain\}/g, roster.find(p => p.role === 'midfielder')?.short ?? 'Einer')
  .replace(/\{keeper\}/g, roster.find(p => p.role === 'keeper')?.short ?? 'Der Torwart');

/**
 * What this bench can say at half-time: one talk to the team, picked by the score (behind: a
 * Donnerwetter; level: a crate of beer; ahead: hinten dicht), one for each man the half was about — the
 * scorer is praised, the one who missed is built up, the one who gave it away gets told — and the
 * Lebensweisheit, which is always there and does nothing for the men. The wording is fixed per match (seeded).
 */
export function talksFor(state: MatchState, side: Side): TalkOffer[] {
  const roster = state.teams[side].roster;
  const diff = state.score[side] - state.score[side === 'A' ? 'B' : 'A'];
  const men = menOfTheHalf(state.strip.filter(p => p.half === 1), side);
  let rng = state.rng ^ (side === 'A' ? 0x51ed : 0x2a7b);
  const offers: TalkOffer[] = [];
  const offerOf = (id: TalkId, man?: string) => {
    const s = pick(TALKS[id].say, rng); rng = s.rng;
    offers.push({ talk: id, label: TALKS[id].label, say: fill(s.item, roster, man), man });
  };
  offerOf(diff < 0 ? 'donnerwetter' : diff === 0 ? 'kiste' : 'hinten_dicht');
  if (men.loben) offerOf('loben', men.loben);
  if (men.aufbauen && men.aufbauen !== men.loben) offerOf('aufbauen', men.aufbauen);
  if (men.anschiss && men.anschiss !== men.loben) offerOf('anschiss', men.anschiss);
  offerOf('lebensweisheit');
  return offers;
}

// ---- Saying it ------------------------------------------------------------

export interface Said {
  offer: TalkOffer;
  react: string;             // what it looked like in our Kabine
  heard: string;             // what the other bench heard through the wall
  moved: Partial<Gauges>;    // what it did to the form (for the strip tool; the game shows it as words)
}

/** Both benches say their thing (null = nothing at all). What it does goes straight into the team's form. */
export function halftime(state: MatchState, picks: Record<Side, TalkOffer | null>): { state: MatchState; said: Record<Side, Said | null> } {
  const s: MatchState = structuredClone(state);
  const said: Record<Side, Said | null> = { A: null, B: null };
  for (const side of ['A', 'B'] as Side[]) {
    const offer = picks[side];
    if (!offer) continue;
    const talk = TALKS[offer.talk];
    const roster = s.teams[side].roster;
    let flop = false;
    if (talk.flop) {
      const man = roster.find(p => p.name === offer.man);
      const chance = Math.max(FLOP_BASE, ...(man?.traits ?? []).map(t => FLOP[t] ?? 0));
      const r = nextRandom(s.rng); s.rng = r.state;
      flop = r.value < chance;
    }
    const moved = flop ? FLOPPED : GIVES[offer.talk];
    move(s.teams[side], moved);
    const react = pick(flop ? talk.flop as string[] : talk.react, s.rng); s.rng = react.rng;
    const heard = pick(talk.heard, s.rng); s.rng = heard.rng;
    said[side] = { offer, react: fill(react.item, roster, offer.man), heard: heard.item, moved };
  }
  return { state: s, said };
}
