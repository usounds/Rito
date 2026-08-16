export const SCOPE = [
    "atproto",
    "include:blue.rito.permissionSet",
    "repo:app.bsky.feed.post?action=create",
    "rpc:app.bsky.actor.getProfile?aud=did:web:api.bsky.app%23bsky_appview",
    "blob:*/*",
];

export const PRIVATE_BOOKMARK_SCOPE = "space:blue.rito.space.bookmark";

export const ALL_SCOPES = [
    ...SCOPE,
    PRIVATE_BOOKMARK_SCOPE,
];