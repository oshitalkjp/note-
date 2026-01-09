
export type TargetLength = 2000 | 4000 | 6000 | 8000 | 10000;

export interface Article {
  id: string;
  trend: string;
  title: string;
  content: string;
  thumbnailUrl: string;
  sectionImages: SectionImage[];
  createdAt: string;
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'published';
  publishedTo?: string[]; // ['note', 'patreon'] など
  references?: string[];
  targetLength: TargetLength;
  youtubeUrls?: string[];
}

export interface SectionImage {
  id: string;
  url: string;
  description: string;
  sectionIndex: number;
}

export interface GenerationProgress {
  step: 'searching' | 'outlining' | 'writing' | 'imaging' | 'complete';
  message: string;
  percent: number;
}
