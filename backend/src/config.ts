import 'dotenv/config';

export const JETSREAM_URL = process.env.JETSREAM_URL ?? 'wss://jetstream2.us-west.bsky.network/subscribe';
export const BOOKMARK = 'blue.rito.feed.bookmark'
export const LIKE = 'blue.rito.feed.like'
export const SERVICE = 'blue.rito.service.schema'
export const POST_COLLECTION = "app.bsky.feed.post";
export const CURSOR_UPDATE_INTERVAL =
  process.env.CURSOR_UPDATE_INTERVAL ? Number(process.env.CURSOR_UPDATE_INTERVAL) : 60000;