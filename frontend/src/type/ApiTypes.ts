export interface Bookmark {
  uri: string;
  did: string;             // DB に合わせて追加
  handle: string;          // 追加
  subject: string;
  ogp_title: string | null;
  ogp_description: string | null;
  ogp_image: string | null;
  created_at: string;      // ISO 8601 形式
  indexed_at: string;      // ISO 8601 形式
  moderation_result: string[] | null; // DB では string? なので null もあり得る
  comments: Comment[];
  tags: string[];
}

export interface Comment {
  lang: 'ja' | 'en';
  title: string;
  comment: string;
  moderation_result: string[] | null; // 同上
}

export function normalizeBookmarks(raw: any[]): Bookmark[] {
  return raw.map(b => ({
    uri: b.uri,
    did: b.did,
    handle: b.handle,
    subject: b.subject,
    ogp_title: b.ogp_title,
    ogp_description: b.ogp_description,
    ogp_image: b.ogp_image,
    created_at: b.created_at,
    indexed_at: b.indexed_at,
    moderation_result: Array.isArray(b.moderation_result)
      ? b.moderation_result
      : b.moderation_result ? [b.moderation_result] : null,
    comments: b.comments.map((c: any) => ({
      lang: c.lang,
      title: c.title,
      comment: c.comment,
      moderation_result: Array.isArray(c.moderation_result)
        ? c.moderation_result
        : c.moderation_result ? [c.moderation_result] : null,
    })),
    tags: Array.isArray(b.tags)
      ? b.tags
          .map((t: any) => t.tag.name)
          .sort((a: string, _b: string) => (a === 'Verified' ? -1 : 0))
      : [],
  }));
}
