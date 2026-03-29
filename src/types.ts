export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '512px' | '1K' | '2K' | '4K';

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  count: number;
  style: string;
  lighting: string;
  angle: string;
  backgroundPrompt: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  timestamp: number;
  settings: GenerationSettings;
}
