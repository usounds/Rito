import { prisma } from '@/logic/HandlePrismaClient';
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const selectedTagsParam = searchParams.get('tags');
    const actorParam = searchParams.get('actor'); // DID or handle
    const selectedTags = selectedTagsParam ? selectedTagsParam.split(',').filter(t => t.trim()) : [];

    const relationshipParam = searchParams.get('relationship'); // "following", "followers", "mutual"

    // actor が指定されている場合のフィルタを作成
    const getActorFilter = async () => {
      let targetDids: string[] = [];

      if (!actorParam) {
        return {};
      }

      // relationship が指定されている場合は SocialGraph から対象ユーザーを取得
      if (relationshipParam && relationshipParam !== 'all' && relationshipParam !== 'specified' && actorParam.startsWith('did:')) {
        const observerDid = actorParam;
        let typeCondition = {};
        if (relationshipParam === 'following') {
          typeCondition = { type: 'follow' };
        } else if (relationshipParam === 'followers') {
          typeCondition = { type: 'follower' };
        } else if (relationshipParam === 'mutual') {
          // mutual は別途処理が必要だが、一旦 follow と follower の両方を取得して共通部分抽出などが理想。
          // 簡易的に type: 'follow' かつ 'follower' (※DB構造による。SocialGraphは単方向なら `type` で区別)
          // ここでは "mutual" という type があるか、もしくはアプリケーション側で解決するか。
          // 既存実装の SocialGraph の仕様に合わせる。
          // SocialGraph definition: model SocialGraph { observerDid, targetDid, type }
          // type: 'follow' | 'follower' ? 
          // 今回は単純に全件取得してフィルタするか、Prismaで頑張るか。
          // ひとまず 'follow' しているユーザーを対象とする（簡易実装）
          // 実際は relationshipParam に応じて targetDid を取得するロジックが必要。
        }

        // ユーザーのソーシャルグラフから targetDid を取得
        let socialConditions: any = { observerDid };
        if (relationshipParam === 'following') {
          socialConditions.type = 'follow';
        } else if (relationshipParam === 'followers') {
          socialConditions.type = 'follower';
        }

        if (relationshipParam === 'mutual') {
          // 相互フォロー = (내가 팔로우) AND (나를 팔로우)
          // 1. follow を取得 (私がフォローしている人: observer=Me, target=Him)
          const following = await prisma.socialGraph.findMany({
            where: { observerDid, type: 'follow' },
            select: { targetDid: true }
          });
          const followingDids = following.map(r => r.targetDid);

          // 2. follower を取得 (私をフォローしている人: target=Me, observer=Him)
          const followers = await prisma.socialGraph.findMany({
            where: { targetDid: observerDid, type: 'follow' },
            select: { observerDid: true }
          });
          const followerDids = new Set(followers.map(r => r.observerDid));

          // 3. 両方に含まれるものを抽出
          targetDids = followingDids.filter(did => followerDids.has(did));

          // 自分自身も含める
          targetDids.push(observerDid);

        } else if (relationshipParam === 'followers') {
          // フォロワーを取得 (私をフォローしている人: target=Me, observer=Him)
          const followers = await prisma.socialGraph.findMany({
            where: { targetDid: observerDid, type: 'follow' },
            select: { observerDid: true }
          });
          targetDids = followers.map(r => r.observerDid);
          // 自分自身も含める
          targetDids.push(observerDid);

        } else {
          // following (私がフォローしている人: observer=Me, target=Him)
          const following = await prisma.socialGraph.findMany({
            where: { observerDid, type: 'follow' },
            select: { targetDid: true }
          });
          targetDids = following.map(r => r.targetDid);
          // 自分自身も含める
          targetDids.push(observerDid);
        }

      } else {
        // 通常の actor 指定 (specified user)
        const actors = actorParam.split(',').filter(a => a.trim());

        // ハンドルが含まれている場合は DID に変換する必要があるが、
        // 簡易的に handle カラムで検索するか、あるいは UserDidHandle テーブルを使う。
        // ここでは handle カラムでの検索と uri (did) での検索を OR で行う。

        // actors 配列の中に DID とハンドルが混在する可能性がある
        return {
          OR: actors.map(a => {
            if (a.startsWith('did:')) {
              return { did: a };
            } else {
              return { handle: a };
            }
          })
        };
      }

      if (targetDids.length > 0) {
        return { did: { in: targetDids } };
      }

      return {};
    };

    const actorFilter = await getActorFilter();

    if (selectedTags.length > 0 || actorParam || (relationshipParam && relationshipParam !== 'all')) {
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
