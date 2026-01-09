
export interface Article {
  id: string;
  trend: string;
  title: string;
  content: string;
  thumbnailUrl: string;
  sectionImages: SectionImage[];
  createdAt: string;
  status: 'draft' | 'published';
  references?: string[];
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
