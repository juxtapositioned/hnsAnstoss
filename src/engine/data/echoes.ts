// v0.25: what happened, in the card's words (DESIGN §2.4). After a playtest: the best moments were the ones
// where the card, the man and the outcome told one story (32 Grad → "Moussa schnauft wie der Bulldog vom
// Huber", Kofi catches him); the worst were a card and an outcome that talked past each other (Tunnel! →
// "lässt ihn mit einem Haken stehen", Trau dich! → "der Ball geht hinten rum"). So a laid card can say how
// a row reads when that row comes up: its `echo`, keyed by row id or '#tag', replaces the row's own line.
// It is not a verdict — no stamp, no "gehört" — it is the same thing happening, told in the card's picture.
// A shout the men did not follow gets one short line between the shout and what happened (`miss`), so the
// coach reads that they heard and did something else, not that the game ignored him.
//
// Placeholders: {actor} the man the row belongs to, {me} the first man of the card's bench in the picture,
// {you} the first man of the other, {keeper} and the other slot names where the scene has them. Lines are
// written for SVH's bench; voice.ts turns them round when the other bench lays the card.

import type { CardSide } from '../types';

export const ECHO: Record<string, Record<string, string[]>> = {
  // ---- Shouts with the ball ----
  schiess: {
    schuss: ['Die Bank schreit SCHIESS, und {actor} schießt. Ohne nachzudenken, wie bestellt.', '{actor} fragt nicht lange und zieht ab!'],
    volley: ['{actor} nimmt die Flanke direkt aus der Luft!'],
  },
  flanke: {
    flanke: ['{actor} haut ihn rein. Hoch, weit, irgendwo in die Mitte.', '{actor} hat die Bank gehört und schlägt die Flanke, bevor einer fragt.'],
  },
  steil: {
    steilpass: ['{actor} spielt den Steilen genau in die Lücke. Einer ist durch!'],
    durch: ['{actor} geht steil, wie gerufen, und {you} schaut nur hinterher.'],
  },
  kopf: {
    kopfball: ['{actor} geht hoch und kommt mit der Stirn an den Ball!'],
    torwart_kopfball: ['Und {actor}, der Torwart, köpft ihn tatsächlich rein. Die Bierbank kippt um.'],
  },
  lang: {
    langer_ball: ['{actor} drischt ihn nach vorne. Die Bank nickt zufrieden.', '{actor} macht, was die Bank sagt: lang und hoch. Da läuft einer hin.'],
    abschlag: ['{actor} haut ihn lang, wie gerufen. Weit in die andere Hälfte.'],
    nach_vorne: ['Nicht hinten rum, sagt die Bank. {actor} spielt ihn nach vorne.'],
  },
  kurz: {
    querpass: ['Kurz, wie gerufen. {actor} spielt den Nebenmann an. Die Bierbank pfeift, die Bank nickt.'],
    abwurf: ['{actor} rollt ihn kurz raus, wie gerufen. Die Bierbank pfeift.'],
    rueckpass: ['{actor} spielt kurz zurück. Sicher ist sicher, sagt die Bank.'],
  },
  leg_quer: {
    quergelegt: ['{actor} legt quer, und der Nebenmann muss nur noch den Fuß hinhalten.'],
    zurueckgelegt: ['{actor} legt ihn zurück in den Rückraum, wie gerufen. Da steht einer.'],
    fluegel: ['{actor} spielt rüber auf den Flügel. Der Nebenmann stand wirklich frei.'],
  },
  lauf: {
    dribbling: ['{actor} läuft einfach. {you} kommt nicht hinterher.', '{actor} hört LAUF und läuft. An {you} vorbei, als wär der ein Hütchen.'],
    durch: ['Und {actor} läuft {you} einfach davon. Durch!'],
  },
  schiri: {
    foul: ['Die Bank hat die Arme oben, bevor {actor} überhaupt da ist. Dann ist er da, mit dem Bein. Pfiff, Freistoß.'],
    foul_gefaehrlich: ['Die ganze Bank schreit SCHIRI, und der Schiri pfeift. Freistoß, und zwar ein gefährlicher!'],
    elfmeter_foul: ['Die Bank schreit SCHIRI, bevor {actor} überhaupt zutritt. Dann tritt er zu. Elfmeter!'],
    gefoult: ['{actor} kommt raus, die Bank schreit SCHIRI, der Schiri zeigt auf den Punkt!'],
  },
  trau_dich: {
    steilpass: ['{actor} traut sich. Nicht der sichere Pass, der andere: steil!'],
    schuss: ['{actor} traut sich und zieht einfach ab!'],
    dribbling: ['{actor} traut sich und geht auf {you} los. Vorbei!'],
    durch: ['{actor} traut sich, und {you} schaut ihm hinterher.'],
    tor: ['{actor} traut sich den Lupfer. Über {keeper}, rein. TOR!'],
  },
  freibier: {
    tor: ['{actor} hat es gehört. TOR! Der Wirt zählt schon die Gläser.',
      '{actor} denkt ans Freibier und trifft. TOR! Hinterm Tresen seufzt der Wirt.'],
  },
  ueber_aussen: {
    fluegel: ['{actor} spielt ihn raus auf den Flügel. Da war wirklich Platz.'],
    flanke: ['Über außen, wie gerufen, und dann rein damit: {actor} schlägt die Flanke.'],
  },
  doppelpass: {
    querpass: ['Gib und geh: {actor} spielt ihn kurz und läuft los.'],
    steilpass: ['Doppelpass! {actor} spielt, läuft, kriegt ihn wieder. Wie im Training. Also nie im Training.'],
    durch: ['Doppelpass, und {actor} ist durch. Die Bank klatscht, als hätte sie es erfunden.'],
  },
  tempo_raus: {
    querpass: ['Tempo raus, wie gerufen. {actor} spielt quer und atmet durch.'],
    rueckpass: ['{actor} spielt zurück. Ganz ruhig. Die Wurst läuft nicht weg.'],
  },
  nachsetzen: {
    abgewehrt: ['{keeper} lässt ihn prallen, und einer ist nachgegangen, wie gerufen. Nachschuss!'],
    zweiter_ball: ['Einer ist mitgegangen und steht genau da, wo der Ball runterkommt.'],
  },
  tunnel: {
    dribbling: ['{actor} schiebt ihn {you} durch die Beine. TUNNEL! Die Bierbank johlt.', 'Durch die Beine! {you} schaut nach unten, {actor} ist schon weg.'],
  },
  koerper_rein: {
    foul: ['{me} stellt den Hintern rein, {you} rennt drauf. Pfiff, Freistoß.'],
    foul_gefaehrlich: ['{me} schirmt ab, Arsch raus, und {you} geht drüber. Freistoß, gefährlich!'],
    querpass: ['{actor} schirmt den Ball ab und legt ab, bevor {you} rankommt.'],
  },
  foul_ziehen: {
    foul: ['{you} kommt, wie bestellt. Ein Kontakt, und {me} fliegt wie vom Pferd getreten. Pfiff.'],
    foul_gefaehrlich: ['{me} lässt {you} kommen, wie bestellt. Kontakt, Flug, Pfiff. Freistoß, gefährlich!'],
    elfmeter_foul: ['{me} lässt {you} im Strafraum kommen. Ein Tipp aufs Schienbein, {me} fällt. Elfmeter!'],
    gefoult: ['{me} wartet, bis {keeper} kommt. Er kommt. Elfmeter!'],
  },
  drueck_ihn_runter: {
    tor: ['{actor} drückt ihn runter, wie der Opa gesagt hat. Aufsetzer, TOR!'],
  },

  // ---- Shouts without the ball ----
  umhauen: {
    abgegraetscht: ['{actor} geht rein und trifft tatsächlich den Ball.', '{actor} geht dazwischen. Egal wie. Diesmal mit Ball.'],
    foul: ['{actor} haut um. Pfiff, Freistoß, aber weit weg vom Tor.'],
  },
  pressing: {
    ballverlust: ['Drauf, drauf, drauf: {actor} läuft {you} so lange an, bis der Ball weg ist.'],
    patzer: ['Drauf! {actor} rennt auf den Torwart zu, und der verdaddelt ihn vor Schreck.'],
    ins_aus: ['{you} kriegt Druck von allen Seiten und spielt ihn ins Aus.'],
    fehlpass: ['Sie laufen an wie die Wilden. {you} spielt den ersten Pass direkt zu uns.'],
  },
  torwart_raus: {
    breit_gemacht: ['{actor} kommt raus wie ein Güterzug und nimmt {you} den Ball vom Fuß.'],
    abgefangen: ['{actor} kommt raus und pflückt die Flanke runter.'],
  },
  weg_damit: {
    geklaert: ['{actor} köpft ihn weg. Keine Kunst. Hauptsache weg.'],
    abgeblockt: ['{actor} haut sich dazwischen und drischt ihn weg. Weg damit, wie gerufen.'],
    zur_ecke: ['Weg damit! {actor} drischt ihn ins Toraus. Ecke, aber weg.'],
  },
  stellen: {
    abgegraetscht: ['{actor} geht nicht rein, wartet, und holt sich den Ball.', '{actor} stellt sich hin wie eine Litfaßsäule. {you} läuft rein. Ball weg.'],
    breit_gemacht: ['{actor} bleibt stehen, bis {you} schießt. Gehalten.'],
    eingeholt: ['{actor} stellt ihn, statt zu grätschen, und spitzelt ihn weg.'],
  },
  linie: {
    gehalten: ['{actor} bleibt auf der Linie und hat ihn.'],
  },
  reinwerfen: {
    abgeblockt: ['{actor} wirft sich rein. Mit allem. Abgeblockt!'],
    zur_ecke: ['{actor} wirft sich rein und lenkt ihn zur Ecke. Hauptsache nicht drin.'],
  },
  zustellen: {
    querpass: ['Die Lücken sind zu. {you} findet nichts und spielt quer.'],
    rueckpass: ['Alles zu. {you} dreht ab und spielt zurück.'],
  },
  nie_im_leben: {
    abseits: ['Die halbe Bank zeigt auf die Linie. Die Fahne geht hoch. Abseits.'],
  },
  fallen_lassen: {
    querpass: ['Alle sind zurück. {you} findet keinen und spielt quer.'],
    abgeblockt: ['Alle zurück, wie gerufen, und einer steht im Weg. Abgeblockt!'],
  },
  linie_halten: {
    abseits: ['Die Kette steht auf einer Linie, wie gerufen. Der Pass kommt, die Fahne auch. Abseits!'],
  },
  schlafmuetze: {
    ballverlust: ['{you} dreht sich zur Bank um. Der Ball ist weg.'],
  },
  taktisches_foul: {
    foul: ['{actor} nimmt {you} mit. Gelb, sagt der Schiri. Egal, sagt die Bank. Konter vorbei.'],
  },
  doppeln: {
    abgegraetscht: ['Zu zweit drauf: {actor} und noch einer. {you} kann nur einen. Ball gewonnen.'],
    ballverlust: ['Zwei auf einen, und {you} weiß nicht, wohin. Ball weg.'],
  },
  kopf_dazwischen: {
    geklaert: ['{actor} geht hoch und köpft ihn raus.'],
    vorbei: ['Einer von uns geht hoch, egal wer. Der Kopfball geht drüber.'],
  },

  // ---- Set-piece shouts ----
  direkt: {
    fk_tor: ['{actor} hat so einen Hammer. Über die Mauer, ins Eck! TOR!'],
    fk_mauer: ['{actor} haut drauf. Genau in die Mauer.'],
    fk_gehalten: ['{actor} schießt direkt, wie gerufen. {keeper} fliegt und hält.'],
    fk_drueber: ['{actor} haut ihn direkt, wie gerufen. Weit drüber, in den Garten vom Nachbarn.'],
  },
  auf_den_kopf: {
    kopfball: ['Alle Großen vorne, der Ball auf die Stirn: {actor} kommt dran!'],
    fk_flanke: ['{actor} hebt ihn rein, die Großen stehen schon.'],
    einwurf_weit: ['{actor} wirft ihn bis an den Fünfer, auf die Köpfe.'],
  },
  kurz_ausfuehren: {
    kurz: ['Kurz ausgeführt, wie gerufen. Keiner weiß warum, aber es klappt.'],
    fk_kurz: ['{actor} spielt ihn kurz. Die Mauer steht umsonst.'],
  },
  hoch_und_weit: {
    abschlag: ['Hoch und weit, das bringt Sicherheit: {actor} haut ihn in die andere Hälfte.'],
    fk_lang: ['{actor} schlägt ihn nach vorne. Da vorne ist einer. Irgendwo.'],
    einwurf_lang: ['{actor} wirft ihn hoch und weit die Linie lang.'],
  },
  schnell: {
    fk_schnell: ['{actor} führt aus, während die Mauer noch diskutiert!'],
    schnell_eingeworfen: ['{actor} wirft schnell ein, wie gerufen. Die schlafen noch.'],
  },
  verladen: {
    tor: ['{actor} schaut ihn nicht an. Schaut ihn nicht an. Schießt. {keeper} liegt in der falschen Ecke. Tor!'],
  },
  variante: {
    fk_variante: ['Die Variante aus dem Training! Zwei laufen über den Ball, und {actor} ist frei!'],
  },
  einwurf_lang: {
    einwurf_weit: ['{actor} wirft ihn weiter, als er schießt. Bis an den Fünfer!'],
    einwurf_lang: ['{actor} holt aus und wirft ihn die halbe Linie lang.'],
  },
  zweiter_pfosten: {
    kopfball: ['Der Ball segelt über alle, und hinten steht {actor}!'],
  },
  mitte: {
    tor: ['{actor} schießt in die Mitte. {keeper} liegt schon in der Ecke. Tor!'],
  },
  vom_anstoss: {
    anstoss_tor: ['{actor} schaut. Und schießt. Der Torwart von denen schaut hinterher. TOR!'],
  },
  torwart_spielt_mit: {
    kurz: ['{actor} spielt mit, wie der Trainer will. Kurz auf den Verteidiger. Geht gut.'],
    abwurf: ['{actor} rollt ihn raus und läuft hinterher. Er will auch mal.'],
  },
  mauer: {
    fk_mauer: ['Die Mauer steht, Hände vor dem Wichtigsten. {you} schießt genau rein.'],
  },
  manndeckung: {
    geklaert: ['Jeder hat einen, wie gerufen. {actor} köpft ihn raus.'],
    gefaustet: ['Jeder hat einen, keiner kommt hoch, und {actor} faustet ihn weg.'],
  },
  immer_links: {
    gehalten: ['{actor} springt nach links. Der Ball kommt links. Gehalten!'],
    fk_gehalten: ['{actor} geht nach links, wie gerufen. Da kommt er. Gehalten!'],
  },
  anlaufen: {
    patzer: ['Sie laufen an, und {keeper} spielt ihn genau in die Füße von {actor}.'],
    verloren: ['{actor} geht dazwischen, bevor der Einwurf ankommt.'],
    abschlag_verloren: ['Sie laufen an, {keeper} haut ihn weg, und bei uns köpft einer zurück.'],
  },
  pfosten_besetzen: {
    geklaert: ['An jedem Pfosten einer, wie beim Opa. {actor} köpft ihn raus.'],
    zur_ecke: ['Am Pfosten steht einer, wie gerufen, und lenkt ihn zur Ecke.'],
  },
  nicht_drehen: {
    fk_mauer: ['Keiner in der Mauer dreht sich. Der Ball knallt {actor} in den Bauch. Er zahlt keinen Kasten.'],
  },
  zappeln: {
    gehalten: ['{actor} zappelt auf der Linie wie ein Hampelmann. {you} schießt genau auf ihn.'],
    vorbei: ['{me} zappelt, {you} schaut hin und schießt vorbei.'],
  },

  // ---- Events with the ball ----
  guelle: {
    steilpass: ['Drüben halten sich drei die Nase zu. {actor} spielt genau durch die Lücke!'],
    durch: ['{you} hält sich die Nase zu. {actor} ist weg.'],
    schuss: ['Drüben hält sich die halbe Abwehr die Nase zu. {actor} zieht ab.'],
  },
  rueckenwind: {
    langer_ball: ['Der Wind nimmt den Ball von {actor} mit, zwanzig Meter weiter als gedacht.'],
    abschlag: ['{actor} haut ihn raus, und der Wind trägt ihn bis an den Sechzehner von denen.'],
    fk_lang: ['{actor} schlägt ihn nach vorne, der Wind macht den Rest.'],
  },
  ausschank: {
    steilpass: ['Die Fahne lehnt am Zaun, Erwin am Tresen. {actor} steckt durch, und keiner hebt was.'],
    durch: ['Keiner hebt die Fahne. Erwin steht am Ausschank. {actor} ist durch.'],
  },
  blaskapelle: {
    steilpass: ['Im Takt vom Radetzkymarsch spielt {actor} den Steilpass. Humtata, und einer ist durch!'],
    querpass: ['{actor} spielt quer, genau auf den Schlag. Die Bierbank klatscht mit.'],
  },
  durchsage: {
    tor: ['{keeper} schaut noch zum Parkplatz, da ist der Ball schon drin. TOR!'],
  },
  tiefe_sonne: {
    tor: ['{keeper} sieht nur Sonne. Den Ball sieht er erst im Netz. TOR!'],
    kopfball: ['{keeper} hält sich die Hand vor die Augen. {actor} kommt an den Ball!'],
  },
  wochenblatt: {
    dribbling: ['Die Kamera klickt, und {actor} zeigt, was er kann. {you} ist auf dem Foto, aber nur von hinten.'],
    schuss: ['{actor} will aufs Foto und zieht ab!'],
  },
  freundin: {
    dribbling: ['Seine Freundin schaut zu, also geht {actor} an {you} vorbei. Einfach so.'],
  },
  plastiktuete: {
    dribbling: ['{you} tritt nach der Tüte, {actor} geht mit dem Ball vorbei.'],
    durch: ['{you} kämpft mit der Aldi-Tüte. {actor} ist weg.'],
  },
  stollen: {
    dribbling: ['{you} rutscht weg, ein Stollen fehlt. {actor} geht vorbei.'],
    durch: ['{you} rutscht aus, wo der Stollen fehlt. {actor} ist durch.'],
  },
  handy_mauer: {
    fk_tor: ['Die ganze Mauer greift sich an die Hosentasche, und {actor} zirkelt ihn drüber. TOR!'],
  },
  aufgepumpt: {
    fk_lang: ['Der Ball von der Tankstelle springt wie ein Flummi, weit nach vorne.'],
    abschlag: ['{actor} tritt rein, und der Ball von der Tankstelle fliegt bis an den anderen Sechzehner.'],
  },
  taube: {
    latte: ['Der Ball knallt an die Latte. Die Taube bleibt sitzen. Respekt.'],
    pfosten: ['Pfosten! Oben auf der Latte flattert die Taube kurz und setzt sich wieder.'],
  },
  muecken: {
    kopfball: ['{keeper} wedelt mit den Armen in den Mücken. {actor} kommt an den Ball!'],
  },
  sturmboee: {
    ecke_direkt: ['Die Böe nimmt die Ecke mit und dreht sie direkt ins Tor. {keeper} greift in den Wind. TOR!'],
    kopfball: ['Der Wind drückt die Ecke genau auf den Kopf von {actor}!'],
  },
  maulwurf: {
    flutscher: ['Der Ball tickt auf dem Maulwurfshügel auf und springt {keeper} über die Hände ins Tor. TOR!'],
    abgewehrt: ['Maulwurfshügel! Der Ball springt komisch, {keeper} kann ihn nur abklatschen. Nachschuss!'],
  },
  geburtstag: {
    eigentor: ['{actor} winkt noch zur Bierbank, da ist der Ball schon an seinem Kopf. Und im eigenen Tor. Happy Birthday.'],
  },

  // ---- Events without the ball ----
  wespe: {
    ballverlust: ['{you} schlägt nach der Wespe statt nach dem Ball. {actor} sagt danke.'],
    patzer: ['{keeper} schlägt nach der Wespe. Der Ball rollt {actor} vor die Füße.'],
  },
  falsches_trikot: {
    ballverlust: ['{you} spielt den Pass zum Mann im falschen Trikot. Der ist aber von uns: {actor}.'],
  },
  pfuetze: {
    ballverlust: ['Der Pass von {you} bleibt in der Pfütze liegen. {actor} holt ihn sich.'],
    lang_verloren: ['Der lange Ball platscht in die Pfütze und bleibt stehen. Bei uns köpft einer zurück.'],
  },
  bus_hupt: {
    langer_ball: ['Der Bus hupt, {you} hat es eilig: lang und hoch, irgendwohin.'],
    lang_verloren: ['Der Bus hupt, {actor} drischt ihn nach vorne, und bei uns köpft einer zurück.'],
    schuss: ['Der Bus hupt. {you} will heim und schießt einfach.'],
  },
  brille: {
    abgegraetscht: ['Der Schiri sieht ohne Brille nichts. {actor} grätscht, ob mit Ball oder ohne, weiß nur {you}.'],
  },
  bratwurst: {
    eingeholt: ['{you} schaut zum Bratwurststand. {actor} holt ihn ein und spitzelt ihn weg.'],
    abgegraetscht: ['{you} riecht die Bratwurst und ist kurz woanders. {actor} nimmt ihm den Ball ab.'],
  },
  handy_torwart: {
    patzer: ['Es brummt in der Hose von {keeper}. Er greift hin, der Ball rollt zu {actor}.'],
  },
  hochzeit: {
    querpass_fehler: ['{you} denkt an die Rede und spielt quer. Genau in den Lauf von {actor}.'],
    rueckpass_kurz: ['{you} schaut auf die Uhr, der Rückpass bleibt liegen. {actor} bedankt sich.'],
    verstolpert: ['Die Glocken läuten, {you} verstolpert. {actor} hat ihn.'],
  },
  dackel_zaun: {
    ins_aus: ['Der Dackel bellt, {you} macht einen Bogen und läuft mit dem Ball ins Aus.'],
    ballverlust: ['{you} schaut zum Dackel. {actor} nimmt ihm den Ball ab.'],
  },
  boeller: {
    vorbei: ['BUMM. {you} zuckt beim Anlauf und schießt vorbei.'],
    fk_drueber: ['BUMM, genau beim Anlauf. Der Freistoß fliegt in den Garten vom Nachbarn.'],
  },
  schief_gekalkt: {
    falscher_einwurf: ['{you} wirft ein, mit einem Fuß vor der schiefen Linie. Falscher Einwurf!'],
  },
  oma: {
    vorbei: ['{you} hört seine Oma und köpft drüber.'],
    drueber: ['Die Oma ruft, der Schütze winkt, und die Ecke fliegt über alle drüber.'],
  },
  kirchenglocken: {
    '#fehler': ['Die Glocken läuten, drüben bekreuzigt sich einer. Den Ball hat er dabei vergessen.'],
  },
  rasensprenger: {
    ballverlust: ['{you} steht im Strahl vom Rasensprenger. {actor} nimmt ihm den Ball ab.'],
    ins_aus: ['Der Rasensprenger erwischt {you}. Der Pass geht ins Aus.'],
  },
  maisfeld: {
    lang_verloren: ['{you} traut sich nicht richtig lang, wegen dem Mais. Der Ball kommt kurz, und bei uns köpft einer zurück.'],
    ins_aus: ['{you} schaut zum Maisfeld und spielt den Ball genau dahin. Weg.'],
  },
  huepfburg: {
    vorbei: ['Zwölf Kinder schreien DANEBEN, und {you} schießt daneben.'],
    latte: ['Die Kinder in der Hüpfburg schreien, {you} zuckt, der Ball knallt an die Latte.'],
  },
  grillrauch: {
    patzer: ['{keeper} sieht im Rauch nichts und spielt ihn {actor} genau vor die Füße.'],
  },
  keine_flanke: {
    zum_einwurf: ['{actor} geht dazwischen und spitzelt ihn ins Aus.'],
    abgegraetscht: ['Nicht flanken lassen, wie gerufen: {actor} grätscht rein, bevor {you} flanken kann.'],
    zur_ecke: ['{actor} blockt die Flanke. Ecke, aber keine Flanke.'],
  },
  mitgehen: {
    eingeholt: ['{actor} klebt an {you} wie eine Klette und spitzelt ihn weg.'],
    abgegraetscht: ['{actor} geht mit, wohin {you} auch geht, und holt sich den Ball.'],
  },
  meiner: {
    abgefangen: ['{actor} fängt ihn. Die eigene Abwehr duckt sich rechtzeitig.'],
    gefaustet: ['{actor} faustet ihn weg, über alle Köpfe.'],
  },
  kontaktlinse: {
    '#fehler': ['{you} sieht zwei Bälle und trifft den falschen.'],
  },
  maibaum: {
    abgegraetscht: ['{actor} geht in den Zweikampf wie ein Bulldog. Ball gewonnen.'],
    foul: ['{actor} denkt an den Maibaum und tritt {you} um. Pfiff. Hat sich trotzdem gut angefühlt.'],
  },
  hahn: {
    vorbei: ['KIKERIKIII! {you} zuckt und schiebt ihn vorbei.'],
    eingeholt: ['Der Hahn kräht, {you} zuckt, und {actor} holt ihn ein.'],
  },
  hitze: {
    eingeholt: ['{you} schnauft wie der Bulldog vom Huber. {actor} holt ihn locker ein.'],
    querpass: ['Bei 32 Grad läuft {you} nicht mehr allein aufs Tor. Er wartet und spielt quer.'],
  },
  balljunge_troedelt: {
    verloren: ['Der Balljunge trödelt, und bis der Einwurf kommt, steht {actor} schon richtig. Ball weg.'],
    geklaert: ['Bis der Balljunge den Ball bringt, stehen alle von uns im Strafraum. {actor} köpft ihn raus.'],
  },
  kleiner_schiri: {
    fk_mauer: ['Die Mauer steht fast am Ball, weil der Schiri so kleine Schritte macht. {you} schießt voll rein.'],
  },
  brennnesseln: {
    falscher_einwurf: ['{you} steht mit einem Bein in den Brennnesseln und hebt den Fuß. Falscher Einwurf.'],
  },
  kuhfladen: {
    drueber: ['Anlauf durch den Kuhfladen, und die Ecke fliegt über alle drüber.'],
  },

  // ---- v0.20 with the ball ----
  flach: {
    steilpass: ['Flach, wie gerufen: {actor} spielt ihn auf dem Rasen durch die Lücke!'],
    querpass: ['{actor} spielt flach quer. Flach spielen, hoch gewinnen.'],
    quergelegt: ['{actor} legt flach quer. Der Nebenmann muss nur noch den Fuß hinhalten.'],
  },
  nach_vorne: {
    nach_vorne: ['{actor} spielt nach vorne. Rückwärts fahren wir nach dem Spiel.'],
    andribbeln: ['{actor} geht nach vorne, wie gerufen, genau auf {you} zu.'],
    steilpass: ['{actor} spielt steil. Einer ist durch!'],
  },
  aufs_tor: {
    tor: ['{actor} schießt einfach aufs Tor. Der Torwart ist auch nur ein Mensch. TOR!'],
    fk_tor: ['Hauptsache aufs Tor, und {actor} trifft es sogar. Ins Eck! TOR!'],
  },
  pike: {
    tor: ['{actor} stochert ihn mit der Spitze rein. Nicht schön. Aber drin. TOR!'],
    vorbei: ['{actor} nimmt die Pike, wie gerufen. Nicht schön, und auch nicht drin.'],
  },
  scout: {
    schuss: ['{actor} sieht den Mann mit dem Notizblock und zieht ab. Für die Bezirksliga!'],
    dribbling: ['Für den Scout: {actor} lässt {you} stehen und schaut zum Zaun, ob er es aufgeschrieben hat.'],
  },
  konferenz: {
    steilpass: ['Drüben horcht die halbe Abwehr zum Sportheim. {actor} steckt durch!'],
    durch: ['{you} horcht nach der Konferenz. {actor} ist weg.'],
    nach_vorne: ['Drüben dreht sich einer zum Fenster. {actor} spielt ihn in die Lücke dahinter.'],
  },
  frisch_gemaeht: {
    querpass: ['Der Ball rollt wie auf Schienen. {actor} spielt quer, und er kommt genau an.'],
    steilpass: ['Auf dem frisch gemähten Rasen läuft der Steilpass von {actor} wie ein Zug. Einer ist durch!'],
  },
  neue_handschuhe: {
    abwurf: ['{actor} wirft mit den neuen Handschuhen raus. Wie ein Profi. Autohaus Maier.'],
  },
  dreh_dich: {
    dribbling: ['{actor} dreht sich. Hinter ihm war wirklich keiner. Weg!'],
    schuss: ['{actor} dreht sich und zieht ab!'],
  },
  fallrueckzieher: {
    volley: ['FALLRÜCKZIEHER! {actor} liegt in der Luft wie der Fischer 1977!'],
  },
  schiess_ihn_an: {
    zur_ecke: ['{me} schießt {you} ans Schienbein. Toraus. Ecke, wie die Profis.'],
    zum_einwurf: ['{me} schießt {you} an, der Ball geht ins Aus. Einwurf für uns.'],
  },
  hintermann: {
    rueckpass: ['{actor} dreht ab, bevor der hinter ihm dran ist, und spielt zurück.'],
  },
  leo: {
    zweiter_ball: ['Drüben lässt ihn einer liegen. Der Ball springt zu uns.'],
  },
  kuehe: {
    dribbling: ['Die Kuh muht, {you} zuckt, {actor} ist vorbei.'],
    flanke: ['{you} schaut zu den Kühen, {actor} schlägt die Flanke.'],
    fluegel: ['Am Weidezaun ist keiner von denen. Da ist nur Platz, und {actor} spielt ihn hin.'],
  },
  fruehschoppen: {
    dribbling: ['{you} läuft noch im Frühschoppen-Tempo. {actor} ist vorbei.'],
    durch: ['{you} hat die zweite Maß noch in den Beinen. {actor} ist durch.'],
  },
  schwiegermutter: {
    tor: ['{you} denkt an die Schwiegermutter und vergisst seinen Mann. TOR!'],
  },
  winkel: {
    tor: ['Da, wo die Spinnweben hängen. {actor} trifft genau die. Tor!'],
    fk_tor: ['{actor} zirkelt ihn in den Winkel, wo die Spinnweben hängen. TOR!'],
    vorbei: ['{actor} zielt in den Winkel. Knapp drüber. Die Spinnweben bleiben.'],
  },
  erster_pfosten: {
    kopfball: ['Scharf auf den ersten Pfosten, und da steht {actor}!'],
  },
  balljunge: {
    schnell_eingeworfen: ['Der Balljunge ist schneller als alle. {actor} wirft ein, bevor die sich sortiert haben.'],
  },
  nieselregen: {
    flutscher: ['Der nasse Ball rutscht {keeper} durch die Hände. TOR!'],
    abgewehrt: ['{keeper} kriegt den nassen Ball nicht fest. Nachschuss!'],
  },
  geschirrtuch: {
    einwurf_weit: ['Abgetrocknet mit dem Entengeschirrtuch fliegt der Einwurf von {actor} bis an den Fünfer.'],
  },
  glueckssocken: {
    tor: ['Die Glückssocken wirken. Seit 2011. Tor!'],
  },
};

/** v0.25: a shout the men did not follow. Per card where the card has a joke of its own, else one of these. */
export const MISS_BY_CARD: Record<string, string[]> = {
  trau_dich: ['{me} traut sich nicht.', 'Trau dich, ruft die Bank. {me} traut sich lieber nicht.'],
  kurz: ['{me} spielt nicht kurz. Er hat seine Gründe.'],
  lang: ['Lang, ruft die Bank. {me} findet, kurz geht auch.'],
  ruhig: ['Ruhig war dann keiner.'],
  absichern: ['Einer bleibt hinten, hat die Bank gerufen. Geblieben ist keiner.', 'Hinten bleibt keiner. Alle wollten nach vorne.'],
  schiess: ['{me} schießt nicht. Er sucht einen, der besser steht.'],
  flanke: ['{me} flankt nicht. Da ist keiner, sagt sein Blick.'],
  steil: ['Steil war dann höchstens der Blutdruck vom Trainer.'],
  tunnel: ['{you} macht die Beine zu. Zum ersten Mal heute.'],
  lauf: ['{me} läuft. Nur nicht schneller als vorher.'],
  umhauen: ['{me} will umhauen und trifft nur Luft.'],
  stellen: ['{me} stellt sich hin. Dann geht er doch rein.'],
  zustellen: ['Zugestellt wird, aber nicht da, wo der Ball ist.'],
  torwart_raus: ['{keeper} kommt raus. Einen Schritt. Dann überlegt er es sich anders.'],
  pressing: ['Sie laufen an. {you} lässt sie laufen.'],
  weg_damit: ['Weg damit, ruft die Bank. Weg ist dann nur die Ordnung.'],
  schiri: ['Die Bank schreit. Der Schiri schaut auf seine Uhr.'],
  freibier: ['Der Wirt atmet auf.'],
};

export const MISS: Record<CardSide, string[]> = {
  ball: [
    '{me} hat es gehört. Sagt er später.',
    '{me} schaut kurz zur Bank. Dann macht er, was er will.',
    'Auf dem Platz kommt davon nichts an.',
    '{me} nickt zur Bank und macht was anderes.',
    'Gehört hat es das ganze Dorf. {me} nicht.',
  ],
  noball: [
    '{me} winkt ab. Er hat eine eigene Idee.',
    '{me} hat es gehört. Zu spät.',
    'Die Bank ruft, {me} rennt. Nur woanders hin.',
    '{me} dreht sich zur Bank um. Genau im falschen Moment.',
  ],
};
