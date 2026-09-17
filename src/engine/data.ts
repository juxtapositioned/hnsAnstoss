import type { Card, Consequence, Player, Plan, Press, Situation, Tempo } from './types';
import { GOAL, ORIGIN, OVER } from './types';

// ---- Tuning knobs -------------------------------------------------------
// v0.5 authoring values, 2026-09-14. Re-run `npm run sim` only after structural changes — see README.

export const K = {
  attacks: 12,
  handAtt: 4,          // attacking shouts in hand; refilled from the attacking pile after every action
  handDef: 4,
  pileAtt: 8,          // dealt from the pool for the match, hand included; no reshuffle
  pileDef: 8,
  subs: 3,
  eventChance: 0.09,   // per situation: the god draws from the world pile
  manDownAtt: 0.85,    // per missing player: attacking rows while attacking
  manDownDef: 0.75,    // per missing player: defending rows while defending
  maxSteps: 10,        // situations per attack before the ref just blows
  // AI prices, in goals per remaining attack: what a red card, a banned coach, an injury are worth to it
  aiRedCard: 0.03,
  aiCoachBan: 0.02,
  aiInjury: 0.01,
  aiThreshold: 0.02,   // a card must be worth at least this much over letting them play — cards are finite
  // Placeholder edge from the three team stats (DESIGN 2.6). Zero at equal stats.
  wFavor: 0.5,
  wMot: 0.3,
  wFit: 0.2,
  edgeCap: 5,
  edgeTilt: 0.4,
};

// ---- Situations ---------------------------------------------------------
// Ids are code, all text is Kreisklasse German. Graph nodes are reachable from build_up. Everything after the
// `card-only` marker is reached only through a shout or a world event. Outcome labels are keys too (plans,
// specials and cards refer to them). A `turnover` row hands the ball to the other team: the same attack goes
// on the other way, from `next`. A `then` list is what stays: red cards, banned coaches, injuries.

export const START_SITUATION = 'build_up';

const RED_DEF: Consequence[] = [{ kind: 'red_card', team: 'def' }];
const RED_ATT: Consequence[] = [{ kind: 'red_card', team: 'att' }];

export const SITUATIONS: Situation[] = [
  {
    id: 'build_up', role: 'defender',
    text: '{player} hat den Ball am eigenen Sechzehner. Der Platz ist holprig, der Trainer brüllt.',
    outcomes: [
      { label: 'Pass ins Mittelfeld', weight: 55, side: 'att', next: 'midfield' },
      { label: 'Langer Hafer', weight: 12, side: 'att', next: 'through_on_goal' },
      { label: 'Fehlpass zum Gegner', weight: 25, side: 'def', next: 'counter', turnover: true },
    ],
  },
  {
    id: 'midfield', role: 'midfielder',
    text: '{player} hat den Ball im Mittelfeld, viel Platz vor sich, und sucht den Pass nach vorne.',
    outcomes: [
      { label: 'Steilpass', weight: 25, side: 'att', next: 'through_on_goal' },
      { label: 'Auf den Flügel', weight: 45, side: 'att', next: 'flank' },
      { label: 'Ball weg', weight: 25, side: 'def', next: 'counter', turnover: true },
    ],
  },
  {
    id: 'flank', role: 'winger',
    text: '{player} geht auf dem Flügel ins Dribbling. Sein Gegenspieler ist zwanzig Jahre älter und hat nichts zu verlieren.',
    outcomes: [
      { label: 'Flanke', weight: 35, side: 'att', next: 'header' },
      { label: 'Zieht nach innen', weight: 30, side: 'att', next: 'edge_shot' },
      { label: 'Abgegrätscht', weight: 30, side: 'def', next: 'build_up', turnover: true },
    ],
  },
  {
    id: 'through_on_goal', role: 'striker',
    text: '{player} ist durch — nur noch der Torwart vor ihm. Am Zaun hält jemand die Luft an.',
    outcomes: [
      { label: 'Tor', weight: 45, side: 'att', next: GOAL },
      { label: 'Gehalten', weight: 30, side: 'def', next: OVER },
      { label: 'Vorbei', weight: 25, side: 'neutral', next: OVER },
    ],
  },
  {
    id: 'header', role: 'striker',
    text: 'Die Flanke kommt, {player} steigt hoch zum Kopfball.',
    outcomes: [
      { label: 'Tor', weight: 30, side: 'att', next: GOAL },
      { label: 'Gehalten', weight: 25, side: 'def', next: OVER },
      { label: 'Geklärt', weight: 45, side: 'neutral', next: OVER },
    ],
  },
  {
    id: 'edge_shot', role: 'midfielder',
    text: '{player} zieht vom Sechzehner ab.',
    outcomes: [
      { label: 'Tor', weight: 22, side: 'att', next: GOAL },
      { label: 'Gehalten', weight: 28, side: 'def', next: OVER },
      { label: 'Geblockt', weight: 50, side: 'neutral', next: OVER },
    ],
  },
  {
    id: 'counter', role: 'midfielder',
    text: 'Ballgewinn! {player} schaltet um. Vorne ist Platz, hinten ist keiner mehr.',
    outcomes: [
      { label: 'Steil — durch', weight: 25, side: 'att', next: 'through_on_goal' },
      { label: 'Sauber ausgespielt — Mittelfeld', weight: 35, side: 'att', next: 'midfield' },
      { label: 'Konter verpufft', weight: 40, side: 'neutral', next: OVER },
    ],
  },

  // ---- card-only: Standards ----
  {
    id: 'penalty', role: 'striker',
    text: 'Elfmeter. {player} legt sich den Ball zurecht. Am Zaun wird es still, sogar die Hunde.',
    outcomes: [
      { label: 'Tor', weight: 72, side: 'att', next: GOAL },
      { label: 'Gehalten', weight: 18, side: 'def', next: OVER },
      { label: 'Drüber', weight: 10, side: 'neutral', next: OVER },
    ],
  },
  {
    id: 'free_kick', role: 'midfielder',
    text: 'Freistoß aus aussichtsreicher Position. {player} steht drüber und guckt wichtig.',
    outcomes: [
      { label: 'Tor', weight: 22, side: 'att', next: GOAL },
      { label: 'Gehalten', weight: 28, side: 'def', next: OVER },
      { label: 'Geklärt', weight: 50, side: 'neutral', next: OVER },
    ],
  },
  {
    id: 'corner', role: 'striker',
    text: 'Ecke. Alle rein, auch der Torwart, der wird zurückgeschickt. {player} lauert am kurzen Pfosten.',
    outcomes: [
      { label: 'Kopfball — Tor', weight: 22, side: 'att', next: GOAL },
      { label: 'Geklärt', weight: 50, side: 'neutral', next: OVER },
      { label: 'Zweiter Ball am Sechzehner', weight: 28, side: 'att', next: 'edge_shot' },
    ],
  },

  // ---- card-only: Zurufe im Angriff ----
  {
    id: 'long_ball', role: 'defender',
    text: '{player} drischt ihn lang, hoch und über alle drüber.',
    outcomes: [
      { label: 'Der Stürmer läuft ein — durch', weight: 35, side: 'att', next: 'through_on_goal' },
      { label: 'Kopfball im Mittelfeld gewonnen', weight: 25, side: 'att', next: 'midfield' },
      { label: 'Direkt in die Arme des Torwarts', weight: 40, side: 'neutral', next: OVER },
    ],
  },
  {
    id: 'draw_foul', role: 'midfielder',
    text: '{player} sucht den Kontakt, findet ihn, und geht runter wie vom Blitz getroffen.',
    outcomes: [
      { label: 'Pfiff — Freistoß', weight: 45, side: 'att', next: 'free_kick' },
      { label: 'Im Sechzehner erwischt — Elfmeter', weight: 12, side: 'att', next: 'penalty' },
      { label: 'Schiri lässt laufen — Konter', weight: 18, side: 'def', next: 'counter', turnover: true },
      { label: 'Gelb wegen Schwalbe', weight: 25, side: 'def', next: OVER },
    ],
  },
  {
    id: 'dive', role: 'winger',
    text: '{player} spürt den Kontakt und fliegt. Der Schiri ist zwanzig Meter weg und hat Zeit.',
    outcomes: [
      { label: 'Elfmeter!', weight: 30, side: 'att', next: 'penalty' },
      { label: 'Freistoß am Sechzehner', weight: 20, side: 'att', next: 'free_kick' },
      { label: 'Schiri lässt laufen — Konter', weight: 25, side: 'def', next: 'counter', turnover: true },
      { label: 'Gelb wegen Schwalbe', weight: 25, side: 'def', next: OVER },
    ],
  },
  {
    id: 'early_cross', role: 'winger',
    text: '{player} schlägt die Flanke früh, ohne hinzugucken. Irgendwer wird schon da sein.',
    outcomes: [
      { label: 'Kommt an — Kopfball', weight: 65, side: 'att', next: 'header' },
      { label: 'Zu lang — Abstoß', weight: 23, side: 'neutral', next: OVER },
      { label: 'Abgefangen — Konter', weight: 12, side: 'def', next: 'counter', turnover: true },
    ],
  },
  {
    id: 'long_shot', role: 'midfielder',
    text: '{player} zieht aus dreißig Metern ab. Warum auch nicht.',
    outcomes: [
      { label: 'Tor', weight: 12, side: 'att', next: GOAL },
      { label: 'Gehalten', weight: 30, side: 'def', next: OVER },
      { label: 'Drüber, in den Acker', weight: 38, side: 'neutral', next: OVER },
      { label: 'Abgefälscht — Ecke', weight: 20, side: 'att', next: 'corner' },
    ],
  },
  {
    id: 'possession', role: 'midfielder',
    text: '{player} lässt den Ball laufen. Quer, zurück, quer. Am Zaun wird gepfiffen.',
    outcomes: [
      { label: 'Aufbau von vorn — Mittelfeld', weight: 45, side: 'att', next: 'midfield' },
      { label: 'Lücke — Steilpass', weight: 20, side: 'att', next: 'through_on_goal' },
      { label: 'Verschleppt, Angriff verpufft', weight: 35, side: 'neutral', next: OVER },
    ],
  },
  {
    id: 'trick_free_kick', role: 'midfielder',
    text: 'Einstudierte Variante. Drei Mann laufen drüber, einer weiß, was er tut. Hoffentlich {player}.',
    outcomes: [
      { label: 'Tor', weight: 32, side: 'att', next: GOAL },
      { label: 'Gehalten', weight: 20, side: 'def', next: OVER },
      { label: 'Abgefangen — Konter', weight: 28, side: 'def', next: 'counter', turnover: true },
      { label: 'Verstolpert', weight: 20, side: 'neutral', next: OVER },
    ],
  },

  {
    id: 'square_ball', role: 'striker',
    text: '{player} ist durch, guckt kurz nach links, und legt quer. Da steht einer. Hoffentlich einer von uns.',
    outcomes: [
      { label: 'Eingeschoben — Tor', weight: 50, side: 'att', next: GOAL },
      { label: 'Torwart fängt den Querpass', weight: 30, side: 'def', next: OVER },
      { label: 'Vertändelt — Konter', weight: 20, side: 'def', next: 'counter', turnover: true },
    ],
  },

  // ---- card-only: Zurufe in der Abwehr ----
  {
    id: 'press_build_up', role: 'defender',
    text: 'Zwei Stürmer laufen {player} an. Der guckt, als hätte man ihm das nicht gesagt.',
    outcomes: [
      { label: 'Fehlpass — Konter', weight: 35, side: 'def', next: 'counter', turnover: true },
      { label: 'Ins Aus gedrängt — Angriff vorbei', weight: 20, side: 'def', next: OVER },
      { label: 'Drüber gehauen — durch', weight: 18, side: 'att', next: 'through_on_goal' },
      { label: 'Rausgespielt — Mittelfeld', weight: 27, side: 'att', next: 'midfield' },
    ],
  },
  {
    id: 'wall', role: 'midfielder',
    text: 'Fünf Mann in der Mauer, alle mit den Händen vor dem Gesicht. {player} nimmt Anlauf.',
    outcomes: [
      { label: 'In die Mauer — geklärt', weight: 45, side: 'neutral', next: OVER },
      { label: 'Drüber — Tor', weight: 15, side: 'att', next: GOAL },
      { label: 'Abgefälscht — Ecke', weight: 15, side: 'att', next: 'corner' },
      { label: 'Von der Mauer weg — Konter', weight: 25, side: 'def', next: 'counter', turnover: true },
    ],
  },
  {
    id: 'keeper_dance', role: 'striker',
    text: 'Der Torwart tanzt auf der Linie, zeigt in eine Ecke, brüllt was. {player} guckt nur auf den Ball. Hoffentlich.',
    outcomes: [
      { label: 'Tor', weight: 62, side: 'att', next: GOAL },
      { label: 'Gehalten', weight: 28, side: 'def', next: OVER },
      { label: 'Drüber', weight: 10, side: 'neutral', next: OVER },
    ],
  },
  {
    id: 'offside_trap', role: 'midfielder',
    text: 'Die Abwehr rückt auf Kommando raus. Hoffentlich alle.',
    outcomes: [
      { label: 'Abseits', weight: 45, side: 'def', next: OVER },
      { label: 'Einer pennt — {player} ist durch, ganz allein', weight: 20, side: 'att', next: 'through_on_goal' },
      { label: 'Kein Steilpass, Ball auf den Flügel', weight: 20, side: 'att', next: 'flank' },
      { label: 'Abgefangen — Konter', weight: 15, side: 'def', next: 'counter', turnover: true },
    ],
  },
  {
    id: 'cynical_foul', role: 'midfielder',
    text: '{player} wird von hinten umgesenst. Der Rasen fliegt.',
    outcomes: [
      { label: 'Pfiff, Freistoß im Nirgendwo — Angriff vorbei', weight: 55, side: 'def', next: OVER },
      { label: 'Ball gewonnen, Foul übersehen — Konter', weight: 15, side: 'def', next: 'counter', turnover: true },
      { label: 'Gelb, und Freistoß', weight: 20, side: 'att', next: 'free_kick' },
      { label: 'Rot, und Freistoß', weight: 10, side: 'att', next: 'free_kick', then: RED_DEF },
    ],
  },
  {
    id: 'keeper_rushes_out', role: 'striker',
    text: 'Der Torwart stürmt aus dem Kasten auf {player} zu. Beide schreien.',
    outcomes: [
      { label: 'Erstickt den Ball', weight: 58, side: 'def', next: OVER },
      { label: 'Umkurvt — Tor', weight: 22, side: 'att', next: GOAL },
      { label: 'Räumt ihn ab — Elfmeter, Rot für den Torwart', weight: 20, side: 'att', next: 'penalty', then: [{ kind: 'red_card', team: 'def', role: 'keeper' }] },
    ],
  },
  {
    id: 'crowded_box', role: 'midfielder',
    text: 'Alle stehen im Sechzehner. Auch der Ersatztorwart, glaubt man.',
    outcomes: [
      { label: 'Geblockt', weight: 45, side: 'neutral', next: OVER },
      { label: 'Abgefälscht — drin', weight: 15, side: 'att', next: GOAL },
      { label: 'Abpraller — {player} nochmal', weight: 20, side: 'att', next: 'edge_shot' },
      { label: 'Geblockt, und Konter', weight: 20, side: 'def', next: 'counter', turnover: true },
    ],
  },
  {
    id: 'double_team', role: 'winger',
    text: 'Zwei Verteidiger stellen {player} auf dem Flügel. Der Rest der Abwehr ist jetzt dünn.',
    outcomes: [
      { label: 'Abgelaufen — Konter', weight: 35, side: 'def', next: 'counter', turnover: true },
      { label: 'Flanke trotzdem', weight: 25, side: 'att', next: 'header' },
      { label: 'Durch die Lücke — durch', weight: 20, side: 'att', next: 'through_on_goal' },
      { label: 'Ins Aus gedrängt', weight: 20, side: 'neutral', next: OVER },
    ],
  },
  {
    id: 'trainer_tobt', role: 'midfielder',
    text: 'An der Seitenlinie tobt der Trainer. Der Schiri hat jetzt andere Sorgen als das Spiel.',
    outcomes: [
      { label: 'Schiri pfeift ab — Angriff vorbei', weight: 30, side: 'def', next: OVER },
      { label: 'Schiri lässt laufen — weiter', weight: 50, side: 'att', next: ORIGIN },
      { label: 'Trainer auf die Tribüne, Freistoß', weight: 20, side: 'att', next: 'free_kick', then: [{ kind: 'coach_banned', team: 'def' }] },
    ],
  },
  {
    id: 'last_ditch', role: 'striker',
    text: 'Der letzte Mann wirft sich vor {player}. Irgendwas wird er treffen.',
    outcomes: [
      { label: 'Zu spät — Tor', weight: 25, side: 'att', next: GOAL },
      { label: 'Geblockt — Ecke', weight: 25, side: 'att', next: 'corner' },
      { label: 'Foul — Elfmeter, und Rot', weight: 15, side: 'att', next: 'penalty', then: RED_DEF },
      { label: 'Ball erobert — Konter', weight: 35, side: 'def', next: 'counter', turnover: true },
    ],
  },
  {
    id: 'provoke', role: 'midfielder',
    text: 'Der Verteidiger redet auf {player} ein. Über seine Mutter, seinen Verein, sein Auto.',
    outcomes: [
      { label: '{player} schlägt zu — Rot', weight: 15, side: 'def', next: OVER, then: RED_ATT },
      { label: 'Rot für den Provokateur, Freistoß', weight: 10, side: 'att', next: 'free_kick', then: RED_DEF },
      { label: 'Rudelbildung, Schiedsrichterball', weight: 30, side: 'att', next: 'midfield' },
      { label: '{player} lacht nur — weiter', weight: 45, side: 'att', next: ORIGIN },
    ],
  },

  // ---- card-only: Ereignisse (the world pile) ----
  {
    id: 'dog_on_pitch', role: 'striker',
    text: 'Waldi, der Hund vom Platzwart, rennt aufs Feld und will den Ball. Nur den Ball.',
    outcomes: [
      { label: 'Schiri unterbricht', weight: 40, side: 'neutral', next: OVER },
      { label: 'Der Stürmer spielt weiter — durch', weight: 30, side: 'att', next: 'through_on_goal' },
      { label: 'Waldi ist zuerst dran', weight: 30, side: 'neutral', next: OVER },
    ],
  },
  {
    id: 'floodlights', role: 'midfielder',
    text: 'Das Flutlicht flackert und geht aus. Irgendwer sucht den Platzwart, der Platzwart sucht die Sicherung.',
    outcomes: [
      { label: 'Zwanzig Minuten Dunkelheit — Angriff abgebrochen', weight: 55, side: 'neutral', next: OVER },
      { label: 'Licht ist wieder da; Schiedsrichterball im Mittelfeld', weight: 45, side: 'att', next: 'midfield' },
    ],
  },
  {
    id: 'no_whistle', role: 'midfielder',
    text: 'Der Schiri lässt alles laufen. Er hat gestern mit beiden Mannschaften im Vereinsheim gesessen.',
    outcomes: [
      { label: '{player} wird umgehauen, kein Pfiff — Konter', weight: 45, side: 'def', next: 'counter', turnover: true },
      { label: '{player} bleibt auf den Beinen — durch', weight: 35, side: 'att', next: 'through_on_goal' },
      { label: 'Rudelbildung, dann Schiedsrichterball', weight: 20, side: 'att', next: 'midfield' },
    ],
  },
  {
    id: 'flag_up', role: 'striker',
    text: 'Die Fahne geht hoch. Der Linienrichter ist ein Vereinsmitglied, das findet der Gegner nicht neutral.',
    outcomes: [
      { label: 'Abseits', weight: 60, side: 'def', next: OVER },
      { label: 'Fahne wieder runter — weiter', weight: 40, side: 'att', next: 'through_on_goal' },
    ],
  },
  {
    id: 'injury', role: 'midfielder',
    text: '{player} geht runter und hält sich das Knie. Oder die Wade. Irgendwas.',
    outcomes: [
      { label: 'Wird runtergetragen; Angriff vorbei', weight: 60, side: 'neutral', next: OVER, then: [{ kind: 'injury' }] },
      { label: 'Alles gut — Schiedsrichterball', weight: 40, side: 'att', next: 'midfield' },
    ],
  },
  {
    id: 'bratwurst', role: 'midfielder',
    text: 'Der Grill am Vereinsheim fängt Feuer. Alle gucken rüber. Auch der Torwart. Auch der Schiri.',
    outcomes: [
      { label: 'Schiri unterbricht und holt sich eine', weight: 50, side: 'neutral', next: OVER },
      { label: 'Weiter geht\'s — Schiedsrichterball', weight: 30, side: 'att', next: 'midfield' },
      { label: 'Der Torwart guckt noch — durch', weight: 20, side: 'att', next: 'through_on_goal' },
    ],
  },
  {
    id: 'platzwart', role: 'midfielder',
    text: 'Der Platzwart fährt mit dem Rasenmäher durch den Mittelkreis. Er hat es nicht gesehen, sagt er.',
    outcomes: [
      { label: 'Rasenmäher im Weg — Angriff vorbei', weight: 55, side: 'neutral', next: OVER },
      { label: 'Ausweichmanöver, Ball auf den Flügel', weight: 45, side: 'att', next: 'flank' },
    ],
  },
  {
    id: 'maulwurf', role: 'midfielder',
    text: 'Der Ball verspringt auf einem Maulwurfshügel. Der Platz ist eine Zumutung, das sagt jeder, seit 1987.',
    outcomes: [
      { label: 'Verspringt ins Aus', weight: 45, side: 'neutral', next: OVER },
      { label: 'Verspringt am Torwart vorbei — Tor', weight: 20, side: 'att', next: GOAL },
      { label: 'Verspringt {player} vor die Füße — nochmal', weight: 35, side: 'att', next: 'edge_shot' },
    ],
  },
  {
    id: 'spaet_dran', role: 'striker',
    text: '{player} kommt gerade erst vom Parkplatz gerannt, das Trikot noch in der Hand.',
    outcomes: [
      { label: 'Ohne Stürmer verhungert der Angriff', weight: 50, side: 'def', next: OVER },
      { label: 'Er ist drin, und gleich durch', weight: 25, side: 'att', next: 'through_on_goal' },
      { label: 'Aufbau wie immer', weight: 25, side: 'att', next: 'midfield' },
    ],
  },
];

// ---- Game plan ----------------------------------------------------------
// Per dial value: situation id → outcome label → factor. The attacker's tempo and the defender's press
// both apply to every situation of the attack. Unlisted situations are untouched.

type Table = Record<string, Record<string, number>>;

export const TEMPO: Record<Tempo, Table> = {
  patient: {
    build_up: { 'Pass ins Mittelfeld': 1.15, 'Langer Hafer': 0.5, 'Fehlpass zum Gegner': 0.8 },
    midfield: { 'Auf den Flügel': 1.15, Steilpass: 0.7, 'Ball weg': 0.85 },
    flank: { Flanke: 1.1, 'Zieht nach innen': 0.9 },
  },
  direct: {
    build_up: { 'Pass ins Mittelfeld': 0.85, 'Langer Hafer': 1.8, 'Fehlpass zum Gegner': 1.2 },
    midfield: { 'Auf den Flügel': 0.8, Steilpass: 1.5, 'Ball weg': 1.2 },
    flank: { Flanke: 0.85, 'Zieht nach innen': 1.3 },
  },
};

export const PRESS: Record<Press, Table> = {
  high: {
    build_up: { 'Pass ins Mittelfeld': 0.85, 'Langer Hafer': 1.5, 'Fehlpass zum Gegner': 1.5 },
    midfield: { Steilpass: 1.25, 'Ball weg': 1.3 },
    flank: { Abgegrätscht: 1.1 },
    counter: { 'Steil — durch': 1.3 },              // space behind a high line, both ways
  },
  deep: {
    build_up: { 'Langer Hafer': 0.7, 'Fehlpass zum Gegner': 0.7 },
    midfield: { Steilpass: 0.8, 'Auf den Flügel': 1.1, 'Ball weg': 0.85 },
    through_on_goal: { Gehalten: 1.1 },
    header: { Geklärt: 1.25 },
    edge_shot: { Geblockt: 1.25 },
    free_kick: { Geklärt: 1.25 },
    counter: { 'Konter verpufft': 1.2 },
  },
};

export const DEFAULT_PLAN: Plan = { tempo: 'patient', press: 'deep' };

/** What the dials are called on the touchline. */
export const PLAN_LABEL: Record<Tempo | Press, string> = {
  patient: 'Geduldig', direct: 'Lange Bälle',
  deep: 'Tief stehen', high: 'Vorne drauf',
};
export const DIAL_LABEL = { tempo: 'Tempo', press: 'Pressing' } as const;

// ---- Cards --------------------------------------------------------------
// One rule: a card rewrites the table before the god rolls. Shouts are the coach's deck; every shout
// visibly changes the situation (replace) or the majority of its rows. Events are the world pile —
// the god draws them himself, nobody holds them.

const SHOTS = ['through_on_goal', 'header', 'edge_shot', 'free_kick'];
const ANY: 'any' = 'any';
const N = 'neutral' as const;
const replace = (situation: string) => [{ kind: 'replace' as const, situation }];

export const CARDS: Card[] = [
  // ---- Zurufe, im Angriff ----
  { id: 'hoof_it', name: 'Hau ihn lang!', kind: 'shout', side: 'att', situations: ['build_up'],
    text: 'Vergiss den Spielaufbau. Einmal hoch und weit, der Rest ist Glaubenssache. Kein Fehlpass möglich.',
    effects: replace('long_ball') },
  { id: 'win_the_foul', name: 'Foul ziehen!', kind: 'shout', side: 'att', situations: ['midfield', 'flank', 'counter'],
    text: 'Kontakt suchen und hinfallen. Freistoß, manchmal Elfmeter, manchmal Gelb.',
    effects: replace('draw_foul') },
  { id: 'go_down_easy', name: 'Fall hin!', kind: 'shout', side: 'att', situations: ['flank', 'edge_shot'],
    text: 'Im Sechzehner reicht ein Hauch. Elfmeter, wenn der Schiri es nicht sieht. Gelb, wenn doch.',
    effects: replace('dive') },
  { id: 'second_ball', name: 'Zweiter Ball!', kind: 'shout', side: 'att', situations: ['header', 'edge_shot', 'free_kick', 'corner'],
    text: 'Geklärt oder geblockt ist nicht vorbei: der Angriff geht im Mittelfeld weiter.',
    effects: [
      { kind: 'redirect', from: 'Geklärt', next: 'midfield' },
      { kind: 'redirect', from: 'Geblockt', next: 'midfield' },
    ] },
  { id: 'early_cross', name: 'Flanke rein!', kind: 'shout', side: 'att', situations: ['flank'],
    text: 'Nicht dribbeln, flanken. Früh, hoch, auf den langen Pfosten. Da steht hoffentlich der Richtige.',
    effects: replace('early_cross') },
  { id: 'hau_drauf', name: 'Hau drauf!', kind: 'shout', side: 'att', situations: ['midfield', 'flank', 'counter'],
    text: 'Aus dreißig Metern draufhauen. Selten drin, nie ein Konter, manchmal eine Ecke.',
    effects: replace('long_shot') },
  { id: 'keep_ball', name: 'Ruhig weiterspielen!', kind: 'shout', side: 'att', situations: ['build_up', 'midfield', 'flank', 'counter'],
    text: 'Ball halten, keinen Fehler machen. Kein Ballverlust, kein Konter, aber auch nicht viel nach vorne.',
    effects: replace('possession') },
  { id: 'trick_free_kick', name: 'Einstudiert!', kind: 'shout', side: 'att', situations: ['free_kick'],
    text: 'Die Variante vom Dienstagstraining. Wenn sie klappt, ist sie drin. Wenn nicht, läuft der Gegner.',
    effects: replace('trick_free_kick') },
  { id: 'cheer', name: 'Anfeuern!', kind: 'shout', side: 'att', situations: ANY,
    text: 'Der Zaun brüllt, die Bank brüllt, du brüllst. Alles nach vorne läuft ein bisschen besser.',
    effects: [{ kind: 'multiply', target: 'att', factor: 1.2 }] },
  { id: 'calm_down', name: 'Ruhig, Jungs!', kind: 'shout', side: 'att', situations: ANY,
    text: 'Keine Hektik. Weniger Fehlpässe, weniger Gestocher, weniger Geschenke für den Gegner.',
    effects: [{ kind: 'multiply', target: 'def', factor: 0.8 }] },
  { id: 'square_ball', name: 'Querlegen!', kind: 'shout', side: 'att', situations: ['through_on_goal'],
    text: 'Nicht schießen, querlegen. Der zweite Stürmer schiebt ein. Wenn der Torwart nicht schneller ist.',
    effects: replace('square_ball') },

  // ---- Zurufe, in der Abwehr ----
  { id: 'offside_trap', name: 'Rausrücken!', kind: 'shout', side: 'def', situations: ['midfield'],
    text: 'Abseitsfalle. Wenn alle mitmachen, ist der Steilpass Abseits. Wenn einer pennt, ist er allein durch.',
    effects: replace('offside_trap') },
  { id: 'take_him_out', name: 'Nimm ihn raus!', kind: 'shout', side: 'def', situations: ['midfield', 'flank', 'counter'],
    text: 'Den Angriff von hinten beenden. Meistens lässt der Schiri laufen. Manchmal zeigt er Rot, und dann fehlt einer.',
    effects: replace('cynical_foul') },
  { id: 'rush_out', name: 'Torwart, raus!', kind: 'shout', side: 'def', situations: ['through_on_goal'],
    text: 'Der Torwart kommt raus. Erstickt den Ball — oder räumt den Stürmer ab, und dann steht der Kassenwart im Tor.',
    effects: replace('keeper_rushes_out') },
  { id: 'last_ditch', name: 'Reingrätschen!', kind: 'shout', side: 'def', situations: ['through_on_goal'],
    text: 'Der letzte Mann wirft sich rein. Ball, Mann oder beides. Bei Mann gibt es Elfmeter und Rot.',
    effects: replace('last_ditch') },
  { id: 'everybody_back', name: 'Alle zurück!', kind: 'shout', side: 'def', situations: ['header', 'edge_shot', 'corner'],
    text: 'Alle Mann in den Sechzehner. Die meisten Schüsse werden geblockt; manche abgefälscht.',
    effects: replace('crowded_box') },
  { id: 'double_team', name: 'Doppeln!', kind: 'shout', side: 'def', situations: ['flank'],
    text: 'Zwei Mann auf den Flügelspieler. Meistens ist der Ball weg und der Konter läuft. Sonst ist die Mitte leer.',
    effects: replace('double_team') },
  { id: 'trainer_rastet_aus', name: 'Ausraster', kind: 'shout', side: 'def', situations: SHOTS,
    text: 'Du stürmst an die Seitenlinie und brüllst den Schiri an. Der pfeift lieber mal ab. Oder schickt dich auf die Tribüne, und dann brüllst du nie wieder.',
    effects: replace('trainer_tobt') },
  { id: 'provoke', name: 'Provozieren!', kind: 'shout', side: 'def', situations: ['midfield', 'flank', 'counter'],
    text: 'Einer redet auf den Ballführer ein. Irgendwer sieht Rot: er, oder deiner.',
    effects: replace('provoke') },
  { id: 'stay_back', name: 'Hinten bleiben!', kind: 'shout', side: 'def', situations: ANY,
    text: 'Keiner rückt raus, keiner will den Ball. Alles, was der Gegner falsch machen kann, macht er ein bisschen öfter.',
    effects: [{ kind: 'multiply', target: 'def', factor: 1.2 }] },
  { id: 'focus', name: 'Konzentration!', kind: 'shout', side: 'def', situations: ANY,
    text: 'Augen auf, Mann decken, Beine zu. Was der Gegner nach vorne versucht, klappt ein bisschen seltener.',
    effects: [{ kind: 'multiply', target: 'att', factor: 0.85 }] },
  { id: 'press_build_up', name: 'Anlaufen!', kind: 'shout', side: 'def', situations: ['build_up'],
    text: 'Beide Stürmer auf den Verteidiger. Fehlpass und Konter, oder er drischt ihn drüber.',
    effects: replace('press_build_up') },
  { id: 'wall', name: 'Mauer stellen!', kind: 'shout', side: 'def', situations: ['free_kick'],
    text: 'Fünf Mann rein, Hände vors Gesicht. Meistens bleibt der Ball in der Mauer. Manchmal geht er drüber.',
    effects: replace('wall') },
  { id: 'keeper_dance', name: 'Torwart, tanz!', kind: 'shout', side: 'def', situations: ['penalty'],
    text: 'Der Torwart soll auf der Linie tanzen und in eine Ecke zeigen. Kreisklasse-Schützen gucken hin.',
    effects: replace('keeper_dance') },

  // ---- Ereignisse: der Fußballgott zieht selbst ----
  { id: 'dog_on_pitch', name: 'Waldi!', kind: 'event', side: ANY, situations: ANY,
    text: 'Der Hund vom Platzwart rennt aufs Feld. Vielleicht wird abgepfiffen, vielleicht nicht.',
    effects: replace('dog_on_pitch') },
  { id: 'floodlight_failure', name: 'Flutlichtausfall', kind: 'event', side: ANY, situations: ANY,
    text: 'Das Licht geht aus. Der Angriff ist wahrscheinlich hin.',
    effects: replace('floodlights') },
  { id: 'ref_swallows_whistle', name: 'Schiri lässt laufen', kind: 'event', side: ANY, situations: ['midfield', 'flank'],
    text: 'Alles erlaubt. Irgendwer wird umgehauen, oder irgendwer kommt durch.',
    effects: replace('no_whistle') },
  { id: 'linesmans_flag', name: 'Die Fahne', kind: 'event', side: ANY, situations: ['through_on_goal'],
    text: 'Der Linienrichter hebt die Fahne. Meistens bleibt sie oben.',
    effects: replace('flag_up') },
  { id: 'injury_stoppage', name: 'Verletzung', kind: 'event', side: ANY, situations: ['midfield', 'flank', 'counter'],
    text: 'Einer liegt. Wenn er nicht aufsteht, ist er weg, und die Bank muss ran.',
    effects: replace('injury') },
  { id: 'bratwurst', name: 'Bratwurstalarm', kind: 'event', side: ANY, situations: ANY,
    text: 'Der Grill am Vereinsheim brennt. Alle gucken rüber, auch der Schiri.',
    effects: replace('bratwurst') },
  { id: 'platzwart', name: 'Der Platzwart', kind: 'event', side: ANY, situations: ['build_up', 'midfield'],
    text: 'Der Platzwart mäht. Jetzt. Mitten im Spiel. Er hat es nicht gesehen, sagt er.',
    effects: replace('platzwart') },
  { id: 'maulwurf', name: 'Maulwurfshügel', kind: 'event', side: ANY, situations: ['through_on_goal', 'edge_shot', 'free_kick'],
    text: 'Der Ball verspringt. Ins Aus, ins Tor oder vor die Füße — der Maulwurf entscheidet.',
    effects: replace('maulwurf') },
  { id: 'verpennt', name: 'Stürmer verpennt', kind: 'event', side: ANY, situations: ['build_up'],
    text: 'Der Stürmer kommt gerade erst vom Parkplatz. Der Angriff läuft erstmal ohne ihn.',
    effects: replace('spaet_dran') },
  { id: 'downpour', name: 'Wolkenbruch', kind: 'event', side: ANY, situations: ANY,
    text: 'Den Rest des Spiels rutscht der Ball, Schüsse gehen vorbei, Klärungen fliegen irgendwohin.',
    effects: [{ kind: 'match', label: 'Wolkenbruch', target: N, factor: 1.4 }] },
];

/** The coach's pool: every shout. A match deals K.pileAtt attacking and K.pileDef defending ones. */
export const DEFAULT_DECK: string[] = CARDS.filter(c => c.kind === 'shout').map(c => c.id);
/** The world pile: every event, shuffled at kick-off, drawn by the god. */
export const EVENT_POOL: string[] = CARDS.filter(c => c.kind === 'event').map(c => c.id);

// ---- Kader ----------------------------------------------------------------
// Eleven starters (1-3-3-2-2), a bench of three. Specials are Dorfbiografien. Nobody has a strength value.

const mult = (target: string, factor: number) => [{ kind: 'multiply' as const, target, factor }];

export const LINEUP_A: Player[] = [
  { name: 'Schorsch', role: 'keeper' },
  { name: 'Erwin', role: 'defender' }, { name: 'Uwe', role: 'defender' },
  { name: 'Horst', role: 'defender',
    special: { situation: 'build_up', text: 'Spielt seit 1988 nur lange Bälle. Langer Hafer ×1,6.', effects: mult('Langer Hafer', 1.6) } },
  { name: 'Kevin', role: 'midfielder' }, { name: 'Manni', role: 'midfielder' }, { name: 'Flo', role: 'midfielder' },
  { name: 'Luca', role: 'winger' },
  { name: 'Jochen', role: 'winger',
    special: { situation: 'flank', text: 'Flankt seit zwanzig Jahren auf den langen Pfosten. Immer. Flanke ×1,3.', effects: mult('Flanke', 1.3) } },
  { name: 'Kalle', role: 'striker',
    special: { situation: 'header', text: 'Kopfballungeheuer. Tor ×1,4 bei Kopfbällen.', effects: mult('Tor', 1.4) } },
  { name: 'Bello', role: 'striker' },
];
export const BENCH_A: Player[] = [
  { name: 'Rudi', role: 'striker',
    special: { situation: 'penalty', text: 'Eiskalt vom Punkt, seit dem Dorffest 2009. Tor ×1,25 bei Elfmetern.', effects: mult('Tor', 1.25) } },
  { name: 'Sascha', role: 'midfielder' },
  { name: 'Dennis', role: 'winger' },
];

export const LINEUP_B: Player[] = [
  { name: 'Olaf', role: 'keeper' },
  { name: 'Dieter', role: 'defender',
    special: { situation: 'build_up', text: 'Sparkassenfilialleiter, macht keine Fehler. Fehlpass ×0,7.', effects: mult('Fehlpass zum Gegner', 0.7) } },
  { name: 'Ralf', role: 'defender' }, { name: 'Achim', role: 'defender' },
  { name: 'Sven', role: 'midfielder',
    special: { situation: 'edge_shot', text: 'Der Hammer aus der zweiten Reihe. Tor ×1,4 vom Sechzehner.', effects: mult('Tor', 1.4) } },
  { name: 'Torben', role: 'midfielder' }, { name: 'Patrick', role: 'midfielder' },
  { name: 'Nico', role: 'winger' },
  { name: 'Timo', role: 'winger',
    special: { situation: 'flank', text: 'Siebzehn und schnell. Die Verteidiger sind achtunddreißig. Abgegrätscht ×0,7.', effects: mult('Abgegrätscht', 0.7) } },
  { name: 'Ronny', role: 'striker' }, { name: 'Mehmet', role: 'striker' },
];
export const BENCH_B: Player[] = [
  { name: 'Basti', role: 'midfielder',
    special: { situation: 'free_kick', text: 'Standardspezialist, übt auf dem Schulhof. Tor ×1,5 bei Freistößen.', effects: mult('Tor', 1.5) } },
  { name: 'Ali', role: 'striker' },
  { name: 'Jens', role: 'defender' },
];

export const situationById = new Map(SITUATIONS.map(s => [s.id, s]));
export const cardById = new Map(CARDS.map(c => [c.id, c]));
