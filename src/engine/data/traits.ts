import type { Trait } from '../types';

// Traits are words on a player card. Each one is a list of tilts on rows of scene types, and fires
// only when its owner fills that slot. When it fires, the panel says so (`fires`) and both benches
// see it before they lay a card. Few traits on purpose: a coach should know all of them by heart.
// v0.13: open play is one scene type at many places (sim.ts), so a tilt names the slot — the man on the
// ball is `carrier`, his opponent `marker` — and the rows it tilts only exist where the place allows:
// a Treter's foul is a free kick in midfield, a dangerous free kick at the Sechzehner, and a penalty in
// the box. Same trait, and the pitch decides what it costs.

const t = (scene: string | string[], slot: string, row: string, factor: number) =>
  ({ scene: Array.isArray(scene) ? scene : [scene], slot, row, factor });
const OPEN = ['play', 'duel', 'counter'];

export const TRAITS: Trait[] = [
  {
    id: 'schnell', label: 'schnell', text: 'Läuft allen davon. Wird selten erwischt.',
    fires: 'läuft seinem Mann eher davon',
    // v0.25: on a defender the same line read as "leaves his man" — and then his man ran away from him
    firesAs: { marker: 'holt jeden wieder ein', chaser: 'holt jeden wieder ein', lastman: 'ist schneller zurück als alle' },
    tilts: [
      t(OPEN, 'carrier', 'dribbling', 1.6), t(OPEN, 'carrier', 'durch', 1.6), t(OPEN, 'carrier', 'abgegraetscht', 0.6),
      t(OPEN, 'marker', 'abgegraetscht', 1.5), t(OPEN, 'marker', 'dribbling', 0.6), t(OPEN, 'marker', 'durch', 0.6),
      t('offsidetrap', 'runner', 'durch', 1.6), t('offsidetrap', 'lastman', 'abseits', 1.5),
      t('through_on_goal', 'chaser', 'eingeholt', 2.5),
    ],
  },
  {
    id: 'treter', label: 'Treter', text: 'Kommt immer an den Ball. Oder ans Bein.',
    fires: 'kommt an den Ball, oder es pfeift',
    tilts: [
      t(OPEN, 'marker', 'abgegraetscht', 1.4), t(OPEN, 'marker', 'foul', 2.5), t(OPEN, 'marker', 'foul_gefaehrlich', 2.5),
      t(OPEN, 'marker', 'elfmeter_foul', 3),
      t('cross', 'marker', 'zur_ecke', 1.4), t('cross', 'marker', 'elfmeter', 3),
      t('corner', 'marker', 'geklaert', 1.4), t('corner', 'marker', 'elfmeter', 3),
    ],
  },
  {
    id: 'rentner', label: 'Rentner', text: '38 und spielt, weil sonst keiner kommt.',
    fires: 'kommt einen Schritt zu spät',
    tilts: [
      t(OPEN, 'marker', 'abgegraetscht', 0.5), t(OPEN, 'marker', 'dribbling', 1.5), t(OPEN, 'marker', 'durch', 1.6),
      t('cross', 'marker', 'kopfball', 1.4), t('offsidetrap', 'lastman', 'durch', 1.8),
      t('through_on_goal', 'chaser', 'eingeholt', 0.4),
    ],
  },
  {
    id: 'kopfballungeheuer', label: 'Kopfballungeheuer', text: 'Wo die Flanke hinkommt, ist schon sein Kopf.',
    fires: 'steigt höher als alle',
    tilts: [t('cross', 'target', 'kopfball', 2), t('corner', 'target', 'kopfball', 2), t('header', 'target', 'tor', 1.6)],
  },
  {
    id: 'fliegenfaenger', label: 'Fliegenfänger', text: 'Fliegt gern. Fängt selten.',
    fires: 'fliegt, fängt aber selten',
    tilts: [
      t('shot', 'keeper', 'gehalten', 0.5), t('shot', 'keeper', 'abgewehrt', 1.8), t('header', 'keeper', 'gehalten', 0.6),
      t('through_on_goal', 'keeper', 'breit_gemacht', 0.6), t('cross', 'keeper', 'abgefangen', 0.5),
      t(['keeperball', 'goalkick'], 'keeper', 'patzer', 3), t('corner', 'keeper', 'gefaustet', 0.5),
      t('freekick', 'keeper', 'fk_gehalten', 0.5), t('penalty', 'keeper', 'gehalten', 0.7),
    ],
  },
  {
    id: 'kaltschnaeuzig', label: 'kaltschnäuzig', text: 'Vor dem Tor geht der Puls runter, nicht rauf.',
    fires: 'macht die Dinger rein',
    tilts: [
      t('through_on_goal', 'runner', 'tor', 1.6), t('shot', 'shooter', 'tor', 1.5),
      t('penalty', 'shooter', 'tor', 1.4),
    ],
  },
  {
    id: 'nervenbuendel', label: 'Nervenbündel', text: 'Allein vor dem Tor denkt er an die Steuererklärung.',
    fires: 'zittert vor dem Tor',
    tilts: [
      t('through_on_goal', 'runner', 'vorbei', 1.8), t('shot', 'shooter', 'vorbei', 1.6),
      t('penalty', 'shooter', 'vorbei', 2.5), t('corner', 'target', 'kopfball', 0.6),
    ],
  },
];

export const traitById = new Map(TRAITS.map(tr => [tr.id, tr]));
