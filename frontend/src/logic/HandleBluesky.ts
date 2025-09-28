
import RichtextBuilder from '@atcute/bluesky-richtext-builder';
import { Messages } from 'next-intl';
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
        via: messages.title
    };
}
