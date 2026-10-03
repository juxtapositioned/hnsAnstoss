// The collaborator's cards (docs/IDEAS.md), as data for the Heilige mode (heilige.ts). Texts are his, only
// typos fixed. Numbers are on the scale he wrote them: xA is the chance that a midfield attack becomes a chance
// on goal, xG the chance that a chance goes in, and a card adds to or takes from it directly.
//
// Who plays what (first reading, open for discussion):
// - `angriff` and `verteidigung` are the coaches' saints. A coach holds three of each and invokes one per
//   situation: an Angriff saint when his side has the ball, a Verteidigung saint when it has not. A saint
//   only counts where his number exists: xA in the midfield, xG in front of goal.
// - `zufall` (Randomness) and `gott` (Fußballgott) are the world's pile. Nobody plays them; now and then one
//   turns over by itself. Written as "+x & -x" (`coin`): it helps the attackers or the defenders, a coin
//   decides which. Written with one sign: always that way for the attacking side.

export type SaintGroup = 'angriff' | 'verteidigung' | 'zufall' | 'gott';

export interface Saint {
  id: string;
  name: string;
  text: string;
  group: SaintGroup;
  /** Added to the attacking side's xG / xA. Negative for the Verteidigung saints. */
  xg: number;
  xa: number;
  /** "+x & -x": a coin decides whether it is +x or -x for the attacking side. */
  coin?: boolean;
}

const s = (group: SaintGroup, name: string, text: string, xg: number, xa: number, coin = false): Saint => ({
  id: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '_').replace(/^_|_$/g, ''),
  name, text, group, xg, xa, ...(coin ? { coin } : {}),
});

const A = (name: string, text: string, xg: number, xa: number) => s('angriff', name, text, xg, xa);
const V = (name: string, text: string, xg: number, xa: number) => s('verteidigung', name, text, -xg, -xa);
const Z = (name: string, text: string, x: number) => s('zufall', name, text, x, x, true);
const G = (name: string, text: string, xg: number, coin = true) => s('gott', name, text, xg, 0, coin);

export const SAINTS: Saint[] = [
  // Angriff (14)
  A('Der Heilige Miro', 'Die Senioren Gymnastik Gruppe übt sich mal wieder im Salto.', 0.25, 0.25),
  A('Der Heilige Ali', 'Hub Hub Hubschraubereinsatz: Auch die Spielerfrauen machen mit.', 0.25, 0.25),
  A('Der Heilige Harry', 'Harry fängt den goldenen Schnatz. Da Kane nix mehr schiefgehen.', 0.5, 0.5),
  A('Der Seelige Roque', 'Viele Sportfreunde sind heute da.', 0.25, 0.25),
  A('Der Seelige Toni', 'Aus der Sportgaststätte duftet es herrlich nach Wiener Schnitzel. Alle bekommen Hunger.', 0.25, 0.25),
  A('Der Heilige Andreas aus Wien', 'Erst geschüttelt, dann gerührt. Mit Olive, bitte.', 0.25, 0.5),
  A('Der Seelige Oliver', 'Für den Lucky Punch benötigt es noch ein Bier – hoffen die Fans der Mannschaft.', 0.25, 0.25),
  A('Erzengel Rudi', 'Tante Käthe hat Kuchen mitgebracht.', 0.5, 0.25),
  A('Der Heilige Mario aus Basel', 'Kaum Schlaf, Zigaretten und Alkohol. Beste Voraussetzungen.', 0.5, 0.5),
  A('Der Seelige Andi aus Madrid in Italien', 'Der Stürmer bleibt im Rasen hängen und sinkt theatralisch zu Boden', 0.25, 0.25),
  A('Der Heilige Müller', 'Ein Raumdeuter mit Wünschelrute vermisst das Spielfeld. Mehrere Wasseradern wurden lokalisiert.', 0.5, 0.5),
  A('Der Heilige Poldi', 'Die Dönerbude ums Eck verkauft heute Döner für 1 Cent. Glücksgefühle kommen auf.', 0.5, 0),
  A('Der Heilige Jürgen der Blonde', 'Ein aufgebrachter Fan tritt auf die Wassertonne am Spielfeldrand ein.', 0.25, 0.25),
  A('Der Heilige Uli', 'Endlich haut am Stammtisch mal einer auf den Tisch. Abteilung Attacke.', 0.5, 0.5),

  // Verteidigung (15)
  V('Der Heilige Otto', 'Ein Duft von Ouzo wabert über das Spielfeld. Plötzlich tanzen alle Fans den Sirtaki.', 0.5, 0.25),
  V('Der Heilige Auge', 'Der Co-Trainer muss gähnen und löst damit eine ansteckende Welle aus.', 0.25, 0.25),
  V('Der Heilige Giovanni', 'Alle Flaschen sind leer. Die Fans holen sich Nachschub.', 0.5, 0.5),
  V('Der Heilige Felix', 'Der Ball fühlt sich plötzlich wie ein Medizinball an. Da rächt sich die fehlende Fitness.', 0.25, 0.25),
  V('Der Heilige Peter', 'Die Abstiegsangst greift um sich. Peter übernimmt!', 0.25, 0.25),
  V('Der Heilige Guido', 'Selbst Diego fängt im Pantheon noch an zu zittern.', 0.5, 0.5),
  V('Der Heilige Katsche', 'Ein Verteidiger grätscht mit beiden Beinen voraus aus fünf Meter Entfernung.', 0.5, 0.5),
  V('Der Heilige Matthias aus dem Osten', 'Der Stammtisch hat ein neues Mitglied. Neue Perspektiven und messerscharfe Analysen inklusive.', 0, 0.5),
  V('Der Seelige Jens', 'Auf dem Nachbargrundstück wird eine Motorsäge angeworfen.', 0.25, 0),
  V('Der Heilige Herrmann', 'Der Trainer tigert an der Seitenlinie entlang. Die gegnerische Mannschaft bekommt es mit der Angst zu tun.', 0.5, 0.5),
  V('Der Seelige Bodo', 'Die Bahnschranke neben dem Sportplatz fällt heute etwas langsam.', 0.25, 0),
  V('Der Seelige Benedikt', 'Ein Innenverteidiger hat sich auf den Flügel verirrt und findet seine Position nicht mehr.', 0.25, 0.5),
  V('Der Heilige Jose', 'Ein Bus parkt hinter dem Tor.', 0.5, 0.5),
  V('Der Heilige Schnauzer Jürgen', 'Die Luft flimmert wie in Rom 1990.', 0.5, 0.5),
  V('Der Seelige Nico', 'Dem Gegner schlottern schon die Beine', 0.25, 0.25),

  // Randomness (14)
  Z('Mund abputzen', 'Ein Spieler war gestern zu lange unterwegs und übergibt sich auf dem Platz.', 0.25),
  Z('Unsportliches Verhalten', 'Die Spieler der zweiten Mannschaft öffnen sich das erste Bier.', 0.25),
  Z('Atemlos', 'Der DJ ist leicht angetrunken und drückt aus Versehen auf die Playtaste.', 0.25),
  Z('Gutes Wetter', 'Die Volleyball Frauen starten ihr Training auf dem Feld gegenüber.', 0.25),
  Z('Frühschoppen', 'Manni hat zwei zu viel intus und stolpert über die Eckfahne. Jetzt liegt er da wie ein Käfer auf dem Rücken.', 0.25),
  Z('Böses Foul', 'Ein Kind ist gestolpert und weint nun bitterlich. Der Vater auf dem Platz ist in Sorge.', 0.25),
  Z('Wassermangel', 'Der Platzwart sorgt sich um den Rasen und aktiviert den Rasensprenger auf der ballfernen Seite.', 0.5),
  Z('Künstliche Intelligenz', 'Der Mähroboter ist außer Rand und Band und fährt kreuz und quer über den Rasen.', 0.5),
  Z('Oma Gerda', 'Ein Fan beleidigt Oma Gerda. Tumulte am Spielfeldrand.', 0.5),
  Z('Notarzteinsatz', 'Der Gästetrainer bricht sich den Fuß beim Tritt gegen die Bande.', 0.5),
  Z('Feuerwehreinsatz', 'Eine Bande Jugendlicher zündelt hinterm Tor. Die Freiwillige Feuerwehr rückt an.', 0.5),
  Z('VAR', 'Die Zuschauer rufen lauthals Abseits.', 0.5),
  Z('Flitzer', 'Timmy (5) will auch mitspielen und rennt auf den Platz.', 0.5),
  Z('Prosecco Time', 'Gabi lässt die Korken knallen und verteilt Prosecco.', 0.5),

  // Fußballgott (16)
  G('Der Seelige Waldi', 'Der Zapfhahn lässt sich nicht mehr schließen. Weißbier für alle!', 0.5),
  G('Der Seelige Julian', 'Familienausflug am Wochenende. Der Fußball rückt in den Hintergrund.', 0.5),
  G('Der Seelige Max', 'Die Fans singen: „Eine neue Liebe ist wie ein neues Leben“', 0.5),
  G('Der Heilige Ottmar', 'Rotation am Grill. Frische Kräfte legen Holzkohle nach. Die Rauchschwaden vernebeln die Sicht.', 0.75),
  G('Der Heilige Pep', 'Der Trainer hat eine geniale Idee.', 0.75),
  G('Der Heilige Berti', 'Das örtliche Boulevardblatt ist heute mit gleich drei Berichterstattern beim Spiel.', 0.75),
  G('Der Heilige Hansi', 'Ein Schwarm Wildgänse fliegt über den Platz.', 0.75),
  G('Der Heilige Günther', 'Sportwagen, die Frisur sitzt. Mehr Stil geht nicht!', 0.75),
  G('Der Heilige Thomas', 'Der Ball ist drin. Nein, doch nicht. Der Linienrichter hebt die Fahne und der Schiri entscheidet auf …', 1),
  G('Erzengel Franz', 'Murphys Law wird außer Kraft gesetzt. Gerade noch mal mit einem blauen Auge davongekommen.', 1),
  G('Erzengel Jürgen', 'Ein Fan stimmt den Song „You’ll never walk alone“ an.', 0.75),
  G('Erzengel Basti', 'Ein Fan trinkt ein Glas Rotwein. Die Farbe erinnert an das heilige Blut aus Rio.', 0.75),
  G('Erzengel Diego', 'Eine Wolke ähnelt täuschend echt der Hand Gottes wie damals im Aztekenstadion.', 1, false),
  G('Erzengel Lothar', 'Der Rasen ist top gepflegt. Bester Greenkeeper den man sich vorstellen kann.', 0.75),
  G('Erzengel Sepp', 'Eine Ente landet im Sechzehner aber niemand will sie fangen. Der Stammtisch philosophiert: „Früher war alles besser!“', -1, false),
  G('Erzengel Gerd', 'Wenn du immer richtig stehst, wartest du nicht, bis das Licht angeht.', 1, false),
  G('Erzengel Andreas vom Elfmeterpunkt', 'Das nennt man ausgleichende Gerechtigkeit. Elfmeter!', 1, false),
];

export const saintById = new Map(SAINTS.map(x => [x.id, x]));
