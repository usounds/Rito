import 'dotenv/config';
import { prisma } from '../db.js';
import OpenAI from "openai";
import pLimit from "p-limit";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const dbLimit = pLimit(5);

/**
 * ブックマークのタイトル、説明、コメント、タグからカテゴリーを分類する (index.ts から移植)
 */
async function classifyCategory(title: string, description: string, comment: string, tags: string[]): Promise<string | null> {
    try {
        const prompt = `与えられたコンテンツを、以下のリストの中から最も適切なカテゴリーに分類してください。
特に「タイトル」と「説明」（ウェブサイトのOGP情報）の内容を最優先の判定基準としてください。
カテゴリーの「識別子（ID）」のみを文字列として返してください。余計な説明は一切不要です。

カテゴリーIDリスト:
- general: 一般的なニュース、速報、特定のカテゴリに当てはまらない話題。
- atprotocol: AT Protocol, Bluesky, Fediverse, 分散型SNS関連の技術や話題。
- social: 社会問題、時事、事件、政治、経済、ビジネス、金融。
- technology: プログラミング、ガジェット、IT、AI、ハードウェア。
- lifestyle: 暮らし、家事、育児、健康、教育、学び、雑学。
- food: 料理、グルメ、レシピ、飲食店。
- travel: 旅行、観光、地域情報、お出かけ。
- entertainment: 映画、音楽、芸能、ドラマ、お笑い、ネタ、ユーモア。
- anime_game: アニメ、マンガ、ゲーム、声優、VTuber。

コンテンツ:
タイトル: ${title}
説明: ${description}
タグ: ${tags.join(', ')}
コメント: ${comment}`;

        const response = await client.chat.completions.create({
            model: "gpt-5-nano",
            messages: [
                { role: "system", content: "あなたはコンテンツ分類の専門家です。カテゴリーIDのみを返してください。" },
                { role: "user", content: prompt }
            ],
        });

        const category = response.choices[0]?.message?.content?.trim().toLowerCase();
        const validCategories = [
            "general", "atprotocol", "social", "technology", "lifestyle", "food", "travel", "entertainment", "anime_game"
        ];

        if (category && validCategories.includes(category)) {
            return category;
        }
        return "general";
    } catch (error) {
        console.error(`Classification error: ${error}`);
        return null;
    }
}

async function main() {
    console.log("Starting backfill for re-classification...");

    // humor, lifestyle, entertainment, technology のブックマークを再分類対象とする
    // あるいは category が null のものも対象とする
    const bookmarks = await prisma.bookmark.findMany({
        where: {
            OR: [
                { category: null },
                { category: { in: ['lifestyle', 'entertainment', 'humor', 'technology'] } }
            ]
        },
        include: {
            comments: true,
            tags: { include: { tag: true } },
        },
    });

    console.log(`Found ${bookmarks.length} bookmarks with null category.`);

    for (let i = 0; i < bookmarks.length; i++) {
        const b = bookmarks[i];
        console.log(`[${i + 1}/${bookmarks.length}] Classifying: ${b.ogp_title || b.subject}`);

        const mainComment = b.comments?.[0]?.comment || "";
        const tags = b.tags.map(t => t.tag.name);
        const category = await classifyCategory(
            b.ogp_title || "",
            b.ogp_description || "",
            mainComment,
            tags
        );

        if (category) {
            await prisma.bookmark.update({
                where: { uri: b.uri },
                data: { category },
            });
            console.log(`  -> Classified as: ${category}`);
        } else {
            console.warn(`  -> Failed to classify.`);
        }
    }

    console.log("Backfill completed.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
