export interface Bookmark {
  uri: string;
  subject: string;
  ogp_title: string;
  ogp_description: string;
  ogp_image: string | null;
  created_at: string;   // ISO 8601 形式
  indexed_at: string;   // ISO 8601 形式
  moderation_result: string[]; // 常に配列で返す
  comments: Comment[];
  tags: string[];
}

export interface Comment {
  lang: 'ja' | 'en';
  title: string;
  comment: string;
  moderation_result: string[]; // こちらも配列に統一
}


export type PrismaBookmarkWithRelations = {
  uri: string;
  subject: string;
  ogp_title: string;
  ogp_description: string;
  ogp_image: string | null;
  created_at: Date;
  indexed_at: Date;
  moderation_result: string | null;
  comments: {
    lang: 'ja' | 'en';
    title: string;
    comment: string;
    moderation_result: string | null;
  }[];
  tags: { name: string }[];
};
