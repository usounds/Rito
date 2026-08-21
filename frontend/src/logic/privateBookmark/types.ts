export interface PrivateBookmarkComment {
  lang: 'ja' | 'en';
  title: string;
  comment?: string;
}

export interface PrivateBookmarkItem {
  uri: string;
  cid?: string;
  rkey: string;
  subject: string;
  comments: PrivateBookmarkComment[];
  tags: string[];
  ogpTitle?: string;
  ogpDescription?: string;
  ogpImage?: string;
  createdAt: string;
}

export type PdsCapabilityStatus =
  | 'idle'
  | 'checking'
  | 'unsupported'     // PDS does not support com.atproto.space.* XRPC
  | 'needs_auth'      // Needs space:* OAuth scope authorization
  | 'needs_space'     // Space has not been created yet
  | 'ready';          // Space is ready and accessible

export interface SpaceCapabilityResult {
  status: PdsCapabilityStatus;
  spaceUri?: string;
  message?: string;
}
