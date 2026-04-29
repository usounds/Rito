import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding test database...');

  // Clear existing data
  await prisma.like.deleteMany();
  await prisma.bookmarkTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.userDidHandle.deleteMany();
  await prisma.jetstreamIndex.deleteMany();

  // Create mock users
  const user = await prisma.userDidHandle.create({
    data: {
      did: 'did:plc:testuser',
      handle: 'rito.blue',
    },
  });

  const user2 = await prisma.userDidHandle.create({
    data: {
      did: 'did:plc:testuser2',
      handle: 'rito2.blue',
    },
  });

  // 固定の時刻を使用して、groupByのクエリでの不一致（ミリ秒の精度問題）を回避
  const baseDate = new Date();
  baseDate.setMilliseconds(0);

  // Create mock bookmarks
  const bookmark1 = await prisma.bookmark.create({
    data: {
      uri: 'at://did:plc:testuser/app.bsky.feed.post/123',
      did: user.did,
      handle: user.handle,
      subject: 'https://example.com/post/1',
      ogp_title: 'Test Post 1',
      ogp_description: 'This is a test post description 1',
      category: 'tech',
      created_at: baseDate,
    },
  });

  const bookmark2 = await prisma.bookmark.create({
    data: {
      uri: 'at://did:plc:testuser2/app.bsky.feed.post/456',
      did: user2.did,
      handle: user2.handle,
      subject: 'https://example.com/post/2',
      ogp_title: 'Test Post 2',
      ogp_description: 'This is a test post description 2',
      category: 'general',
      created_at: new Date(baseDate.getTime() - 1000 * 60 * 60), // 1 hour ago
    },
  });

  // Create tags
  const tag1 = await prisma.tag.create({ data: { name: 'Verified' } });
  const tag2 = await prisma.tag.create({ data: { name: 'Tech' } });

  await prisma.bookmarkTag.createMany({
    data: [
      { bookmark_uri: bookmark1.uri, tag_id: tag1.id },
      { bookmark_uri: bookmark1.uri, tag_id: tag2.id },
      { bookmark_uri: bookmark2.uri, tag_id: tag1.id },
    ],
  });

  // Create comments
  await prisma.comment.create({
    data: {
      bookmark_uri: bookmark1.uri,
      lang: 'ja',
      title: 'テストタイトル1',
      comment: 'テストコメント1',
    },
  });

  await prisma.comment.create({
    data: {
      bookmark_uri: bookmark2.uri,
      lang: 'ja',
      title: 'テストタイトル2',
      comment: 'テストコメント2',
    },
  });

  // Create Like for bookmark1
  await prisma.like.create({
    data: {
      aturi: 'at://did:plc:otheruser/app.bsky.feed.like/999',
      subject: bookmark1.uri,
      did: 'did:plc:otheruser',
      created_at: new Date(),
    },
  });

  // Create jetstream index
  await prisma.jetstreamIndex.create({
    data: {
      service: 'rito',
      index: (Date.now() * 1000).toString(), // current time in microseconds
    },
  });

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
