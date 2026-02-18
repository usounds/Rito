import { CommitCreateEvent, CommitDeleteEvent, CommitUpdateEvent, Jetstream } from '@skyware/jetstream';
import { prisma } from './db.js';
import WebSocket from 'ws';
import { BOOKMARK, CURSOR_UPDATE_INTERVAL, JETSREAM_URL, SERVICE, POST_COLLECTION, LIKE } from './config.js';
import { BlueRitoFeedBookmark } from './lexicons/index.js';
import logger from './logger.js';
import OpenAI from "openai";
import { Client, simpleFetchHandler } from '@atcute/client';
import pLimit from "p-limit";
import PQueue from 'p-queue';
import { client as oauthClient } from "./lib/HandleOauthClientNode.js";
import { Agent } from "@atproto/api";
import * as TID from '@atcute/tid';
import { ActorIdentifier } from '@atcute/lexicons/syntax';
import { BlueRitoFeedLike, BlueRitoServiceSchema } from './lexicons/index.js';
import type { XRPCQueries } from '@atcute/lexicons/ambient';
import type * as AppBskyActorGetProfile from '@atcute/bluesky/types/app/actor/getProfile';
import type * as AppBskyFeedPost from '@atcute/bluesky/types/app/feed/post';
import type * as AppBskyRichTextFacet from '@atcute/bluesky/types/app/richtext/facet';
import type * as AppBskyEmbedExternal from '@atcute/bluesky/types/app/embed/external';

const isPostRecord = (v: unknown): v is AppBskyFeedPost.Main & { via?: string } =>
  !!v && typeof v === 'object' && '$type' in v && v.$type === 'app.bsky.feed.post';

const isEmbedExternal = (v: unknown): v is AppBskyEmbedExternal.Main =>
  !!v && typeof v === 'object' && '$type' in v && v.$type === 'app.bsky.embed.external';

const isTagFeature = (v: unknown): v is AppBskyRichTextFacet.Tag =>
  !!v && typeof v === 'object' && '$type' in v && v.$type === 'app.bsky.richtext.facet#tag';
const queue = new PQueue({ concurrency: 1 });
const analysisQueue = new PQueue({ concurrency: 2 });

// Type definitions for API responses
interface DidDocument {
  alsoKnownAs?: string[];
}

interface DomainCheckResult {
  result: boolean;
}

interface OgpResult {
  result: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: { url: string }[];
  };
}

interface DnsAnswer {
  data: string;
}

interface DnsResponse {
  Answer?: DnsAnswer[];
}

interface PostToBookmarkRecord {
  sub: string;
  lang?: string;
}

// Comment locale type
interface CommentLocale {
  lang: string;
  title?: string;
  comment?: string;
}

// Bookmark record type (the inner object, not the full record schema)
interface BookmarkRecord {
  $type: 'blue.rito.feed.bookmark';
  subject: string;
  createdAt?: string;
  comments?: CommentLocale[];
  ogpTitle?: string;
  ogpDescription?: string;
  ogpImage?: string;
  tags?: string[];
}

const dbLimit = pLimit(5); // 同時に DB 操作は最大 5 件まで
const publicAgent = new Client({
  handler: simpleFetchHandler({
    service: 'https://public.api.bsky.app',
  }),
}) as Client<XRPCQueries>;


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 環境変数にAPIキーを設定しておく
});

async function checkModeration(texts: string[]): Promise<string[]> {
  try {
    const response = await client.moderations.create({
      model: "omni-moderation-latest",
      input: texts,
    });

    const flaggedCategories: Set<string> = new Set();

    response.results.forEach(result => {
      for (const [category, value] of Object.entries(result.categories)) {
        if (value) flaggedCategories.add(category);
      }
    });

    return Array.from(flaggedCategories); // 問題なければ空配列 []
  } catch (error) {
    console.error("Moderation error:", error);
    throw error;
  }
}

/**
 * ブックマークのタイトル、説明、コメント、タグからカテゴリーを分類する
 */
const CLASSIFY_SYSTEM_PROMPT = `あなたはウェブコンテンツを自動分類する専門AIです。

## タスク
与えられたコンテンツ情報を分析し、最も適切なカテゴリーIDを1つだけ返してください。

## 判定基準の優先順位
1. タイトルと説明（ウェブサイトのOGP情報）を最優先
2. タグ情報を補助的に使用
3. コメントは参考程度

## カテゴリーID一覧
- general: 一般的なニュース、速報、特定のカテゴリに当てはまらない話題
- atprotocol: AT Protocol, Bluesky, Atmosphere, Fediverse, 分散型SNS関連の技術や話題
- social: 社会問題、時事、事件、政治、経済、ビジネス、金融
- technology: プログラミング、ガジェット、IT、AI、ハードウェア
- lifestyle: 暮らし、家事、育児、健康、教育、学び、雑学
- food: 料理、グルメ、レシピ、飲食店
- travel: 旅行、観光、地域情報、お出かけ
- entertainment: 映画、音楽、芸能、ドラマ、お笑い、ネタ、ユーモア
- anime_game: アニメ、マンガ、ゲーム、声優、VTuber

## 出力ルール
- 上記のカテゴリーIDのいずれか1つのみを返すこと
- 余計な説明、記号、改行は一切含めないこと
- 複数カテゴリーに該当する場合は、最も主要なものを1つ選ぶこと
- 判断に迷う場合は "general" を返すこと`;

const VALID_CATEGORIES = [
  "general", "atprotocol", "social", "technology", "lifestyle", "food", "travel", "entertainment", "anime_game"
];

async function classifyCategory(title: string, description: string, comment: string, tags: string[]): Promise<string | null> {
  try {
    const userPrompt = `タイトル: ${title}
説明: ${description}
タグ: ${tags.join(', ')}
コメント: ${comment}`;

    const response = await client.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
    });

    const category = response.choices[0]?.message?.content?.trim().toLowerCase();

    if (category && VALID_CATEGORIES.includes(category)) {
      return category;
    }
    return "general"; // 判定不能な場合は一般
  } catch (error) {
    logger.error(`Classification error: ${error}`);
    return null;
  }
}

//const prisma = new PrismaClient();
let cursor = "0";
let prev_time_us = "0";
let cursorUpdateInterval: NodeJS.Timeout;

(prisma as any).$on('error', (e: any) => {
  logger.error(`Prisma error event: ${e?.message || e}`);
  process.exit(1); // DB接続が切れたらプロセス終了
});

function epochUsToDateTime(cursor: string | number): string {
  return new Date(Number(cursor) / 1000).toISOString();
}

// JetstreamIndex から初期カーソル取得
async function loadCursor(): Promise<string> {
  try {
    const indexRecord = await prisma.jetstreamIndex.findUnique({
      where: { service: 'rito' }
    });
    if (indexRecord && indexRecord.index) {
      logger.info(`Cursor from DB: ${indexRecord.index} (${epochUsToDateTime(indexRecord.index)})`);
      return indexRecord.index;
    } else {
      const nowUs = Date.now().toString();
      logger.info(`No DB cursor found, using current time: ${nowUs} (${epochUsToDateTime(nowUs)})`);
      return nowUs;
    }
  } catch (err) {
    logger.error(`Failed to load cursor from DB: ${err}`);
    return Date.now().toString();
  }
}

// 初期化
async function init() {
  cursor = await loadCursor();

  // リカバリ: 未分類のブックマークを再キューイング
  const unclassifiedBookmarks = await prisma.bookmark.findMany({
    where: { category: null },
    select: { uri: true, did: true, subject: true, ogp_title: true, ogp_description: true, ogp_image: true, tags: { select: { tag: { select: { name: true } } } }, comments: true }
  });

  logger.info(`Found ${unclassifiedBookmarks.length} unclassified bookmarks. Queueing for analysis...`);

  for (const b of unclassifiedBookmarks) {
    analysisQueue.add(async () => {
      try {
        const tags = b.tags.map(t => t.tag.name);
        const mainComment = b.comments.find(c => c.lang === 'ja')?.comment || b.comments[0]?.comment || "";

        // モデレーション (OGP)
        const ogpTexts: string[] = [];
        if (b.ogp_title) ogpTexts.push(b.ogp_title);
        if (b.ogp_description) ogpTexts.push(b.ogp_description);
        const ogpFlaggedCategories = await checkModeration(ogpTexts);
        const ogpModerationResult = ogpFlaggedCategories.length > 0 ? ogpFlaggedCategories.join(',') : null;

        // カテゴリー分類
        const category = await classifyCategory(
          b.ogp_title || "",
          b.ogp_description || "",
          mainComment,
          tags
        );

        // Bookmark Update
        await dbLimit(() =>
          prisma.bookmark.update({
            where: { uri: b.uri },
            data: {
              category: category,
              moderation_result: ogpModerationResult,
            }
          })
        );
        // Comments Moderation (Recovery)
        for (const c of b.comments) {
          const commentTexts: string[] = [];
          if (c.title) commentTexts.push(c.title);
          if (c.comment) commentTexts.push(c.comment);
          const commentFlaggedCategories = await checkModeration(commentTexts);
          const commentModerationResult = commentFlaggedCategories.length > 0 ? commentFlaggedCategories.join(',') : null;

          await dbLimit(() =>
            prisma.comment.update({
              where: { id: c.id },
              data: { moderation_result: commentModerationResult }
            })
          );
        }

        logger.info(`Recovery analysis complete for ${b.uri}: ${category}`);
      } catch (e) {
        logger.error(`Recovery analysis failed for ${b.uri}: ${e}`);
      }
    });
  }

  const jetstream = new Jetstream({
    wantedCollections: [BOOKMARK, SERVICE, LIKE, POST_COLLECTION],
    endpoint: JETSREAM_URL,
    cursor: Number(cursor),
    ws: WebSocket,
  });

  jetstream.on('open', () => {
    logger.info(`Jetstream open: ${JETSREAM_URL}`);

    cursorUpdateInterval = setInterval(() => {
      if (!jetstream.cursor) return;

      const currentCursor = jetstream.cursor.toString();

      // DB 更新はキュー経由で
      queue.add(async () => {
        try {
          await prisma.jetstreamIndex.upsert({
            where: { service: 'rito' },
            update: { index: currentCursor },
            create: { service: 'rito', index: currentCursor },
          });

          logger.info(`Cursor updated to: ${currentCursor} (${epochUsToDateTime(currentCursor)})`);
        } catch (err) {
          logger.error(`Failed to upsert cursor in DB: ${err}`);
        }
      });

      // 前回と同じなら再接続
      if (prev_time_us === currentCursor) {
        logger.info(`前回からtime_usが変動していませんので再接続します`);
        jetstream.close();
      }

      prev_time_us = currentCursor;
    }, CURSOR_UPDATE_INTERVAL);
  });


  function isValidTangledUrl(url: string, userProfHandle: string): boolean {
    try {
      const u = new URL(url);

      // ドメインが tangled.org であることを確認
      if (u.hostname !== "tangled.org") return false;

      // パスを分解
      const parts = u.pathname.split("/").filter(Boolean);

      // 最低でも2要素必要（例: ["@rito.blue", "skeet.el"]）
      if (parts.length < 2) return false;

      // 1個目が @handle であることを確認
      if (parts[0] !== userProfHandle && parts[0] !== `@${userProfHandle}`) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async function upsertBookmark(event: CommitCreateEvent<typeof BOOKMARK> | CommitUpdateEvent<typeof BOOKMARK>) {
    //console.log("upsertBookmark")

    const record = event.commit.record as BookmarkRecord;
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    cursor = event.time_us.toString();

    let handle = 'no handle';
    let isVerify = false;

    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(`https://plc.directory/${event.did}`);
        if (res.ok) {
          const didData = await res.json() as DidDocument;
          handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? handle;
          logger.info(`Handle successed for DID: ${event.did}, handle: ${handle}`);
          break; // 成功したらループを抜ける
        } else {
          logger.warn(`Attempt ${attempt}: plc.directory fetch failed with status ${res.status}`);
        }
      } catch (err) {
        logger.warn(`Attempt ${attempt}: plc.directory fetch error for DID: ${event.did}`);
      }

    }

    if (!handle) {
      logger.warn(`Failed to fetch handle after ${maxAttempts} attempts for DID: ${event.did}`);
      try {
        const userProfile = await publicAgent.get(`app.bsky.actor.getProfile`, {
          params: { actor: event.did as ActorIdentifier },
        });
        if (userProfile.ok && userProfile.data?.handle) {
          handle = userProfile.data.handle;
        } else {
          logger.error(`Error fetching handle from publicAgent: ${event.did}`);
          return;
        }
      } catch (err) {
        logger.error(`Error fetching handle from publicAgent: ${err}`);
      }
    }

    // URL が正しいかチェック
    const subject = record.subject || '';
    try {
      const url = new URL(subject);
      const domain = url.hostname;

      if ((url.pathname === '/' || url.pathname === '') &&
        (domain === handle || domain.endsWith(`.${handle}`))) {
        isVerify = true;
      } else if (isValidTangledUrl(subject, handle)) {
        isVerify = true;
      }
    } catch {
      // URL パースエラーは無視
    }

    try {
      // DID->Handleテーブル
      //console.log("DID->Handleテーブル")
      await dbLimit(() =>
        prisma.userDidHandle.upsert({
          where: { did: event.did },
          update: { handle: handle },
          create: { did: event.did, handle: handle },
        })
      );

      // Bookmark の upsert
      //console.log("Bookmark の upsert")
      await dbLimit(() =>
        prisma.bookmark.upsert({
          where: { uri: aturi },
          update: {
            subject: record.subject ?? '',
            ogp_title: record.ogpTitle,
            ogp_description: record.ogpDescription,
            ogp_image: record.ogpImage,
            moderation_result: null, // Async will handle this
            handle: handle,
            category: null, // Async will handle this
            indexed_at: new Date(),
          },
          create: {
            uri: aturi,
            did: event.did,
            subject: record.subject ?? '',
            ogp_title: record.ogpTitle,
            ogp_description: record.ogpDescription,
            ogp_image: record.ogpImage,
            moderation_result: null,
            handle: handle,
            category: null,
            created_at: record.createdAt ? new Date(record.createdAt) : new Date(),
            indexed_at: new Date(),
          },
        })
      );

      const existingLangs = (record.comments ?? []).map((c: CommentLocale) => c.lang);

      // コメントの upsert（個別に moderation）
      for (const c of record.comments ?? []) {
        // コメントの upsert
        //console.log("コメントの upsert")
        await dbLimit(() =>
          prisma.comment.upsert({
            where: {
              bookmark_uri_lang: {
                bookmark_uri: aturi,
                lang: c.lang,
              },
            },
            update: {
              title: c.title,
              comment: c.comment,
              moderation_result: null,
            },
            create: {
              bookmark_uri: aturi,
              lang: c.lang,
              title: c.title,
              comment: c.comment,
              moderation_result: null,
            },
          })
        );
      }

      // record.comments に存在しない言語は削除
      await prisma.comment.deleteMany({
        where: {
          bookmark_uri: aturi,
          NOT: {
            lang: { in: existingLangs },
          },
        },
      });

      async function safeUpsertTag(name: string) {
        try {
          return await dbLimit(() =>
            prisma.tag.upsert({
              where: { name },
              update: {},
              create: { name },
            })
          );
        } catch (err) {
          console.error(`Tag upsert failed for "${name}":`, err);
          return null; // エラーが出た場合は null を返す
        }
      }

      // タグの更新
      let tagsLocal = (record.tags ?? [])
        .filter((name: string) => name && name.trim().length > 0) // 空文字を除外
        .filter((name: string) => name.toLowerCase() !== "verified");

      if (isVerify) tagsLocal.push("Verified");

      // 順番に処理
      const tagRecords: { id: number; name: string }[] = [];
      for (const name of tagsLocal) {
        const tag = await safeUpsertTag(name);
        if (tag) tagRecords.push(tag);
      }

      // null を除外
      const validTagRecords = tagRecords.filter(
        (t): t is NonNullable<typeof t> => t !== null
      );

      // BookmarkTag の更新用
      const oldTags = await prisma.bookmarkTag.findMany({
        where: { bookmark_uri: aturi },
        select: { tag_id: true },
      });
      const oldTagIds = oldTags.map((r: { tag_id: number }) => r.tag_id);

      const newTagIds = validTagRecords.map((t: { id: number }) => t.id);

      // 不要タグ削除
      const removeIds = oldTagIds.filter((id: number) => !newTagIds.includes(id));
      if (removeIds.length > 0) {
        await dbLimit(() =>
          prisma.bookmarkTag.deleteMany({
            where: { bookmark_uri: aturi, tag_id: { in: removeIds } },
          })
        );
      }

      // 新規タグ追加
      const addIds = newTagIds.filter((id: number) => !oldTagIds.includes(id));
      for (const id of addIds) {
        await dbLimit(() =>
          prisma.bookmarkTag.create({ data: { bookmark_uri: aturi, tag_id: id } })
        );
      }

      // analysisQueue にジョブ追加
      analysisQueue.add(async () => {
        try {
          // OGP用のmoderation
          const ogpTexts: string[] = [];
          if (record.ogpTitle) ogpTexts.push(record.ogpTitle);
          if (record.ogpDescription) ogpTexts.push(record.ogpDescription);
          // DID->Handleテーブル
          const ogpFlaggedCategories = await checkModeration(ogpTexts);
          const ogpModerationResult = ogpFlaggedCategories.length > 0 ? ogpFlaggedCategories.join(',') : null;

          // カテゴリー分類
          const mainComment = record.comments?.[0]?.comment || "";
          const category = await classifyCategory(
            record.ogpTitle || "",
            record.ogpDescription || "",
            mainComment,
            record.tags || []
          );

          // Update Bookmark with analysis results
          await dbLimit(() =>
            prisma.bookmark.update({
              where: { uri: aturi },
              data: {
                category: category,
                moderation_result: ogpModerationResult,
              }
            })
          );

          // Comments Moderation
          for (const c of record.comments ?? []) {
            const commentTexts: string[] = [];
            if (c.title) commentTexts.push(c.title);
            if (c.comment) commentTexts.push(c.comment);

            const commentFlaggedCategories = await checkModeration(commentTexts);
            const commentModerationResult = commentFlaggedCategories.length > 0 ? commentFlaggedCategories.join(',') : null;

            await dbLimit(() =>
              prisma.comment.update({
                where: {
                  bookmark_uri_lang: {
                    bookmark_uri: aturi,
                    lang: c.lang
                  }
                },
                data: { moderation_result: commentModerationResult }
              })
            );
          }
          logger.info(`Async analysis complete for ${aturi}: ${category} and Moderation: ${ogpModerationResult}`);

        } catch (err) {
          logger.error(`Async analysis failed for ${aturi}: ${err}`);
        }
      });


      logger.info(`Upserted bookmark (queued for analysis): ${aturi}, Verify: ${isVerify}`);
    } catch (err) {
      logger.error(`Error in upsert: ${err}`);
    }

  }


  async function upsertPost(
    event: CommitCreateEvent<typeof POST_COLLECTION> | CommitUpdateEvent<typeof POST_COLLECTION>
  ) {
    const record = event.commit.record;
    if (!isPostRecord(record)) return;
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;

    try {
      // facets と embed からリンク抽出
      const tags: string[] = [];
      const links: string[] = [];

      if (record.facets) {
        for (const facet of record.facets) {
          if (facet.features) {
            for (const feature of facet.features) {
              if (isTagFeature(feature) && feature.tag) {
                tags.push(feature.tag);
              }
            }
          }
        }
      }


      if (!tags.includes('rito.blue')) {
        return
      }

      tags.splice(tags.indexOf('rito.blue'), 1)

      if (record.via === 'リト' || record.via === 'Rito') return;

      if (record.embed && isEmbedExternal(record.embed) && record.embed.external?.uri) {
        links.push(record.embed.external.uri);
      }

      // 重複・undefined 排除
      const uniqueLinks = Array.from(new Set(links.filter((l): l is string => !!l)));
      if (uniqueLinks.length != 1) return;

      // UserDidHandle upsert
      let handle = 'no handle';

      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await fetch(`https://plc.directory/${event.did}`);
          if (res.ok) {
            const didData = await res.json() as DidDocument;
            handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? handle;
            logger.info(`Handle successed for DID: ${event.did}, handle: ${handle}`);
            break; // 成功したらループを抜ける
          } else {
            logger.warn(`Attempt ${attempt}: plc.directory fetch failed with status ${res.status}`);
          }
        } catch (err) {
          logger.warn(`Attempt ${attempt}: plc.directory fetch error for DID: ${event.did}`);
        }

      }

      if (!handle) {
        logger.warn(`Failed to fetch handle after ${maxAttempts} attempts for DID: ${event.did}`);
        try {
          const userProfile = await publicAgent.get('app.bsky.actor.getProfile', {
            params: { actor: event.did as ActorIdentifier },
          });
          if (userProfile.ok && userProfile.data?.handle) {
            handle = userProfile.data.handle;
          } else {
            logger.error(`Error fetching handle from publicAgent: ${event.did}`);
            return;
          }
        } catch (err) {
          logger.error(`Error fetching handle from publicAgent: ${err}`);
        }
      }

      const exists = await prisma.postToBookmark.findUnique({
        where: { sub: event.did },
        select: { sub: true }, // 必要な情報だけ取得
      });

      if (!exists) {
        // 存在しない場合は処理を中断
        return;
      }

      logger.info(
        `Detect #rito.blue post: ${aturi}, link: ${uniqueLinks[0]}`
      );

      //ドメインチェック
      const urlString = uniqueLinks[0] || '';
      let domain = '';

      try {
        const url = new URL(urlString);
        domain = url.hostname;
      } catch (err) {
        return
      }
      const domainCheck = await fetch(`https://rito.blue/api/checkDomain?domain=${domain}`);
      const domainData = await domainCheck.json() as DomainCheckResult;

      if (domainData.result) {
        logger.warn(`Domain not allowed: ${domain} for post ${aturi}`);
        return;
      }

      let ogpTitle = '';
      let ogpDescription = '';
      let ogImage = '';

      try {
        const ogp = await fetch(`https://rito.blue/api/fetchOgp?url=${encodeURIComponent(urlString)}`);
        const ogpData = await ogp.json() as OgpResult;

        if (ogpData.result?.ogTitle) ogpTitle = ogpData.result.ogTitle;
        if (ogpData.result?.ogDescription) ogpDescription = ogpData.result.ogDescription;
        if (ogpData.result?.ogImage?.[0]?.url) ogImage = ogpData.result.ogImage[0].url;

      } catch (err) {
      }

      // 既に同じURLのブックマークが存在するかチェック（重複作成防止）
      const existingBookmark = await prisma.bookmark.findFirst({
        where: {
          did: event.did,
          subject: uniqueLinks[0],
        },
      });

      if (existingBookmark) {
        logger.info(`Bookmark already exists for ${uniqueLinks[0]} by ${event.did}, skipping...`);
        return;
      }

      // REMOVED await classifyCategory(...)

      const session = await oauthClient.restore(event.did);
      const agent = new Agent(session);
      const rkeyLocal = TID.now();

      function normalizeComment(text: string): string {
        let result = text

        // #tags を削除
        result = result.replace(/#[^\s#]+/g, '')

        // URL / ドメイン（パス付き含む）を根こそぎ削除
        result = result.replace(
          /\bhttps?:\/\/[^\s]+|\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g,
          ''
        )

        // 空白を 1 つに圧縮
        result = result
          // 半角スペース + 全角スペースを 1 つに
          .replace(/[ 　]+/g, ' ')
          // 行頭・行末のスペースだけ除去（改行は残る）
          .replace(/^[ 　]+|[ 　]+$/gm, '')

        return result
      }

      await agent.com.atproto.repo.putRecord({
        repo: event.did, // ここが対象ユーザーの DID
        collection: 'blue.rito.feed.bookmark',
        rkey: rkeyLocal, // レコードキー
        record: {
          subject: uniqueLinks[0],
          createdAt: new Date().toISOString(),
          comments: [
            {
              lang: (exists as PostToBookmarkRecord).lang || 'ja',
              title: ogpTitle,
              comment: normalizeComment(record.text || ''),
            }
          ],
          ogpTitle: ogpTitle,
          ogpDescription: (record.embed && isEmbedExternal(record.embed)) ? record.embed.external?.description || ogpDescription : ogpDescription,
          ogpImage: ogImage,
          tags
        },
      })

      logger.info(
        `Post to bookmark created: ${aturi}, link: ${uniqueLinks[0]}`
      );
    } catch (err) {
      logger.error(`Error in upsertPost for ${aturi}: ${err}`);
    }
  }

  // イベント登録
  // BOOKMARK
  jetstream.onCreate(BOOKMARK, event => queue.add(() => upsertBookmark(event)));
  jetstream.onUpdate(BOOKMARK, event => queue.add(() => upsertBookmark(event)));

  // POST_COLLECTION
  const isLocal = process.env.IS_LOCAL === 'true' || process.env.NODE_ENV !== 'production';
  const isForceEnabled = process.env.ENABLE_POST_COLLECTION === 'true';

  if (!isLocal || isForceEnabled) {
    jetstream.onCreate(POST_COLLECTION, event => queue.add(() => upsertPost(event)));
    jetstream.onUpdate(POST_COLLECTION, event => queue.add(() => upsertPost(event)));
    logger.info(`POST_COLLECTION handlers are ENABLED (isLocal: ${isLocal}, isForceEnabled: ${isForceEnabled})`);
  } else {
    logger.info(`POST_COLLECTION handlers are DISABLED (isLocal: ${isLocal}, isForceEnabled: ${isForceEnabled}). Set ENABLE_POST_COLLECTION=true to force enable.`);
  }

  // SERVICE
  jetstream.onCreate(SERVICE, event => queue.add(() => upsertResolver(event)));
  jetstream.onUpdate(SERVICE, event => queue.add(() => upsertResolver(event)));

  jetstream.onCreate(LIKE, event => queue.add(() => upsertLike(event)));
  jetstream.onUpdate(LIKE, event => queue.add(() => upsertLike(event)));

  // TXT レコード取得関数
  const fetchTxtRecords = async (subDomain: string): Promise<string | null> => {
    try {
      const response = await fetch(`https://dns.google/resolve?name=${subDomain}&type=TXT`);
      const data = await response.json() as DnsResponse;
      if (!data.Answer || data.Answer.length === 0) return null;

      const txtData = data.Answer.map((a: DnsAnswer) => a.data)
        .join("")
        .replace(/^"|"$/g, "")
        .replace(/"/g, "");

      const didMatch = txtData.match(/did:[\w:.]+/);
      return didMatch ? didMatch[0] : null;
    } catch (error) {
      logger.error(`TXTレコードの取得に失敗しました (${subDomain}): ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };


  async function upsertResolver(
    event: CommitCreateEvent<typeof SERVICE> | CommitUpdateEvent<typeof SERVICE>
  ) {
    const record = event.commit.record as BlueRitoServiceSchema.Main;
    const nsid = event.commit.rkey;
    const did = event.did;
    const schema = record.schema || '';
    let verified = false;
    let handle = '';

    if (!nsid || !did) {
      logger.warn(`Missing nsid or did in resolver event: ${JSON.stringify(record)}`);
      return;
    }


    // verified がまだ false なら DNS TXT レコードもチェック
    const parts = nsid.split('.').reverse(); // uk.skyblur.post -> ['post', 'skyblur', 'uk']
    const subDomain = `_lexicon.${parts.slice(1).join('.')}`;
    const foundDid = await fetchTxtRecords(subDomain);

    if (foundDid && foundDid === did) {
      verified = true;
      logger.info(`Verified via DNS TXT: ${subDomain} -> ${foundDid}`);
    }

    if (!verified) {
      try {
        const res = await fetch(`https://plc.directory/${event.did}`);
        if (res.ok) {
          const didData = await res.json() as DidDocument;
          handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? '';
        }

        if (!handle) {
          // まずユーザープロフィールから handle を取得
          const userProfile = await publicAgent.get('app.bsky.actor.getProfile', {
            params: { actor: did as ActorIdentifier },
          });

          if (userProfile.ok && userProfile.data?.handle) {
            handle = userProfile.data.handle;

          }

        }

        const reversedHandle = handle.split('.').reverse().join('.');
        if (handle && nsid.startsWith(reversedHandle)) {
          verified = true;
          logger.info(`Verified handle: ${nsid} matches ${reversedHandle}`);
        } else {
          logger.warn(`Verification failed: ${nsid} does not match ${reversedHandle}`);
        }
      } catch (err) {
        logger.error(`Verification error for ${event.did}: ${err}`);
      }
    }


    try {
      if (verified) {
        const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
        await prisma.resolver.upsert({
          where: { nsid_did: { nsid: nsid, did: did } }, // 複合主キーで検索
          update: {
            schema: schema,
            verified: verified,
            indexed_at: new Date()
          },
          create: {
            nsid: nsid,
            did: did,
            schema: schema,
            verified: verified,
            indexed_at: new Date()
          },
        });
        logger.info(`Upserted resolver: ${nsid} -> ${did}`);
      }
    } catch (err) {
      logger.error(`Error in upsertResolver: ${err}`);
    }
  }

  async function upsertLike(event: CommitCreateEvent<typeof LIKE> | CommitUpdateEvent<typeof LIKE>) {
    const record = event.commit.record as BlueRitoFeedLike.Main;
    const aturi = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;
    const subject = typeof record.subject === 'string' ? record.subject : (record.subject as any).uri;
    const did = event.did;

    try {
      await prisma.like.upsert({
        where: { aturi: aturi },
        update: {
          subject: subject,
          did: did,
          created_at: new Date(record.createdAt),
        },
        create: {
          aturi: aturi,
          subject: subject,
          did: did,
          created_at: new Date(record.createdAt),
        },
      });
      logger.info(`Upserted like: ${aturi}, subject: ${subject}`);
    } catch (err) {
      logger.error(`Error in upsertLike: ${err}`);
    }
  }

  jetstream.start();
}

init();