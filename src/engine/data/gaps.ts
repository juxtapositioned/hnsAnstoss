// v0.27: what happens off camera. Between two highlights the clock jumps and the match goes on without
// anyone watching; a few of these lines say what it looked like. Written in SVH's voice like everything
// else (voice.ts), with the men by name: {a} is one of ours, {b} one of theirs, {ta} / {tb} the keepers.
// Nothing here moves the score or a gauge — it is the Kreisklasse between the moments that matter.

/** Any time. */
export const GAP_LINES: string[] = [
  'Viel Mittelfeld. Sehr viel Mittelfeld.',
  '{a} und {b} streiten sich um einen Einwurf. Beide sind sich sehr sicher.',
  'Der Ball liegt im Maisfeld. Die Suche dauert.',
  '{b} holt sich Gelb fürs Meckern. Er meckert weiter, jetzt leiser.',
  'Der Schiri bindet sich den Schuh. Alle warten.',
  'Auf der Bierbank wird die zweite Kiste aufgemacht.',
  '{a} fordert den Ball. Er kriegt ihn nicht. Er fordert ihn weiter.',
  'Hin und her, her und hin. Die Bratwurst am Stand ist spannender.',
  '{tb} schlägt dreimal ab. Dreimal ins Seitenaus.',
  'Zwei Fehlpässe bei uns, drei drüben. Ausgeglichen.',
  '{a} liegt am Boden. Der Zeugwart kommt mit dem Eisspray. {a} steht wieder.',
  '{b} grätscht an der Mittellinie ins Leere und bleibt kurz liegen. Aus Scham.',
  'Ein Hund bellt am Zaun. Diesmal bleibt er draußen.',
  'Der Linienrichter holt sich ein Spezi. Die Fahne hält solange der Wirt.',
  '{a} probiert einen Übersteiger. Er probiert es nie wieder.',
  'Freistoß im Mittelfeld, und keiner weiß, wer ihn schießen soll. Am Ende keiner.',
  'Die Oma am Zaun ruft {a} zu, dass er sich eine Jacke anziehen soll.',
  '{b} erklärt dem Schiri die Abseitsregel. Der Schiri nickt höflich.',
  'Lange Bälle, kurze Beine.',
  '{a} und {b} kennen sich aus der Schule. Man merkt es an jedem Zweikampf.',
  'Es passiert nichts. Mit großem Einsatz.',
  'Der Ball fliegt dreimal über den Zaun. Einmal kommt er von allein zurück.',
  'Drüben wechselt einer die Schuhe. Mitten im Spiel. Auf dem Platz.',
  '{tb} steht weit vor seinem Tor und winkt jemandem auf dem Parkplatz.',
  'Auf der Bierbank wird die Aufstellung diskutiert. Laut, und in beide Richtungen.',
  'Einwurf, Einwurf, Einwurf. Der Ball will heute nicht auf dem Platz bleiben.',
  '{a} köpft einen Ball, der eigentlich für den Fuß gedacht war.',
  'Der Wind dreht. Die Grillwolke auch.',
  '{b} spielt einen Pass in den Rücken seines Mitspielers. Der schaut ihn lange an.',
  'Die Durchsage sucht den Fahrer eines weißen Passat. Keiner meldet sich.',
  '{ta} fängt eine Rückgabe mit der Hand. Der Schiri schaut gerade auf die Uhr.',
  '{a} zieht sich die Stutzen hoch. Das dauert, er ist gründlich.',
  'Ein Traktor fährt am Sportplatz vorbei. Alle schauen hin, auch der Schiri.',
  '{b} ruft seit zehn Minuten "Hintermann!". Es war nie einer da.',
  'Der Ball ist platt. Der Zeugwart pumpt nach, mit dem Fahrradschlauch-Adapter.',
  '{a} und {b} liegen gleichzeitig am Boden. Der Schiri lässt beide liegen.',
];

/** The first quarter of an hour. */
export const EARLY: string[] = [
  'Beide tasten sich ab. Mit den Stollen.',
  'Die ersten Minuten sind für die Knöchel.',
  '{a} sucht noch seine Position. Der Trainer zeigt sie ihm. Zweimal.',
];

/** The last quarter of an hour of the match. */
export const LATE: string[] = [
  'Die Ersten schauen auf die Uhr am Vereinsheim. Die geht seit Jahren nach.',
  'Krämpfe, auf beiden Seiten. Der Zeugwart hat alle Hände voll.',
  '{b} steht nur noch im Mittelkreis und winkt, wenn der Ball vorbeikommt.',
  'Die Bierbank zählt die Minuten runter. Laut und falsch.',
];

/** After a goal, by who scored it (from SVH's side). */
export const AFTER_GOAL: Record<'us' | 'them', string[]> = {
  us: [
    'Anstoß für die. Bei uns wird noch gefeiert, da läuft das Spiel schon wieder.',
    'Die Bierbank singt noch, als drüben schon angestoßen wird.',
    '{a} läuft noch eine Ehrenrunde, dann merkt er, dass weitergespielt wird.',
  ],
  them: [
    'Anstoß für uns. {a} holt den Ball aus dem Netz und trägt ihn zur Mitte, als wär es seine Schuld.',
    'Bei uns redet erstmal keiner. Dann schreien alle gleichzeitig.',
    '{ta} schaut lange den Pfosten an. Der Pfosten schaut zurück.',
  ],
};

/** A half that ends without anything happening in its last minutes. */
export const TO_WHISTLE: Record<'halftime' | 'end', string[]> = {
  halftime: ['Der Schiri schaut auf die Uhr, dann auf den Kuchenstand. Halbzeit.', 'Noch ein Einwurf, dann pfeift er ab. Halbzeit.'],
  end: ['Der Schiri pfeift dreimal, und dann nochmal, weil es keiner gehört hat. Aus.', 'Ein letzter langer Ball, keiner kommt hin. Abpfiff.'],
};
