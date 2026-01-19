import { prisma } from '@/logic/HandlePrismaClient';
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const selectedTagsParam = searchParams.get('tags');
    const actorParam = searchParams.get('actor'); // DID or handle
    const selectedTags = selectedTagsParam ? selectedTagsParam.split(',').filter(t => t.trim()) : [];

    // actor が指定されている場合のベースフィルタを作成
    const getActorFilter = () => {
      if (!actorParam) return {};
      // DID か handle かを判定
      if (actorParam.startsWith('did:')) {
        // DID から handle を取得する必要がある場合は uri で検索
        return { uri: { startsWith: `at://${actorParam}/` } };
      } else {
        // handle の場合
        return { handle: actorParam };
      }
    };
    const actorFilter = getActorFilter();

    if (selectedTags.length > 0 || actorParam) {
      // 選択されたタグをすべて持つブックマークのURIを取得
      const whereCondition: Record<string, unknown> = { ...actorFilter };

      if (selectedTags.length > 0) {
        whereCondition.AND = selectedTags.map(tagName => ({
          tags: {
            some: {
              tag: { name: tagName }
            }
          }
        }));
      }

      const bookmarksWithAllTags = await prisma.bookmark.findMany({
        where: whereCondition,
        select: { uri: true }
      });

      const bookmarkUris = bookmarksWithAllTags.map(b => b.uri);

      if (bookmarkUris.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      // それらのブックマークに付いているタグを集計
      const tagCounts = await prisma.bookmarkTag.groupBy({
        by: ['tag_id'],
        _count: { tag_id: true },
        where: {
          bookmark_uri: { in: bookmarkUris }
        }
      });

      // tag_id から名前を取得
      const tagIds = tagCounts.map(tc => tc.tag_id);
      const tags = await prisma.tag.findMany({
        where: { id: { in: tagIds } }
      });
      const tagIdToName = new Map(tags.map(t => [t.id, t.name]));

      const tagsWithCount = tagCounts
        .map(tc => ({
          tag: tagIdToName.get(tc.tag_id) ?? '',
          count: tc._count.tag_id,
        }))
        .filter(t => t.tag !== '' && !selectedTags.includes(t.tag))
        .sort((a, b) => b.count - a.count);

      return NextResponse.json(tagsWithCount, {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // 選択タグがない場合は従来の処理（直近80件から取得）
    const recentBookmarks = await prisma.bookmark.findMany({
      orderBy: { indexed_at: 'desc' },
      take: 80,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const tagNamesSet = new Set<string>();
    for (const bookmark of recentBookmarks) {
      for (const bt of bookmark.tags) {
        tagNamesSet.add(bt.tag.name);
      }
    }
    const tagNames = Array.from(tagNamesSet);

    const tagCounts = await prisma.bookmarkTag.groupBy({
      by: ['tag_id'],
      _count: { tag_id: true },
      where: {
        tag: { name: { in: tagNames } },
      },
    });

    const tagIdToName = new Map<number, string>();
    for (const bookmark of recentBookmarks) {
      for (const bt of bookmark.tags) {
        tagIdToName.set(bt.tag.id, bt.tag.name);
      }
    }

    const tagsWithCount = tagCounts
      .map(tc => ({
        tag: tagIdToName.get(tc.tag_id) ?? '',
        count: tc._count.tag_id,
      }))
      .filter(t => t.tag !== '')
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(tagsWithCount, {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    console.error("Error fetching tags:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
