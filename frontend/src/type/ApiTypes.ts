export interface Bookmark {
  uri: string;
  subject: string;
  ogp_title: string;
  ogp_description: string;
  ogp_image: string | null;
  created_at: string;  // ISO 8601 形式の文字列
  indexed_at: string;  // ISO 8601 形式の文字列
  verified: boolean;
  comments: Comment[];
  tags: string[];
}

export interface Comment {
  lang: string;
  title: string;
  comment: string;
}