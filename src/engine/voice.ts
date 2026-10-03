// Whose words (v0.25). Every line in the game is written the way SV Hinterdupfing's bench would say it:
// "Freistoß für die", "drüben köpft einer zurück", "Von der Bank". The player always coaches SVH (HOME),
// so when the other bench shouts, or the other side has the ball and a row speaks from its view, the
// same line has to be turned round — otherwise RWK's "Einwurf für die" is our throw-in and RWK's shout reads
// like ours. That is all this does: a small table of phrases and their mirror, applied in one pass.
// Writing rule for new lines: say "für die / für uns", "drüben / bei uns", "von denen / von uns", "unser",
// and "Von der Bank" for the bench; avoid "deren" before anything but a masculine noun ("deren Bus").

import type { Side } from './types';

/** The side the player coaches, and the side every line is written for. */
export const HOME: Side = 'A';

/** A-voice phrase → the same thing said from the other side. Bidirectional pairs are listed both ways. */
const MIRROR: [string, string][] = [
  ['Von der Bank', 'Von drüben'],
  ['für drüben', 'für uns'],
  ['für die', 'für uns'], ['für uns', 'für die'],
  ['Für die', 'Für uns'], ['Für uns', 'Für die'],
  ['wegen uns', 'wegen denen'], ['wegen denen', 'wegen uns'],
  ['von unseren', 'von denen'],
  ['von uns', 'von denen'], ['von denen', 'von uns'],
  ['zu uns', 'zu denen'], ['zu denen', 'zu uns'],
  ['Bei uns', 'Drüben'], ['Drüben', 'Bei uns'],
  ['bei uns', 'drüben'], ['drüben', 'bei uns'],
  ['Unsere ', 'Deren Leute '],
  ['unserem ', 'deren '],
  ['Unser ', 'Deren '], ['Deren ', 'Unser '],
  ['unser ', 'deren '], ['deren ', 'unser '],
];

const AWAY = new Map(MIRROR);
// whole words only: "deren" in "anderen" is not theirs
const AWAY_RE = new RegExp(`(?<![\\p{L}])(?:${[...AWAY.keys()].sort((a, b) => b.length - a.length)
  .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (/\p{L}$/u.test(k) ? '(?![\\p{L}])' : '')).join('|')})`, 'gu');

/**
 * A line in the words of `speaker`. For the home side only the bench gets a name ("Von unserer Bank"), so
 * two shouts in one panel can be told apart; for the other side the line is turned round.
 */
export function voice(text: string, speaker: Side): string {
  if (speaker === HOME) return text.replace(/Von der Bank/g, 'Von unserer Bank');
  return text.replace(AWAY_RE, m => AWAY.get(m) ?? m);
}
