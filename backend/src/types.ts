export interface JetstreamCommitEvent<R = unknown> {
  did: string;
  seq: number;
  time: string;
  kind: 'commit';
  commit: {
    operation: 'create' | 'update' | 'delete';
    collection: string;
    rkey: string;
    rev: string;
    cid?: string;
    record?: R;
  };
}

export type CommitCreateEvent<R = unknown> = JetstreamCommitEvent<R> & {
  commit: { operation: 'create'; cid: string; record: R };
};

export type CommitUpdateEvent<R = unknown> = JetstreamCommitEvent<R> & {
  commit: { operation: 'update'; cid: string; record: R };
};

export type CommitDeleteEvent = JetstreamCommitEvent<never> & {
  commit: { operation: 'delete' };
};

export type CommitPutEvent<R = unknown> = CommitCreateEvent<R> | CommitUpdateEvent<R>;

export interface DidDocument {
  alsoKnownAs?: string[];
}

export interface DomainCheckResult {
  result: boolean;
}

export interface OgpResult {
  result: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: { url: string }[];
  };
}

export interface DnsAnswer {
  data: string;
}

export interface DnsResponse {
  Answer?: DnsAnswer[];
}

export interface PostToBookmarkRecord {
  sub: string;
  lang?: string;
}

export interface CommentLocale {
  lang: string;
  title?: string;
  comment?: string;
}

export interface BookmarkRecord {
  $type: 'blue.rito.feed.bookmark';
  subject: string;
  createdAt?: string;
  comments?: CommentLocale[];
  ogpTitle?: string;
  ogpDescription?: string;
  ogpImage?: string;
  tags?: string[];
}
