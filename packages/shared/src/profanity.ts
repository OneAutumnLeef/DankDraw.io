/**
 * Conservative wordmask. Not exhaustive — just enough to dampen the worst.
 * Hosts get full control via room moderation; this is a base layer.
 */
const BANNED = [
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'cunt',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded',
  'whore', 'slut', 'pussy', 'wank', 'bastard',
];

const PATTERN = new RegExp(`\\b(${BANNED.join('|')})\\b`, 'gi');

/** Replace banned words with asterisks of the same length. */
export function maskProfanity(s: string): string {
  return s.replace(PATTERN, (m) => '*'.repeat(m.length));
}
