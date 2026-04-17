export type ToneId = 1 | 2 | 3 | 4 | 0;

export type ChaoContour = number[];

export interface Syllable {
  hanzi: string;
  pinyin: string;
  tone: ToneId;
}

export type SandhiKind =
  | 'third-third'
  | 'half-third'
  | 'yi'
  | 'bu'
  | 'neutral';

export interface Prompt {
  id: string;
  syllables: Syllable[];
  surfaceContours: ChaoContour[];
  underlyingContours: ChaoContour[];
  sandhi?: SandhiKind;
}
