
import RichtextBuilder from '@atcute/bluesky-richtext-builder';
import { Messages } from 'next-intl';
import { detectAll } from 'tinyld';

const MAX_TEXT_LENGTH = 300;

export function buildPost(
    activeComment: string | undefined,
    tags: string[],
    messages: Messages
) {
    const builder = new RichtextBuilder();

    // ホワイトスペースを含むタグは除外
    let validTags = tags.filter(tag => !/\s/.test(tag));

    // rito.blue が含まれていなければ追加
    if (!validTags.includes("rito.blue")) {
        validTags = [...validTags, "rito.blue"];
    }

    // タグ分の文字数を計算（# + タグ文字 + 半角スペース）
    const tagsLength = validTags.reduce((sum, tag) => {
        return sum + 1 + tag.length + 1; // # + tag.length + 半角スペース
    }, 0);

    // text部分を短くして addText
    const baseText = activeComment || messages.create.inform.bookmark;
    builder.addText(baseText.slice(0, MAX_TEXT_LENGTH - tagsLength));

    // タグを追加（全てのタグの前に半角スペース）
    validTags.forEach(tag => {
        builder.addText(" "); // 半角スペースを挿入
        builder.addTag(tag);
    });

    return {
        $type: "app.bsky.feed.post",
        text: builder.text,
        facets: builder.facets,
        createdAt: new Date().toISOString(),
        via: messages.title,
        langs: detectTopLanguages(baseText)||[],
    };
}

/**
 * テキストの言語を検知し、上位2件（または1件）を返す
 * @param text 判定対象の文字列
 * @returns 言語コード配列（例: ['ja', 'en']）
 */
export function detectTopLanguages(text: string): string[] {
  // detectAllで候補を取得
  const results = detectAll(text);

  if (!results || results.length === 0) {
    return [];
  }

  // accuracy順にソート（念のため）
  const sorted = results.sort((a, b) => b.accuracy - a.accuracy);

  // 上位2件を取得（候補が1件なら1件のみ）
  const topLanguages = sorted.slice(0, 2).map(r => r.lang);

  return topLanguages;
}