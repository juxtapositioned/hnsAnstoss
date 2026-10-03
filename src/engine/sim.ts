// The football under the strip (DESIGN §2.1, v0.13). Every panel is a situation at a place: a man on
// the ball on the left wing at the halfway line is not the same panel as a man on the ball at the edge
// of their box, and neither is a free kick from 18 metres the same as one from our own half. Each scene
// type here is a function from the ball's position to a table: which outcomes can happen at all, how
// likely each one is, and where the ball goes next. The geometry is a real pitch (105 × 68 m); the
// numbers are Kreisklasse — keepers are worse, defenders slower, and the long ball is a way of life.
//
// Pure and deterministic: the same place always builds the same table, the cast only tilts it (traits),
// and the shouts pull it (match.ts). No numbers ever reach the screen — the coach reads the place.
//
// Positions are in the frame of the side with the ball (types.ts `Pos`); a row's `to` is in the frame
// of the panel it is written in, and the engine mirrors it when the row hands the ball over.

import type { Built, CastSlot, Pos, Role, Row, SceneType, Side, Spot, Tag } from './types';
import { GOAL } from './types';
import { HOME } from './voice';

const LEN = 105;
const WID = 68;
const BOX_X = 1 - 16.5 / LEN;
const BOX_HALF = 20.16 / WID;

export const clamp = (v: number, lo = 0.02, hi = 0.98) => Math.min(hi, Math.max(lo, v));
export const at = (x: number, y: number): Pos => ({ x: clamp(x), y: clamp(y) });
export const mirror = (p: Pos): Pos => ({ x: 1 - p.x, y: 1 - p.y });

/** Metres to the middle of the goal this side attacks. */
export const dist = (p: Pos) => Math.hypot((1 - p.x) * LEN, (p.y - 0.5) * WID);
/** Metres off the pitch's long axis. */
const lateral = (p: Pos) => Math.abs(p.y - 0.5) * WID;
export const inBox = (p: Pos) => p.x >= BOX_X && Math.abs(p.y - 0.5) <= BOX_HALF;
/** Outside the width of the box: the wing. */
export const isWide = (p: Pos) => lateral(p) > 18;

/**
 * Kreisklasse xG: how often a shot from here goes in. Straight on, 8 m ≈ 70 %, 11 m ≈ 55 %, 18 m ≈ 30 %,
 * 25 m ≈ 16 %; the angle takes off up to two thirds at the byline. The keeper is the Metzger's son.
 */
export function xg(p: Pos): number {
  const angle = Math.atan2(lateral(p), Math.max(0.5, (1 - p.x) * LEN));
  return Math.min(0.8, 0.85 * Math.exp(-(dist(p) - 6) / 11.5) * (0.3 + 0.7 * Math.cos(angle)));
}

/** Move `y` part of the way towards `to`. */
const toward = (y: number, to = 0.5, k = 0.5) => y + (to - y) * k;
/** The wing on this side. */
const wing = (y: number) => (y < 0.5 ? 0.08 : 0.92);
const sideWord = (p: Pos) => (p.y < 0.36 ? 'links' : p.y > 0.64 ? 'rechts' : '');

/** The place in German, as the side with the ball sees it. The panel and the text strip say it out loud. */
export function where(p: Pos): string {
  const side = sideWord(p);
  if (inBox(p)) return dist(p) < 9 ? 'am Fünfer' : side ? `im Strafraum, ${side}` : 'im Strafraum';
  if (isWide(p)) {
    if (p.x > 0.93) return `${side} an der Grundlinie`;
    if (p.x >= 0.6) return `${side} auf dem Flügel`;
    if (p.x >= 0.4) return `${side} an der Seitenlinie`;
    return `${side} hinten`;
  }
  if (p.x >= 0.72) return 'vor dem Sechzehner';
  if (p.x >= 0.58) return 'in der gegnerischen Hälfte';
  if (p.x >= 0.42) return 'an der Mittellinie';
  if (p.x >= 0.17) return 'in der eigenen Hälfte';
  return 'vor dem eigenen Tor';
}

/**
 * v0.25: the place in German as *we* see it — SVH's bench, whoever has the ball. "In der gegnerischen
 * Hälfte" said from RWK's side was our half, and the coach read it the wrong way round; now every place is
 * ours or theirs ("in unserer Hälfte", "vor deren Sechzehner", "links hinten"). `p` is in SVH's frame.
 */
export function whereHome(p: Pos): string {
  const side = sideWord(p);
  const back = mirror(p);
  if (inBox(p)) return dist(p) < 9 ? 'an deren Fünfer' : side ? `in deren Strafraum, ${side}` : 'in deren Strafraum';
  if (inBox(back)) return dist(back) < 9 ? 'an unserem Fünfer' : side ? `in unserem Strafraum, ${side}` : 'in unserem Strafraum';
  if (isWide(p)) {
    if (p.x > 0.93) return `${side} an deren Grundlinie`;
    if (p.x < 0.07) return `${side} an unserer Grundlinie`;
    if (p.x >= 0.6) return `${side} vorne`;
    if (p.x >= 0.4) return `${side} an der Seitenlinie`;
    return `${side} hinten`;
  }
  if (p.x >= 0.72) return 'vor deren Sechzehner';
  if (p.x >= 0.58) return 'in deren Hälfte';
  if (p.x >= 0.42) return 'an der Mittellinie';
  if (p.x >= 0.28) return 'in unserer Hälfte';
  return 'vor unserem Sechzehner';
}

/**
 * What a panel's place is called, from SVH's side. `spot` is in the frame of `side` (who has the ball).
 * `named` is a drama that drew itself at a place of its own ("am Zaun", "am Spielfeldrand"): it keeps
 * its name, unless the name says whose box it is — then it is turned round like everything else.
 */
export function placeName(type: string, spot: Spot, side: Side, named = false): string {
  if (spot.flank || spot.x < 0 || spot.x > 1 || spot.y < 0 || spot.y > 1) return spot.where;
  const p = side === HOME ? spot : mirror(spot);
  const ours = p.x < 0.5;
  const s = sideWord(p);
  switch (type) {
    case 'kickoff': return 'Mittelkreis';
    case 'corner': return `an ${ours ? 'unserer' : 'deren'} Eckfahne${s ? `, ${s}` : ''}`;
    case 'penalty': case 'psychospiel': return `am Elfmeterpunkt vor ${ours ? 'unserem' : 'deren'} Tor`;
    case 'torlinie': return `auf ${ours ? 'unserer' : 'deren'} Torlinie`;
    case 'goalkick': return `an ${ours ? 'unserem' : 'deren'} Fünfer`;
    case 'torwartjagd': return `vor ${ours ? 'unserem' : 'deren'} Tor`;
    case 'handspiel': case 'torwart_vorne': case 'cross': return `in ${ours ? 'unserem' : 'deren'} Strafraum`;
    default: return named ? spot.where : whereHome(p);
  }
}

// ---- Rows -------------------------------------------------------------------

const row = (id: string, weight: number, next: string, word: string, actor: string, text: string, more: Partial<Row> = {}): Row =>
  ({ id, weight, next, word, actor, text, ...more });

/** Only what can happen here, weights rounded so a table prints cleanly. */
const live = (rows: Row[]): Row[] => rows.filter(r => r.weight > 0).map(r => ({ ...r, weight: Math.round(r.weight * 100) / 100 }));

/** A foul on the man with the ball: harmless in midfield, a free kick near the box, a penalty inside it. */
function foulRow(p: Pos, weight: number, victim = 'carrier', fouler = 'marker'): Row {
  const treter = { treter: [`{${fouler}} kommt an den Ball. Also fast. Eher ans Bein von {${victim}}. Pfiff.`,
    `{${fouler}} grätscht, wie er immer grätscht: mit allem. {${victim}} fliegt, der Schiri pfeift.`] };
  if (inBox(p)) {
    return row('elfmeter_foul', weight * 0.5, 'penalty', 'ELFMETER!', fouler,
      `{${fouler}} räumt {${victim}} im Strafraum ab. Der Schiri zeigt auf den Punkt!`, { tags: ['pfiff', 'gefahr'],
        alt: [`{${victim}} ist schneller am Ball, {${fouler}} nur schneller am Bein. Elfmeter!`],
        by: { treter: [`{${fouler}} macht im Strafraum, was er überall macht. Diesmal zeigt der Schiri auf den Punkt.`] } });
  }
  if (dist(p) < 30) {
    return row('foul_gefaehrlich', weight, 'freekick', 'FREISTOSS!', fouler,
      `{${fouler}} holt {${victim}} {where} von den Beinen. Freistoß in gefährlicher Position!`, { tags: ['pfiff'], by: treter });
  }
  return row('foul', weight, 'freekick', 'FOUL', fouler, `{${fouler}} nimmt {${victim}} die Beine weg. Pfiff, Freistoß.`, { tags: ['pfiff'],
    alt: [`{${fouler}} hält {${victim}} am Trikot fest, bis es reißt. Pfiff.`], by: treter });
}

/**
 * How often a man on the ball here shoots at all. Nobody shoots from beyond thirty metres or from the
 * byline, not even here: from there the shot is not an option, so a "Schieß!" has nothing to say.
 */
function shotWeight(p: Pos): number {
  const d = dist(p);
  if (Math.atan2(lateral(p), Math.max(0.5, (1 - p.x) * LEN)) > 1) return 0;
  const w = inBox(p) ? (d < 11 ? 120 : 90) : d < 25 ? 70 : d < 32 ? 35 : 0;
  return isWide(p) ? w * 0.4 : w;
}

// ---- Cast -------------------------------------------------------------------

/** Who has the ball at this place: defenders at the back, wingers wide, strikers up front. */
function carrierRole(p: Pos): Role[] {
  if (p.x < 0.3) return isWide(p) ? ['defender'] : ['defender', 'midfielder'];
  if (p.x < 0.62) return isWide(p) ? ['winger'] : ['midfielder'];
  return isWide(p) ? ['winger'] : ['striker', 'midfielder', 'winger'];
}

/** Who of the other side stands at the same place. */
function markerRole(p: Pos): Role[] {
  if (p.x > 0.7) return ['defender'];
  if (p.x > 0.38) return isWide(p) ? ['defender'] : ['midfielder'];
  return ['striker'];
}

const slot = (name: string, role: Role | Role[], of: CastSlot['of']): CastSlot => ({ slot: name, role, of });
const keeper = slot('keeper', 'keeper', 'other');

// ---- Open play: a ball action or a challenge ---------------------------------------
// A man with the ball is either free — he has time and picks what to do with it (ball action) — or a man
// of theirs is on him and it is the two of them (challenge). A pass into their half usually lands in a
// challenge, beating the man buys a ball action.

/** Where a pass lands: in our half the receiver has time, in theirs someone is on him at once. */
const received = (to: Pos) => (to.x >= 0.5 ? 'duel' : 'play');

function openTags(p: Pos, base: Tag[]): Tag[] {
  const tags = [...base];
  if (inBox(p)) tags.push('box');
  if (isWide(p)) tags.push('wing');
  if (p.x >= 0.55) tags.push('upfield');
  if (p.x < 0.3) tags.push('deep');
  return tags;
}

/** The title of an open-play panel: the zone. The situation type (ball action / challenge) is its badge. */
const zoneLabel = (p: Pos) =>
  inBox(p) ? 'Im Strafraum' : p.x < 0.3 ? 'Im Aufbau' : isWide(p) && p.x >= 0.45 ? 'Am Flügel' : p.x >= 0.72 ? 'Vor dem Strafraum' : 'Im Mittelfeld';

/** Ball action: our man has the ball and time. Nobody is on him — the question is what he does with it. */
const play: SceneType = {
  id: 'play', label: 'Ballaktion', situation: 'action',
  build(p): Built {
    const { x, y } = p;
    const box = inBox(p);
    const wide = isWide(p);
    const d = dist(p);
    const counter = x >= 0.25 && x <= 0.85;          // lost anywhere but at the ends, they are off before we are back
    const forward = at(x + 0.28, toward(y, 0.5, 0.3));
    const flank = at(x + 0.12, wing(y));
    const long = at(0.72, y < 0.5 ? 0.25 : 0.75);
    const rows = [
      row('querpass', x < 0.4 ? 7 : x < 0.7 ? 5 : 4, 'play', 'QUERPASS', 'carrier', '{carrier} spielt quer. Sicher ist sicher.',
        { to: at(x + 0.08, y < 0.5 ? y + 0.3 : y - 0.3) }),
      x < 0.3
        ? row('rueckpass', 5, 'keeperball', 'RÜCKPASS', 'carrier', '{carrier} spielt zurück zum Torwart. Gepfeife von der Bierbank.')
        : row('rueckpass', box ? 2 : 3, 'play', 'RÜCKPASS', 'carrier', '{carrier} dreht ab und spielt zurück. Nochmal von vorne.',
          { to: at(x - 0.16, toward(y)) }),
      row('nach_vorne', box ? 0 : x < 0.3 ? 22 : x < 0.7 ? 26 : 12, received(forward), 'NACH VORNE', 'carrier', '{carrier} spielt den Ball nach vorne. Es geht was.',
        { to: forward }),
      row('fluegel', !wide && x > 0.25 && x < 0.85 ? 14 : 0, received(flank), 'AUF DEN FLÜGEL', 'carrier', '{carrier} verlagert auf den Flügel.', { to: flank }),
      row('langer_ball', x < 0.35 ? 18 : x < 0.5 ? 8 : 0, 'duel', 'LANGER BALL', 'carrier', '{carrier} drischt ihn lang nach vorne. Da läuft einer hin.',
        { to: long }),
      row('lang_verloren', x < 0.35 ? 12 : x < 0.5 ? 6 : 0, 'play', 'KOPFBALLDUELL', 'carrier',
        'Der lange Ball von {carrier} landet beim Gegner. Kopfball, zurück, Ballbesitz drüben.', { to: at(0.68, 0.5), flip: true }),
      row('steilpass', x < 0.3 || box ? 0 : x < 0.55 ? 32 : 50, 'through_on_goal', 'STEILPASS!', 'carrier', '{carrier} sieht die Lücke und steckt durch!',
        { tags: ['gefahr'], alt: ['{carrier} spielt den Ball genau zwischen zwei von denen durch. Da läuft einer!',
          '{carrier} schaut nach links und spielt nach vorne. Steil, und einer ist durch!'] }),
      // Where a closed gap goes (v0.25): nobody to pass to, so he takes his man on himself.
      row('andribbeln', 12, 'duel', 'ANDRIBBELN', 'carrier', '{carrier} dribbelt los, genau auf {marker} zu.', { to: at(x + 0.06, y), carry: true,
        half: true, blocked: ['Keine Lücke, kein Pass. {carrier} muss selber an {marker} vorbei.', 'Alles zu da vorne. {carrier} nimmt den Ball und geht halt selber.'] }),
      row('flanke', x < 0.6 ? 0 : wide ? (x > 0.8 ? 70 : 55) : lateral(p) > 12 && x > 0.72 ? 25 : 0, 'cross', 'FLANKE!', 'carrier',
        '{carrier} hat Zeit und schlägt die Flanke.', { alt: ['{carrier} schaut kurz hoch und haut ihn in die Mitte.'] }),
      // From distance the shot is also where a closed gap goes: nobody to pass to, so he tries it himself.
      row('schuss', shotWeight(p), 'shot', d > 20 ? 'FERNSCHUSS!' : 'SCHUSS!', 'carrier',
        d > 20 ? '{carrier} fackelt nicht lange und zieht aus der Distanz ab!' : '{carrier} hat Platz und zieht ab!', { tags: ['gefahr'], carry: true,
          half: d > 18, blocked: ['Vorne ist alles zu. {carrier} probiert es halt aus der Distanz.', 'Kein Durchkommen. Also zieht {carrier} von da ab, wo er steht.'] }),
      row('ballverlust', x < 0.3 ? 8 : x < 0.7 ? 10 : 10, counter ? 'counter' : 'play', 'ABGEFANGEN', 'marker',
        `{marker} läuft in den Pass und fängt ihn ab.${counter ? ' Umschalten!' : ''}`, { flip: true, tags: ['fehler'] }),
      row('ins_aus', wide ? 5 : 0, 'throwin', 'AUS', 'carrier', 'Der Pass von {carrier} ist zu lang. Einwurf für die.',
        { flip: true, to: at(x, y < 0.5 ? 0 : 1), tags: ['fehler'] }),
      // The Kreisklasse at the back: the square pass across your own box, and the back-pass that stops halfway.
      row('querpass_fehler', x < 0.3 ? 12 : 0, 'through_on_goal', 'FEHLPASS!', 'marker',
        '{carrier} spielt quer vor dem eigenen Sechzehner. Genau in den Lauf von {marker}.', { flip: true, to: at(0.1, 0.5), tags: ['fehler'], carry: true }),
      row('rueckpass_kurz', x < 0.3 ? 9 : 0, 'through_on_goal', 'ZU KURZ!', 'marker',
        'Der Rückpass von {carrier} bleibt auf halbem Weg im Gras liegen. {marker} bedankt sich.', { flip: true, to: at(0.08, 0.5), tags: ['fehler'], carry: true }),
      row('abseits', x > 0.55 && x < 0.86 ? 5 : 0, 'freekick', 'ABSEITS', 'carrier', 'Der Pass kommt, die Fahne auch. Abseits.',
        { flip: true, tags: ['gegenpfiff'] }),
    ];
    return {
      label: zoneLabel(p), prompt: ['{carrier} hat den Ball {where} und Zeit. {marker} steht zu weit weg.',
        '{carrier} nimmt den Ball {where} an. Keiner stört ihn. {marker} schaut nur.',
        '{carrier} steht {where} ganz allein mit dem Ball. {marker} bindet sich den Schuh.'],
      cast: [slot('carrier', carrierRole(p), 'init'), slot('marker', markerRole(p), 'other')], rows: live(rows), tags: openTags(p, ['attack']),
    };
  },
};

/** Challenge: a man of theirs is on ours. Past him, or not. */
const duel: SceneType = {
  id: 'duel', label: 'Zweikampf', situation: 'challenge',
  build(p): Built {
    const { x, y } = p;
    const box = inBox(p);
    const wide = isWide(p);
    const counter = x >= 0.25 && x <= 0.85;
    const slow = x >= 0.5 ? 0.6 : 1;               // their defenders: slow, and they know it
    const rows = [
      row('dribbling', wide ? 30 : 28, box ? 'shot' : x >= 0.68 && !wide ? 'through_on_goal' : 'play', 'VORBEI!', 'carrier',
        box ? '{carrier} lässt {marker} stehen und hat freie Bahn!'
          : x >= 0.68 && !wide ? '{carrier} lässt {marker} stehen. Dahinter ist keiner mehr!'
          : '{carrier} lässt {marker} mit einem Haken stehen.',
        { to: box ? at(x + 0.05, toward(y, 0.5, 0.4)) : at(x + 0.14, y), tags: x >= 0.62 ? ['gefahr'] : undefined, carry: true,
          alt: box ? ['{carrier} dreht sich einmal um {marker} herum und steht frei!'] : x >= 0.68 && !wide ? ['{carrier} ist an {marker} vorbei, und vor ihm ist nur noch Rasen!']
            : ['{carrier} legt ihn an {marker} vorbei und läuft auf der anderen Seite.', '{carrier} täuscht an, {marker} fällt drauf rein.'],
          by: { schnell: ['{carrier} tippt ihn an {marker} vorbei und ist weg. Einfach schneller.'],
            'marker:schnell': ['{marker} ist schnell. {carrier} heute schneller. Das gibt es selten.'] } }),
      // A half-chance (v0.25): past him he does not get, so he lays it off or shoots with the man on him.
      row('querpass', 10, 'play', 'ABGELEGT', 'carrier', '{carrier} legt ab, bevor {marker} ihn erwischt.', { to: at(x - 0.03, y < 0.5 ? y + 0.25 : y - 0.25),
        half: true, blocked: ['{marker} steht ihm auf den Füßen. {carrier} legt ab, bevor es weh tut.', '{marker} lässt ihn nicht vorbei. {carrier} legt ab.'] }),
      row('rueckpass', 4, 'play', 'ZURÜCK', 'carrier', '{carrier} dreht ab und spielt zurück.', { to: at(x - 0.12, toward(y)) }),
      row('flanke', wide && x > 0.65 ? 24 : 0, 'cross', 'FLANKE!', 'carrier', '{carrier} bringt die Flanke noch an {marker} vorbei.'),
      row('schuss', shotWeight(p) * 0.8, 'shot', 'SCHUSS!', 'carrier', '{carrier} schießt einfach, mit {marker} am Trikot.', { tags: ['gefahr'], carry: true,
        half: true, blocked: ['{marker} lässt ihn nicht vorbei. {carrier} schießt halt, mit {marker} am Trikot.'] }),
      row('abgegraetscht', 20 * slow, counter ? 'counter' : 'play', 'ABGEGRÄTSCHT', 'marker', `{marker} grätscht {carrier} sauber ab. Ball gewonnen.${counter ? ' Und los!' : ''}`,
        { flip: true, tags: ['geklaert'], alt: [`{marker} stellt den Fuß rein, und der Ball bleibt bei ihm.${counter ? ' Und los!' : ''}`],
          by: { 'marker:treter': [`{marker} geht mit gestrecktem Bein rein. Ball gewonnen, Bein auch fast.${counter ? ' Und los!' : ''}`],
            'marker:schnell': [`{marker} ist schneller dran, als {carrier} schauen kann.${counter ? ' Und los!' : ''}`] } }),
      row('ballverlust', 14 * slow, counter ? 'counter' : 'play', 'BALL WEG', 'marker',
        `{marker} spitzelt {carrier} den Ball vom Fuß.${counter ? ' Umschalten!' : ''}`, { flip: true, tags: ['fehler'] }),
      foulRow(p, 12),
      row('verstolpert', x < 0.3 ? 7 : 0, 'shot', 'VERSTOLPERT!', 'marker', '{carrier} will {marker} vor dem eigenen Tor noch ausspielen. Einmal zu oft.',
        { flip: true, to: at(0.12, toward(y, 0.5, 0.5)), tags: ['fehler'], carry: true }),
      row('ins_aus', wide ? 5 : 0, 'throwin', 'AUS', 'carrier', '{carrier} legt sich den Ball zu weit vor. Einwurf für die.',
        { flip: true, to: at(x, y < 0.5 ? 0 : 1), tags: ['fehler'] }),
      row('zum_einwurf', wide ? 6 : 0, 'throwin', 'EINWURF', 'marker', '{marker} spitzelt ihn ins Seitenaus. Einwurf.',
        { to: at(x, y < 0.5 ? 0 : 1), tags: ['geklaert'] }),
      row('zur_ecke', x > 0.8 ? 8 : 0, 'corner', 'ECKE', 'marker', '{marker} grätscht ihn ins Toraus. Ecke.', { tags: ['geklaert'] }),
    ];
    return {
      label: zoneLabel(p),
      prompt: box ? '{carrier} hat den Ball {where}! {marker} klebt an ihm.'
        : wide ? '{carrier} zieht {where} die Linie runter, {marker} kommt raus.'
        : '{marker} geht {where} auf {carrier} drauf.',
      cast: [slot('carrier', carrierRole(p), 'init'), slot('marker', markerRole(p), 'other')], rows: live(rows), tags: openTags(p, ['attack', 'duel']),
    };
  },
};

const counter: SceneType = {
  id: 'counter', label: 'Konter', situation: 'challenge',
  place: p => at(Math.max(p.x, 0.35), p.y),
  build(p): Built {
    const { x, y } = p;
    const shot = at(x + 0.12, toward(y));
    const rows = [
      row('durch', 90, 'through_on_goal', 'DURCH!', 'carrier', '{carrier} rennt {marker} einfach davon!', { tags: ['gefahr'], carry: true,
        alt: ['{carrier} ist an {marker} vorbei, bevor der sich umgedreht hat!', '{carrier} legt sich den Ball an {marker} vorbei und sprintet hinterher. Durch!'],
        by: { schnell: ['{carrier} zieht einfach das Tempo an. {marker} sieht nur noch die Rückennummer.'],
          'marker:schnell': ['{marker} ist schnell, aber {carrier} hatte drei Meter Vorsprung. Die holt heute keiner auf.'],
          'marker:rentner': ['{marker} dreht sich um, und {carrier} ist schon weg. Mit 38 dreht man sich nicht mehr so schnell.'] } }),
      // Half-chances (v0.25): a counter someone got in front of is a shot from distance, or it is over.
      row('schuss', dist(shot) < 32 ? 25 : 0, 'shot', 'SCHUSS!', 'carrier', '{carrier} zieht im vollen Lauf ab!', { to: shot, tags: ['gefahr'], carry: true,
        half: true, blocked: ['Durch kommt er nicht mehr. {carrier} zieht aus dem Lauf ab, bevor {marker} ganz dran ist.'] }),
      row('dribbling', 14, 'play', 'VORBEI!', 'carrier', '{carrier} tanzt {marker} aus und läuft weiter.', { to: at(x + 0.2, y), carry: true }),
      row('fluegel', 12, 'duel', 'AUF DEN FLÜGEL', 'carrier', '{carrier} legt raus auf den Flügel.', { to: at(x + 0.15, wing(y)) }),
      row('querpass', 10, 'play', 'ABGEBREMST', 'carrier', '{carrier} wartet auf die Mitspieler. Der Konter ist vorbei, der Ball ist noch da.',
        { to: at(x + 0.1, toward(y)), half: true, blocked: ['{marker} hat ihn gestellt. {carrier} muss warten. Der Konter ist vorbei, der Ball ist noch da.'] }),
      row('abgegraetscht', 20, 'play', 'GESTOPPT', 'marker', '{marker} stellt sich clever und holt den Ball raus.', { flip: true, tags: ['geklaert'],
        by: { 'marker:schnell': ['{marker} ist schneller zurück, als {carrier} schauen kann, und holt sich den Ball.'] } }),
      foulRow(p, 16),
      row('ballverlust', 8, 'play', 'BALL WEG', 'carrier', '{carrier} verstolpert den Ball. Allein. Ohne Gegner.', { flip: true, tags: ['fehler'] }),
      row('abseits', 6, 'freekick', 'ABSEITS', 'carrier', 'Fahne! {carrier} ist zu früh gestartet.', { flip: true, tags: ['gegenpfiff'] }),
    ];
    return {
      label: 'Konter', prompt: ['Umschalten! {carrier} rennt {where} los, hinten steht nur noch {marker}.',
        'Konter! {carrier} hat {where} den Ball und nur noch {marker} vor sich.',
        '{carrier} läuft {where} los. Seine Leute hinterher, {marker} rückwärts.'],
      cast: [slot('carrier', ['striker', 'winger'], 'init'), slot('marker', 'defender', 'other')],
      rows: live(rows), tags: x >= 0.55 ? ['attack', 'defence', 'duel', 'upfield'] : ['attack', 'defence', 'duel'],
    };
  },
};

/** A cross in the air, from where it was hit. Deep from the byline it is dangerous; from far out the keeper's. */
const cross: SceneType = {
  id: 'cross', label: 'Flanke', situation: 'challenge',
  build(p): Built {
    const deep = p.x > 0.9;
    const far = p.x < 0.75;
    const aim = at(0.91, p.y < 0.5 ? 0.45 : 0.55);
    const rows = [
      row('kopfball', far ? 30 : 42, 'header', 'KOPFBALL!', 'target', '{target} steigt vor {marker} hoch und kommt an den Ball!', { to: aim, tags: ['gefahr'], carry: true,
        by: { kopfballungeheuer: ['{target} steht in der Luft, als hätte er einen Hocker dabei. {marker} reicht ihm bis zur Schulter.'] } }),
      row('volley', 7, 'shot', 'VOLLEY!', 'target', 'Die Flanke fällt runter, {target} nimmt ihn direkt!', { to: at(0.86, aim.y), tags: ['gefahr'], carry: true }),
      row('zurueckgelegt', deep ? 12 : 0, 'shot', 'ZURÜCKGELEGT', 'target', 'Die Flanke kommt flach von der Grundlinie, {target} legt sie mit der Brust in den Rückraum.',
        { to: at(0.86, 0.5), tags: ['gefahr'] }),
      row('abgefangen', far ? 30 : 20, 'keeperball', 'GEPFLÜCKT', 'keeper', '{keeper} pflückt die Flanke runter. Sicher.', { flip: true, tags: ['geklaert'] }),
      row('zur_ecke', 14, 'corner', 'ECKE', 'marker', '{marker} köpft zur Ecke. Puh.', { tags: ['geklaert'] }),
      row('geklaert', 18, 'play', 'GEKLÄRT', 'marker', '{marker} köpft raus, das Ding ist weg.', { flip: true, to: at(0.78, 0.5), tags: ['geklaert'] }),
      row('zweiter_ball', 9, 'play', 'ABPRALLER', 'target', 'Keiner kommt richtig dran. Der Ball springt raus an den Sechzehner, und da steht einer von uns.',
        { to: at(0.78, 0.5), half: true, blocked: ['{marker} lässt {target} nicht hochkommen. Der Ball springt raus an den Sechzehner, da steht noch einer von uns.'] }),
      row('ins_leere', 12, 'goalkick', 'DRÜBER', 'target', 'Die Flanke segelt über alle drüber, auch über {target}. Abstoß.', { flip: true, tags: ['fehler'] }),
      row('elfmeter', 3, 'penalty', 'ELFMETER!', 'marker', '{marker} hängt {target} am Trikot wie ein Rucksack. Der Schiri zeigt auf den Punkt!',
        { tags: ['pfiff', 'gefahr'] }),
      row('eigentor', 5, GOAL, 'EIGENTOR!', 'marker', '{marker} will klären und köpft ihn ins eigene Eck. {keeper} schaut ihn lange an.',
        { tags: ['gefahr'] }),
    ];
    return {
      label: 'Flanke', prompt: 'Die Flanke fliegt in den Strafraum. {target} und {marker} steigen hoch, {keeper} zögert.',
      cast: [slot('target', 'striker', 'init'), slot('marker', 'defender', 'other'), keeper],
      rows: live(rows), tags: ['attack', 'box'], spot: { ...aim, where: 'im Strafraum' },
    };
  },
};

/** A shot from here. What the place gives is `xg`; the rest is how it misses. */
const shot: SceneType = {
  id: 'shot', label: 'Abschluss', situation: 'action',
  build(p): Built {
    const g = xg(p);
    const m = 1 - g;
    const d = dist(p);
    const far = d > 20;
    const rows = [
      row('tor', g * 100, GOAL, 'TOOOR!', 'shooter', far ? '{shooter} zieht ab, und der Ball schlägt im Winkel ein! TOR!' : '{shooter} hält drauf — drin! TOR!',
        { tags: ['gefahr'],
          alt: far ? ['{shooter} trifft ihn voll. Der Ball ist drin, bevor {keeper} sich bewegt. TOR!', 'Ein Strich, von {shooter}, aus der Distanz. Unhaltbar. TOR!',
            '{shooter} trifft ihn nicht richtig. Der Ball flattert, {keeper} greift daneben. TOR!']
            : ['{shooter} schiebt ihn ins lange Eck. TOR!', '{shooter} haut ihn unter die Latte. {keeper} hört ihn nur. TOR!', '{shooter} schießt {keeper} an, und von da ist er drin. TOR!'],
          by: { kaltschnaeuzig: ['{shooter} nimmt sich Zeit. Viel Zeit. Dann liegt der Ball im Netz. TOR!'],
            nervenbuendel: ['{shooter} trifft ihn mit dem Schienbein. Der Ball hoppelt, und {keeper} fällt drüber. TOR!'] } }),
      row('gehalten', m * 36, 'keeperball', 'GEHALTEN!', 'keeper', '{keeper} ist unten und hat ihn.', { flip: true, tags: ['geklaert'],
        alt: ['{keeper} fliegt und fischt ihn aus dem Eck.', '{keeper} steht richtig und fängt ihn wie einen Rückpass.'],
        by: { fliegenfaenger: ['{keeper} fliegt spektakulär. Und hat ihn! Er schaut selbst überrascht auf seine Handschuhe.'] } }),
      row('abgewehrt', d < 22 ? m * 18 : 0, 'shot', 'ABGEWEHRT', 'keeper', '{keeper} lässt nach vorne abprallen. Nachschuss!',
        { to: at(0.92, toward(p.y, 0.5, 0.6)),
          by: { fliegenfaenger: ['{keeper} fliegt, faustet, und der Ball springt genau zurück ins Feld. Nachschuss!'] } }),
      row('zur_ecke', m * 9, 'corner', 'ECKE', 'keeper', '{keeper} lenkt ihn mit den Fingerspitzen zur Ecke.', { tags: ['geklaert'] }),
      row('abgeblockt', m * (d < 20 ? 16 : 12), 'play', 'ABGEBLOCKT', 'blocker', '{blocker} wirft sich rein. Abgeblockt, und weg ist er.',
        { flip: true, to: at(0.8, p.y), tags: ['geklaert'] }),
      row('vorbei', m * (26 + d * 0.5), 'goalkick', far ? 'DRÜBER' : 'VORBEI', 'shooter',
        far ? '{shooter} jagt ihn über den Zaun. Der Ball ist im Bach.' : '{shooter} schiebt ihn am Pfosten vorbei. Das Dorf stöhnt.',
        { flip: true, tags: ['fehler'],
          alt: far ? ['{shooter} zieht ab. Der Ball landet auf dem Dach vom Sportheim.'] : ['{shooter} schießt ins Außennetz. Die Bierbank hat schon gejubelt.'],
          by: { nervenbuendel: ['{shooter} zieht ab. Der Ball fliegt Richtung Eckfahne.', '{shooter} denkt kurz nach. Zu lang. Vorbei.'] } }),
      row('latte', g * 14, 'play', 'LATTE!', 'shooter', '{shooter} trifft die Latte! Der Ball springt zurück ins Feld.', { to: at(0.84, 0.5) }),
      // The keeper is the Metzger's son: now and then the easy one goes through his hands.
      row('flutscher', m * 6, GOAL, 'FLUTSCHER!', 'keeper', '{keeper} hat ihn. Dann nicht mehr. Der Ball rutscht ihm durch die Hände ins Tor.',
        { tags: ['gefahr'] }),
    ];
    const tags: Tag[] = ['attack'];
    if (inBox(p)) tags.push('box');
    return {
      label: far ? 'Fernschuss' : 'Abschluss',
      prompt: far ? '{shooter} nimmt {where} Maß. {keeper} macht sich lang.' : '{shooter} kommt {where} zum Abschluss. {keeper} macht sich breit.',
      cast: [slot('shooter', inBox(p) ? ['striker', 'winger'] : ['striker', 'winger', 'midfielder'], 'init'), keeper, slot('blocker', 'defender', 'other')],
      rows: live(rows), tags,
    };
  },
};

const header: SceneType = {
  id: 'header', label: 'Kopfball', situation: 'challenge',
  build(): Built {
    const rows = [
      row('tor', 50, GOAL, 'TOOOR!', 'target', '{target} nickt ein! TOR!', { tags: ['gefahr'],
        alt: ['{target} köpft ihn wuchtig unter die Latte. TOR!', '{target} verlängert mit dem Hinterkopf. Irgendwie drin. TOR!'],
        by: { kopfballungeheuer: ['{target} köpft, als würde er Nägel einschlagen. {keeper} dreht sich nur noch um. TOR!'] } }),
      row('gehalten', 26, 'keeperball', 'GEHALTEN!', 'keeper', '{keeper} fliegt und hat ihn.', { flip: true, tags: ['geklaert'] }),
      row('vorbei', 28, 'goalkick', 'DRÜBER', 'target', '{target} köpft ihn drüber. Knapp, sagt die Bank. Nicht knapp, sagt die Bierbank.',
        { flip: true, tags: ['fehler'] }),
      row('latte', 6, 'play', 'LATTE!', 'target', '{target} köpft an die Latte! Der Ball springt zurück.', { to: at(0.84, 0.5) }),
      row('zur_ecke', 10, 'corner', 'ECKE', 'keeper', '{keeper} kratzt ihn zur Ecke.', { tags: ['geklaert'] }),
      row('flutscher', 5, GOAL, 'FLUTSCHER!', 'keeper', 'Ein Aufsetzer. {keeper} geht runter, der Ball springt drüber. TOR!', { tags: ['gefahr'] }),
    ];
    return {
      label: 'Kopfball', prompt: '{target} steigt hoch, {where}. {keeper} fliegt hinterher.',
      cast: [slot('target', 'striker', 'init'), keeper], rows, tags: ['attack', 'box'],
    };
  },
};

const through: SceneType = {
  id: 'through_on_goal', label: 'Allein vor dem Tor', situation: 'challenge',
  place: p => at(Math.max(p.x, 0.86), toward(p.y, 0.5, 0.6)),
  build(p): Built {
    const angle = 1 - Math.min(0.4, lateral(p) / 30);
    // v0.25: more than half of all goals come from here, so it has more than one way to go in — and the man
    // in the picture decides how it reads: the Nervenbündel scores with his eyes shut, or thinks of his taxes.
    const rows = [
      row('tor', 72 * angle, GOAL, 'TOOOR!', 'runner', '{runner} allein vor {keeper}, bleibt cool — TOR!', { tags: ['gefahr'],
        alt: [
          '{runner} lupft ihn über {keeper}. Der Ball fällt und fällt, und dann ist er drin. TOR!',
          '{runner} schiebt ihn {keeper} durch die Beine. Ganz ruhig. TOR!',
          '{runner} haut einfach drauf. {keeper} zieht den Kopf weg. TOR!',
          '{runner} umkurvt {keeper} und schiebt ins leere Tor. Extra langsam. TOR!',
          '{runner} schießt, {keeper} hat die Finger dran, und trotzdem ist er drin. TOR!',
        ],
        by: {
          nervenbuendel: ['{runner} macht die Augen zu und schießt. Als er sie aufmacht, jubeln alle. TOR!',
            '{runner} zittert, stolpert fast und trifft den Ball mit dem Schienbein. Drin! Er selbst schaut am ungläubigsten. TOR!'],
          kaltschnaeuzig: ['{runner} schaut {keeper} in die Augen, zeigt links und schiebt rechts ein. TOR!',
            '{runner} wartet, bis {keeper} liegt. Dann schiebt er ein, als wär es Training. TOR!'],
        } }),
      row('breit_gemacht', 18, 'keeperball', 'BREIT GEMACHT!', 'keeper', '{keeper} kommt raus, macht sich breit, und {runner} scheitert. Das Dorf atmet.',
        { flip: true, tags: ['geklaert'],
          alt: ['{keeper} wirft sich {runner} vor die Füße. Ball weg, Knie kaputt, aber Ball weg.', '{keeper} bleibt stehen, bis {runner} schießt, und hat ihn.'],
          by: { fliegenfaenger: ['{keeper} fliegt, und diesmal hält er ihn sogar fest. Das Dorf schaut ungläubig.'] } }),
      row('vorbei', 12, 'goalkick', 'VORBEI!', 'runner', '{runner} allein vor dem Tor und schiebt ihn neben den Pfosten. Unfassbar.', { flip: true, tags: ['fehler'],
        alt: ['{runner} will es zu schön machen. Außennetz.', '{runner} lupft ihn über {keeper}. Und über das Tor.'],
        by: { nervenbuendel: ['{runner} denkt an die Steuererklärung und schiebt ihn neben den Pfosten.', '{runner} hat zu lange nachgedacht. Der Ball geht an den Pfosten und ins Aus.'],
          kaltschnaeuzig: ['Sogar {runner} schiebt ihn vorbei. Er schaut seinen Fuß an, als wär der schuld.'] } }),
      row('gefoult', 6, 'penalty', 'ELFMETER!', 'keeper', '{keeper} räumt {runner} ab wie ein Schneepflug. Elfmeter!', { tags: ['pfiff'],
        alt: ['{keeper} kommt zu spät und nimmt {runner} mit. Elfmeter!'] }),
      row('eingeholt', 8, 'play', 'EINGEHOLT', 'chaser', '{chaser} kommt von hinten angeflogen und spitzelt ihn weg.', { flip: true, to: at(0.86, 0.5), tags: ['geklaert'],
        alt: ['{chaser} grätscht von hinten. Sauber! Ganz knapp, aber sauber.'],
        by: { schnell: ['{chaser} holt ihn ein, als hätte er einen Motor im Hintern, und spitzelt ihn weg.'] } }),
      row('quergelegt', 5, 'shot', 'QUERGELEGT', 'runner', '{runner} legt quer. Der Nebenmann muss nur noch den Fuß hinhalten.',
        { to: at(0.94, 0.5), tags: ['gefahr'] }),
    ];
    return {
      label: 'Allein vor dem Tor', prompt: ['{runner} ist durch. Nur noch {keeper}. Das ganze Dorf hält die Luft an.',
        '{runner} läuft allein aufs Tor zu. {keeper} kommt raus, {chaser} keucht hinterher.',
        'Keiner mehr zwischen {runner} und {keeper}. Auf der Bierbank steht einer auf.'],
      cast: [slot('runner', ['striker', 'winger'], 'init'), keeper, slot('chaser', 'defender', 'other')],
      rows: live(rows), tags: ['attack', 'box'],
    };
  },
};

/** The keeper has it in his hands: open play, he throws or he kicks. */
const keeperball: SceneType = {
  id: 'keeperball', label: 'Torwart am Ball', situation: 'action',
  place: () => ({ x: 0.06, y: 0.5 }),
  build(): Built {
    const rows = [
      row('abwurf', 50, 'play', 'ABWURF', 'keeper', '{keeper} wirft kurz raus. Neuer Aufbau.', { to: at(0.2, 0.22) }),
      row('abschlag', 30, 'duel', 'ABSCHLAG', 'keeper', '{keeper} drischt ihn weit nach vorne.', { to: at(0.58, 0.5) }),
      row('abschlag_verloren', 16, 'play', 'KOPFBALLDUELL', 'keeper', '{keeper} drischt ihn weit nach vorne. Drüben köpft einer zurück.',
        { flip: true, to: at(0.55, 0.5) }),
      row('patzer', 16, 'shot', 'PATZER!', 'presser', '{keeper} verdaddelt den Ball genau vor die Füße von {presser}!',
        { flip: true, to: at(0.1, 0.5), tags: ['fehler'], carry: true }),
    ];
    return {
      label: 'Torwart am Ball', prompt: '{keeper} hat den Ball in der Hand. {presser} steht davor und wartet.',
      cast: [slot('keeper', 'keeper', 'init'), slot('presser', 'striker', 'other')], rows, tags: ['keeper'],
    };
  },
};

// ---- Set pieces: the dead balls --------------------------------------------

// v0.25: exclusive — a generic shout at the kick-off (Kurz!, Hoch und weit!) was a price for nothing; only
// the cards written for the kick-off (the shot from the centre spot, the church bells, the maize) come up here.
const kickoff: SceneType = {
  id: 'kickoff', label: 'Anstoß', situation: 'setpiece', exclusive: true,
  place: () => ({ x: 0.5, y: 0.5 }),
  build(): Built {
    const rows = [
      row('anstoss', 35, 'play', 'ANSTOSS', 'kicker', '{kicker} tippt an, der Ball geht hinten rum. Erstmal ankommen.', { to: at(0.36, 0.5) }),
      row('langer_ball', 40, 'duel', 'LANGER BALL', 'kicker', '{kicker} drischt ihn gleich lang auf den Flügel.', { to: at(0.72, 0.2) }),
      row('lang_verloren', 12, 'play', 'KOPFBALLDUELL', 'kicker', '{kicker} drischt ihn lang nach vorne. Drüben köpft einer zurück.',
        { flip: true, to: at(0.7, 0.5) }),
      row('fehlpass', 7, 'play', 'FEHLPASS', 'kicker', '{kicker} spielt den ersten Pass direkt zum Gegner. Applaus von der Bierbank.',
        { flip: true, to: at(0.45, 0.5), tags: ['fehler'] }),
      // Straight from the kick-off, because their keeper stands at the Sechzehner. Nearly never, and then forever.
      // v0.25: rarer — the kick-off only shows its own cards now, so Vom Anstoß! comes up every other kick-off.
      row('anstoss_tor', 0.08, GOAL, 'VOM ANSTOSS!', 'kicker',
        '{kicker} schießt direkt vom Anstoß. Der Torwart von denen steht am Sechzehner und schaut hinterher. TOR! Das erzählt das Dorf noch in zehn Jahren.',
        { tags: ['gefahr'] }),
      row('anstoss_gefangen', 1.25, 'keeperball', 'GEFANGEN', 'kicker', '{kicker} schießt direkt vom Anstoß. Der Torwart von denen fängt ihn wie einen Rückpass.',
        { flip: true, tags: ['geklaert'] }),
      row('anstoss_drueber', 1.5, 'goalkick', 'DRÜBER', 'kicker', '{kicker} schießt direkt vom Anstoß. Weit drüber, und über den Zaun auch.',
        { flip: true, tags: ['fehler'] }),
    ];
    return {
      label: 'Anstoß', prompt: '{kicker} steht am Mittelkreis. {presser} scharrt mit den Füßen. Der Schiri schaut auf die Uhr.',
      cast: [slot('kicker', 'midfielder', 'init'), slot('presser', 'striker', 'other')], rows, tags: ['setpiece'],
      spot: { x: 0.5, y: 0.5, where: 'Mittelkreis' },
    };
  },
};

const goalkick: SceneType = {
  id: 'goalkick', label: 'Abstoß', situation: 'setpiece',
  place: () => ({ x: 0.05, y: 0.5 }),
  build(): Built {
    const rows = [
      row('kurz', 34, 'play', 'KURZ', 'keeper', '{keeper} spielt kurz auf den Verteidiger. Die Bierbank pfeift.', { to: at(0.16, 0.25) }),
      row('abschlag', 40, 'duel', 'ABSCHLAG', 'keeper', '{keeper} haut den Abstoß weit in die andere Hälfte.', { to: at(0.58, 0.5) }),
      row('abschlag_verloren', 21, 'play', 'KOPFBALLDUELL', 'keeper', '{keeper} haut ihn weit raus, und drüben köpft einer zurück.',
        { flip: true, to: at(0.55, 0.5) }),
      row('patzer', 16, 'shot', 'PATZER!', 'presser', '{keeper} spielt den Abstoß genau in die Füße von {presser}!',
        { flip: true, to: at(0.12, 0.5), tags: ['fehler'], carry: true }),
    ];
    return {
      label: 'Abstoß', prompt: '{keeper} legt sich den Ball auf die Fünferlinie. {presser} lauert an der Strafraumgrenze.',
      cast: [slot('keeper', 'keeper', 'init'), slot('presser', 'striker', 'other')], rows, tags: ['setpiece', 'keeper'],
      spot: { x: 0.05, y: 0.5, where: 'am eigenen Fünfer' },
    };
  },
};

const throwin: SceneType = {
  id: 'throwin', label: 'Einwurf', situation: 'setpiece',
  place: p => at(p.x, p.y < 0.5 ? 0 : 1),
  build(p): Built {
    const { x, y } = p;
    const rows = [
      row('kurz', 44, 'play', 'EINWURF', 'thrower', '{thrower} wirft kurz ein. Weiter geht es.', { to: at(x + 0.02, toward(y, 0.5, 0.15)) }),
      row('einwurf_lang', x <= 0.72 ? 20 : 0, 'play', 'WEIT GEWORFEN', 'thrower', '{thrower} nimmt Anlauf und wirft die Linie lang.',
        { to: at(x + 0.14, toward(y, 0.5, 0.2)) }),
      row('einwurf_weit', x > 0.72 ? 22 : 0, 'cross', 'IN DEN STRAFRAUM', 'thrower', '{thrower} trocknet den Ball am Trikot ab und wirft ihn bis an den Fünfer.'),
      row('schnell_eingeworfen', 8, 'play', 'SCHNELL!', 'thrower', '{thrower} wirft schnell ein, bevor die sich sortiert haben.',
        { to: at(x + 0.18, toward(y, 0.5, 0.35)), tags: x > 0.55 ? ['gefahr'] : undefined }),
      row('verloren', 20, 'play', 'BALL WEG', 'marker', '{marker} geht dazwischen. Ball weg.', { flip: true, tags: ['fehler'] }),
      row('falscher_einwurf', 5, 'throwin', 'FALSCH!', 'thrower',
        '{thrower} hebt beim Einwerfen den Fuß. Falscher Einwurf, sagt der Schiri. Das hat seit 1987 keiner mehr gepfiffen.',
        { flip: true, tags: ['fehler'] }),
    ];
    return {
      label: 'Einwurf', prompt: '{thrower} holt den Ball {where}. {marker} stellt sich davor und hampelt.',
      cast: [slot('thrower', x < 0.5 ? 'defender' : 'winger', 'init'), slot('marker', markerRole(p), 'other')],
      rows: live(rows), tags: ['setpiece', 'wing'],
    };
  },
};

/** A free kick where the foul was. Near the box it is a shot; wide of it a cross; in our own half a long ball. */
const freekick: SceneType = {
  id: 'freekick', label: 'Freistoß', situation: 'setpiece',
  build(p): Built {
    const d = dist(p);
    const direct = lateral(p) < 24 ? (d < 22 ? 45 : d < 30 ? 30 : 0) : 0;
    // Kreisklasse walls jump the wrong way and keepers stand behind them: a free kick is a better shot
    // than the same shot from open play
    const gk = Math.min(0.3, xg(p) * 1.3);    // the goal's share of a direct free kick
    const final = p.x > 0.62;
    const rows = [
      row('fk_tor', direct * gk, GOAL, 'TOOOR!', 'taker', '{taker} zirkelt ihn über die Mauer ins Eck! TOR!', { tags: ['gefahr'] }),
      row('fk_mauer', direct * 0.28, 'play', 'MAUER!', 'wall', '{taker} drischt ihn {wall} in den Bauch. Die Mauer steht.',
        { flip: true, to: at(0.78, p.y), tags: ['geklaert'] }),
      row('fk_abpraller', direct * 0.1, 'play', 'ABPRALLER', 'taker', '{taker} schießt in die Mauer, der Ball springt zurück vor seine Füße. Nochmal!',
        { to: at(p.x - 0.03, p.y), carry: true, half: true, blocked: ['Die Mauer steht wie eine Eins. {taker} schießt rein, und der Ball kommt zurück vor seine Füße. Nochmal!'] }),
      row('fk_gehalten', direct * 0.2, 'keeperball', 'GEHALTEN!', 'keeper', '{keeper} fliegt und hält. Die Bierbank applaudiert trotzdem.',
        { flip: true, tags: ['geklaert'] }),
      row('fk_ecke', direct * 0.1, 'corner', 'ECKE', 'keeper', '{keeper} kratzt ihn mit den Fingerspitzen um den Pfosten. Ecke.', { tags: ['geklaert'] }),
      row('fk_drueber', direct * (0.34 - gk), 'goalkick', 'DRÜBER', 'taker', '{taker} jagt ihn weit drüber. Der Ball ist beim Nachbarn im Garten.',
        { flip: true, tags: ['fehler'] }),
      row('fk_flanke', final ? (direct ? 30 : 50) : 0, 'cross', 'FLANKE!', 'taker', '{taker} hebt ihn hinein in den Strafraum.'),
      row('fk_kurz', final ? 16 : 40, 'play', 'KURZ', 'taker', '{taker} spielt ihn kurz. Die Mauer steht umsonst.',
        { to: at(p.x + 0.03, toward(p.y, 0.5, 0.3)) }),
      row('fk_lang', final ? 0 : 30, 'duel', 'LANG!', 'taker', '{taker} schlägt ihn weit nach vorne.',
        { to: at(Math.min(p.x + 0.3, 0.8), toward(p.y, 0.5, 0.4)) }),
      row('fk_verloren', final ? 0 : 10, 'play', 'KOPFBALLDUELL', 'taker', '{taker} schlägt ihn weit nach vorne, und drüben köpft einer zurück.',
        { flip: true, to: at(Math.min(p.x + 0.28, 0.78), 0.5) }),
      // The one from training, with the shoelace: two run over the ball, the third one shoots. Or all three run over it.
      row('fk_variante', final && direct ? 4 : 0, 'through_on_goal', 'VARIANTE!', 'taker', 'Zwei laufen über den Ball, {wall} springt, und {taker} hat plötzlich freie Bahn!',
        { to: at(p.x + 0.06, toward(p.y, 0.5, 0.5)), tags: ['gefahr'], carry: true }),
      row('fk_verstolpert', final && direct ? 2 : 0, 'play', 'VERSTOLPERT', 'taker', 'Die Variante aus dem Training. Zwei laufen über den Ball, {taker} auch. Ball weg.',
        { flip: true, tags: ['fehler'] }),
      row('fk_schnell', 8, p.x > 0.45 ? 'through_on_goal' : 'play', 'SCHNELL!', 'taker', '{taker} führt schnell aus, während die Mauer noch diskutiert!',
        { to: at(p.x + 0.2, p.y), tags: p.x > 0.45 ? ['gefahr'] : undefined }),
    ];
    return {
      label: 'Freistoß',
      prompt: direct ? 'Freistoß {where}. {taker} legt sich den Ball hin, {wall} stellt die Mauer, {keeper} dirigiert.'
        : final ? 'Freistoß {where}. {taker} winkt die Großen nach vorne.'
        : 'Freistoß {where}. {taker} schaut, wer vorne frei ist.',
      cast: [slot('taker', ['midfielder', 'winger'], 'init'), slot('wall', 'defender', 'other'), keeper],
      rows: live(rows), tags: ['setpiece'],
    };
  },
};

const corner: SceneType = {
  id: 'corner', label: 'Ecke', situation: 'setpiece',
  place: p => at(1, p.y < 0.5 ? 0 : 1),
  build(p): Built {
    const left = p.y < 0.5;
    const aim = at(0.92, left ? 0.46 : 0.54);
    const rows = [
      row('kopfball', 40, 'header', 'KOPFBALL!', 'target', 'Die Ecke kommt scharf, {target} kommt vor {marker} an den Ball!', { to: aim, tags: ['gefahr'], carry: true,
        by: { kopfballungeheuer: ['Die Ecke kommt, und {target} ist schon oben. {marker} springt auch. Irgendwann.'] } }),
      row('kurz', 12, 'play', 'KURZ', 'target', '{target} holt sich die Ecke kurz an der Fahne ab. Keiner weiß, warum.', { to: at(0.9, left ? 0.14 : 0.86) }),
      row('gefaustet', 16, 'counter', 'GEFAUSTET', 'keeper', '{keeper} faustet weg — und drüben rennt schon einer!', { flip: true, to: at(0.86, 0.5), tags: ['geklaert'] }),
      row('geklaert', 26, 'play', 'GEKLÄRT', 'marker', '{marker} köpft raus, das Ding ist weg.', { flip: true, to: at(0.78, 0.5), tags: ['geklaert'] }),
      row('zweiter_ball', 8, 'shot', 'ABPRALLER', 'target', 'Der Ball springt raus an den Sechzehner. Da steht einer und hat Zeit.', { to: at(0.8, 0.5), tags: ['gefahr'],
        half: true, blocked: ['{marker} lässt {target} nicht hoch. Der Ball springt raus an den Sechzehner, da steht einer und hat Zeit.'] }),
      row('drueber', 6, 'goalkick', 'DRÜBER', 'target', 'Die Ecke fliegt über {target} und alle anderen drüber ins Toraus.', { flip: true, tags: ['fehler'] }),
      row('elfmeter', 2, 'penalty', 'ELFMETER!', 'marker', '{marker} hält {target} fest wie beim Schuhplattler. Elfmeter!', { tags: ['pfiff', 'gefahr'] }),
      row('eigentor', 4, GOAL, 'EIGENTOR!', 'marker', 'Die Ecke kommt scharf, {marker} hält den Kopf hin. Leider in die falsche Richtung. TOR!',
        { tags: ['gefahr'] }),
      row('ecke_direkt', 1.5, GOAL, 'DIREKT!', 'target', 'Die Ecke dreht sich und dreht sich, {keeper} greift daneben, und das Ding ist direkt drin. Ein Olympisches!',
        { tags: ['gefahr'] }),
      row('foul_angreifer', 4, 'freekick', 'STÜRMERFOUL', 'target', '{target} steigt mit beiden Ellbogen hoch. Pfiff, Freistoß für die.',
        { flip: true, to: at(0.94, 0.5), tags: ['gegenpfiff'] }),
    ];
    return {
      label: 'Ecke', prompt: 'Ecke. {target} rangelt mit {marker}, {keeper} brüllt.',
      cast: [slot('target', 'striker', 'init'), slot('marker', 'defender', 'other'), keeper],
      rows, tags: ['setpiece', 'box'],
      spot: { x: 0.995, y: left ? 0.005 : 0.995, where: `an der Eckfahne, ${left ? 'links' : 'rechts'}` },
    };
  },
};

const penalty: SceneType = {
  id: 'penalty', label: 'Elfmeter', situation: 'setpiece',
  place: () => ({ x: 1 - 11 / LEN, y: 0.5 }),
  build(): Built {
    const rows = [
      row('tor', 78, GOAL, 'TOOOR!', 'shooter', '{shooter} verlädt {keeper}. Der liegt links, der Ball ist rechts. Tor!', { tags: ['gefahr'],
        alt: ['{shooter} haut ihn in die Mitte. {keeper} liegt schon in der Ecke. Tor!', '{shooter} läuft an, stoppt, läuft wieder an. {keeper} fällt einfach um. Tor!'],
        by: { kaltschnaeuzig: ['{shooter} legt sich den Ball hin, schaut {keeper} nicht mal an und schiebt ein. Tor!'],
          nervenbuendel: ['{shooter} schließt die Augen. Drin! Er schaut trotzdem nochmal nach, ob wirklich. Tor!'] } }),
      row('gehalten', 17, 'keeperball', 'GEHALTEN!', 'keeper', '{keeper} ahnt die Ecke! Gehalten! Der Torwart ist ab heute Ehrenbürger.',
        { flip: true, tags: ['geklaert'] }),
      row('vorbei', 10, 'goalkick', 'IN DEN BACH', 'shooter', '{shooter} schießt ihn in den Bach. Der Platzwart holt den zweiten Ball.',
        { flip: true, tags: ['fehler'],
          by: { nervenbuendel: ['{shooter} rutscht beim Anlauf weg. Der Ball geht in den Bach, {shooter} fast hinterher.'] } }),
      row('pfosten', 3, 'play', 'PFOSTEN', 'shooter', '{shooter} trifft den Pfosten. Der Ball springt raus, und drüben ist einer schneller.',
        { flip: true, to: at(0.88, 0.5) }),
    ];
    return {
      label: 'Elfmeter', prompt: '{shooter} legt sich den Ball auf den Punkt. {keeper} tänzelt auf der Linie. Das ganze Dorf hält die Luft an.',
      cast: [slot('shooter', ['striker', 'winger'], 'init'), keeper], rows, tags: ['setpiece', 'box'],
      spot: { x: 1 - 11 / LEN, y: 0.5, where: 'auf dem Elfmeterpunkt' },
    };
  },
};

export const SIM_SCENES: SceneType[] = [play, duel, counter, cross, shot, header, through, keeperball, kickoff, goalkick, throwin, freekick, corner, penalty];
