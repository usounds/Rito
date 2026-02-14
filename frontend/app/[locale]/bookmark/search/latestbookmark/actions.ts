'use server';

import { fetchBookmarks, BookmarkQuery } from './data';
import { cookies } from "next/headers";
import { verifySignedDid } from "@/logic/HandleOauthClientNode";

export async function fetchBookmarksAction(query: BookmarkQuery) {
    const cookieStore = await cookies();
    const signedDid = cookieStore.get("USER_DID")?.value;
    const did = signedDid ? verifySignedDid(signedDid) : undefined;

    // Override userDid with verified DID to prevent spoofing
    const safeQuery = { ...query, userDid: did || undefined };

    return await fetchBookmarks(safeQuery);
}
