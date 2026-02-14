import { InfiniteBookmarkList } from '@/components/InfiniteBookmarkList';
import { fetchBookmarks } from './data';

type PageProps = {
  params: { locale: string };
  searchParams?: {
    sort?: 'created' | 'updated';
    tag?: string[];
    handle?: string[];
    page?: string;
    comment?: string; // コメント優先フラグ
    relationship?: string;
    userDid?: string;
  };
};

export async function LatestBookmark({ params, searchParams }: PageProps) {
  const locale = params.locale;
  const query = searchParams ?? {};

  const page = query.page ? parseInt(query.page) : 1;
  const bookmarkQuery = {
    ...query,
    page,
    tag: query.tag,
    handle: query.handle,
    sort: query.sort as 'created' | 'updated',
    relationship: query.relationship as 'following' | 'followers' | 'mutual' | undefined,
    userDid: query.userDid,
  };

  const result = await fetchBookmarks(bookmarkQuery);

  return (
    <InfiniteBookmarkList
      initialItems={result.items}
      initialHasMore={result.hasMore}
      query={bookmarkQuery}
      locale={locale}
    />
  );
}
