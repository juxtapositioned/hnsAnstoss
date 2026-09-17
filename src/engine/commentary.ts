// Der Stadionsprecher und der Zaun. Pure text, no logic in the tables; the picker hashes instead of
// drawing from the match rng so the flavour never changes which outcome the god rolls.

import type { Resolution } from './types';
import { GOAL, OVER } from './types';

// ---- Anpfiff / Abpfiff ----------------------------------------------------

const KICKOFF = [
  'Anpfiff auf dem Sportplatz an der B12. {n} Zuschauer, davon {d} Hunde und ein Traktor.',
  'Anpfiff. {n} Zuschauer, {d} davon Verwandte, der Rest wartet auf die Bratwurst.',
  'Der Schiri pfeift an, {n} Leute am Zaun, {d} Hunde, und Oma Gerda hat ihren Klappstuhl dabei.',
  'Anpfiff. Der Platz ist frisch gemäht, also halb. {n} Zuschauer, {d} Hunde.',
  'Es geht los. {n} Zuschauer, {d} Hunde, und der Bürgermeister, der sich für einen Fan hält.',
];

const WIN = [
  'Sieg! Freibier im Vereinsheim, der Vorstand zahlt. Also der Kassenwart. Also du.',
  'Gewonnen! Oma Gerda weint. Der Platzwart auch, aber wegen dem Rasen.',
  'Drei Punkte! Die Kabine singt, der Schiri flüchtet, das Dorf hat wieder ein Thema.',
  'Sieg. Im Dorfblatt steht morgen „Souveräner Auftritt“. Es war nicht souverän.',
];
const LOSS = [
  'Verloren. Der Vorstand berät. Der Vorstand berät immer, das heißt nichts.',
  'Niederlage. Im Vereinsheim läuft trotzdem der Zapfhahn, nur leiser.',
  'Verloren. Der Trainer sagt „Wir nehmen das Positive mit“. Es gibt nichts Positives.',
  'Niederlage. Der Zaun fährt heim. Waldi bleibt, der mag den Rasen.',
];
const DRAW = [
  'Unentschieden. Wie immer. Wie jedes Jahr. Wie damals gegen Oberdorf.',
  'Remis. Beide Trainer sagen, das war zu wenig. Beide haben recht.',
  'Unentschieden. Der Schiri ist der Einzige, der gewonnen hat: keiner hat ihn geschlagen.',
];

// ---- Nach dem Würfelwurf ----------------------------------------------------
// Specific lines by "situation:label"; the generic pools catch everything else.

const SPECIFIC: Record<string, string[]> = {
  'build_up:Langer Hafer': [
    'Langer Hafer! Der Klassiker, seit 1974 unverändert.',
    'Hoch und weit! Der Zaun johlt. Das ist Fußball, wie das Dorf ihn versteht.',
  ],
  'build_up:Fehlpass zum Gegner': [
    'Fehlpass. Direkt zum Gegner. Der Zaun stöhnt kollektiv.',
    'Der Pass geht zum Gegner. Vom Zaun: „Das ist mein Neffe, ich schäm mich.“',
  ],
  'midfield:Ball weg': [
    'Ball weg. Vom Zaun: „Den Pass hätte meine Oma gespielt, mit Rollator.“',
    'Abgelaufen. Der Trainer tritt gegen die Trinkflasche. Die Trinkflasche war leer.',
  ],
  'flank:Abgegrätscht': [
    'Abgegrätscht! Der Rasen fliegt, das Schienbein fast auch.',
    'Grätsche! Vom Zaun: „Das ist Kreisklasse, kein Ballett!“',
  ],
  'flank:Flanke': ['Flanke rein! Irgendwer wird schon da sein.'],
  'penalty:Tor': [
    'Elfmeter drin! Eiskalt. Also der Ball, nicht der Schütze, der zittert noch.',
    'Verwandelt! Der Torwart hat die Ecke gewusst. Der Ball war trotzdem drin.',
  ],
  'penalty:Gehalten': [
    'Gehalten! Der Torwart lässt sich feiern wie nach einem Pokalfinale.',
    'Der Torwart hält! Er wird das die nächsten dreißig Jahre erzählen.',
  ],
  'penalty:Drüber': [
    'Drüber! Der Ball ist über den Zaun. Irgendwer holt ihn, aber nicht der Schütze.',
    'In die Wolken. Vom Zaun: „Der wollte den Kirchturm treffen.“',
  ],
  'long_ball:Direkt in die Arme des Torwarts': ['Direkt in die Arme des Torwarts. Der freut sich, so oft hat er den Ball sonst nicht.'],
  'cynical_foul:Rot, und Freistoß': ['ROT! Der Sünder guckt, als hätte er noch nie einen Menschen berührt.'],
  'keeper_rushes_out:Erstickt den Ball': ['Der Torwart wirft sich rein! Mutig. Oder lebensmüde.'],
  'trainer_tobt:Trainer auf die Tribüne, Freistoß': ['Der Trainer muss auf die Tribüne. Es gibt keine Tribüne. Er stellt sich hinter den Zaun und brüllt weiter.'],
  'trainer_tobt:Schiri pfeift ab — Angriff vorbei': ['Der Schiri pfeift ab, ohne Grund, aber mit Nachdruck. Der Trainer setzt sich wieder.'],
  'dog_on_pitch:Waldi ist zuerst dran': [
    'Waldi hat den Ball. Waldi gibt den Ball nicht her. Waldi ist der Held des Tages.',
    'Waldi ist schneller als alle 22. Das war absehbar.',
  ],
  'dog_on_pitch:Schiri unterbricht': ['Unterbrechung. Der Platzwart pfeift, Waldi hört nicht, der Schiri auch nicht.'],
  'dog_on_pitch:Der Stürmer spielt weiter — durch': ['Der Stürmer tänzelt um den Hund! Waldi bellt. Der Zaun bellt mit.'],
  'floodlights:Zwanzig Minuten Dunkelheit — Angriff abgebrochen': [
    'Dunkel. „Wer hat die Sicherung?“ — „Der Platzwart.“ — „Wo ist der Platzwart?“ — „Bratwurst.“',
  ],
  'floodlights:Licht ist wieder da; Schiedsrichterball im Mittelfeld': ['Licht! Applaus für den Platzwart, sein erster in dieser Saison.'],
  'flag_up:Abseits': ['Abseits! Der Linienrichter ist übrigens der Schwager vom Torwart.'],
  'flag_up:Fahne wieder runter — weiter': ['Die Fahne geht wieder runter. Der Linienrichter hat den Schwager mal im Stich gelassen.'],
  'injury:Wird runtergetragen; Angriff vorbei': ['Einer liegt. Der Physio ist der Metzger, aber der kennt sich mit Fleisch aus.'],
  'injury:Alles gut — Schiedsrichterball': ['Er steht wieder. Eisspray, ein Schluck Bier, weiter geht\'s.'],
  'bratwurst:Schiri unterbricht und holt sich eine': ['Es riecht nach Bratwurst. Der Schiri guckt Richtung Grill. Der Schiri hat Hunger. Der Schiri geht.'],
  'bratwurst:Der Torwart guckt noch — durch': ['Der Torwart guckt zum Grill. Der Stürmer nicht.'],
  'platzwart:Rasenmäher im Weg — Angriff vorbei': ['Der Platzwart winkt freundlich vom Rasenmäher. Er hört nicht, weil er nicht zuhört.'],
  'platzwart:Ausweichmanöver, Ball auf den Flügel': ['Um den Rasenmäher herum! Das war das beste Dribbling des Tages.'],
  'maulwurf:Verspringt ins Aus': ['Der Platz wird jedes Jahr gewalzt. Der Maulwurf freut sich jedes Jahr.'],
  'maulwurf:Verspringt am Torwart vorbei — Tor': ['Verspringt und drin! Der Maulwurf bekommt eine Vereinsnadel.'],
  'spaet_dran:Ohne Stürmer verhungert der Angriff': ['Der Stürmer schnürt noch die Schuhe. Der Angriff hat nicht gewartet.'],
  'spaet_dran:Er ist drin, und gleich durch': ['Reingesprintet und durch! Das Trikot hat er unterwegs angezogen, halb.'],
  'cynical_foul:Pfiff, Freistoß im Nirgendwo — Angriff vorbei': ['Umgesenst! Der Schiri pfeift, zeigt nichts, und der Zaun nickt: „War taktisch.“'],
  'cynical_foul:Ball gewonnen, Foul übersehen — Konter': ['Foul? Der Schiri hat nichts gesehen. Der Ball ist weg, und vorne läuft einer.'],
  'cynical_foul:Gelb, und Freistoß': ['Gelb. Der Sünder nickt, als hätte er es bestellt. Hat er.'],
  'keeper_rushes_out:Räumt ihn ab — Elfmeter, Rot für den Torwart': ['Der Torwart nimmt Mann, Ball und ein bisschen Rasen mit. Elfmeter, Rot, und der Kassenwart zieht sich die Handschuhe an.'],
  'no_whistle:{player} wird umgehauen, kein Pfiff — Konter': ['Umgehauen, kein Pfiff. Der Schiri guckt in die andere Richtung, sehr konzentriert. Und der Gegner läuft.'],
  'draw_foul:Pfiff — Freistoß': ['Gefoult, sagt der Schiri. „Gefallen“, sagt der Zaun. Freistoß.'],
  'draw_foul:Im Sechzehner erwischt — Elfmeter': ['Im Sechzehner erwischt! Der Schiri zeigt auf den Punkt, der Zaun tobt, in beide Richtungen.'],
  'dive:Elfmeter!': ['Er fliegt, der Schiri zeigt auf den Punkt! Vom Zaun: „Das war nie!“ — „Doch!“ — „Nie!“'],
  'dive:Freistoß am Sechzehner': ['Freistoß, knapp vor dem Sechzehner. Der Schiri war sich nicht sicher, das sieht man ihm an.'],
  'early_cross:Kommt an — Kopfball': ['Flanke, blind geschlagen, und da steht einer! Zufall ist auch eine Taktik.'],
  'early_cross:Zu lang — Abstoß': ['Zu lang. Der Ball fliegt über alle und landet beim Bratwurststand.'],
  'long_shot:Tor': ['AUS DREISSIG METERN! Der Torwart hat ihn erst gesehen, als er drin war.'],
  'long_shot:Drüber, in den Acker': ['Drüber. Weit drüber. Der Bauer nebenan hat jetzt einen Ball.'],
  'long_shot:Abgefälscht — Ecke': ['Abgefälscht, Ecke! Der Verteidiger guckt auf sein Bein, als wäre es nicht seins.'],
  'possession:Verschleppt, Angriff verpufft': ['Quer, zurück, quer, zurück. Der Zaun pfeift. Der Angriff schläft ein.'],
  'possession:Lücke — Steilpass': ['Und plötzlich die Lücke! Geduld, sagt der Trainer, das war Geduld.'],
  'trick_free_kick:Tor': ['DIE VARIANTE! Die vom Dienstag! Sie hat geklappt! Der Trainer weint fast.'],
  'trick_free_kick:Verstolpert': ['Drei laufen drüber, der vierte stolpert. Die Variante braucht noch einen Dienstag.'],
  'trick_free_kick:Abgefangen — Konter': ['Der Gegner hat die Variante gelesen. Und läuft.'],
  'offside_trap:Abseits': ['Abseits! Alle sind rausgerückt, sogar der Torwart, der wusste nicht warum.'],
  'offside_trap:Einer pennt — {player} ist durch, ganz allein': ['Alle rücken raus. Einer nicht. {player} ist durch, und der eine wird am Montag nicht angerufen.'],
  'crowded_box:Abgefälscht — drin': ['Abgefälscht! Von wem? Egal! Drin!'],
  'crowded_box:Geblockt': ['Geblockt. Mit dem Oberschenkel, dem Bauch und ein bisschen Ehre.'],
  'crowded_box:Geblockt, und Konter': ['Geblockt, und der Ball springt nach vorne, und da ist keiner mehr außer unserem. Konter!'],
  'double_team:Abgelaufen — Konter': ['Zwei Mann, ein Ball, und der Ball ist weg. Vorne ist niemand. Konter.'],
  'double_team:Durch die Lücke — durch': ['Zwei auf den Flügel, keiner in der Mitte. Der Pass in die Mitte. Durch.'],
  'last_ditch:Zu spät — Tor': ['Die Grätsche kommt, der Ball ist schon weg. Drin.'],
  'last_ditch:Foul — Elfmeter, und Rot': ['Grätsche, Mann getroffen, kein Ball. Elfmeter, Rot, und der Zaun ist sich einig: „Das war nie Rot.“ War es.'],
  'last_ditch:Ball erobert — Konter': ['GRÄTSCHE! Ball! Sauber! Der Zaun johlt, der Stürmer liegt, und vorne ist Platz.'],
  'provoke:{player} schlägt zu — Rot': ['Er hat zugeschlagen. Vor dem Schiri. Rot. Vom Zaun: „Das über seine Mutter war aber auch hart.“'],
  'provoke:Rot für den Provokateur, Freistoß': ['Der Schiri hat es gehört. Rot für den Provokateur. Der wusste nicht, dass der Schiri die Familie kennt.'],
  'provoke:{player} lacht nur — weiter': ['{player} lacht nur und spielt weiter. Das war das Schlimmste, was er tun konnte.'],
  'trainer_tobt:Schiri lässt laufen — weiter': ['Der Trainer tobt, der Schiri winkt ab, das Spiel läuft. Keiner hat hingeguckt.'],
  'square_ball:Eingeschoben — Tor': ['Quergelegt, eingeschoben, drin! Der Passgeber will auch gefeiert werden. Wird er nicht.'],
  'square_ball:Torwart fängt den Querpass': ['Quergelegt, und der Torwart liegt drauf. Vom Zaun: „SCHIESS DOCH!“ Zu spät.'],
  'press_build_up:Fehlpass — Konter': ['Angelaufen, Fehlpass, Konter! Der Verteidiger guckt seine Schuhe an.'],
  'press_build_up:Drüber gehauen — durch': ['Angelaufen, und er haut ihn einfach drüber. Und vorne läuft einer ein. Das war Glück, das war Plan, egal.'],
  'wall:In die Mauer — geklärt': ['In die Mauer. Einer hat was abgekriegt, wo es weh tut. Der Zaun lacht.'],
  'wall:Drüber — Tor': ['Über die Mauer, in den Winkel! Die Mauer dreht sich um und sieht nur noch das Netz.'],
  'keeper_dance:Gehalten': ['Der Torwart hat getanzt, der Schütze hat hingeguckt, gehalten! Der Torwart tanzt weiter.'],
  'keeper_dance:Tor': ['Der Torwart tanzt, der Schütze nicht. Drin. Der Torwart hört auf zu tanzen.'],
  'counter:Konter verpufft': ['Konter! Und dann der Querpass ins Nichts. Da war keiner. Da ist nie einer.'],
  'counter:Steil — durch': ['Umschaltspiel! Ein Pass, und der Stürmer ist allein. Der Zaun findet plötzlich Taktik gut.'],
  'corner:Kopfball — Tor': ['Ecke, Kopfball, drin! Der Torwart war noch beim Zurückschicken vom eigenen Torwart.'],
  ':Gelb wegen Schwalbe': ['Schwalbe! Gelb! Vom Zaun: „Sowas gab\'s früher nicht!“ (Gab\'s.)'],
  ':Schiri lässt laufen — Konter': ['Er liegt, der Schiri lässt laufen, und der Gegner läuft mit. Konter.'],
  ':Abseits': ['Abseits! Vom Zaun kommt ein „NIEMALS!“, das man im Nachbardorf gehört hat.'],
};

const KONTER = [
  'Ball weg, und der Gegner rennt. Vom Zaun: „HINTEN! HINTEN!“ Hinten ist keiner.',
  'Ballverlust. Konter. Der Trainer dreht sich zur Bank, die Bank guckt weg.',
  'Abgefangen, und jetzt geht es andersrum. Schnell. Zu schnell für die Abwehr.',
  'Umschaltmoment, sagt der Stadionsprecher. Er hat das Wort im Fernsehen gehört.',
];

const TOR = [
  'TOOOR! Der Stadionsprecher fällt vom Stuhl.',
  'Drin! Am Zaun fliegt ein Bierbecher. Ein leerer, zum Glück.',
  'Tor! Der Torwart diskutiert mit seiner Abwehr. Die Abwehr diskutiert mit dem Torwart.',
  'Tor! Oma Gerda hat es nicht gesehen, sie war Bratwurst holen.',
  'Tor! Irgendwo im Dorf geht ein Fenster auf.',
  'Tor! Der Platzwart nickt anerkennend. Das macht er sonst nie.',
  'Drin! Der Torschütze rennt zum Zaun und wird von seiner Mutter umarmt.',
];
const GEHALTEN = [
  'Gehalten! Der Torwart tut so, als wäre das Absicht gewesen.',
  'Der Torwart hat ihn. Mit dem Gesicht, aber er hat ihn.',
  'Gehalten. Der Zaun ist sich einig: „Den muss er machen.“',
  'Parade! Der Torwart ist eigentlich Dachdecker, aber heute nicht.',
];
const DANEBEN = [
  'Vorbei. Der Ball liegt jetzt im Maisfeld. Wer holt ihn?',
  'Drüber. Das war Richtung Vereinsheim, nicht Richtung Tor.',
  'Daneben. Vom Zaun: „Mein Opa hätte den gemacht, und der ist seit zehn Jahren tot.“',
  'Neben das Tor. Der Ball rollt zur B12. Vorsicht beim Holen.',
  'Geklärt, irgendwohin. Der Ball ist weg, der Angriff auch.',
];
const ABWEHR = [
  'Ball weg. Der Trainer tritt gegen die Trinkflasche.',
  'Nix da. Der Ball ist hinten, der Angriff ist vorbei, der Trainer ist rot im Gesicht.',
  'Angriff vorbei. Der Stadionsprecher liest inzwischen die Bratwurstpreise vor.',
  'Abgefangen. Vom Zaun: „Jungs, ihr spielt wie meine Frau kocht.“ Seine Frau steht daneben.',
];
const WEITER = [
  'Weiter geht\'s. Am Zaun wird es kurz still.',
  'Und der Ball läuft. Irgendwer ruft „HINTEN!“, keiner weiß warum.',
  'Das läuft. Der Trainer brüllt was, das im Dorf noch niemand verstanden hat.',
  'Schön gespielt. Für Kreisklasse.',
  'Weiter, weiter! Oma Gerda steht auf. Das macht sie nur bei Gefahr.',
];

// ---- Picker ---------------------------------------------------------------

function hash(...parts: (number | string)[]): number {
  let h = 2166136261;
  for (const p of parts) for (const ch of String(p)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = (pool: string[], h: number) => pool[h % pool.length]!;

export function kickoffLine(seed: number): string {
  const h = hash(seed, 'kickoff');
  return pick(KICKOFF, h).replace('{n}', String(23 + (h >> 8) % 60)).replace('{d}', String(3 + (h >> 16) % 9));
}

export function fullTimeLine(seed: number, won: boolean, draw: boolean): string {
  return pick(draw ? DRAW : won ? WIN : LOSS, hash(seed, 'fulltime'));
}

/** One line from the Stadionsprecher or the Zaun for what the god just rolled. */
export function commentLine(res: Resolution, seed: number, attackIndex: number, step: number): string {
  const { outcome } = res;
  const h = hash(seed, attackIndex, step, outcome.label);
  const pool = SPECIFIC[`${res.situationId}:${outcome.label}`] ?? SPECIFIC[`:${outcome.label}`]
    ?? (outcome.next === GOAL ? TOR
      : outcome.turnover ? KONTER
      : outcome.next !== OVER ? WEITER
      : outcome.label === 'Gehalten' ? GEHALTEN
      : outcome.side === 'def' ? ABWEHR
      : DANEBEN);
  return pick(pool, h).replace(/\{player\}/g, res.playerName);
}
