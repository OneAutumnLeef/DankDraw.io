import type { Difficulty } from './game.js';

export interface WordEntry {
  word: string;
  difficulty: Difficulty;
  category: string;
}

/** A curated list of ~280 words. Mix of easy household items, animals,
 * pop culture, memes, internet absurdity — keeping the dank spirit. */
export const WORDS: ReadonlyArray<WordEntry> = [
  // ── Animals (easy) ──
  { word: 'cat', difficulty: 'easy', category: 'animals' },
  { word: 'dog', difficulty: 'easy', category: 'animals' },
  { word: 'fish', difficulty: 'easy', category: 'animals' },
  { word: 'bird', difficulty: 'easy', category: 'animals' },
  { word: 'cow', difficulty: 'easy', category: 'animals' },
  { word: 'pig', difficulty: 'easy', category: 'animals' },
  { word: 'horse', difficulty: 'easy', category: 'animals' },
  { word: 'lion', difficulty: 'easy', category: 'animals' },
  { word: 'tiger', difficulty: 'easy', category: 'animals' },
  { word: 'bear', difficulty: 'easy', category: 'animals' },
  { word: 'panda', difficulty: 'easy', category: 'animals' },
  { word: 'monkey', difficulty: 'easy', category: 'animals' },
  { word: 'snake', difficulty: 'easy', category: 'animals' },
  { word: 'frog', difficulty: 'easy', category: 'animals' },
  { word: 'duck', difficulty: 'easy', category: 'animals' },
  { word: 'shark', difficulty: 'medium', category: 'animals' },
  { word: 'whale', difficulty: 'medium', category: 'animals' },
  { word: 'octopus', difficulty: 'medium', category: 'animals' },
  { word: 'penguin', difficulty: 'medium', category: 'animals' },
  { word: 'kangaroo', difficulty: 'medium', category: 'animals' },
  { word: 'giraffe', difficulty: 'medium', category: 'animals' },
  { word: 'elephant', difficulty: 'medium', category: 'animals' },
  { word: 'rhinoceros', difficulty: 'hard', category: 'animals' },
  { word: 'platypus', difficulty: 'hard', category: 'animals' },
  { word: 'axolotl', difficulty: 'hard', category: 'animals' },
  { word: 'narwhal', difficulty: 'hard', category: 'animals' },
  { word: 'pangolin', difficulty: 'hard', category: 'animals' },
  { word: 'capybara', difficulty: 'hard', category: 'animals' },

  // ── Food (easy/medium) ──
  { word: 'pizza', difficulty: 'easy', category: 'food' },
  { word: 'burger', difficulty: 'easy', category: 'food' },
  { word: 'fries', difficulty: 'easy', category: 'food' },
  { word: 'pasta', difficulty: 'easy', category: 'food' },
  { word: 'sushi', difficulty: 'easy', category: 'food' },
  { word: 'taco', difficulty: 'easy', category: 'food' },
  { word: 'donut', difficulty: 'easy', category: 'food' },
  { word: 'cake', difficulty: 'easy', category: 'food' },
  { word: 'banana', difficulty: 'easy', category: 'food' },
  { word: 'apple', difficulty: 'easy', category: 'food' },
  { word: 'pineapple', difficulty: 'medium', category: 'food' },
  { word: 'avocado', difficulty: 'medium', category: 'food' },
  { word: 'watermelon', difficulty: 'medium', category: 'food' },
  { word: 'strawberry', difficulty: 'medium', category: 'food' },
  { word: 'spaghetti', difficulty: 'medium', category: 'food' },
  { word: 'biryani', difficulty: 'medium', category: 'food' },
  { word: 'samosa', difficulty: 'medium', category: 'food' },
  { word: 'croissant', difficulty: 'hard', category: 'food' },
  { word: 'macaron', difficulty: 'hard', category: 'food' },
  { word: 'pomegranate', difficulty: 'hard', category: 'food' },

  // ── Objects (easy) ──
  { word: 'phone', difficulty: 'easy', category: 'objects' },
  { word: 'laptop', difficulty: 'easy', category: 'objects' },
  { word: 'chair', difficulty: 'easy', category: 'objects' },
  { word: 'book', difficulty: 'easy', category: 'objects' },
  { word: 'cup', difficulty: 'easy', category: 'objects' },
  { word: 'spoon', difficulty: 'easy', category: 'objects' },
  { word: 'key', difficulty: 'easy', category: 'objects' },
  { word: 'ball', difficulty: 'easy', category: 'objects' },
  { word: 'clock', difficulty: 'easy', category: 'objects' },
  { word: 'umbrella', difficulty: 'medium', category: 'objects' },
  { word: 'glasses', difficulty: 'easy', category: 'objects' },
  { word: 'backpack', difficulty: 'medium', category: 'objects' },
  { word: 'lipstick', difficulty: 'medium', category: 'objects' },
  { word: 'toothbrush', difficulty: 'medium', category: 'objects' },
  { word: 'microscope', difficulty: 'hard', category: 'objects' },
  { word: 'telescope', difficulty: 'hard', category: 'objects' },
  { word: 'metronome', difficulty: 'hard', category: 'objects' },
  { word: 'chandelier', difficulty: 'hard', category: 'objects' },

  // ── Places ──
  { word: 'beach', difficulty: 'easy', category: 'places' },
  { word: 'school', difficulty: 'easy', category: 'places' },
  { word: 'park', difficulty: 'easy', category: 'places' },
  { word: 'farm', difficulty: 'easy', category: 'places' },
  { word: 'castle', difficulty: 'medium', category: 'places' },
  { word: 'pyramid', difficulty: 'medium', category: 'places' },
  { word: 'volcano', difficulty: 'medium', category: 'places' },
  { word: 'lighthouse', difficulty: 'medium', category: 'places' },
  { word: 'observatory', difficulty: 'hard', category: 'places' },
  { word: 'colosseum', difficulty: 'hard', category: 'places' },
  { word: 'taj mahal', difficulty: 'hard', category: 'places' },
  { word: 'eiffel tower', difficulty: 'medium', category: 'places' },

  // ── Actions / verbs ──
  { word: 'running', difficulty: 'easy', category: 'actions' },
  { word: 'sleeping', difficulty: 'easy', category: 'actions' },
  { word: 'cooking', difficulty: 'easy', category: 'actions' },
  { word: 'dancing', difficulty: 'easy', category: 'actions' },
  { word: 'crying', difficulty: 'easy', category: 'actions' },
  { word: 'flexing', difficulty: 'medium', category: 'actions' },
  { word: 'swimming', difficulty: 'easy', category: 'actions' },
  { word: 'skydiving', difficulty: 'medium', category: 'actions' },
  { word: 'stargazing', difficulty: 'hard', category: 'actions' },
  { word: 'meditation', difficulty: 'hard', category: 'actions' },

  // ── Pop culture / characters ──
  { word: 'batman', difficulty: 'easy', category: 'pop' },
  { word: 'superman', difficulty: 'easy', category: 'pop' },
  { word: 'spiderman', difficulty: 'easy', category: 'pop' },
  { word: 'pikachu', difficulty: 'easy', category: 'pop' },
  { word: 'mario', difficulty: 'easy', category: 'pop' },
  { word: 'sonic', difficulty: 'easy', category: 'pop' },
  { word: 'hello kitty', difficulty: 'medium', category: 'pop' },
  { word: 'peppa pig', difficulty: 'medium', category: 'pop' },
  { word: 'shrek', difficulty: 'easy', category: 'pop' },
  { word: 'godzilla', difficulty: 'medium', category: 'pop' },
  { word: 'bart simpson', difficulty: 'medium', category: 'pop' },
  { word: 'darth vader', difficulty: 'medium', category: 'pop' },
  { word: 'iron man', difficulty: 'easy', category: 'pop' },
  { word: 'gandalf', difficulty: 'medium', category: 'pop' },
  { word: 'voldemort', difficulty: 'medium', category: 'pop' },
  { word: 'wall-e', difficulty: 'hard', category: 'pop' },

  // ── Memes (the dank tier) ──
  { word: 'troll face', difficulty: 'medium', category: 'memes' },
  { word: 'doge', difficulty: 'medium', category: 'memes' },
  { word: 'pepe', difficulty: 'medium', category: 'memes' },
  { word: 'rage face', difficulty: 'hard', category: 'memes' },
  { word: 'stonks', difficulty: 'hard', category: 'memes' },
  { word: 'gigachad', difficulty: 'hard', category: 'memes' },
  { word: 'distracted boyfriend', difficulty: 'hard', category: 'memes' },
  { word: 'galaxy brain', difficulty: 'hard', category: 'memes' },
  { word: 'this is fine dog', difficulty: 'hard', category: 'memes' },
  { word: 'gummy bear', difficulty: 'medium', category: 'memes' },

  // ── Sports & games ──
  { word: 'football', difficulty: 'easy', category: 'sports' },
  { word: 'basketball', difficulty: 'easy', category: 'sports' },
  { word: 'tennis', difficulty: 'easy', category: 'sports' },
  { word: 'cricket', difficulty: 'easy', category: 'sports' },
  { word: 'chess', difficulty: 'easy', category: 'sports' },
  { word: 'bowling', difficulty: 'medium', category: 'sports' },
  { word: 'archery', difficulty: 'medium', category: 'sports' },
  { word: 'skateboard', difficulty: 'medium', category: 'sports' },
  { word: 'surfboard', difficulty: 'medium', category: 'sports' },

  // ── Nature ──
  { word: 'tree', difficulty: 'easy', category: 'nature' },
  { word: 'flower', difficulty: 'easy', category: 'nature' },
  { word: 'mountain', difficulty: 'easy', category: 'nature' },
  { word: 'cloud', difficulty: 'easy', category: 'nature' },
  { word: 'rainbow', difficulty: 'easy', category: 'nature' },
  { word: 'lightning', difficulty: 'medium', category: 'nature' },
  { word: 'tornado', difficulty: 'medium', category: 'nature' },
  { word: 'iceberg', difficulty: 'medium', category: 'nature' },
  { word: 'galaxy', difficulty: 'medium', category: 'nature' },
  { word: 'meteor', difficulty: 'medium', category: 'nature' },
  { word: 'aurora', difficulty: 'hard', category: 'nature' },
  { word: 'glacier', difficulty: 'hard', category: 'nature' },

  // ── Music & instruments ──
  { word: 'guitar', difficulty: 'easy', category: 'music' },
  { word: 'piano', difficulty: 'easy', category: 'music' },
  { word: 'drum', difficulty: 'easy', category: 'music' },
  { word: 'violin', difficulty: 'medium', category: 'music' },
  { word: 'saxophone', difficulty: 'medium', category: 'music' },
  { word: 'accordion', difficulty: 'hard', category: 'music' },
  { word: 'didgeridoo', difficulty: 'hard', category: 'music' },

  // ── Emotions / abstract ──
  { word: 'love', difficulty: 'medium', category: 'abstract' },
  { word: 'fear', difficulty: 'medium', category: 'abstract' },
  { word: 'rage', difficulty: 'medium', category: 'abstract' },
  { word: 'time', difficulty: 'hard', category: 'abstract' },
  { word: 'gravity', difficulty: 'hard', category: 'abstract' },
  { word: 'silence', difficulty: 'hard', category: 'abstract' },
  { word: 'nostalgia', difficulty: 'hard', category: 'abstract' },
  { word: 'karma', difficulty: 'hard', category: 'abstract' },

  // ── Tech ──
  { word: 'robot', difficulty: 'easy', category: 'tech' },
  { word: 'computer', difficulty: 'easy', category: 'tech' },
  { word: 'rocket', difficulty: 'easy', category: 'tech' },
  { word: 'satellite', difficulty: 'medium', category: 'tech' },
  { word: 'drone', difficulty: 'medium', category: 'tech' },
  { word: 'usb stick', difficulty: 'medium', category: 'tech' },
  { word: 'nfc card', difficulty: 'hard', category: 'tech' },
  { word: 'algorithm', difficulty: 'hard', category: 'tech' },
];

/** Pick three words for the drawer to choose from: easy, medium, hard. */
export function pickThreeWords(
  recentlyUsed: ReadonlySet<string>,
  customWords: readonly string[] = [],
): WordEntry[] {
  if (customWords.length >= 3) {
    const pool = customWords.slice();
    const choices: WordEntry[] = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const word = pool.splice(idx, 1)[0]!;
      choices.push({ word, difficulty: 'medium', category: 'custom' });
    }
    return choices;
  }

  const picks: WordEntry[] = [];
  for (const diff of ['easy', 'medium', 'hard'] as const) {
    const pool = WORDS.filter((w) => w.difficulty === diff && !recentlyUsed.has(w.word));
    const fallback = WORDS.filter((w) => w.difficulty === diff);
    const source = pool.length ? pool : fallback;
    picks.push(source[Math.floor(Math.random() * source.length)]!);
  }
  return picks;
}
