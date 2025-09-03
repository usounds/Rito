export type SchemaEntry = {
  nsid: string;
  schema: string;
};

export const nsidSchema: SchemaEntry[] = [
  { nsid: "app.bsky.actor.profile", schema: "https://bsky.app/profile/{did}" },
  { nsid: "app.bsky.feed.generator", schema: "https://bsky.app/profile/{did}/feed/{rkey}" },
  { nsid: "app.bsky.feed.post", schema: "https://bsky.app/profile/{did}/post/{rkey}" },
  { nsid: "app.bsky.graph.list", schema: "https://bsky.app/profile/{did}/lists/{rkey}" },
  { nsid: "uk.skyblur.post", schema: "https://skyblur.uk/post/{did}/{rkey}" },
];