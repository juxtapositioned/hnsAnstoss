import type { Card, Gauges, Loadout } from '../types';
import { ECHO, MISS, MISS_BY_CARD } from './echoes';

export { MISS };

// The cards, v0.15 (DESIGN §2.2). A card is shouted with the ball or without it; the deck at the bottom
// puts eighteen of them into the six situations (DESIGN §2.1) — ball action, challenge, set piece, each
// with and without the ball — three to a situation.
//
// A shout *pulls*: the rows it names get `pull` of the way towards certain (0.6: a 10 % cross becomes a
// 64 % cross, a 40 % one 76 %), the rows it pushes down lose `pull` of their weight. So a simple shout
// makes one or two outcomes very likely, and the place decides which of them even exist: "Flanke!" on the
// wing in their half is a cross, in our own half it lies grey, because nobody crosses from there. A shout
// names what the man *does* — the shot, the cross, the long ball — never how it turns out: "Schieß!"
// makes the shot likely and leaves the goal to the place and the keeper. The few that lean a result
// (Freibier!, Auf der Linie!) pull softly.
//
// A card is playable only where it does something (v0.11): it must lean at least one row of this panel's
// table and leave at least one alone. Selectors are row ids ('flanke', 'kopfball') or row kinds with '#'
// — '#pfiff', '#gegenpfiff', '#gefahr', '#fehler', '#geklaert' (types.ts `RowTag`, seen from the side that
// has the initiative). Row ids live in ../sim.ts (the football) and ./scenes.ts (the drama).
// Rules for writing a card: the shout in the name, one line of text that is the picture and nothing else —
// no outcomes, no "eher", no conditions (v0.10: a card never explains what it does) — and no numbers. Check a new card in `npm run strip -- --cover` and --values.

const shout = (
  id: string, name: string, side: Card['side'], text: string,
  up: string[], line: string,
  extra: { down?: string[]; pull?: number; playableIn?: string[]; alt?: string[] } = {},
): Card => ({
  id, name, text, kind: 'shout', side, playableIn: extra.playableIn,
  effect: { kind: 'shout', up, down: extra.down, pull: extra.pull ?? 0.6, line, alt: extra.alt },
});

/** An event (v0.16): pulls like a shout, but nobody shouts it — the village does it. `line` says what happens. */
const event = (
  id: string, name: string, side: Card['side'], text: string,
  up: string[], line: string,
  extra: { down?: string[]; pull?: number; playableIn?: string[]; alt?: string[] } = {},
): Card => ({ ...shout(id, name, side, text, up, line, extra), kind: 'event' });

const WRITTEN: Card[] = [
  // ---- Shouts with the ball (open play) ----
  shout('schiess', 'Schieß!', 'ball', 'Nicht lang fackeln.',
    ['schuss', 'volley'],
    'Von der Bank: "SCHIESS!"', { pull: 0.65 }),
  shout('flanke', 'Flanke!', 'ball', 'Rein damit, hoch in die Mitte.',
    ['flanke'],
    'Von der Bank: "FLANKE!"', { pull: 0.65 }),
  shout('steil', 'Steil!', 'ball', 'Steckt durch, der läuft schon.',
    ['steilpass', 'durch', 'geniestreich', 'ausgerueckt'],
    'Von der Bank: "STEIL! STEIL!"'),
  shout('kopf', 'Kopf!', 'ball', 'Hoch damit. Einer steigt.',
    ['kopfball', 'torwart_kopfball'],
    'Von der Bank: "KOPF! KOPF!"', { pull: 0.55 }),
  shout('lang', 'Lang!', 'ball', 'Nicht hinten rumspielen.',
    ['langer_ball', 'abschlag', 'nach_vorne', 'ausgerueckt'],
    'Von der Bank: "LANG! LAAANG!"',
    { down: ['querpass', 'rueckpass', 'abwurf'] }),
  shout('kurz', 'Kurz!', 'ball', 'Kurz und sicher, auch wenn die Bierbank pfeift.',
    ['querpass', 'abwurf', 'rueckpass'],
    'Von der Bank: "KURZ! KURZ SPIELEN!"',
    { down: ['langer_ball', 'lang_verloren', 'abschlag', 'abschlag_verloren', 'ballverlust', 'patzer'] }),
  shout('leg_quer', 'Leg quer!', 'ball', 'Der Nebenmann steht doch frei.',
    ['zurueckgelegt', 'quergelegt', 'fluegel'],
    'Von der Bank: "QUER! LEG QUER!"'),
  shout('lauf', 'Lauf!', 'ball', 'Beine in die Hand.',
    ['dribbling', 'durch', 'unserer', 'ausgerueckt', 'weggetreten'],
    'Von der Bank: "LAUF! LAUF! LAUF!"'),
  // Lives on two tags: nobody does something stupid, and nobody talks himself into a yellow. That makes
  // it the card that works in almost every panel of the match, drama included — the coach's clearing of
  // the throat. `up` is empty on purpose: it is heard unless one of its rows came up anyway.
  shout('ruhig', 'Ruhig!', 'ball', 'Puls runter, Jungs.',
    [], 'Von der Bank: "RUUUHIG!"',
    { down: ['#fehler', '#gegenpfiff'] }),
  // The bench's arms go up wherever a referee is deciding something — a foul, a yellow for their man,
  // Erwin's flag. '#pfiff' is every row where the whistle goes our way; in the box that is a penalty.
  shout('schiri', 'Schiri!!', 'ball', 'Alle Arme hoch. Der hat doch was gesehen.',
    ['#pfiff'],
    'Von der Bank, mit beiden Armen: "SCHIRIII!"', { pull: 0.5 }),
  shout('trau_dich', 'Trau dich!', 'ball', 'Nicht den sicheren Pass. Den anderen.',
    ['#gefahr'],
    'Von der Bank: "TRAU DICH!"', { pull: 0.35 }),
  shout('absichern', 'Absichern!', 'ball', 'Einer bleibt hinten. Einer!',
    [], 'Von der Bank: "EINER BLEIBT HINTEN!"',
    { down: ['ballverlust', 'abgegraetscht', 'lang_verloren', 'abschlag_verloren', 'patzer', 'leeres_tor', 'ihrer'], pull: 0.5 }),
  shout('freibier', 'Freibier!', 'ball', 'Der Wirt zahlt pro Tor eine Runde.',
    ['tor', 'drin', 'torwart_kopfball', 'im_dunkeln', 'abgestaubt'],
    'Von der Bank: "FREIBIER! DER WIRT ZAHLT!"', { pull: 0.3 }),

  // v0.16: more with the ball. Über außen! and Doppelpass! pick a way forward, Tempo raus! is the safe
  // brother of Trau dich!, Nachsetzen! is for the ball the keeper does not hold.
  shout('ueber_aussen', 'Über außen!', 'ball', 'Da ist Platz. Da war immer Platz.',
    ['fluegel', 'flanke'],
    'Von der Bank: "ÜBER AUSSEN! AUSSEN IST FREI!"',
    { pull: 0.55 }),
  shout('doppelpass', 'Doppelpass!', 'ball', 'Gib und geh. Wie im Training. Also nie.',
    ['querpass', 'steilpass', 'durch', 'quergelegt'],
    'Von der Bank: "DOPPELPASS! GIB UND GEH!"', { pull: 0.5 }),
  shout('tempo_raus', 'Tempo raus!', 'ball', 'Einmal durchatmen. Die Wurst läuft nicht weg.',
    ['querpass', 'rueckpass', 'abwurf'],
    'Von der Bank: "TEMPO RAUS! GANZ RUHIG!"',
    { down: ['steilpass', 'durch', 'andribbeln'], playableIn: ['play', 'duel', 'counter', 'keeperball'], pull: 0.5 }),
  shout('nachsetzen', 'Nachsetzen!', 'ball', 'Einer geht immer mit.',
    ['abgewehrt', 'zweiter_ball'],
    'Von der Bank: "NACHSETZEN! GEH MIT!"',
    { down: ['gehalten'], pull: 0.5 }),
  // v0.16, the challenge with the ball: the nutmeg that is all or nothing, the backside that keeps it,
  // and the honest little brother of Schwalbe! that waits for the contact instead of going past.
  shout('tunnel', 'Tunnel!', 'ball', 'Der steht immer breitbeinig.',
    ['dribbling'],
    'Von der Bank: "TUNNEL! DER STEHT OFFEN!"', { pull: 0.7 }),
  shout('koerper_rein', 'Körper rein!', 'ball', 'Arsch raus, Ball abschirmen.',
    ['#pfiff', 'querpass', 'rueckpass'],
    'Von der Bank: "KÖRPER REIN! ARSCH RAUS!"',
    { down: ['ballverlust', 'abgegraetscht'], playableIn: ['duel', 'counter'], pull: 0.45 }),
  shout('foul_ziehen', 'Zieh das Foul!', 'ball', 'Nur antippen lassen.',
    ['foul', 'foul_gefaehrlich', 'elfmeter_foul', 'gefoult'],
    'Von der Bank, halblaut: "Lass ihn kommen. Lass ihn kommen."',
    { down: ['dribbling'], pull: 0.4 }),
  // At the header: nobody had a card there before v0.16.
  shout('drueck_ihn_runter', 'Drück ihn runter!', 'ball', 'Kopf über den Ball, wie der Opa gesagt hat.',
    [], 'Von der Bank: "RUNTER! DRÜCK IHN RUNTER!"',
    { down: ['vorbei'], playableIn: ['header'], pull: 0.6 }),

  // ---- Shouts without the ball (open play) ----
  // Umhauen! leans the harmless foul only: at the Sechzehner and in the box the foul is a different row
  // (sim.ts `foulRow`), and no coach shouts for a free kick in front of his own goal.
  shout('umhauen', 'Umhauen!', 'noball', 'Dein Mann geht dazwischen. Egal wie.',
    ['abgegraetscht', 'foul', 'abseits'],
    'Von der Bank: "UMHAUEN!"',
    { playableIn: ['duel', 'offsidetrap'], pull: 0.45 }),
  shout('pressing', 'Drauf! Drauf!', 'noball', 'Anlaufen, anlaufen, anlaufen.',
    ['#fehler', 'ihrer', 'fehlalarm', 'abgepfiffen'],
    'Von der Bank: "DRAUF! DRAUF! DRAUF!"', { pull: 0.4 }),
  // Only where a keeper can come: crosses, a man through, the empty goal. At a shot he stays on his line.
  shout('torwart_raus', 'Torwart raus!', 'noball', 'Der Torwart kommt. Hoffentlich rechtzeitig.',
    ['breit_gemacht', 'abgefangen', 'leeres_tor'],
    'Von der Bank: "RAUS! RAAAUS!"', { pull: 0.5 }),
  shout('weg_damit', 'Weg damit!', 'noball', 'Keine Kunst hinten.',
    ['#geklaert', 'abseits'],
    'Von der Bank: "WEG DAMIT!"', { pull: 0.35 }),
  // The disciplined brother of Umhauen!: it wins the ball without a whistle, and it is the one card
  // that talks a Treter out of his foul — '#pfiff' is every row where the ref gives them something.
  shout('stellen', 'Stellen!', 'noball', 'Nicht reingehen. Stellen.',
    ['abgegraetscht', 'breit_gemacht', 'eingeholt'],
    'Von der Bank: "STELLEN! NICHT REINGEHEN!"',
    { down: ['#pfiff'], pull: 0.4 }),
  shout('linie', 'Auf der Linie!', 'noball', 'Bleib stehen, mach dich groß.',
    ['gehalten', 'reingefallen', 'nicht_drin', 'abgefangen'],
    'Von der Bank: "BLEIB STEHEN! GROSS MACHEN!"', { pull: 0.35 }),
  shout('reinwerfen', 'Reinwerfen!', 'noball', 'Wirf dich rein. Hauptsache nicht drin.',
    ['abgeblockt', 'zur_ecke', 'nicht_drin', 'brust'],
    'Von der Bank: "REINWERFEN! REIN!"', { pull: 0.45 }),
  // v0.25: only where there are gaps to close — not at a man already through on goal
  shout('zustellen', 'Zustellen!', 'noball', 'Die Lücken zu.',
    ['querpass', 'rueckpass', 'fehlalarm'],
    'Von der Bank: "ZUSTELLEN! ZU! ZU!"',
    { down: ['#gefahr', 'nach_vorne', 'langer_ball', 'abschlag'], playableIn: ['play', 'duel', 'counter'], pull: 0.35 }),
  // The other bench's answer to Schiri!!: every row where the whistle goes against the men with the ball.
  shout('nie_im_leben', 'Nie im Leben!', 'noball', 'Die halbe Bank steht am Zaun und zeigt auf den Schiri.',
    ['#gegenpfiff'],
    'Von der Bank, die halbe Mannschaft dazu: "NIE IM LEBEN, SCHIRI!"',
    { down: ['#pfiff'], pull: 0.4 }),
  // The bench that wants no whistle at all: the rows where the ref waves it away go up, every decision
  // for the men with the ball goes down.
  shout('aufstehen', 'Aufstehen!', 'noball', 'Der liegt doch gar nicht richtig.',
    ['weiterspielen', 'schiriball', 'ordner', 'abgepfiffen', 'nicht_drin'],
    'Von der Bank: "DER STEHT WIEDER AUF! SCHIRI, DER STEHT WIEDER AUF!"',
    { down: ['#pfiff'], pull: 0.4 }),

  // v0.16, without the ball: dropping deep, holding the line high, getting into their man's head; the
  // foul that takes the yellow on purpose, two on one, and not biting.
  shout('fallen_lassen', 'Fallen lassen!', 'noball', 'Alle zurück. Auch der Stürmer.',
    ['querpass', 'fluegel', 'abgeblockt', 'abgefangen'],
    'Von der Bank: "ALLE ZURÜCK! AUCH DU, HEINZ!"',
    { down: ['steilpass', 'durch', 'langer_ball'], pull: 0.4 }),
  shout('linie_halten', 'Linie halten!', 'noball', 'Keiner lässt sich rausziehen.',
    ['abseits'],
    'Von der Bank: "LINIE! LINIE HALTEN!"',
    { down: ['steilpass', 'durch'], pull: 0.45 }),
  shout('schlafmuetze', 'Schlafmütze!', 'noball', 'Der war gestern auf der Kirmes.',
    ['#fehler'],
    'Von der Bank, über den ganzen Platz: "HE, SCHLAFMÜTZE! WIE WAR DIE KIRMES?"', { pull: 0.3 }),
  // Only on the counter: in a plain challenge the free kick is worse than the tackle it replaces.
  shout('taktisches_foul', 'Taktisches Foul!', 'noball', 'Gelb nehmen wir mit.',
    ['foul'],
    'Von der Bank: "NIMM IHN MIT! GELB IST EGAL!"',
    { down: ['durch', 'schuss', 'dribbling'], playableIn: ['counter'], pull: 0.45 }),
  // v0.25: a challenge only — on a counter there is nobody to double with ("hinten steht nur noch Kofi")
  shout('doppeln', 'Doppeln!', 'noball', 'Zwei auf einen. Der kann nur einen.',
    ['abgegraetscht', 'ballverlust', 'querpass'],
    'Von der Bank: "DOPPELN! ZU ZWEIT DRAUF!"', { playableIn: ['duel'], pull: 0.45 }),
  shout('nicht_springen', 'Nicht springen!', 'noball', 'Der will doch nur, dass du springst.',
    [], 'Von der Bank: "NICHT SPRINGEN! STEHEN BLEIBEN!"',
    { down: ['dribbling', 'durch', '#pfiff'], pull: 0.35 }),
  // At the header, for the side defending it: a head in the way, or at least a shoulder.
  shout('kopf_dazwischen', 'Kopf dazwischen!', 'noball', 'Einer muss hochgehen. Egal wer.',
    ['vorbei', 'zur_ecke', 'geklaert'],
    'Von der Bank: "HOCHGEHEN! EINER MUSS HOCH!"', { playableIn: ['header', 'cross'], pull: 0.4 }),

  // ---- Set-piece shouts ----
  // With the ball: for the side taking it.
  shout('direkt', 'Direkt!', 'ball', 'Der hat so einen Hammer.',
    ['fk_tor', 'fk_mauer', 'fk_abpraller', 'fk_gehalten', 'fk_ecke', 'fk_drueber'],
    'Von der Bank: "DIREKT! HAU IHN REIN!"',
    { playableIn: ['setpiece'], pull: 0.7 }),
  shout('auf_den_kopf', 'Auf den Kopf!', 'ball', 'Die Großen nach vorne, der Ball auf die Stirn.',
    ['kopfball', 'fk_flanke', 'einwurf_weit'],
    'Von der Bank: "ALLE REIN! AUF DEN KOPF!"', { playableIn: ['setpiece'] }),
  shout('kurz_ausfuehren', 'Kurz ausführen!', 'ball', 'Nicht einfach reinhauen.',
    ['kurz', 'fk_kurz', 'anstoss'],
    'Von der Bank: "KURZ! KURZ AUSFÜHREN!"',
    { playableIn: ['setpiece'], down: ['patzer', 'fehlpass', 'falscher_einwurf'] }),
  shout('hoch_und_weit', 'Hoch und weit!', 'ball', 'Da vorne ist einer. Irgendwo.',
    ['langer_ball', 'abschlag', 'fk_lang', 'einwurf_lang'],
    'Von der Bank: "HOCH UND WEIT! DAS BRINGT SICHERHEIT!"', { playableIn: ['setpiece'] }),
  shout('schnell', 'Schnell!', 'ball', 'Die stehen noch und diskutieren.',
    ['fk_schnell', 'schnell_eingeworfen'],
    'Von der Bank: "SCHNELL! DIE SCHLAFEN!"', { playableIn: ['setpiece'], pull: 0.55 }),
  shout('verladen', 'Verladen!', 'ball', 'Schau links, schieß rechts.',
    ['tor'],
    'Von der Bank, ganz ruhig: "Schau ihn nicht an. Schau ihn nicht an."', { playableIn: ['setpiece'], pull: 0.35 }),
  // v0.16, taking it: the trick from training, the man who throws further than he shoots, the far post,
  // the middle of the goal at a penalty, the shot from the kick-off and the keeper who wants to play.
  shout('variante', 'Die Variante!', 'ball', 'Die aus dem Training. Die mit dem Schuhbinden.',
    ['fk_variante', 'fk_verstolpert'],
    'Von der Bank, mit einem Zwinkern: "DIE VARIANTE!"', { playableIn: ['freekick'] }),
  shout('einwurf_lang', 'Einwurf lang!', 'ball', 'Der Kalle wirft weiter als er schießt.',
    ['einwurf_lang', 'einwurf_weit'],
    'Von der Bank: "KALLE! WEIT!"', { playableIn: ['throwin'] }),
  shout('zweiter_pfosten', 'Zweiter Pfosten!', 'ball', 'Über alle drüber.',
    ['kopfball', 'fk_flanke'],
    'Von der Bank: "ZWEITER PFOSTEN! ZWEITER!"',
    { down: ['gefaustet'], playableIn: ['corner', 'freekick'], pull: 0.45 }),
  shout('mitte', 'Mitte!', 'ball', 'Der Torwart springt eh.',
    [], 'Von der Bank, ganz leise: "Mitte. Der springt."',
    { down: ['vorbei', 'pfosten'], playableIn: ['penalty'], pull: 0.7 }),
  shout('vom_anstoss', 'Vom Anstoß!', 'ball', 'Deren Torwart steht immer zu weit vorne.',
    ['anstoss_tor', 'anstoss_gefangen', 'anstoss_drueber'],
    'Von der Bank: "SCHAU MAL, WO DER TORWART STEHT! SCHAU MAL!"', { playableIn: ['kickoff'] }),
  shout('torwart_spielt_mit', 'Torwart spielt mit!', 'ball', 'Der will auch mal.',
    ['kurz', 'abwurf'],
    'Von der Bank: "SPIEL MIT, HANS! DU KANNST DAS!"',
    { down: ['abschlag_verloren'], playableIn: ['goalkick', 'keeperball'], pull: 0.55 }),
  // Without the ball: for the side defending it.
  shout('mauer', 'Mauer!', 'noball', 'Fünf Mann, Hände vor dem Wichtigsten.',
    ['fk_mauer'], 'Von der Bank: "MAUER! STEHEN BLEIBEN!"',
    { playableIn: ['setpiece'], down: ['#gefahr'] }),
  shout('manndeckung', 'Manndeckung!', 'noball', 'Jeder nimmt sich einen. Auch der Torwart.',
    ['geklaert', 'gefaustet'], 'Von der Bank: "JEDER EINEN! JEDER EINEN!"',
    { playableIn: ['setpiece'], down: ['kopfball'], pull: 0.55 }),
  shout('immer_links', 'Immer links!', 'noball', 'Der schießt immer links. Hat er letztes Jahr auch.',
    ['gehalten', 'fk_gehalten'], 'Von der Bank, zum Torwart: "IMMER LINKS! DER SCHIESST IMMER LINKS!"', { playableIn: ['setpiece'], pull: 0.4 }),
  shout('anlaufen', 'Anlaufen!', 'noball', 'Keiner spielt hier kurz raus.',
    ['#fehler', 'lang_verloren', 'abschlag_verloren', 'fk_verloren'],
    'Von der Bank: "ANLAUFEN! DIE KÖNNEN DAS NICHT!"',
    { playableIn: ['setpiece'], down: ['kurz', 'fk_kurz', 'anstoss'], pull: 0.5 }),

  // v0.16, defending it: a man on each post, a wall that does not turn round, a keeper who wriggles.
  shout('pfosten_besetzen', 'Pfosten besetzen!', 'noball', 'Einer an jeden Pfosten. Hat der Opa auch so gemacht.',
    ['geklaert', 'zur_ecke', 'fk_ecke'],
    'Von der Bank: "PFOSTEN! EINER AN JEDEN PFOSTEN!"',
    { down: ['fk_tor'], playableIn: ['corner', 'freekick'], pull: 0.4 }),
  shout('nicht_drehen', 'Nicht drehen!', 'noball', 'Wer sich in der Mauer dreht, zahlt den Kasten.',
    ['fk_mauer'], 'Von der Bank: "NICHT DREHEN! WER SICH DREHT, ZAHLT!"',
    { down: ['fk_tor'], playableIn: ['freekick'], pull: 0.45 }),
  shout('zappeln', 'Zappeln!', 'noball', 'Arme hoch, Zunge raus.',
    ['gehalten', 'vorbei'],
    'Von der Bank: "ZAPPELN! MACH DICH BREIT!"', { playableIn: ['penalty'], pull: 0.3 }),

  // ---- Events (v0.16) ----
  // Small absurd things from the village that work like a shout: nothing stops, no scene of its own, the
  // table just leans. With the ball they help us, without it they get at them.

  // With the ball: ball action.
  event('guelle', 'Gülle', 'ball', 'Der Bauer fährt nebenan Gülle aus. Der Wind steht auf deren Tor.',
    ['steilpass', 'durch', 'schuss'],
    'Der Wind dreht. Drüben halten sich drei die Nase zu.', { pull: 0.45 }),
  event('rueckenwind', 'Rückenwind', 'ball', 'Der Wind hat gedreht. Jetzt kommt er von hinten.',
    ['langer_ball', 'abschlag', 'fk_lang'],
    'Eine Böe von hinten. Die Eckfahne zeigt aufs Tor von denen.',
    { down: ['lang_verloren', 'abschlag_verloren'], pull: 0.5 }),
  event('ausschank', 'Erwin am Ausschank', 'ball', 'Der Linienrichter ist kurz ein Bier holen.',
    ['steilpass', 'durch'],
    'Erwin steht am Ausschank. Die Fahne lehnt am Zaun.',
    { down: ['abseits'], pull: 0.45 }),
  event('blaskapelle', 'Blaskapelle', 'ball', 'Im Festzelt probt die Musik den Radetzkymarsch. Alle laufen im Takt.',
    ['querpass', 'steilpass'],
    'Aus dem Festzelt: Radetzkymarsch. Die Bierbank klatscht mit. Unsere laufen im Takt.', { pull: 0.45 }),
  event('durchsage', 'Durchsage', 'ball', '„Der Besitzer des blauen Opel, bitte zum Parkplatz.“ Deren Torwart fährt einen blauen Opel.',
    [], 'Aus dem Lautsprecher: „Der Besitzer des blauen Opel …“ {keeper} dreht sich zum Parkplatz um.',
    { down: ['gehalten', 'breit_gemacht', 'fk_gehalten'], pull: 0.4 }),
  event('tiefe_sonne', 'Tiefe Sonne', 'ball', 'Die Sonne steht genau hinter deren Tor.',
    [], 'Die Sonne kommt hinter der Wolke vor. {keeper} hält sich die Hand vor die Augen.',
    { down: ['abgefangen', 'gehalten', 'gefaustet'], pull: 0.4 }),

  // With the ball: challenge.
  event('wochenblatt', 'Wochenblatt', 'ball', 'Der Mann von der Zeitung hat die Kamera oben.',
    ['dribbling', 'schuss'],
    'Hinterm Tor klickt die Kamera vom Wochenblatt. {me} richtet sich die Haare.', { pull: 0.45 }),
  event('freundin', 'Freundin am Zaun', 'ball', 'Seine Freundin ist heute zum ersten Mal da.',
    ['dribbling'],
    'Am Zaun winkt eine. Zum ersten Mal da. {me} hat es gesehen.',
    { down: ['querpass', 'rueckpass'], pull: 0.55 }),
  event('plastiktuete', 'Plastiktüte', 'ball', 'Eine Aldi-Tüte weht über den Platz, genau zwischen die zwei.',
    ['dribbling', 'durch'],
    'Eine Aldi-Tüte weht vorbei. {you} tritt nach der Tüte.',
    { down: ['abgegraetscht'], pull: 0.4 }),
  event('stollen', 'Deren Stollen', 'ball', 'Drüben hat einer einen Stollen verloren.',
    [], '{you} rutscht weg. Einer von seinen Stollen liegt im Gras.',
    { down: ['abgegraetscht', 'ballverlust', 'eingeholt'], pull: 0.45 }),

  // With the ball: set piece.
  event('handy_mauer', 'Handy in der Mauer', 'ball', 'In der Mauer klingelt ein Handy. Alle schauen, wessen.',
    ['fk_tor'],
    'In der Mauer klingelt ein Handy. Die ganze Mauer greift sich an die Hosentasche.',
    { down: ['fk_mauer'], playableIn: ['freekick'], pull: 0.35 }),
  event('aufgepumpt', 'Aufgepumpt an der Tankstelle', 'ball', 'Der Ball ist hart wie ein Stein.',
    ['fk_lang', 'einwurf_lang', 'einwurf_weit', 'abschlag'],
    'Der Ball ist von der Tankstelle. Zwei Bar zu viel. Er springt wie ein Flummi.', { pull: 0.5 }),
  event('taube', 'Taube auf der Latte', 'ball', 'Eine Taube sitzt auf der Latte und bleibt sitzen.',
    ['latte', 'pfosten'],
    'Auf der Latte sitzt eine Taube. Sie bleibt sitzen. Alle schauen hin.',
    { down: ['vorbei', 'fk_drueber'], playableIn: ['penalty', 'freekick'], pull: 0.4 }),
  event('muecken', 'Mückenschwarm', 'ball', 'Um den Fünfer tanzt ein Mückenschwarm. Deren Torwart wedelt.',
    ['kopfball'],
    'Über dem Fünfer steht ein Mückenschwarm. {keeper} wedelt mit beiden Armen.',
    { down: ['gefaustet', 'abgefangen'], playableIn: ['corner'], pull: 0.45 }),

  // v0.18: the village scores too. Each of these leans a row that goes straight in — the corner the wind
  // turns, the ball that hops off a molehill, the defender with two Sekt inside him.
  event('sturmboee', 'Sturmböe', 'ball', 'Der Wind pfeift um die Eckfahne.',
    ['ecke_direkt', 'kopfball'],
    'Eine Böe packt die Ecke und dreht sie aufs Tor zu. {keeper} rudert mit den Armen.',
    { down: ['gefaustet', 'kurz'], playableIn: ['corner'], pull: 0.45 }),
  event('maulwurf', 'Maulwurfshügel', 'ball', 'Vor deren Tor hat der Maulwurf gearbeitet.',
    ['flutscher', 'abgewehrt'],
    'Der Ball tickt vor {keeper} auf einem Maulwurfshügel auf und springt ganz woanders hin.',
    { down: ['gehalten'], playableIn: ['shot', 'header'], pull: 0.45 }),
  event('geburtstag', 'Geburtstag', 'ball', 'Deren Libero hat heute Geburtstag. Zwei Sekt hatte er schon.',
    ['eigentor'],
    'Die Bierbank singt "Happy Birthday". {marker} dreht sich um und winkt. Der Ball kommt trotzdem.',
    { playableIn: ['cross', 'corner'], pull: 0.4 }),


  // Without the ball: their ball action.
  event('wespe', 'Wespe', 'noball', 'Eine Wespe vom Kuchenstand hat sich einen von denen ausgesucht.',
    ['#fehler'],
    'Vom Kuchenstand kommt eine Wespe. Sie sucht sich {you} aus.', { playableIn: ['play', 'shot', 'keeperball'], pull: 0.4 }),
  event('falsches_trikot', 'Falsches Trikot', 'noball', 'Einer von denen trägt aus Versehen unser Auswärtstrikot.',
    ['ballverlust'],
    'Einer von denen hat unser Auswärtstrikot an. Seine eigenen wissen nicht mehr, wen sie anspielen sollen.', { pull: 0.5 }),
  event('pfuetze', 'Pfütze', 'noball', 'Die Pfütze von Donnerstag ist immer noch nicht weg.',
    ['ballverlust', 'lang_verloren'],
    'Der Ball rollt in die Pfütze von Donnerstag. Und bleibt drin liegen.',
    { down: ['steilpass', 'langer_ball', 'durch'], pull: 0.45 }),
  event('bus_hupt', 'Bus hupt', 'noball', 'Deren Bus will um fünf los. Der Fahrer hupt.',
    ['langer_ball', 'lang_verloren', 'schuss', 'abschlag', 'abschlag_verloren'],
    'Vom Parkplatz hupt deren Bus. Drüben schaut einer auf die Uhr.',
    { down: ['querpass', 'rueckpass'], pull: 0.45 }),

  // Without the ball: their challenge.
  event('brille', 'Brille im Auto', 'noball', 'Der Schiri hat seine Brille im Auto gelassen.',
    ['abgegraetscht'],
    'Der Schiri kneift die Augen zusammen. Die Brille liegt im Auto, auf dem Beifahrersitz.',
    { down: ['#pfiff', '#gegenpfiff'], pull: 0.45 }),
  event('pfarrer', 'Pfarrer am Zaun', 'noball', 'Der Pfarrer schaut zu. Keiner flucht, keiner foult.',
    [], 'Am Zaun steht der Pfarrer. Zwanzig Mann benehmen sich.',
    { down: ['#pfiff', '#gegenpfiff'], pull: 0.5 }),
  event('bratwurst', 'Bratwurst', 'noball', 'Der Grill ist an und der Wind steht richtig. Deren Libero ist 51.',
    ['eingeholt', 'abgegraetscht'],
    'Der Wind trägt den Grill über den Platz. {you} schaut kurz zum Bratwurststand.', { pull: 0.45 }),
  // v0.18: their mistakes at the back, where a mistake is a chance for us.
  event('handy_torwart', 'Handy im Tor', 'noball', 'Deren Torwart hat das Handy in der Trainingshose. Es ist Samstag, seine Frau ruft an.',
    ['patzer'],
    'Aus der Trainingshose von {keeper} brummt es. Er greift sich an die Tasche statt an den Ball.',
    { playableIn: ['keeperball', 'goalkick'], pull: 0.5 }),
  event('hochzeit', 'Hochzeit nebenan', 'noball', 'In der Kirche ist Hochzeit. Deren Libero ist Trauzeuge und muss um drei die Rede halten.',
    ['querpass_fehler', 'rueckpass_kurz', 'verstolpert'],
    'Die Glocken läuten zur Hochzeit. {you} schaut auf die Uhr. Die Rede ist um drei.',
    { playableIn: ['play+deep', 'duel+deep'], pull: 0.5 }),
  event('dackel_zaun', 'Dackel am Zaun', 'noball', 'Der Dackel bellt am Zaun. Deren Linksaußen hat Angst vor Hunden.',
    ['ins_aus', 'ballverlust'],
    'Am Zaun bellt der Dackel. {you} macht einen großen Bogen um die Seitenlinie.',
    { down: ['flanke', 'fluegel'], playableIn: ['wing'], pull: 0.45 }),

  // Without the ball: their set piece.
  event('boeller', 'Böller', 'noball', 'Beim Schützenfest wird geböllert. Genau beim Anlauf.',
    ['vorbei', 'fk_drueber'],
    'Vom Schützenfest: BUMM. Genau beim Anlauf.', { playableIn: ['penalty', 'freekick'], pull: 0.35 }),
  event('schief_gekalkt', 'Schief gekalkt', 'noball', 'Der Platzwart hat die Linie heute Morgen neu gezogen. Schief.',
    ['falscher_einwurf'],
    '{you} steht an der Linie. Oder davor. Die Linie ist schief, keiner weiß es genau.', { playableIn: ['throwin'], pull: 0.5 }),
  event('oma', 'Oma am Zaun', 'noball', 'Die Oma von deren Stürmer ruft seinen Namen. Laut.',
    ['vorbei', 'drueber'],
    'Vom Zaun ruft eine Oma einen Namen. Laut. {you} dreht sich um.', { playableIn: ['corner', 'header'], pull: 0.4 }),
  event('kirchenglocken', 'Kirchenglocken', 'noball', 'Zwölf Uhr, der Pfarrer läutet. Drüben bekreuzigt sich einer.',
    ['#fehler'],
    'Die Kirchenglocken läuten. Drüben bekreuzigt sich einer, mitten in der Bewegung.', { playableIn: ['kickoff', 'goalkick'], pull: 0.5 }),

  // ---- v0.20: more cards, and gentler ones ----
  // After a playtest: the dog is funny once, then it is a panel of dog every match. So these are all shouts
  // and events — they lean the table and the football goes on, nothing forces a scene. Every one of them
  // has a few lines (`alt`), so the fifth Rasensprenger of the season does not tell the first joke again.
  // Sidegrades where they can be: flat against long, the near post against the far one, the tall ref
  // against the short one, the Balljunge who is quick for us and has all the time in the world for them.

  // With the ball: ball action.
  shout('flach', 'Flach!', 'ball', 'Flach spielen, hoch gewinnen. Hat der Opa schon gesagt.',
    ['steilpass', 'querpass', 'zurueckgelegt', 'quergelegt'],
    'Von der Bank: "FLACH! FLAAACH!"',
    { down: ['langer_ball', 'lang_verloren', 'flanke'], playableIn: ['play', 'duel', 'counter', 'through_on_goal'], pull: 0.5,
      alt: ['Von der Bank: "AUF DEN BODEN! DER BALL IST RUND, NICHT OVAL!"',
        'Von der Bank: "FLACH SPIELEN, HOCH GEWINNEN!" Auf der Rentnerbank nickt einer.'] }),
  shout('nach_vorne', 'Nach vorne!', 'ball', 'Rückwärts fahren wir erst nach dem Spiel.',
    ['nach_vorne', 'andribbeln', 'steilpass'],
    'Von der Bank: "NACH VORNE! NACH VOOORNE!"',
    { down: ['rueckpass', 'querpass'], playableIn: ['play'], pull: 0.5,
      alt: ['Von der Bank: "NICHT ZURÜCK! DA HINTEN IST NUR UNSER TOR!"',
        'Von der Bank, mit dem ganzen Arm: "DA LANG! DA IST VORNE!"'] }),
  shout('aufs_tor', 'Aufs Tor!', 'ball', 'Irgendwie aufs Tor. Der Torwart ist auch nur ein Mensch.',
    [], 'Von der Bank: "AUFS TOR! HAUPTSACHE AUFS TOR!"',
    { down: ['vorbei', 'fk_drueber'], playableIn: ['shot', 'through_on_goal', 'freekick'], pull: 0.5,
      alt: ['Von der Bank: "NICHT IN DEN BACH! AUFS TOR!"',
        'Von der Bank: "ZWISCHEN DIE PFOSTEN, HERRGOTT!"'] }),
  shout('pike', 'Pike!', 'ball', 'Nicht schön. Aber schnell.',
    ['tor', 'vorbei'],
    'Von der Bank: "PIKE! NIMM DIE PIKE!"',
    { down: ['eingeholt', 'breit_gemacht'], playableIn: ['through_on_goal'], pull: 0.4,
      alt: ['Von der Bank: "SPITZE! MIT DER SPITZE!"',
        'Von der Bank: "NICHT SCHÖN MACHEN! EINFACH DRAUF!"'] }),
  event('scout', 'Der Scout', 'ball', 'Am Zaun steht einer mit Notizblock. Angeblich vom TSV, Bezirksliga.',
    ['schuss', 'andribbeln', 'dribbling'],
    'Am Zaun schreibt einer was auf. {me} hat es gesehen und will jetzt alles alleine machen.',
    { down: ['querpass', 'rueckpass'], playableIn: ['duel', 'counter'], pull: 0.45,
      alt: ['Der Mann mit dem Notizblock schaut her. {me} schaut, ob er schaut.',
        'Einer flüstert: "Der ist vom TSV." Ab jetzt spielt {me} keinen Pass mehr.'] }),
  event('konferenz', 'Konferenz', 'ball', 'Im Sportheim läuft die Bundesliga-Konferenz. Die von drüben sind alle Schalker.',
    ['steilpass', 'nach_vorne', 'durch'],
    'Aus dem Sportheim: "TOR IN GELSENKIRCHEN!" Drüben dreht sich die halbe Abwehr zum Fenster.',
    { playableIn: ['play', 'counter'], pull: 0.45,
      alt: ['Aus dem Sportheim schreit der Radiomann. {you} fragt über den Platz: "Für wen?"',
        'Aus dem Sportheim: "ELFMETER FÜR SCHALKE!" {you} bleibt stehen und horcht.'] }),
  event('frisch_gemaeht', 'Frisch gemäht', 'ball', 'Der Platzwart hat heute früh gemäht. Der Ball läuft wie auf Schienen.',
    ['querpass', 'steilpass', 'abwurf', 'kurz'],
    'Es riecht nach frischem Gras. Der Ball rollt, als hätte der Platzwart ihn gebügelt.',
    { down: ['ballverlust', 'ins_aus', 'verstolpert'], playableIn: ['play', 'duel', 'keeperball', 'goalkick'], pull: 0.4,
      alt: ['Der Rasen ist kurz wie beim Friseur. {me} spielt den Ball, und der Ball hüpft kein bisschen.',
        'Am Rand steht der Platzwart, die Hände in den Taschen, und schaut stolz auf seinen Rasen.'] }),
  event('neue_handschuhe', 'Neue Handschuhe', 'ball', 'Unser Torwart hat neue Handschuhe. Vom Autohaus Maier, steht drauf.',
    ['abwurf'],
    '{keeper} klatscht die neuen Handschuhe zusammen. Autohaus Maier, steht drauf. Er fühlt sich wie ein Profi.',
    { down: ['patzer', 'abschlag_verloren'], playableIn: ['keeperball', 'goalkick'], pull: 0.45,
      alt: ['{keeper} riecht an den neuen Handschuhen. Riechen noch ganz neu.',
        'Am Zaun steht der Herr Maier vom Autohaus und winkt {keeper} zu. {keeper} winkt mit dem Handschuh zurück.'] }),

  // With the ball: challenge.
  shout('dreh_dich', 'Dreh dich!', 'ball', 'Hinter dir ist keiner. Glaub mir.',
    ['dribbling', 'schuss'],
    'Von der Bank: "DREH DICH! DU HAST ZEIT!"',
    { down: ['rueckpass', 'querpass'], playableIn: ['duel', 'counter'], pull: 0.5,
      alt: ['Von der Bank: "HAST ZEIT! DREH DICH!" Ob er Zeit hat, weiß nur der hinter ihm.',
        'Von der Bank: "DREHEN! DREHEN! DREEEHEN!"'] }),
  shout('fallrueckzieher', 'Fallrückzieher!', 'ball', 'Einmal im Leben. Wie der Klaus Fischer.',
    ['volley'],
    'Von der Bank: "FALLRÜCKZIEHER! WIE DER FISCHER!"',
    { playableIn: ['cross'], pull: 0.5,
      alt: ['Die Bierbank im Chor: "FALL-RÜCK-ZIE-HER!"',
        'Von der Bank, schon im Stehen: "JETZT! RÜCKWÄRTS! JETZT!"'] }),
  shout('schiess_ihn_an', 'Schieß ihn an!', 'ball', 'Der Ball muss nur noch von ihm ins Aus.',
    ['zur_ecke', 'zum_einwurf'],
    'Von der Bank: "SCHIESS IHN AN! ANS SCHIENBEIN!"',
    { down: ['ballverlust', 'abgegraetscht'], playableIn: ['duel+wing'], pull: 0.45,
      alt: ['Von der Bank: "ANSCHIESSEN! ECKE HOLEN!"',
        'Von der Bank: "HOL DIR DIE ECKE! WIE DIE PROFIS!"'] }),
  shout('hintermann', 'Hintermann!', 'ball', 'Da kommt einer. Da kommt immer einer.',
    ['rueckpass'],
    'Von der Bank: "HINTERMANN! HINTERMAAANN!"',
    { down: ['ballverlust', 'abgegraetscht', 'verstolpert'], playableIn: ['duel'], pull: 0.45,
      alt: ['Von der Bank und von der Bierbank gleichzeitig: "HINTERMANN!"',
        'Von der Bank: "HINTER DIR! HINTER DIIIR!"'] }),
  // Not the bench: one of our men in the box. The oldest dirty trick in the Kreisklasse.
  shout('leo', 'Leo!', 'ball', 'Einer von uns ruft Leo. Drüben heißt einer Leo.',
    ['zweiter_ball'],
    'Aus dem Strafraum ruft einer: "LEO!" Drüben dreht sich Leo um.',
    { down: ['geklaert', 'abgefangen', 'gefaustet'], playableIn: ['cross', 'corner'], pull: 0.45,
      alt: ['"LEO! LASS IHN!" {you} lässt ihn. {you} heißt nicht mal Leo.',
        'Einer ruft "LEO!", und drei von denen gehen gleichzeitig nicht hin.'] }),
  event('kuehe', 'Kühe am Zaun', 'ball', 'Nebenan stehen die Kühe am Weidezaun. Deren Außenverteidiger ist aus der Stadt.',
    ['dribbling', 'flanke', 'fluegel'],
    'Am Weidezaun muht es. {you} zuckt zusammen. Er ist aus der Stadt.',
    { down: ['abgegraetscht'], playableIn: ['wing'], pull: 0.45,
      alt: ['Eine Kuh schaut {you} tief in die Augen. {you} schaut zurück. Zu lange.',
        'Am Zaun muhen drei Kühe gleichzeitig. {me} kennt das. {you} nicht.'] }),
  event('fruehschoppen', 'Frühschoppen', 'ball', 'Deren Abwehr war heute früh schon beim Frühschoppen. Alle vier.',
    ['dribbling', 'durch'],
    '{you} gähnt. Aus dem Trikot riecht es nach Weißbier. Von gestern und von heute.',
    { down: ['eingeholt', 'abgegraetscht'], playableIn: ['duel', 'counter', 'through_on_goal'], pull: 0.45,
      alt: ['{you} läuft los und bleibt nach drei Schritten stehen. Die zweite Maß war zu viel.',
        '{you} hat noch Schaum vom Frühschoppen im Schnauzer.'] }),
  // Leans no goal row of its own: their man at the back is just thinking about something else.
  event('schwiegermutter', 'Schwiegermutter', 'ball', 'Die Schwiegermutter von deren Libero ist da. Sie hat eine Meinung.',
    [], 'Vom Zaun ruft die Schwiegermutter: "{you}! DU SOLLST DEN BALL WEGMACHEN!" {you} zieht den Kopf ein.',
    { down: ['geklaert', 'abgefangen', 'eingeholt', 'gefaustet'], playableIn: ['cross', 'corner', 'through_on_goal'], pull: 0.4,
      alt: ['Die Schwiegermutter am Zaun schüttelt den Kopf. {you} sieht es. Jetzt denkt er nach, und das ist nie gut.',
        'Vom Zaun: "DAS HAT DER VATI FRÜHER BESSER GEMACHT!" {you} wird rot.'] }),

  // With the ball: set piece.
  shout('winkel', 'In den Winkel!', 'ball', 'Da, wo die Spinnweben hängen.',
    ['tor', 'vorbei', 'fk_tor', 'fk_drueber'],
    'Von der Bank: "IN DEN WINKEL! WO DIE SPINNWEBEN HÄNGEN!"',
    { down: ['gehalten', 'pfosten', 'fk_gehalten', 'fk_mauer'], playableIn: ['penalty', 'freekick'], pull: 0.4,
      alt: ['Von der Bank: "OBEN REIN! DA KOMMT DER NIE HIN!"',
        'Von der Bank, ganz leise: "Winkel. Ganz oben. Wo die Oma die Spinnweben hat."'] }),
  shout('erster_pfosten', 'Erster Pfosten!', 'ball', 'Da, wo es weh tut.',
    ['kopfball', 'eigentor'],
    'Von der Bank: "ERSTER PFOSTEN! SCHARF REIN!"',
    { down: ['geklaert'], playableIn: ['corner'], pull: 0.45,
      alt: ['Von der Bank: "KURZER PFOSTEN! DA STEHT KEINER!"',
        'Von der Bank: "VORNE REIN! DA, WO ES WEH TUT!"'] }),
  event('langer_schiri', 'Langer Schiri', 'ball', 'Der Schiri misst die Mauer ab. Er ist 1,98 und macht große Schritte.',
    [], 'Der Schiri zählt die Schritte ab. Laut. Bei neun steht die Mauer schon fast im Fünfer.',
    { down: ['fk_mauer'], playableIn: ['freekick'], pull: 0.5,
      alt: ['Der Schiri macht Schritte wie ein Storch. Die Mauer muss weit zurück und schimpft.',
        '"Neun fuffzehn", sagt der Schiri, und meint eher zwölf.'] }),
  // The same boy as `balljunge_troedelt`: the captain's son. Quick for us.
  event('balljunge', 'Balljunge', 'ball', 'Der Balljunge ist der Sohn vom Kapitän. Der Ball ist sofort wieder da.',
    ['schnell_eingeworfen', 'kurz'],
    'Der Balljunge wirft {me} den Ball zu, bevor der Schiri geschaut hat. Er ist neun und will gewinnen.',
    { down: ['falscher_einwurf'], playableIn: ['throwin', 'goalkick'], pull: 0.45,
      alt: ['Der Balljunge hat den Ersatzball schon in der Hand, bevor der andere im Maisfeld ist. Papa hat gesagt, er soll schnell sein.',
        'Der Balljunge sprintet los. Schneller als die ganze Viererkette.'] }),
  event('nieselregen', 'Nieselregen', 'ball', 'Seit der Halbzeit nieselt es. Deren Torwart hat die Handschuhe im Auto.',
    ['fk_abpraller', 'zweiter_ball', 'flutscher', 'abgewehrt'],
    'Es nieselt. {keeper} wischt sich die Hände an der Hose ab. Die Hose ist auch nass.',
    { down: ['fk_gehalten', 'gefaustet', 'abgefangen', 'gehalten'], playableIn: ['freekick', 'corner', 'cross'], pull: 0.4,
      alt: ['Der Ball ist nass und schwer wie ein Medizinball. {keeper} schaut ihm misstrauisch entgegen.',
        'Es nieselt. {keeper} bläst sich in die Hände. Das hilft nicht.'] }),
  event('geschirrtuch', 'Geschirrtuch', 'ball', 'Die Wirtin wirft ein Geschirrtuch über den Zaun. Zum Abtrocknen vom Ball.',
    ['einwurf_weit'],
    'Über den Zaun fliegt ein Geschirrtuch vom Sportheim. {me} trocknet den Ball ab und nimmt Anlauf.',
    { down: ['falscher_einwurf'], playableIn: ['throwin'], pull: 0.45,
      alt: ['{me} trocknet den Ball mit dem Geschirrtuch ab. Es ist das mit den Enten. Die Wirtin winkt.',
        'Die Wirtin ruft: "DAS WILL ICH ZURÜCK!" {me} trocknet den Ball ab und holt weit aus.'] }),
  event('glueckssocken', 'Glückssocken', 'ball', 'Der Schütze trägt die Glückssocken. Ungewaschen seit dem Aufstieg 2011.',
    [], '{shooter} zieht die Stutzen hoch. Darunter: die Glückssocken. {keeper} riecht es bis auf die Linie.',
    { down: ['gehalten', 'vorbei'], playableIn: ['penalty'], pull: 0.35,
      alt: ['Seit 2011 ungewaschen, die Socken. {keeper} geht einen Schritt nach hinten.',
        'Die Glückssocken von {shooter} sind grün. Sie waren mal weiß.'] }),
  // Wherever the ref could whistle against us — offside, the foul on the keeper at a corner — and a few
  // drama scenes besides. Nobody shouts it; the ref's whistle simply has water in it.
  event('nasse_pfeife', 'Nasse Pfeife', 'ball', 'Die Pfeife vom Schiri hat Wasser gezogen. Sie macht nur noch pfft.',
    [], 'Der Schiri bläst in die Pfeife. Pfft. Er klopft sie an der Hose aus.',
    { down: ['#gegenpfiff'], pull: 0.5,
      alt: ['Die Pfeife vom Schiri gurgelt nur noch. Er schaut sie böse an.',
        'Pfft, macht die Pfeife. Der Schiri probiert es mit zwei Fingern im Mund. Kann er nicht.'] }),

  // Without the ball: their ball action.
  event('rasensprenger', 'Rasensprenger', 'noball', 'Der Rasensprenger vom Platzwart läuft auf Zeitschaltuhr. Die Uhr geht vor.',
    ['ballverlust', 'ins_aus'],
    'Tsch-tsch-tsch: der Rasensprenger springt an. {you} steht mitten im Strahl.',
    { playableIn: ['play'], pull: 0.5,
      alt: ['Der Rasensprenger dreht sich einmal im Kreis und erwischt {you} von hinten.',
        'Der Platzwart rennt zum Wasserhahn. Zu spät. {you} ist schon nass.'] }),
  event('maisfeld', 'Maisfeld', 'noball', 'Hinter dem Platz steht der Mais zwei Meter hoch. Was drin landet, ist weg.',
    ['lang_verloren', 'ins_aus', 'abschlag_verloren'],
    'Drüben schaut einer nervös zum Maisfeld. Der letzte Ball von denen liegt da immer noch drin.',
    { down: ['langer_ball', 'abschlag'], playableIn: ['play', 'keeperball', 'goalkick', 'kickoff'], pull: 0.5,
      alt: ['Hinterm Zaun raschelt der Mais. {you} hat Angst um den Ball.',
        'Aus dem Maisfeld kommt ein Bambini mit einem Ball von 2019. {you} schaut ihm nach.'] }),
  event('huepfburg', 'Hüpfburg', 'noball', 'Hinter unserem Tor steht die Hüpfburg vom Kinderfest. Zwölf Kinder springen und schreien.',
    ['vorbei', 'latte'],
    'Hinter dem Tor springen zwölf Kinder in der Hüpfburg und schreien "DANEBEN!". Vorher.',
    { playableIn: ['shot'], pull: 0.4,
      alt: ['Aus der Hüpfburg winkt ein Kind. {you} winkt fast zurück.',
        'Die Hüpfburg quietscht. {you} schaut hin, mitten im Ausholen.'] }),
  event('grillrauch', 'Grillrauch', 'noball', 'Der Wind treibt den Rauch vom Grill genau vor deren Tor.',
    ['abschlag_verloren', 'patzer'],
    'Eine Wolke Grillrauch zieht über den Fünfer. {keeper} hustet und sieht seine Leute nicht mehr.',
    { down: ['kurz', 'abwurf'], playableIn: ['keeperball', 'goalkick'], pull: 0.45,
      alt: ['Es riecht nach Bratwurst und Kohle. {keeper} blinzelt durch den Rauch.',
        'Der Grillmeister wedelt mit dem Pappteller. Der ganze Rauch geht zu {keeper}.'] }),
  shout('keine_flanke', 'Keine Flanke!', 'noball', 'Nicht flanken lassen. Deren Großer köpft alles.',
    ['zum_einwurf', 'zur_ecke', 'abgegraetscht', 'ins_aus'],
    'Von der Bank: "KEINE FLANKE! NICHT FLANKEN LASSEN!"',
    { down: ['flanke'], playableIn: ['wing'], pull: 0.45,
      alt: ['Von der Bank: "BEIN RAUS! KEINE FLANKE!"',
        'Von der Bank: "DER DARF NICHT FLANKEN! DER DARF GAR NIX!"'] }),

  // Without the ball: their challenge.
  shout('mitgehen', 'Mitgehen!', 'noball', 'Wo der hingeht, gehst du hin. Auch aufs Klo.',
    ['eingeholt', 'abgegraetscht'],
    'Von der Bank: "MITGEHEN! DRANBLEIBEN!"',
    { down: ['durch', 'quergelegt', 'dribbling'], playableIn: ['counter', 'through_on_goal', 'duel'], pull: 0.45,
      alt: ['Von der Bank: "GEH MIT! DER LÄUFT DIR WEG!"',
        'Von der Bank: "BLEIB AN IHM DRAN! WIE EINE KLETTE!"'] }),
  shout('meiner', 'Meiner!', 'noball', 'Der Torwart ruft. Alle anderen ducken sich.',
    ['abgefangen', 'gefaustet'],
    'Aus unserem Fünfer: "MEINER! MEINEEER!"',
    { down: ['kopfball', 'volley'], playableIn: ['cross', 'corner'], pull: 0.45,
      alt: ['Unser Torwart brüllt "MEINER!", und zwei von unseren lassen sich fallen.',
        'Von hinten: "MEINER!" Die eigene Abwehr duckt sich. Aus Erfahrung.'] }),
  event('kontaktlinse', 'Kontaktlinse', 'noball', 'Einer von denen hat eine Kontaktlinse verloren. Er sucht noch.',
    ['#fehler'],
    '{you} kneift ein Auge zu. Mit dem anderen sieht er zwei Bälle.',
    { playableIn: ['duel', 'counter', 'cross', 'header', 'through_on_goal'], pull: 0.4,
      alt: ['{you} tastet kurz im Gras herum. Die Linse ist noch nicht wieder aufgetaucht.',
        'Drüben ruft einer: "NICHT DRAUFTRETEN! DIE LINSE!" Alle schauen auf den Boden.'] }),
  event('maibaum', 'Der Maibaum', 'noball', 'Letztes Jahr haben die von drüben unseren Maibaum geklaut.',
    ['abgegraetscht', 'foul'],
    'Die Bierbank ruft: "MAIBAUMDIEBE!" {me} geht in den nächsten Zweikampf wie ein Bulldog.',
    { down: ['dribbling'], playableIn: ['duel'], pull: 0.45,
      alt: ['Auf der Bierbank hält einer ein Foto vom leeren Dorfplatz hoch. {me} hat es gesehen.',
        'Vom Zaun: "GEBT UNS DEN BAUM ZURÜCK!" {me} beißt die Zähne zusammen.'] }),
  event('hahn', 'Der Hahn', 'noball', 'Auf dem Hof nebenan kräht der Hahn. Um halb vier am Nachmittag.',
    ['vorbei', 'eingeholt'],
    'Vom Hof nebenan: KIKERIKIII! {you} zuckt zusammen.',
    { playableIn: ['through_on_goal', 'header'], pull: 0.4,
      alt: ['KIKERIKIII, um halb vier. {you} schaut kurz auf die Uhr.',
        'Der Hahn kräht, der Hofhund bellt, und {you} kommt aus dem Tritt.'] }),
  event('hitze', '32 Grad', 'noball', 'Es hat 32 Grad. Deren Stürmer hat einen Bierbauch.',
    ['eingeholt', 'querpass'],
    '{you} läuft los. Nach zehn Metern läuft er nur noch so halb.',
    { down: ['durch'], playableIn: ['counter', 'through_on_goal'], pull: 0.45,
      alt: ['Die Sonne brennt. {you} schnauft wie der Bulldog vom Huber.',
        '{you} schaut beim Laufen sehnsüchtig zum Wasserkasten.'] }),

  // Without the ball: their set piece.
  event('balljunge_troedelt', 'Balljunge trödelt', 'noball', 'Der Balljunge ist der Sohn vom Kapitän. Für die von drüben hat er keine Eile.',
    ['geklaert', 'gefaustet', 'verloren'],
    'Der Balljunge schlendert zum Ball. Unterwegs bindet er sich den Schuh.',
    { down: ['schnell_eingeworfen', 'kurz'], playableIn: ['throwin', 'corner'], pull: 0.45,
      alt: ['Der Balljunge sucht den Ball im Gebüsch. Er findet einen anderen, von letzter Woche.',
        'Drüben ruft einer: "BALL!" Der Balljunge winkt freundlich zurück.'] }),
  event('maehroboter', 'Mähroboter', 'noball', 'Der Platzwart hat einen Mähroboter. Der mäht auch samstags.',
    ['fk_verloren', 'abschlag_verloren', 'fk_verstolpert'],
    'Der Mähroboter rollt gemütlich durchs Bild. {you} wartet, bis er vorbei ist. Er ist nicht vorbei.',
    { down: ['fk_kurz', 'kurz'], playableIn: ['freekick', 'goalkick'], pull: 0.45,
      alt: ['Der Mähroboter piept und fährt {you} über den Fuß.',
        'Der Mähroboter bleibt genau neben dem Ball stehen. Der Platzwart ruft: "DER MACHT DAS SELBER!"'] }),
  event('kleiner_schiri', 'Kleiner Schiri', 'noball', 'Der Schiri misst die Mauer ab. Er ist 1,58 und macht kleine Schritte.',
    ['fk_mauer'],
    'Der Schiri zählt die Schritte ab. Es sind viele, aber sie sind klein. Die Mauer steht fast am Ball.',
    { down: ['fk_tor', 'fk_schnell'], playableIn: ['freekick'], pull: 0.45,
      alt: ['"Neun fuffzehn", sagt der Schiri, nach sieben Trippelschritten.',
        'Der Schiri trippelt die Schritte ab. Die Mauer rückt hinter seinem Rücken noch einen Meter nach.'] }),
  event('brennnesseln', 'Brennnesseln', 'noball', 'An der Seitenlinie stehen die Brennnesseln hüfthoch. Der Platzwart sagt, das ist Natur.',
    ['falscher_einwurf', 'verloren'],
    '{you} holt den Ball aus den Brennnesseln. Kurze Hose. Er will es nur noch hinter sich haben.',
    { down: ['einwurf_lang', 'einwurf_weit'], playableIn: ['throwin'], pull: 0.45,
      alt: ['{you} steht beim Einwurf mit einem Bein in den Brennnesseln und verzieht das Gesicht.',
        '{you} fischt den Ball mit spitzen Fingern aus den Brennnesseln.'] }),
  event('kuhfladen', 'Kuhfladen', 'noball', 'Am Dienstag waren die Kühe auf dem Platz. An der Eckfahne sieht man es noch.',
    ['drueber', 'geklaert'],
    'Der Schütze nimmt Anlauf. Genau durch den Kuhfladen.',
    { down: ['kopfball', 'ecke_direkt'], playableIn: ['corner'], pull: 0.45,
      alt: ['An der Eckfahne riecht es nach Weide. Der Schütze nimmt lieber einen ganz kurzen Anlauf.',
        'Der Schütze tritt in den Kuhfladen, schaut auf seinen Schuh und schießt trotzdem.'] }),

  // ---- Drama ----
  {
    id: 'hund', name: 'Hund auf dem Platz', kind: 'drama', side: 'noball',
    text: 'Der Dackel vom Platzwart ist los.',
    playableIn: ['attack'], once: true,
    effect: { kind: 'steer', next: 'hund', initiative: 'mine', word: 'HUND!',
      line: 'Ein Dackel. Auf dem Platz. Mit dem Ball. Der Schiri pfeift, alle rennen dem Hund nach.' },
  },
  {
    id: 'buergermeister', name: 'Bürgermeister am Zaun', kind: 'drama', side: 'noball',
    text: 'Hubert winkt den Schiri an den Zaun. Das ist noch nie gut ausgegangen.',
    playableIn: ['setpiece'], once: true,
    effect: { kind: 'steer', next: 'buergermeister', initiative: 'mine', word: 'HUBERT!',
      line: 'Bürgermeister Hubert winkt den Schiri an den Zaun. Der Schiri kommt. Das ist noch nie gut ausgegangen.' },
  },
  {
    id: 'abseitsfalle', name: 'Abseitsfalle!', kind: 'drama', side: 'noball',
    text: 'Die ganze Kette macht drei Schritte nach vorne.',
    playableIn: ['play+upfield', 'duel+upfield', 'counter+upfield'], once: true,
    effect: { kind: 'steer', next: 'offsidetrap', initiative: 'keep', word: 'RAUS! RAUS!',
      line: 'Von der Bank: "RAUS! RAUS! RAUS!" Die ganze Kette macht drei Schritte nach vorne und hebt den Arm.' },
  },
  {
    id: 'schwalbe', name: 'Schwalbe!', kind: 'drama', side: 'ball',
    text: 'Ganz leise von der Bank: "Fall hin."',
    playableIn: ['duel+box', 'cross'],
    effect: { kind: 'steer', next: 'schwalbe', initiative: 'keep', word: 'SCHWALBE!',
      line: 'Von der Bank, ganz leise: "Fall hin." {me} fällt hin. Mit Anlauf und Schrei.' },
  },
  // v0.9. Drama the village provides: the fire brigade, a brawl, a linesman who pours the beer, a coach who
  // still thinks he can play, and a ball that hit something. Each forces its own scene (scenes.ts).
  {
    id: 'sirene', name: 'Sirene!', kind: 'drama', side: 'noball',
    text: 'Drei von denen sind bei der Freiwilligen Feuerwehr. Bei uns nur der Kassier.',
    playableIn: ['play', 'duel', 'counter'], once: true,
    effect: { kind: 'steer', next: 'feuerwehr', initiative: 'mine', word: 'SIRENE!',
      line: 'Die Sirene heult übers Dorf. Drei Mann drüben bleiben stehen und schauen zum Gerätehaus.' },
  },
  {
    id: 'rudelbildung', name: 'Rudelbildung!', kind: 'drama', side: 'noball',
    text: 'Dein Mann schubst. Alle kommen dazu.',
    playableIn: ['play', 'duel', 'counter'], once: true,
    effect: { kind: 'steer', next: 'rudel', initiative: 'mine', word: 'RUDEL!',
      line: 'Von der Bank: "LASS DIR DAS NICHT GEFALLEN!" {me} lässt es sich nicht gefallen. Zwanzig Mann laufen zusammen.' },
  },
  {
    id: 'fahne', name: 'Fahne!', kind: 'drama', side: 'noball',
    text: 'Der Linienrichter ist unser Wirt.',
    playableIn: ['through_on_goal'], once: true,
    effect: { kind: 'steer', next: 'linienrichter', initiative: 'mine', word: 'FAHNE!',
      line: 'Von der Bank, zum Linienrichter: "ERWIN! ERWIN! ABSEITS!" Erwin hebt die Fahne. Mit der Hand, in der kein Bier ist.' },
  },
  {
    id: 'trainer_rein', name: 'Trainer rein!', kind: 'drama', side: 'ball',
    text: 'Du ziehst dir selbst das Trikot über. Mit 47.',
    playableIn: ['play'], once: true,
    effect: { kind: 'steer', next: 'trainer', initiative: 'keep', word: 'TRAINER!',
      line: 'Der Trainer zieht die Trainingsjacke aus. Darunter: ein Trikot. Das war so geplant. Die Bierbank steht auf.' },
  },
  {
    id: 'handspiel', name: 'Handspiel!', kind: 'drama', side: 'ball',
    text: 'Alle schreien Hand. Ob es eins war, weiß nur der Ball.',
    playableIn: ['corner', 'freekick'],
    effect: { kind: 'steer', next: 'handspiel', initiative: 'keep', word: 'HAND!',
      line: 'Von der Bank: "HAND! HAAAND!" {me} hebt den Arm, die Bierbank hebt den Arm, der Schiri hebt die Pfeife.' },
  },
  // v0.9b, more of it: the Bierbank on the pitch, the keeper up for a corner, Erwin on the goal line, the
  // Zeugwart's Eisspray (a panel burned at a dead ball — the clock is the point), a ref in the family, and
  // a keeper who talks before the penalty.
  {
    id: 'bierbank', name: 'Bierbank!', kind: 'drama', side: 'noball',
    text: 'Einer von der Bierbank hat genug gesehen.',
    playableIn: ['cross', 'shot', 'header', 'through_on_goal'], once: true,
    effect: { kind: 'steer', next: 'bierbank', initiative: 'mine', word: 'BIERBANK!',
      line: 'Von der Bierbank steht einer auf. Mit Becher. Er ist auf dem Platz, bevor der Ordner die Wurst weggelegt hat.' },
  },
  {
    id: 'torwart_vorne', name: 'Torwart nach vorne!', kind: 'drama', side: 'ball',
    text: 'Der Torwart geht mit nach vorne. Hinten steht dann niemand.',
    playableIn: ['corner'], once: true,
    effect: { kind: 'steer', next: 'torwart_vorne', initiative: 'keep', word: 'TORWART VOR!',
      line: 'Von der Bank: "TORWART! NACH VORNE!" Er kommt. Langsam, aber er kommt. Hinten steht jetzt niemand mehr.' },
  },
  {
    id: 'torlinie', name: 'Torlinie!', kind: 'drama', side: 'ball',
    text: 'Latte, Linie, drin oder nicht. Erwin schaut in sein Bier.',
    playableIn: ['shot', 'header'], once: true,
    effect: { kind: 'steer', next: 'torlinie', initiative: 'keep', word: 'LINIE!',
      line: 'Latte! Der Ball springt runter auf die Linie und wieder raus. Alle schauen zu Erwin. Erwin schaut in sein Bier.' },
  },
  {
    id: 'eisspray', name: 'Eisspray!', kind: 'drama', side: 'ball',
    text: 'Einer legt sich hin. Der Zeugwart holt das Eisspray.',
    playableIn: ['kickoff', 'goalkick', 'throwin'], once: true,
    effect: { kind: 'steer', next: 'eisspray', initiative: 'keep', word: 'EISSPRAY',
      line: 'Von der Bank, ohne Ton, nur mit dem Daumen nach unten: "Leg dich hin." {me} legt sich hin. Die Wade, sagt er.' },
  },
  {
    id: 'schwager', name: 'Schwager!', kind: 'drama', side: 'ball',
    text: 'Der Schiri ist der Schwager vom Kapitän. Sonntag ist Familienessen.',
    playableIn: ['play', 'duel'], once: true,
    effect: { kind: 'steer', next: 'schwager', initiative: 'keep', word: 'SCHWAGER!',
      line: 'Von der Bank: "MICHAEL! DER IST DEIN SCHWAGER!" Der Schiri heißt Michael. Er tut so, als hätte er nichts gehört.' },
  },
  // v0.18: two more that can end in the net. The Festzelt and the floodlight share a cable; and their keeper
  // cannot play with his feet, which the whole village knows.
  {
    id: 'stromausfall', name: 'Stromausfall!', kind: 'drama', side: 'ball',
    text: 'Das Flutlicht und das Festzelt hängen am selben Kabel.',
    playableIn: ['play+upfield', 'duel+upfield'], once: true,
    effect: { kind: 'steer', next: 'stromausfall', initiative: 'keep', word: 'DUNKEL!',
      line: 'Von der Bank, zum Festzelt: "JETZT, SEPP!" Die Blaskapelle steckt den Verstärker ein. Zack, dunkel.' },
  },
  {
    id: 'auf_den_torwart', name: 'Auf den Torwart!', kind: 'drama', side: 'noball',
    text: 'Deren Torwart kann nicht mit dem Fuß. Das weiß das ganze Dorf.',
    playableIn: ['keeperball', 'goalkick', 'play+deep'],
    effect: { kind: 'steer', next: 'torwartjagd', initiative: 'mine', word: 'DRAUF!',
      line: 'Von der Bank: "GEH AUF DEN TORWART! DER KANN NICHT MIT DEM FUSS!" {me} geht auf den Torwart.' },
  },
  {
    // The initiative stays with the shooter's bench, as in every penalty panel.
    id: 'psychospiel', name: 'Psychospiel!', kind: 'drama', side: 'noball',
    text: 'Unser Torwart sagt dem Schützen was ins Ohr.',
    playableIn: ['penalty'],
    effect: { kind: 'steer', next: 'psychospiel', initiative: 'keep', word: 'PSYCHO!',
      line: 'Von der Bank: "SAG IHM WAS!" {keeper} geht hin und sagt ihm was. Was, weiß nur der Schütze. Der Schütze wird blass.' },
  },
];

/**
 * v0.18: cards that work towards a goal pull harder. On top of its own pull such a card takes
 * `ATTACK_BOOST` of the rest of the way to certain (0.6 → 0.8, 0.35 → 0.68). The defending cards stay as
 * they are, so a bench that goes forward is heard more often than one that parks the bus.
 */
const ATTACK_BOOST = 0.5;
const FOR_GOAL = new Set([
  'schiess', 'flanke', 'steil', 'kopf', 'leg_quer', 'lauf', 'trau_dich', 'freibier', 'ueber_aussen', 'doppelpass',
  'nachsetzen', 'tunnel', 'foul_ziehen', 'drueck_ihn_runter',
  'direkt', 'auf_den_kopf', 'schnell', 'verladen', 'variante', 'zweiter_pfosten', 'mitte', 'vom_anstoss',
  'guelle', 'ausschank', 'blaskapelle', 'durchsage', 'tiefe_sonne', 'wochenblatt', 'freundin', 'plastiktuete', 'stollen',
  'handy_mauer', 'muecken', 'sturmboee', 'maulwurf', 'geburtstag',
  'flach', 'nach_vorne', 'aufs_tor', 'pike', 'scout', 'konferenz', 'dreh_dich', 'fallrueckzieher', 'leo', 'kuehe',
  'fruehschoppen', 'schwiegermutter', 'winkel', 'erster_pfosten', 'langer_schiri', 'balljunge', 'nieselregen',
  'geschirrtuch', 'glueckssocken',
]);

/**
 * The other side of it: every card without the ball — the defending shouts and the village when it gets
 * at them — pulls only `DEFENCE_DAMP` as hard as written. The men try; at this level it hardly ever works. The
 * exceptions are the cards that make *their* back line blunder: those make goals for the bench that lays them.
 */
const DEFENCE_DAMP = 0.5;
const BLUNDER = new Set(['handy_torwart', 'hochzeit']);
/**
 * v0.25: and what such a card takes away from a chance mostly turns into a smaller one (match.ts
 * `guardWeights`): the through ball becomes a shot from 25 metres, the man through becomes a man who has to
 * take his man on. The bench without the ball sees its card close the gap; the bench with it still plays.
 * Before, a quarter of the pull was all a defending card had, and a Zustellen! followed by "sieht die Lücke
 * und steckt durch" was the rule, not the exception.
 */
const GUARD = 0.7;
/** The safe shouts with the ball are damped the same way: the square pass at this level rarely comes off. */
const SAFE_DAMP = 0.25;
const SAFE = new Set(['kurz', 'tempo_raus', 'absichern', 'kurz_ausfuehren', 'torwart_spielt_mit', 'hintermann']);

const tuned = (c: Card): Card => {
  if (c.effect.kind !== 'shout') return c;
  const { pull } = c.effect;
  if (FOR_GOAL.has(c.id)) return { ...c, effect: { ...c.effect, pull: pull + (1 - pull) * ATTACK_BOOST } };
  if (c.side === 'noball' && !BLUNDER.has(c.id)) return { ...c, effect: { ...c.effect, pull: pull * DEFENCE_DAMP, guard: GUARD } };
  if (SAFE.has(c.id)) return { ...c, effect: { ...c.effect, pull: pull * SAFE_DAMP } };
  return c;
};

/**
 * v0.22: what a card costs where its kind's price (form.ts: a shout costs Puste, an event or a drama
 * Gunst) does not fit the picture. Gauge by gauge on top of that price; a negative number gives. What is
 * written here is the price as paid (v0.24): only the kind's default scales with the card's pull.
 */
const COSTS: Record<string, Partial<Gauges>> = {
  // shouts nobody runs for: the bench yells at the ref, at them, or tells its own men to breathe
  ruhig: { puste: -0.02 }, tempo_raus: { puste: -0.05 }, schiri: { puste: 0 }, nie_im_leben: { puste: 0 },
  aufstehen: { puste: 0 }, schlafmuetze: { puste: 0 }, leo: { puste: 0 }, zappeln: { puste: 0.01 }, meiner: { puste: 0.01, moral: -0.02 },
  // shouts that are a lot of running (v0.24: the price as paid, so a side that runs everything is platt by the end)
  pressing: { puste: 0.18 }, lauf: { puste: 0.15 }, nachsetzen: { puste: 0.15 }, doppeln: { puste: 0.15 },
  mitgehen: { puste: 0.15 }, anlaufen: { puste: 0.15 }, reinwerfen: { puste: 0.12 }, fallrueckzieher: { puste: 0.1, moral: -0.03 },
  doppelpass: { puste: 0.1 }, steil: { puste: 0.08 }, ueber_aussen: { puste: 0.08 }, schnell: { puste: 0.08 },
  umhauen: { puste: 0.08 }, torwart_raus: { puste: 0.05 },
  // shouts the men do not like to hear: they cost the heads instead of the legs (v0.23: instead, not as well)
  kurz: { puste: 0, moral: 0.02 }, fallen_lassen: { puste: 0, moral: 0.02 }, hoch_und_weit: { puste: 0, moral: 0.02 },
  taktisches_foul: { puste: 0, moral: 0.02 }, weg_damit: { puste: 0, moral: 0.015 },
  // and one they very much like to hear
  // v0.25: and the god does not like a goal that was bought: Freibier! was the one card with no price at all
  freibier: { puste: 0, moral: -0.06, gunst: 0.05 },
  // shouts that lift the heads as well as costing the legs: somebody on the bench believes in them
  trau_dich: { moral: -0.03 }, dreh_dich: { moral: -0.02 }, nach_vorne: { moral: -0.02 },
  tunnel: { moral: -0.02 },
  // the village does it for them: music, a camera, a girlfriend, a scout, a stolen Maibaum, new gloves
  blaskapelle: { moral: -0.04 }, wochenblatt: { moral: -0.03 }, freundin: { moral: -0.03 },
  scout: { moral: -0.03 }, maibaum: { moral: -0.05 }, neue_handschuhe: { moral: -0.02 },
  // the god likes the church, the old ways and the Opa's wisdom, and he has a soft spot for superstition
  pfarrer: { gunst: -0.04 }, kirchenglocken: { gunst: -0.04 }, glueckssocken: { gunst: -0.03 },
  flach: { gunst: -0.02 }, pfosten_besetzen: { gunst: -0.02 }, drueck_ihn_runter: { gunst: -0.02 },
  // drama with a second price, or a second gift
  schwalbe: { moral: 0.03 },           // the men are a bit ashamed
  trainer_rein: { moral: 0.05 },       // 47, and he thinks he is better than them
  rudelbildung: { moral: -0.08 },      // nothing welds a team like a brawl
  eisspray: { puste: -0.12 },          // while he lies there, everybody breathes
};

export const CARDS: Card[] = WRITTEN.map(tuned).map(c => ({
  ...c,
  ...(COSTS[c.id] ? { cost: COSTS[c.id] } : {}),
  ...(ECHO[c.id] ? { echo: ECHO[c.id] } : {}),
  ...(MISS_BY_CARD[c.id] ? { miss: MISS_BY_CARD[c.id] } : {}),
}));

/**
 * The v0.15 deck: three cards for each of the six situations, picked so that every slot has one card that
 * is usually right and at least one that is sometimes wrong. Kept for when the slots go back to three.
 */
export const DECK_V15: Loadout = {
  'ball:action': ['lang', 'steil', 'freibier'],
  'ball:challenge': ['lauf', 'schiri', 'schwalbe'],
  'ball:setpiece': ['schnell', 'direkt', 'auf_den_kopf'],
  'noball:action': ['pressing', 'zustellen', 'hund'],
  'noball:challenge': ['umhauen', 'stellen', 'abseitsfalle'],
  'noball:setpiece': ['anlaufen', 'mauer', 'buergermeister'],
};

/**
 * The pool (v0.16 playtest deck, v0.26 pool): every skill that can do something in a situation is in its
 * slot, so a skill that fits several situations is in several slots. Before kick-off each coach picks three
 * per situation from it (loadout.ts); those three are what he has in that situation all match.
 */
export const POOL: Loadout = {
  'ball:action': [
    'schiess', 'flanke', 'steil', 'lang', 'kurz', 'leg_quer', 'ruhig', 'trau_dich', 'absichern', 'freibier',
    'ueber_aussen', 'doppelpass', 'tempo_raus', 'nachsetzen', 'torwart_spielt_mit',
    'trainer_rein', 'schwager', 'torlinie',
    'guelle', 'rueckenwind', 'ausschank', 'blaskapelle', 'durchsage', 'tiefe_sonne', 'wochenblatt', 'aufgepumpt',
    'stromausfall', 'maulwurf',
    // v0.20
    'flach', 'nach_vorne', 'aufs_tor', 'konferenz', 'frisch_gemaeht', 'neue_handschuhe', 'kuehe', 'nasse_pfeife',
  ],
  'ball:challenge': [
    'lauf', 'schiri', 'kopf', 'leg_quer', 'ruhig', 'trau_dich', 'absichern', 'freibier', 'steil', 'flanke', 'schiess',
    'ueber_aussen', 'doppelpass', 'tempo_raus', 'nachsetzen', 'tunnel', 'koerper_rein', 'foul_ziehen', 'drueck_ihn_runter',
    'schwalbe', 'schwager', 'torlinie',
    'guelle', 'ausschank', 'blaskapelle', 'durchsage', 'tiefe_sonne', 'wochenblatt', 'freundin', 'plastiktuete', 'stollen',
    'stromausfall', 'maulwurf', 'geburtstag',
    // v0.20
    'flach', 'aufs_tor', 'pike', 'scout', 'konferenz', 'frisch_gemaeht', 'dreh_dich', 'fallrueckzieher', 'schiess_ihn_an',
    'hintermann', 'leo', 'kuehe', 'fruehschoppen', 'schwiegermutter', 'nieselregen', 'nasse_pfeife',
  ],
  'ball:setpiece': [
    'schnell', 'direkt', 'auf_den_kopf', 'kurz_ausfuehren', 'hoch_und_weit', 'verladen', 'kopf', 'lang', 'kurz',
    'ruhig', 'schiri', 'trau_dich', 'absichern', 'freibier',
    'nachsetzen', 'variante', 'einwurf_lang', 'zweiter_pfosten', 'mitte', 'vom_anstoss', 'torwart_spielt_mit',
    'handspiel', 'torwart_vorne', 'eisspray',
    'rueckenwind', 'durchsage', 'tiefe_sonne', 'handy_mauer', 'aufgepumpt', 'taube', 'muecken',
    'sturmboee', 'geburtstag',
    // v0.20
    'aufs_tor', 'frisch_gemaeht', 'neue_handschuhe', 'leo', 'schwiegermutter', 'winkel', 'erster_pfosten', 'langer_schiri',
    'balljunge', 'nieselregen', 'geschirrtuch', 'glueckssocken', 'nasse_pfeife',
  ],
  'noball:action': [
    'pressing', 'zustellen', 'weg_damit', 'linie', 'reinwerfen', 'nie_im_leben',
    'fallen_lassen', 'linie_halten', 'schlafmuetze', 'doppeln',
    'hund', 'sirene', 'rudelbildung', 'bierbank', 'abseitsfalle',
    'wespe', 'falsches_trikot', 'pfuetze', 'bus_hupt', 'brille', 'pfarrer', 'dackel_zaun',
    'auf_den_torwart', 'handy_torwart', 'hochzeit',
    // v0.20
    'rasensprenger', 'maisfeld', 'huepfburg', 'grillrauch', 'keine_flanke',
  ],
  'noball:challenge': [
    'umhauen', 'stellen', 'pressing', 'zustellen', 'torwart_raus', 'weg_damit', 'linie', 'reinwerfen', 'nie_im_leben', 'aufstehen',
    'fallen_lassen', 'linie_halten', 'schlafmuetze', 'taktisches_foul', 'doppeln', 'nicht_springen', 'kopf_dazwischen',
    'hund', 'sirene', 'rudelbildung', 'bierbank', 'fahne', 'abseitsfalle',
    'falsches_trikot', 'pfuetze', 'bus_hupt', 'brille', 'pfarrer', 'bratwurst', 'dackel_zaun', 'oma',
    'hochzeit',
    // v0.20
    'keine_flanke', 'mitgehen', 'meiner', 'kontaktlinse', 'maibaum', 'hahn', 'hitze',
  ],
  'noball:setpiece': [
    'anlaufen', 'mauer', 'manndeckung', 'immer_links', 'linie', 'weg_damit', 'nie_im_leben', 'aufstehen',
    'schlafmuetze', 'pfosten_besetzen', 'nicht_drehen', 'zappeln',
    'buergermeister', 'psychospiel',
    'bus_hupt', 'boeller', 'schief_gekalkt', 'oma', 'kirchenglocken',
    'auf_den_torwart', 'handy_torwart',
    // v0.20
    'maisfeld', 'grillrauch', 'meiner', 'balljunge_troedelt', 'maehroboter', 'kleiner_schiri', 'brennnesseln', 'kuhfladen',
  ],
};

export const cardById = new Map(CARDS.map(c => [c.id, c]));
