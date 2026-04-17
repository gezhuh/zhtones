import type { Prompt, Syllable } from './model';
import { applySandhi, underlyingContours } from './sandhi';

function makePrompt(id: string, syllables: Syllable[]): Prompt {
  const surface = applySandhi(syllables);
  return {
    id,
    syllables,
    surfaceContours: surface.surfaceContours,
    underlyingContours: underlyingContours(syllables),
    sandhi: surface.sandhi,
  };
}

const SINGLE_SYLLABLES: Syllable[] = [
  { hanzi: '妈', pinyin: 'mā', tone: 1 },
  { hanzi: '麻', pinyin: 'má', tone: 2 },
  { hanzi: '马', pinyin: 'mǎ', tone: 3 },
  { hanzi: '骂', pinyin: 'mà', tone: 4 },
  { hanzi: '吗', pinyin: 'ma', tone: 0 },
  { hanzi: '高', pinyin: 'gāo', tone: 1 },
  { hanzi: '来', pinyin: 'lái', tone: 2 },
  { hanzi: '好', pinyin: 'hǎo', tone: 3 },
  { hanzi: '是', pinyin: 'shì', tone: 4 },
  { hanzi: '了', pinyin: 'le', tone: 0 },
  { hanzi: '飞', pinyin: 'fēi', tone: 1 },
  { hanzi: '人', pinyin: 'rén', tone: 2 },
  { hanzi: '我', pinyin: 'wǒ', tone: 3 },
  { hanzi: '去', pinyin: 'qù', tone: 4 },
  { hanzi: '的', pinyin: 'de', tone: 0 },
];

const PAIRS: Array<[Syllable, Syllable]> = [
  // T3+T3 -> T2+T3
  [
    { hanzi: '你', pinyin: 'nǐ', tone: 3 },
    { hanzi: '好', pinyin: 'hǎo', tone: 3 },
  ],
  [
    { hanzi: '很', pinyin: 'hěn', tone: 3 },
    { hanzi: '好', pinyin: 'hǎo', tone: 3 },
  ],
  [
    { hanzi: '老', pinyin: 'lǎo', tone: 3 },
    { hanzi: '虎', pinyin: 'hǔ', tone: 3 },
  ],
  // half-third (T3 + non-T3)
  [
    { hanzi: '老', pinyin: 'lǎo', tone: 3 },
    { hanzi: '师', pinyin: 'shī', tone: 1 },
  ],
  [
    { hanzi: '美', pinyin: 'měi', tone: 3 },
    { hanzi: '国', pinyin: 'guó', tone: 2 },
  ],
  [
    { hanzi: '请', pinyin: 'qǐng', tone: 3 },
    { hanzi: '坐', pinyin: 'zuò', tone: 4 },
  ],
  [
    { hanzi: '我', pinyin: 'wǒ', tone: 3 },
    { hanzi: '们', pinyin: 'men', tone: 0 },
  ],
  // 一 sandhi
  [
    { hanzi: '一', pinyin: 'yī', tone: 1 },
    { hanzi: '个', pinyin: 'gè', tone: 4 },
  ],
  [
    { hanzi: '一', pinyin: 'yī', tone: 1 },
    { hanzi: '天', pinyin: 'tiān', tone: 1 },
  ],
  [
    { hanzi: '一', pinyin: 'yī', tone: 1 },
    { hanzi: '年', pinyin: 'nián', tone: 2 },
  ],
  [
    { hanzi: '一', pinyin: 'yī', tone: 1 },
    { hanzi: '起', pinyin: 'qǐ', tone: 3 },
  ],
  // 不 sandhi
  [
    { hanzi: '不', pinyin: 'bù', tone: 4 },
    { hanzi: '是', pinyin: 'shì', tone: 4 },
  ],
  [
    { hanzi: '不', pinyin: 'bù', tone: 4 },
    { hanzi: '要', pinyin: 'yào', tone: 4 },
  ],
  [
    { hanzi: '不', pinyin: 'bù', tone: 4 },
    { hanzi: '好', pinyin: 'hǎo', tone: 3 },
  ],
  [
    { hanzi: '不', pinyin: 'bù', tone: 4 },
    { hanzi: '来', pinyin: 'lái', tone: 2 },
  ],
  // neutral tone (non-T3 first syllable)
  [
    { hanzi: '妈', pinyin: 'mā', tone: 1 },
    { hanzi: '妈', pinyin: 'ma', tone: 0 },
  ],
  [
    { hanzi: '哥', pinyin: 'gē', tone: 1 },
    { hanzi: '哥', pinyin: 'ge', tone: 0 },
  ],
  [
    { hanzi: '爸', pinyin: 'bà', tone: 4 },
    { hanzi: '爸', pinyin: 'ba', tone: 0 },
  ],
  [
    { hanzi: '朋', pinyin: 'péng', tone: 2 },
    { hanzi: '友', pinyin: 'you', tone: 0 },
  ],
  // no-sandhi pairs covering each tone combo
  [
    { hanzi: '中', pinyin: 'zhōng', tone: 1 },
    { hanzi: '国', pinyin: 'guó', tone: 2 },
  ],
  [
    { hanzi: '今', pinyin: 'jīn', tone: 1 },
    { hanzi: '天', pinyin: 'tiān', tone: 1 },
  ],
  [
    { hanzi: '汉', pinyin: 'hàn', tone: 4 },
    { hanzi: '语', pinyin: 'yǔ', tone: 3 },
  ],
  [
    { hanzi: '学', pinyin: 'xué', tone: 2 },
    { hanzi: '生', pinyin: 'shēng', tone: 1 },
  ],
  [
    { hanzi: '电', pinyin: 'diàn', tone: 4 },
    { hanzi: '话', pinyin: 'huà', tone: 4 },
  ],
];

export const SINGLE_PROMPTS: Prompt[] = SINGLE_SYLLABLES.map((s, i) =>
  makePrompt(`s-${i}`, [s]),
);

export const PAIR_PROMPTS: Prompt[] = PAIRS.map((pair, i) => makePrompt(`p-${i}`, pair));
