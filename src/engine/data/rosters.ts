import type { Loadout, Player, TeamSetup } from '../types';

// Two fixed rosters for the prototype. No numbers: role, traits, a name the commentary uses.
// Both benches pick their skills from the same pool (loadout.ts); the rosters are where the two sides differ.

const p = (name: string, short: string, role: Player['role'], traits: string[] = []): Player => ({ name, short, role, traits });

export const ROSTER_A: Player[] = [
  p('Wolfgang Obermeier', 'Wolle', 'keeper'),
  p('Bartholomäus Huber', 'Barthl', 'defender', ['treter']),
  p('Piotr Kowalczyk', 'Piotr', 'defender'),
  p('Luca Esposito', 'Luca', 'defender'),
  p('Kofi Mensah', 'Kofi', 'defender', ['schnell']),
  p('Bernd Kaltenbach', 'Kalle', 'midfielder'),
  p('Arben Krasniqi', 'Arben', 'midfielder'),
  p('Jean-Luc Hofbauer', 'Schanni', 'winger', ['schnell']),
  p('Vinzenz Wimmer', 'Vinz', 'winger'),
  p('Goran Petrović', 'Goran', 'striker', ['kopfballungeheuer']),
  p('Timo Schwarzhuber jun.', 'Junior', 'striker', ['nervenbuendel']),
];

export const ROSTER_B: Player[] = [
  p('Torsten Kühn', 'Torte', 'keeper', ['fliegenfaenger']),
  p('Heinz-Dieter Hartmann', 'Hadde', 'defender', ['treter', 'rentner']),
  p('Dragan Jović', 'Dragan', 'defender'),
  p('Yusuf Kaya', 'Yusuf', 'defender', ['schnell']),
  p('Rainer Ludwig', 'Opa', 'defender', ['rentner']),
  p('Konstantinos Papadopoulos', 'Kosta', 'midfielder'),
  p('Sven Kraus', 'Krausi', 'midfielder'),
  p('Oleksandr Bondarenko', 'Sascha', 'winger'),
  p('Finn-Ole Vogel', 'Finn-Ole', 'winger', ['nervenbuendel']),
  p('Moussa Diallo', 'Moussa', 'striker', ['kaltschnaeuzig']),
  p('Tobias Frank', 'Kante', 'striker', ['kopfballungeheuer']),
];

/** No skills at all: the football alone. The UI and the strip tool put a picked loadout in before kick-off. */
export const noLoadout = (): Loadout => ({
  'ball:action': [], 'ball:challenge': [], 'ball:setpiece': [],
  'noball:action': [], 'noball:challenge': [], 'noball:setpiece': [],
});

export const TEAM_A: TeamSetup = { name: 'SV Hinterdupfing', short: 'SVH', roster: ROSTER_A, loadout: noLoadout() };
export const TEAM_B: TeamSetup = { name: 'Rot-Weiß Krötenbach', short: 'RWK', roster: ROSTER_B, loadout: noLoadout() };
