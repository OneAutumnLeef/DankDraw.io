export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export const ACHIEVEMENTS: ReadonlyArray<AchievementDef> = [
  { id: 'first_blood', name: 'First Blood', desc: 'be the first to guess a word', icon: '🩸' },
  { id: 'picasso', name: 'Picasso', desc: 'have everyone guess your drawing', icon: '🎨' },
  { id: 'speedster', name: 'Speedster', desc: 'guess a word in under 8 seconds', icon: '⚡' },
  { id: 'detective', name: 'Detective', desc: 'guess a hard word with no hints', icon: '🕵️' },
  { id: 'centurion', name: 'Centurion', desc: 'reach 1000 lifetime points', icon: '💯' },
  { id: 'champion', name: 'Champion', desc: 'win your first game', icon: '🏆' },
  { id: 'streak', name: 'Streaker', desc: 'guess 3 words in a row', icon: '🔥' },
  { id: 'late_bloomer', name: 'Late Bloomer', desc: 'guess in the last 3 seconds', icon: '⏰' },
  { id: 'team_player', name: 'Team Player', desc: 'win a teams-mode game', icon: '🤝' },
  { id: 'globetrotter', name: 'Globetrotter', desc: 'play 10 games', icon: '🌍' },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

export const ACHIEVEMENT_INDEX: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
