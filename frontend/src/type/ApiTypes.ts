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

export function normalizeBookmarks(raw: any[]): Bookmark[] {
  return raw.map(b => ({
    uri: b.uri,
    handle: b.handle,
    subject: b.subject,
    ogpTitle: b.ogp_title,
    ogpDescription: b.ogp_description,
    ogpImage: b.ogp_image,
    createdAt: b.created_at,
    indexedAt: b.indexed_at,
    moderations: typeof b.moderation_result === 'string'
      ? b.moderation_result.split(',').map((s: string) => s.trim())
      : [],
    comments: b.comments.map((c: any) => ({
      lang: c.lang,
      title: c.title,
      comment: c.comment,
      moderations: typeof c.moderation_result === 'string'
        ? c.moderation_result.split(',').map((s: string) => s.trim())
        : [],
    })),
    tags: Array.isArray(b.tags)
      ? b.tags
          .map((t: any) => t.tag.name)
          .sort((a: string, _b: string) => (a === 'Verified' ? -1 : 0))
      : [],
  }));
}
