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


interface RawBookmark {
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
}

export function normalizeBookmarks(raw: RawBookmark[]): Bookmark[] {
  return raw.map(b => ({
    uri: b.uri,
    handle: b.handle ?? '',   // ← null の場合は空文字に変換
    subject: b.subject,
    ogpTitle: b.ogp_title ?? '',
    ogpDescription: b.ogp_description ?? '',
    ogpImage: b.ogp_image ?? null,
createdAt: typeof b.created_at === 'string' ? b.created_at : b.created_at.toISOString(),
indexedAt: typeof b.indexed_at === 'string' ? b.indexed_at : b.indexed_at.toISOString(),
    moderations: b.moderation_result
      ? b.moderation_result.split(',').map(s => s.trim())
      : [],
    comments: b.comments.map(c => ({
  lang: c.lang === 'en' ? 'en' : 'ja', // string -> "ja" | "en"
      title: c.title ?? '',
      comment: c.comment ?? '',
      moderations: c.moderation_result
        ? c.moderation_result.split(',').map(s => s.trim())
        : [],
    })),
    tags: Array.isArray(b.tags)
      ? b.tags
          .map(t => t.tag.name)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .sort((a, _b) => (a === 'Verified' ? -1 : 0))
      : [],
  }));
}
