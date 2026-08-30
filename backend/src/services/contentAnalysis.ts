import OpenAI from 'openai';
import logger from '../logger.js';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CLASSIFY_SYSTEM_PROMPT = `あなたはウェブコンテンツを自動分類する専門AIです。

## タスク
与えられたコンテンツ情報を分析し、最も適切なカテゴリーIDを1つだけ返してください。

## 判定基準の優先順位
1. タイトルと説明（ウェブサイトのOGP情報）を最優先
2. タグ情報を補助的に使用
3. コメントは参考程度

## カテゴリーID一覧
- general: 一般的なニュース、速報、特定のカテゴリに当てはまらない話題
- atprotocol: atproto, ATProtocol, AT Protocol, Bluesky, Atmosphere, Fediverse, 分散型SNS関連の技術や話題
- social: ニュース、社会問題、時事、事件、政治、経済、ビジネス、金融
- technology: プログラミング、ガジェット、IT、AI、ハードウェア
- lifestyle: 日常生活、家事、育児、健康、教育、学び、雑学（※風景や写真作品は含まない）
- food: 料理、グルメ、レシピ、飲食店
- travel: 旅行、観光、地域情報、お出かけ（※風景や写真作品は含まない）
- entertainment: 映画、音楽、芸能、ドラマ、お笑い、ネタ、ユーモア
- anime_game: アニメ、マンガ、ゲーム、声優、VTuber
- photo: 写真、風景、絶景、アート、デザイン、建築、イラスト

## 出力ルール
- 上記のカテゴリーIDのいずれか1つのみを返すこと
- 余計な説明、記号、改行は一切含めないこと
- 複数カテゴリーに該当する場合は、最も主要なものを1つ選ぶこと
- 【重要】コメントが「～へ行った」「～をした」という旅行記や日記の体裁であっても、投稿のメインコンテンツが明らかな風景・植物・自然などの写真であれば 'travel' や 'lifestyle' ではなく 'photo' を優先してください
- 【重要】タグに「atmosphere」「atproto」「atprotocol」のいずれかが含まれる場合は、他の要素に関わらず優先的に 'atprotocol' カテゴリーに分類してください
- 判断に迷う場合は "general" を返すこと`;

const VALID_CATEGORIES = [
  'general',
  'atprotocol',
  'social',
  'technology',
  'lifestyle',
  'food',
  'travel',
  'entertainment',
  'anime_game',
  'photo',
];

export async function checkModeration(texts: string[]): Promise<string[]> {
  try {
    const response = await client.moderations.create({
      model: 'omni-moderation-latest',
      input: texts,
    });
    const flaggedCategories = new Set<string>();

    response.results.forEach((result: OpenAI.Moderation) => {
      for (const [category, value] of Object.entries(result.categories)) {
        if (value) flaggedCategories.add(category);
      }
    });

    return Array.from(flaggedCategories);
  } catch (error) {
    logger.error(`Moderation error: ${error}`);
    throw error;
  }
}

export async function classifyCategory(
  title: string,
  description: string,
  comment: string,
  tags: string[],
): Promise<string | null> {
  try {
    const userPrompt = `タイトル: ${title}
説明: ${description}
タグ: ${tags.join(', ')}
コメント: ${comment}`;
    const promises = Array.from({ length: 3 }).map(() =>
      client.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    );
    const responses = await Promise.all(promises);
    const categories = responses
      .map((response: OpenAI.Chat.ChatCompletion) => response.choices[0]?.message?.content?.trim().toLowerCase())
      .filter((category: string | undefined): category is string =>
        !!category && VALID_CATEGORIES.includes(category),
      );

    if (categories.length === 0) return 'general';

    const counts = categories.reduce<Record<string, number>>((result, category) => {
      result[category] = (result[category] || 0) + 1;
      return result;
    }, {});
    return Object.keys(counts).reduce((left, right) => counts[left] > counts[right] ? left : right);
  } catch (error) {
    logger.error(`Classification error: ${error}`);
    return null;
  }
}
