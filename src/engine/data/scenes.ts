import { SIM_SCENES } from '../sim';
import type { CastSlot, Row, SceneType, Situation, Spot, Tag } from '../types';
import { GOAL } from '../types';

// Scene types. The football itself — open play, crosses, shots, and every dead ball — lives in ../sim.ts,
// where a table is built from the ball's position. What is left here are the scenes only a card reaches:
// the offside trap and the drama the village provides. Their tables are fixed, because a dog is a dog
// wherever it runs. The ones on the pitch happen where the ball is; the others are drawn at their own spot
// (the fence, the Gerätehaus). Either way the ball carries on from where it was before the drama (a row's
// `to` moves it, the engine mirrors it on a flip).
// Ids are code, labels and texts are Kreisklasse German. Every row has a `word` — the one- or two-word
// headline the panel shows — and an `actor`, the man the word belongs to. Row ids are shared across scenes
// on purpose (`vorbei` is a miss anywhere), so a shout reads the same in every panel.

interface Drama {
  id: string;
  label: string;
  prompt: string;
  tags: Tag[];
  spot?: Spot;               // off the pitch or at a fixed place; none = where the ball is
  cast: CastSlot[];
  rows: Row[];
}

const DRAMA: Drama[] = [
  {
    // Reached only through the Abseitsfalle! card. The attacker keeps the initiative: it is his man who runs.
    id: 'offsidetrap', label: 'Abseitsfalle',
    prompt: 'Die Kette rückt raus. {runner} startet, {lastman} hebt den Arm. Der Linienrichter schaut.',
    tags: ['defence'],
    // drawn where the ball is
    cast: [{ slot: 'runner', role: ['striker', 'winger'], of: 'init' }, { slot: 'lastman', role: 'defender', of: 'other' }],
    rows: [
      { id: 'abseits', weight: 50, next: 'counter', flip: true, word: 'ABSEITS!', actor: 'lastman', tags: ['gegenpfiff', 'geklaert'], text: 'Fahne oben! {runner} stand einen Meter im Abseits und diskutiert noch mit dem Linienrichter, da hat {lastman} den Freistoß schon schnell gespielt. Konter!' },
      { id: 'durch', weight: 50, next: 'through_on_goal', carry: true, word: 'DURCH!', actor: 'runner', tags: ['gefahr'], text: 'Die Kette rückt raus, {runner} ist durch — die Falle steht offen!' },
    ],
  },
  // ---- Only reachable through a drama card. The initiative side is the bench that laid it. ----
  {
    id: 'hund', label: 'Hund auf dem Platz',
    prompt: 'Der Dackel hat den Ball. {chaser} und {rival} rennen hinterher. Der Schiri schaut auf die Uhr.',
    tags: ['drama'],
    // drawn where the ball is
    cast: [{ slot: 'chaser', role: ['striker', 'winger', 'midfielder'], of: 'init' }, { slot: 'rival', role: ['striker', 'winger', 'midfielder'], of: 'other' }],
    rows: [
      { id: 'unserer', weight: 35, next: 'counter', carry: true, word: 'LEBERKÄS!', actor: 'chaser', text: '{chaser} lockt ihn mit einem Stück Leberkäs. Der Hund kommt, der Ball auch. Die anderen suchen noch den Hund, {chaser} ist schon weg.' },
      { id: 'ihrer', weight: 65, next: 'counter', flip: true, carry: true, word: 'HERRCHEN', actor: 'rival', text: 'Der Dackel läuft zu {rival}. Natürlich. Sein Herrchen sitzt auf der Bank drüben. {rival} nimmt den Ball gleich mit, alle anderen stehen noch beim Hund.' },
    ],
  },
  {
    id: 'buergermeister', label: 'Bürgermeister am Zaun',
    prompt: 'Hubert redet auf den Schiri ein. Der Schiri nickt. Dann schaut er zu den Bänken.',
    tags: ['drama'],
    spot: { x: 0.5, y: 1.16, where: 'am Zaun' },
    cast: [{ slot: 'mouth', role: 'midfielder', of: 'init' }, { slot: 'theirs', role: 'midfielder', of: 'other' }],
    rows: [
      { id: 'drueben', weight: 60, next: 'counter', to: { x: 0.5, y: 0.5 }, banned: 'other', word: 'TRIBÜNE!', actor: 'theirs', tags: ['pfiff'], text: 'Der Schiri geht zur anderen Bank. Zeigt auf die Tribüne. Der Trainer drüben geht, und sagt dabei Dinge. Seine Mannschaft schaut ihm nach, {mouth} spielt schnell weiter.' },
      { id: 'beide', weight: 40, next: 'play', to: { x: 0.3, y: 0.5 }, banned: 'both', word: 'BEIDE RAUS!', actor: 'mouth', text: 'Der Schiri hat genug. Beide Trainer auf die Tribüne. Hubert zuckt mit den Schultern.' },
    ],
  },
  {
    // Reached through Schwalbe!. The attacker's man goes down in the box; the ref decides.
    id: 'schwalbe', label: 'Schwalbe',
    prompt: '{diver} liegt im Strafraum und hält sich das Schienbein. {marker} hat ihn nicht berührt. Der Schiri läuft hin.',
    tags: ['drama', 'box'],
    // drawn where the ball is
    cast: [{ slot: 'diver', role: ['striker', 'winger'], of: 'init' }, { slot: 'marker', role: 'defender', of: 'other' }],
    rows: [
      { id: 'elfmeter', weight: 45, next: 'penalty', word: 'ELFMETER!', actor: 'diver', tags: ['pfiff', 'gefahr'], text: 'Der Schiri hat es genau gesehen. Also fast. Er zeigt auf den Punkt, {marker} zeigt auf {diver}, {diver} zeigt gen Himmel.' },
      { id: 'gelb', weight: 40, next: 'freekick', flip: true, word: 'GELB!', actor: 'diver', tags: ['gegenpfiff'], text: 'Gelb für {diver}, wegen der Schauspielkunst. Freistoß für drüben, und {marker} klatscht höhnisch.' },
      { id: 'weiterspielen', weight: 15, next: 'corner', word: 'WEITERSPIELEN', actor: 'marker', tags: ['geklaert'], text: 'Der Schiri winkt ab, {marker} spitzelt den Ball ins Aus. Ecke. {diver} steht wieder auf, das Schienbein ist geheilt.' },
    ],
  },
  // ---- v0.9 drama. The village provides. ----
  {
    // Reached through Sirene!. The bench that laid it has the initiative: its men are not in the fire brigade.
    id: 'feuerwehr', label: 'Feuerwehralarm',
    prompt: 'Die Sirene heult. {feuerwehr} bleibt stehen und schaut zum Gerätehaus. {ours} steht schon am Ball.',
    tags: ['drama'],
    spot: { x: 0.36, y: 1.12, where: 'Richtung Gerätehaus' },
    cast: [{ slot: 'ours', role: ['striker', 'winger', 'midfielder'], of: 'init' }, { slot: 'feuerwehr', role: ['defender', 'midfielder'], of: 'other' }],
    rows: [
      { id: 'ausgerueckt', weight: 40, next: 'counter', carry: true, word: 'AUSGERÜCKT!', actor: 'feuerwehr', text: '{feuerwehr} und zwei Kollegen rennen zum Gerätehaus. Der Schiri zuckt mit den Schultern: Weiter! {ours} hat auf einmal sehr viel Platz.' },
      { id: 'fehlalarm', weight: 60, next: 'counter', flip: true, word: 'FEHLALARM', actor: 'feuerwehr', text: 'Fehlalarm, die Katze vom Pfarrer. {feuerwehr} joggt zurück und nimmt sich den Ball gleich wieder mit.' },
    ],
  },
  {
    // Reached through Rudelbildung!. The layer's man started it.
    id: 'rudel', label: 'Rudelbildung',
    prompt: '{schubser} schubst {opfer}. {opfer} schubst zurück. Zwanzig Mann, ein Schiri, zwei Bänke.',
    tags: ['drama'],
    // drawn where the ball is
    cast: [{ slot: 'schubser', role: 'defender', of: 'init' }, { slot: 'opfer', role: ['winger', 'striker'], of: 'other' }],
    rows: [
      { id: 'gelb_ihrer', weight: 30, next: 'freekick', word: 'GELB DRÜBEN', actor: 'opfer', tags: ['pfiff'], text: 'Der Schiri holt {opfer} raus. Gelb, weil er zuletzt geschubst hat. Freistoß für uns, die Bierbank johlt.' },
      { id: 'gelb_unserer', weight: 45, next: 'freekick', flip: true, word: 'GELB!', actor: 'schubser', tags: ['gegenpfiff'], text: 'Der Schiri hat nur {schubser} gesehen. Gelb, Freistoß für die. {schubser} zeigt auf zwanzig andere.' },
      { id: 'abgepfiffen', weight: 25, next: 'counter', flip: true, word: 'AUSEINANDER!', actor: 'schubser', text: 'Der Schiri brüllt, alle gehen auseinander, keiner weiß mehr, wer den Ball hatte. "Die", sagt der Schiri.' },
    ],
  },
  {
    // Reached through Fahne!. Their man is through, the linesman is our landlord.
    id: 'linienrichter', label: 'Fahne',
    prompt: '{runner} ist durch. Der Linienrichter ist unser Wirt. Er schaut zu {lastman}, dann auf die Fahne.',
    tags: ['drama'],
    spot: { x: 0.78, y: 0.04, flank: true, where: 'an der Seitenlinie' },
    cast: [{ slot: 'lastman', role: 'defender', of: 'init' }, { slot: 'runner', role: ['striker', 'winger'], of: 'other' }],
    rows: [
      { id: 'fahne', weight: 40, next: 'freekick', word: 'FAHNE!', actor: 'lastman', tags: ['pfiff'], text: 'Fahne oben! Abseits, sagt der Wirt, und der Wirt hat immer recht. {runner} schreit, {lastman} klopft dem Wirt über den Zaun auf die Schulter.' },
      { id: 'weiter', weight: 60, next: 'shot', flip: true, carry: true, word: 'WEITER!', actor: 'runner', tags: ['gegenpfiff'], text: 'Der Schiri winkt die Fahne weg. {runner} hat gar nicht erst gewartet und steht schon vor dem Tor. Der Wirt schaut auf den Boden.' },
    ],
  },
  {
    // Reached through Trainer rein!. The coach subs himself on; the roster man who came off watches.
    id: 'trainer', label: 'Spielertrainer',
    prompt: '{ersatz} muss runter. Der Trainer zieht sich das Trikot über. Mit 47. {gegner} lacht.',
    tags: ['drama'],
    spot: { x: 0.5, y: 0.97, where: 'an der Mittellinie' },
    cast: [{ slot: 'ersatz', role: 'midfielder', of: 'init' }, { slot: 'gegner', role: 'defender', of: 'other' }],
    rows: [
      { id: 'geniestreich', weight: 40, next: 'through_on_goal', word: 'AUSSENRIST!', actor: 'ersatz', tags: ['gefahr'], text: 'Erster Kontakt: Außenrist, {gegner} steht im Wald, und der Trainer schickt einen steil. {ersatz} auf der Bank klatscht langsam.' },
      { id: 'krampf', weight: 35, next: 'play', flip: true, word: 'KRAMPF', actor: 'gegner', tags: ['fehler'], text: 'Nach zwölf Metern ruft der Trainer nach dem Zeugwart. Krampf in beiden Waden. {gegner} nimmt sich den Ball, {ersatz} das Trikot.' },
      { id: 'trainer_foul', weight: 25, next: 'freekick', flip: true, word: 'GELB', actor: 'gegner', tags: ['gegenpfiff'], text: 'Erste Aktion: der Trainer holt {gegner} von hinten runter. Gelb, Freistoß für die. Von der Bierbank: "Geh wieder auf die Bank, Trainer!"' },
    ],
  },
  {
    // Reached through Handspiel!. The ball hit their man somewhere; everybody screams.
    id: 'handspiel', label: 'Handspiel',
    prompt: 'Der Ball springt {hand} irgendwo hin. {schreier} schreit HAND, die Bank schreit HAND, die Bierbank schreit HAND.',
    tags: ['drama', 'box'],
    spot: { x: 0.84, y: 0.56, where: 'im Strafraum' },
    cast: [{ slot: 'schreier', role: 'striker', of: 'init' }, { slot: 'hand', role: 'defender', of: 'other' }],
    rows: [
      { id: 'elfmeter', weight: 40, next: 'penalty', word: 'ELFMETER!', actor: 'hand', tags: ['pfiff', 'gefahr'], text: 'Der Schiri zeigt auf den Punkt. {hand} zeigt auf seine Brust. Der Schiri zeigt nochmal auf den Punkt.' },
      { id: 'brust', weight: 45, next: 'corner', word: 'BRUST', actor: 'hand', tags: ['geklaert'], text: 'Brust, sagt der Schiri. Ecke. {schreier} schreit noch dreimal HAND, dann geht er in den Strafraum.' },
      { id: 'meckern', weight: 15, next: 'freekick', flip: true, word: 'GELB!', actor: 'schreier', tags: ['gegenpfiff'], text: '{schreier} hat dem Schiri zu nah ins Ohr geschrien. Gelb, Freistoß für die, und {hand} reibt sich die Brust.' },
    ],
  },
  // ---- v0.9b drama. ----
  {
    // Reached through Bierbank!. A spectator is on the pitch; the layer's men are the ones not stopping him.
    id: 'bierbank', label: 'Bierbank auf dem Platz',
    prompt: 'Einer von der Bierbank ist auf dem Platz. Mit Becher. {ours} hält ihn nicht auf, {theirs} versucht es. Der Ordner legt die Wurst weg.',
    tags: ['drama'],
    spot: { x: 0.3, y: 0.88, where: 'am Spielfeldrand' },
    cast: [{ slot: 'ours', role: 'defender', of: 'init' }, { slot: 'theirs', role: ['striker', 'winger'], of: 'other' }],
    rows: [
      { id: 'weggetreten', weight: 35, next: 'counter', word: 'BIERBANK!', actor: 'ours', tags: ['pfiff'], text: 'Er tritt den Ball ins Maisfeld und winkt. Schiedsrichterball, {ours} hat ihn, und alle anderen schauen noch dem Ordner zu.' },
      { id: 'ordner', weight: 40, next: 'shot', flip: true, carry: true, word: 'WEITER!', actor: 'theirs', text: 'Der Ordner ist schneller als gedacht. Der Schiri lässt weiterspielen, und {theirs} hat den Ball noch.' },
      { id: 'strafe', weight: 25, next: 'penalty', flip: true, word: 'ELFMETER!', actor: 'theirs', tags: ['gegenpfiff'], text: 'Der Schiri hat den Becher gesehen, und wer ihm vorher zugeprostet hat. Elfmeter für die, wegen uns. {ours} sagt, er kennt den Mann nicht.' },
    ],
  },
  {
    // Reached through Torwart nach vorne!. Our keeper is up for the corner; nobody is at home.
    id: 'torwart_vorne', label: 'Torwart im Strafraum',
    prompt: '{keeper} steht im Strafraum. Im anderen. Hinten steht niemand, {lastman} schaut sich um, {runner} lauert.',
    tags: ['drama', 'box'],
    spot: { x: 0.93, y: 0.5, where: 'im gegnerischen Strafraum' },
    cast: [
      { slot: 'keeper', role: 'keeper', of: 'init' },
      { slot: 'lastman', role: 'defender', of: 'other' },
      { slot: 'runner', role: ['striker', 'winger'], of: 'other' },
    ],
    rows: [
      { id: 'torwart_kopfball', weight: 30, next: GOAL, word: 'TORWART!', actor: 'keeper', tags: ['gefahr'], text: '{keeper} steigt hoch wie ein Kranich und nickt ein. Der Torwart! Die Bierbank kippt um.' },
      { id: 'leeres_tor', weight: 40, next: 'through_on_goal', flip: true, carry: true, word: 'LEERES TOR', actor: 'runner', tags: ['fehler'], text: '{lastman} köpft raus, {runner} rennt. Siebzig Meter, kein Torwart. {keeper} rennt auch. Hinterher.' },
      { id: 'geklaert', weight: 30, next: 'play', to: { x: 0.8, y: 0.5 }, flip: true, word: 'GEKLÄRT', actor: 'lastman', tags: ['geklaert'], text: '{lastman} köpft weg. {keeper} trabt zurück und sagt, er wollte eh nicht.' },
    ],
  },
  {
    // Reached through Torlinie!. Bar, line, and the linesman is our landlord.
    id: 'torlinie', label: 'Torlinie',
    prompt: '{shooter} hämmert ihn an die Latte, der Ball springt auf die Linie. Drin? {keeper} sagt nein. Erwin, der Linienrichter, ist unser Wirt.',
    tags: ['drama', 'box'],
    spot: { x: 0.99, y: 0.5, where: 'auf der Torlinie' },
    cast: [{ slot: 'shooter', role: ['striker', 'winger'], of: 'init' }, { slot: 'keeper', role: 'keeper', of: 'other' }],
    rows: [
      { id: 'drin', weight: 45, next: GOAL, word: 'DRIN!', actor: 'shooter', tags: ['gefahr'], text: 'Erwin hebt die Hand und zeigt zur Mitte. Drin, sagt der Wirt. Der Schiri glaubt ihm. {keeper} glaubt es nicht.' },
      { id: 'nicht_drin', weight: 40, next: 'corner', word: 'NICHT DRIN', actor: 'keeper', tags: ['gegenpfiff', 'geklaert'], text: 'Der Schiri war näher dran als Erwin. Nicht drin, Ecke. Erwin schaut wieder in sein Bier.' },
      { id: 'gelb', weight: 15, next: 'freekick', flip: true, word: 'GELB!', actor: 'shooter', tags: ['gegenpfiff'], text: '{shooter} zeigt Erwin, wo die Linie ist. Zu deutlich. Gelb, Freistoß für die.' },
    ],
  },
  {
    // Reached through Eisspray!. Nothing happened, but a man lies down, and the clock runs.
    id: 'eisspray', label: 'Eisspray',
    prompt: '{liegt} liegt. Nichts ist passiert, aber er liegt. Der Zeugwart trabt los mit dem Eisspray, {gegner} tippt auf die Uhr.',
    tags: ['drama'],
    // drawn where the ball is
    cast: [{ slot: 'liegt', role: ['midfielder', 'winger', 'striker'], of: 'init' }, { slot: 'gegner', role: 'midfielder', of: 'other' }],
    rows: [
      { id: 'eisspray', weight: 65, next: 'play', word: 'EISSPRAY', actor: 'liegt', text: 'Zwei Minuten Eisspray auf die Wade, die Uhr läuft. {liegt} steht auf, humpelt drei Schritte und sprintet dann zum Freistoß. Unser Ball.' },
      { id: 'gelb', weight: 20, next: 'freekick', flip: true, word: 'GELB!', actor: 'liegt', tags: ['gegenpfiff'], text: 'Der Schiri hat es gesehen. Gelb für {liegt}, fürs Liegen. Freistoß für die.' },
      { id: 'schiriball', weight: 15, next: 'play', flip: true, word: 'WEITER', actor: 'gegner', text: 'Der Schiri winkt den Zeugwart weg. Schiedsrichterball, {gegner} hat ihn zuerst.' },
    ],
  },
  {
    // Reached through Schwager!. The ref is family.
    id: 'schwager', label: 'Der Schwager',
    prompt: 'Der Schiri ist der Schwager von {kapitaen}. {kapitaen} geht zu Boden, {gegner} war einen Meter weg. Der Schiri zögert.',
    tags: ['drama'],
    // drawn where the ball is
    cast: [{ slot: 'kapitaen', role: ['midfielder', 'winger'], of: 'init' }, { slot: 'gegner', role: 'defender', of: 'other' }],
    rows: [
      { id: 'freistoss', weight: 50, next: 'freekick', word: 'FREISTOSS', actor: 'kapitaen', tags: ['pfiff'], text: 'Pfiff. Freistoß. {gegner} fragt, wofür. Der Schiri sagt: Familie.' },
      { id: 'elfmeter', weight: 15, next: 'penalty', word: 'ELFMETER!', actor: 'kapitaen', tags: ['pfiff', 'gefahr'], text: 'Der Schiri überlegt kurz, ob das im Strafraum war. Es war nicht. Er zeigt trotzdem auf den Punkt. Sonntag ist Familienessen.' },
      { id: 'unparteiisch', weight: 35, next: 'play', flip: true, word: 'WEITER!', actor: 'gegner', tags: ['gegenpfiff'], text: 'Der Schiri will heute allen zeigen, wie unparteiisch er ist. Weiterspielen, {gegner} nimmt den Ball mit. {kapitaen} bleibt liegen, aus Prinzip.' },
    ],
  },
  {
    // Reached through Psychospiel!. Our keeper talks before their penalty. The initiative stays with the
    // shooter's bench, as in every penalty panel, so the rows read from the taker's side and the keeper's
    // bench holds its no-ball pile here. The penalty itself, if it is still taken, is fresh dice.
    id: 'psychospiel', label: 'Psychospiel',
    prompt: '{keeper} geht zu {shooter}, sagt ihm was ins Ohr und zeigt in die linke Ecke. Der Schiri pfeift.',
    tags: ['drama', 'box'],
    spot: { x: 0.89, y: 0.5, where: 'auf dem Elfmeterpunkt' },
    cast: [{ slot: 'shooter', role: ['striker', 'winger'], of: 'init' }, { slot: 'keeper', role: 'keeper', of: 'other' }],
    rows: [
      { id: 'verzogen', weight: 30, next: 'play', flip: true, word: 'IN DEN BACH', actor: 'shooter', tags: ['fehler'], text: '{shooter} hat drei Sekunden nachgedacht. Zu lang. Der Ball geht in den Bach, {keeper} winkt ihm hinterher.' },
      { id: 'reingefallen', weight: 15, next: 'keeperball', flip: true, word: 'GEHALTEN!', actor: 'keeper', tags: ['geklaert'], text: '{shooter} schießt in die Ecke, in die {keeper} gezeigt hat. Weil er dachte, dass {keeper} denkt, dass er das nicht macht. {keeper} hat ihn.' },
      { id: 'nicht_zugehoert', weight: 55, next: 'penalty', word: 'SCHIESST TROTZDEM', actor: 'shooter', tags: ['gefahr'], text: '{shooter} hat nicht zugehört. Er legt sich den Ball nochmal hin und schaut nur auf den Ball.' },
    ],
  },
  // ---- v0.18 drama: two that can end in the net. ----
  {
    // Reached through Stromausfall!. The floodlight goes out; what happens in the dark stays in the dark.
    id: 'stromausfall', label: 'Stromausfall',
    prompt: 'Das Flutlicht ist aus. Man hört {ours} schnaufen und {theirs} fluchen. Irgendwo ist der Ball.',
    tags: ['drama'],
    // drawn where the ball is
    cast: [{ slot: 'ours', role: ['striker', 'winger'], of: 'init' }, { slot: 'theirs', role: 'defender', of: 'other' }],
    rows: [
      { id: 'im_dunkeln', weight: 35, next: GOAL, word: 'IM DUNKELN!', actor: 'ours', tags: ['gefahr'], text: 'Es rumpelt, dann klatscht es im Netz. Als das Licht angeht, liegt der Ball im Tor und {ours} grinst. Der Schiri hat nichts gesehen, also zählt es.' },
      { id: 'licht_an', weight: 40, next: 'play', carry: true, word: 'LICHT AN', actor: 'ours', text: 'Nach einer Minute ist das Licht wieder da. {ours} hat den Ball noch, und {theirs} steht auf einmal zehn Meter weiter weg.' },
      { id: 'im_dunkeln_weg', weight: 25, next: 'play', flip: true, word: 'WEG!', actor: 'theirs', tags: ['fehler'], text: 'Als das Licht angeht, hat {theirs} den Ball. Keiner weiß, wie. {ours} auch nicht.' },
    ],
  },
  {
    // Reached through Auf den Torwart!. The layer's striker runs at their keeper, who cannot play with his feet.
    id: 'torwartjagd', label: 'Torwart unter Druck',
    prompt: '{jaeger} rennt auf {keeper} zu. {keeper} hat den Ball am Fuß und schaut, wem er ihn geben kann. {libero} versteckt sich.',
    tags: ['drama', 'box'],
    spot: { x: 0.93, y: 0.5, where: 'vor deren Tor' },
    cast: [
      { slot: 'jaeger', role: ['striker', 'winger'], of: 'init' },
      { slot: 'keeper', role: 'keeper', of: 'other' },
      { slot: 'libero', role: 'defender', of: 'other' },
    ],
    rows: [
      { id: 'abgestaubt', weight: 35, next: GOAL, word: 'ABGESTAUBT!', actor: 'jaeger', tags: ['gefahr'], text: '{keeper} will ihn stoppen, der Ball springt ihm übers Schienbein. {jaeger} muss nur noch einschieben.' },
      { id: 'eigentor', weight: 10, next: GOAL, word: 'EIGENTOR!', actor: 'libero', tags: ['gefahr'], text: '{libero} will helfen und spielt ihn zurück. Am Torwart vorbei. Ins eigene Tor. Die Bierbank ist still vor Glück.' },
      { id: 'weggedroschen', weight: 40, next: 'duel', to: { x: 0.45, y: 0.5 }, flip: true, word: 'WEGGEDROSCHEN', actor: 'keeper', tags: ['geklaert'], text: '{keeper} drischt ihn in letzter Sekunde weg. Irgendwohin. Hauptsache weg.' },
      { id: 'zur_ecke', weight: 15, next: 'corner', word: 'ECKE', actor: 'keeper', tags: ['geklaert'], text: '{keeper} grätscht ihn mit Not ins Toraus. Ecke. {jaeger} klatscht in die Hände.' },
    ],
  },
];

/**
 * What kind of situation each drama is for the side it belongs to: a challenge when a man of theirs is in
 * it with ours, a set piece when the ball lies dead and the ref decides, a ball action otherwise.
 */
const SITUATION: Record<string, Situation> = {
  offsidetrap: 'challenge', hund: 'challenge', buergermeister: 'setpiece', schwalbe: 'challenge',
  feuerwehr: 'action', rudel: 'challenge', linienrichter: 'challenge', trainer: 'action', handspiel: 'setpiece',
  bierbank: 'action', torwart_vorne: 'challenge', torlinie: 'setpiece', eisspray: 'setpiece', schwager: 'challenge',
  psychospiel: 'setpiece', stromausfall: 'action', torwartjagd: 'challenge',
};

const fixed = (d: Drama): SceneType => ({
  id: d.id, label: d.label, situation: SITUATION[d.id] ?? 'action',
  build: () => ({ label: d.label, prompt: d.prompt, cast: d.cast, rows: d.rows, tags: d.tags, spot: d.spot }),
});

export const SCENES: SceneType[] = [...SIM_SCENES, ...DRAMA.map(fixed)];

export const START_SCENE = 'kickoff';
export const sceneById = new Map(SCENES.map(s => [s.id, s]));
