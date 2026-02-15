export interface Bookmark {
  uri: string;
  //  did: string;             // DB に合わせて追加
  handle: string;          // 追加
  subject: string;
  ogpTitle: string | null;
  ogpDescription: string | null;
  ogpImage: string | null;
  createdAt: string;      // ISO 8601 形式
  indexedAt: string;      // ISO 8601 形式
  moderations: string[] | null; // DB では string? なので null もあり得る
  comments: Comment[];
  tags: string[];
  likes?: string[];
  category: string | null;
}

export interface Comment {
  lang: 'ja' | 'en';
  title: string;
  comment: string;
  moderations: string[]; // 同上
}

export interface TagRanking {
  tag: string;
  count: number;
}

interface RawComment {
  lang: string;                  // ← ここを string にする
  title: string | null;
  comment: string | null;
  moderation_result?: string | null;
  bookmark_uri?: string;
}


export interface RawBookmark {
  uri: string;
  handle: string | null;
  subject: string;
  ogp_title?: string | null;
  ogp_description?: string | null;
  ogp_image?: string | null;
  created_at: string | Date;      // ← Date も許容
  indexed_at: string | Date;      // ← Date も許容
  moderation_result?: string | null;
  comments: RawComment[];
  tags?: { tag: { name: string } }[];
  category?: string | null;
}
