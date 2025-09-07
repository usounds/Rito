export interface Bookmark {
  uri: string;
  subject: string;
  ogp_title: string;
  ogp_description: string;
  ogp_image: string | null;
  created_at: string;  // ISO 8601 形式の文字列
  indexed_at: string;  // ISO 8601 形式の文字列
  moderations: string[];
  comments: Comment[];
  tags: string[];
}

export interface Comment {
  lang: 'ja' | 'en'
  title: string;
  comment: string;
}
