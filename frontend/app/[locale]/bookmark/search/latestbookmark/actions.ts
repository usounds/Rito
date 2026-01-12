'use server';

import { fetchBookmarks, BookmarkQuery } from './data';

export async function fetchBookmarksAction(query: BookmarkQuery) {
    return await fetchBookmarks(query);
}
