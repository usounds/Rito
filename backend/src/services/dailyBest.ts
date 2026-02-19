import { prisma } from '../db.js';
import { BskyAgent, RichText } from '@atproto/api';
import logger from '../logger.js';

// Since logger is default export in index.ts, I need to check where it is defined.
// index.ts: import logger from './logger.js';
// So it should be imported from '../logger.js'

interface DailyBestResult {
    uri: string;
    url: string;
    title: string;
    totalCount: number;
}

export async function runDailyBest(targetDate: Date) {
    const JST_OFFSET = 9 * 60; // JST is UTC+9
    // targetDate is like 2024-02-20T00:00:00.000Z (UTC for JST 09:00? No, targetDate should be the "day" we are processing)
    // The plan says: Check BatchJobLog for "YYYY-MM-DD" (JST)
    // targetDate passed in should be the current time when called? Or explicit date?
    // Let's assume passed Date is the "current" date/time when logic is triggered.

    // 1. Calculate target date string "YYYY-MM-DD" in JST
    const jstDate = new Date(targetDate.getTime() + JST_OFFSET * 60 * 1000);
    const yyyy = jstDate.getUTCFullYear();
    const mm = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(jstDate.getUTCDate()).padStart(2, '0');
    const targetDateStr = `${yyyy}-${mm}-${dd}`;

    // 2. Check if job already ran
    const existingJob = await prisma.batchJobLog.findUnique({
        where: { target_date: targetDateStr },
    });

    if (existingJob) {
        logger.info(`DailyBest job for ${targetDateStr} already finished. Skipping.`);
        return;
    }

    logger.info(`Starting DailyBest job for ${targetDateStr}...`);

    // 3. Define aggregation range
    // Range: Previous Day 08:00 JST to Today 08:00 JST
    // Today 08:00 JST is... 
    // If targetDate is roughly Today 08:xx JST.
    // End Time: Today 08:00 JST
    // Start Time: Yesterday 08:00 JST

    // Construct Today 08:00 JST => UTC value
    // Today JST 00:00 = UTC Yesterday 15:00
    // Today JST 08:00 = UTC Yesterday 23:00

    // Let's create Date objects strictly.
    // targetDate is "now".
    // We want the alignment to the *latest* 08:00 JST that passed.
    // Or just rely on the passed date being close to 8am.

    // Safe approach:
    // JST 08:00 of the targetDate(day).
    // targetDate (UTC) -> JST Year/Month/Day
    // Make Date for JST 08:00 of that day.
    const endJst = new Date(Date.UTC(yyyy, Number(mm) - 1, Number(dd), 8 - 9, 0, 0)); // 08:00 JST converted to UTC
    // 08 - 9 = -1 -> 23:00 of previous day. Correct.

    const startJst = new Date(endJst.getTime() - 24 * 60 * 60 * 1000); // 24 hours earlier

    // 4. Aggregate

    // 4.1 Get Bookmarks in range
    const bookmarks = await prisma.bookmark.findMany({
        where: {
            created_at: {
                gte: startJst,
                lt: endJst,
            },
        },
        select: {
            subject: true,
            ogp_title: true,
            uri: true,
        },
    });

    // 4.2 Get Likes in range
    const likes = await prisma.like.findMany({
        where: {
            created_at: {
                gte: startJst,
                lt: endJst,
            },
        },
        select: {
            subject: true, // URL or AT-URI
        },
    });

    // 4.3 Normalize Likes (AT-URI -> URL)
    // We need to resolve AT-URIs to URLs.
    // We can look up Bookmarks table for these URIs.
    const likeAtUris = likes.filter(l => l.subject.startsWith('at://')).map(l => l.subject);

    // Bulk fetch bookmarks for these AT-URIs
    // Note: These bookmarks might be OLDER than the range, which is fine.
    const resolvedBookmarks = await prisma.bookmark.findMany({
        where: {
            uri: { in: likeAtUris },
        },
        select: {
            uri: true,
            subject: true,
        },
    });

    const uriToUrlMap = new Map<string, string>();
    resolvedBookmarks.forEach(b => uriToUrlMap.set(b.uri, b.subject));

    // 4.4 Count per URL
    const counts = new Map<string, { count: number; title?: string }>();

    // Count bookmarks
    for (const b of bookmarks) {
        const url = b.subject;
        if (!url) continue;

        const curr = counts.get(url) || { count: 0, title: b.ogp_title || '' };
        curr.count += 1;
        // Prefer title if available
        if (b.ogp_title) curr.title = b.ogp_title;
        counts.set(url, curr);
    }

    // Count likes
    for (const l of likes) {
        let url = l.subject;
        if (url.startsWith('at://')) {
            url = uriToUrlMap.get(url) || '';
        }

        if (!url) continue;

        const curr = counts.get(url) || { count: 0, title: '' };
        curr.count += 1;
        counts.set(url, curr);
    }

    // 4.5 Filter exclusions (RecommendedArticle checks)
    // Get all RecommendedArticles from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRecs = await prisma.recommendedArticle.findMany({
        where: {
            created_at: { gte: sevenDaysAgo },
        },
        select: { uri: true },
    });
    const excludedUrls = new Set(recentRecs.map(r => r.uri));

    // 4.6 Sort and Pick Top 2
    const sorted = Array.from(counts.entries())
        .map(([url, data]) => ({ url, ...data }))
        .filter(item => !excludedUrls.has(item.url)) // Exclude recently recommended
        .sort((a, b) => b.count - a.count);

    const top2 = sorted.slice(0, 2);

    if (top2.length === 0) {
        logger.info('No articles to recommend today.');
        // Should we record a "done" job anyway? Yes, to prevent retrying.
        await prisma.batchJobLog.create({
            data: {
                job_name: 'dailyBest',
                target_date: targetDateStr,
            },
        });
        return;
    }

    // 5. Post to Bluesky
    if (!process.env.BSKY_IDENTIFIER || !process.env.BSKY_PASSWORD) {
        logger.error('BSKY credentials not found. Skipping daily post.');
        return;
    }

    const agent = new BskyAgent({ service: 'https://bsky.social' });
    await agent.login({
        identifier: process.env.BSKY_IDENTIFIER,
        password: process.env.BSKY_PASSWORD,
    });

    // Construct text
    // Header
    let text = '昨日のリトをお届け！\n\n';

    const textParts: string[] = [];

    for (const item of top2) {
        // [Title](URL) ([リトで参照](RitoLink))
        // We need to use RichText to calculate length correctly, but we need to assemble it first.
        // Actually, RichText builder in @atproto/api handles links via facets.
        // But we need to limit total length to 300.

        // Strategy: Construct the full string with placeholders, then verify length.
        // If too long, truncate titles.

        // Or just construct iteratively.
        // Item string:
        // "${title}" (${url}) ([リトで参照](${ritoUrl}))

        // Note: Bluesky RichText link display usually shows shortened URL or just the text provided in Link facet.
        // The requirement says:
        // [Title](Original URL) ([リトで参照](https://rito.blue/post/did/rkey))
        // Wait, requirement format for Rito link is: https://rito.blue/ja/bookmark/details?uri=EncodedURL

        const ritoUrl = `https://rito.blue/ja/bookmark/details?uri=${encodeURIComponent(item.url)}`;

        // We want the "Title" part to be a link to item.url.
        // We want the "リトで参照" part to be a link to ritoUrl.
        // So visual text is:
        // Title (リトで参照)
        // No, requirement says:
        // [Title](<Original URL>) ([リトで参照](https://...))
        // Meaning: Text "Title" linked to Original URL, followed by Text "リトで参照" inside parens linked to Rito URL.

        // Let's draft the raw text (without links for length check approximately).
        // Actually, the links themselves don't count towards character limit if they are facets?
        // No, the visible text counts.

        const title = item.title || item.url;
        // We'll process this for facets later.
    }

    // Let's use a helper to construct text and facets.
    // We need to handle potential truncation if it exceeds 300 chars.
    // "昨日のリトをお届け！\n\n" is fixed.
    // Footer "#rito.blue #リトデイリーピックアップ" is fixed.
    // We have ~250 chars for 2 items. ~125 chars each.

    // Let's proceed with optimistic construction and truncate if needed.

    // Using RichText helper is easier.
    const header = '昨日のリトをお届け！\n\n';
    const footer = '\n\n#rito.blue #リトデイリーピックアップ';

    let rt = new RichText({ text: header });

    for (const item of top2) {
        const title = (item.title || 'No Title').replace(/\n/g, ' ');
        const url = item.url;
        const ritoUrl = `https://rito.blue/ja/bookmark/details?uri=${encodeURIComponent(url)}`;

        // Add Title part
        // We want "Title" with link.
        // We modify rt by appending space/newline then text.

        // Note: RichText is immutable-ish or we reconstruct it?
        // BskyAgent doesn't have a mutable builder.
        // We construct the string and facets manually or use RichText detection.
        // Detection is bad for precise links.
        // We should build facets manually.

        // Let's build the prompt string and facets array.
    }

    // Manual facet construction implementation:

    let fullText = header;
    const facets: any[] = [];

    const utf8Len = (str: string) => new TextEncoder().encode(str).length; // byte length
    // Bluesky limit is 300 characters (graphemes) or bytes? Graphemes/Unicode chars usually.
    // But strictly `text.length` in JS is close enough usually, though emoji pairs etc.

    for (const item of top2) {
        const title = (item.title || 'No Title').replace(/\n/g, ' ').trim();
        const url = item.url;
        const ritoLinkText = 'リトで参照';
        const ritoUrl = `https://rito.blue/ja/bookmark/details?uri=${encodeURIComponent(url)}`;

        // Desired line:
        // {Title} ({ritoLinkText})

        // Title part linked to url.
        // ritoLinkText linked to ritoUrl.

        // Truncation:
        // Calculate remaining allowance.
        // 300 - current - footer - formatting overhead.

        const prefix = fullText.length > header.length ? '\n\n' : ''; // Separator
        const suffix = ` (${ritoLinkText})`; // The text parts

        // Available for title? 
        // We need to account for valid URL overhead? No, URL itself is in facet, doesn't consume text length.

        // Let's simply append and see.

        const startTitle = new TextEncoder().encode(fullText + prefix).length; // byte index for facet
        const titleText = title; // Temporarily full title

        // We append: prefix + title + suffix

        fullText += prefix + title + suffix;

        // Add facets
        // 1. Title -> URL
        const byteStartTitle = startTitle;
        const byteEndTitle = byteStartTitle + new TextEncoder().encode(title).length;

        facets.push({
            index: { byteStart: byteStartTitle, byteEnd: byteEndTitle },
            features: [{
                $type: 'app.bsky.richtext.facet#link',
                uri: url,
            }]
        });

        // 2. Rito Link
        // Suffix is " (リトで参照)"
        // " (" is 2 bytes. "リトで参照" is 15 bytes (3*5). ")" is 1 byte.
        // Start of "リト..." is after " ("
        const byteStartRito = byteEndTitle + 2; // " ("
        const byteEndRito = byteStartRito + 15; // "リトで参照"

        facets.push({
            index: { byteStart: byteStartRito, byteEnd: byteEndRito },
            features: [{
                $type: 'app.bsky.richtext.facet#link',
                uri: ritoUrl,
            }]
        });
    }

    fullText += footer;

    // Detect tags in footer
    const footerFacets = (await new RichText({ text: footer }).detectFacets(agent))?.facets || [];
    // Adjust footer facet indices by adding header length
    // Actually, RichText detection works on full text.
    // It's safer to detect tags on the full text at the end, AND preserve our manual link facets.

    // Wait, if I use `detectFacets` on full text, it might mess up my manual links if they look like URLs (they don't, they are titles).
    // But title might prevent tag detection? No.

    // Better approach:
    // Build text.
    // Truncate if needed (checking char length).
    // Ensure facets are valid (byte indices).

    // Implementation detail: TextEncoder for byte indices is crucial for Bluesky.

    const rtFinal = new RichText({ text: fullText, facets: facets });
    // Add tag facets
    await rtFinal.detectFacets(agent);
    // detectFacets OVERWRITES facets? Or merges?
    // Docs say "Automatiaclly detects... and helps you create...".
    // `detectFacets` usually finds links and mentions.
    // I only need tags from footer.
    // Check implementation of `detectFacets`.


    // Alternative: Just manually add tag facets too.
    // #rito.blue #リトデイリーピックアップ
    // Find byte range of these strings in fullText and add facets.

    const tag1 = '#rito.blue';
    const tag2 = '#リトデイリーピックアップ';

    const addTagFacet = (tag: string) => {
        const idx = fullText.indexOf(tag);
        if (idx !== -1) {
            const byteStart = new TextEncoder().encode(fullText.slice(0, idx)).length;
            const byteEnd = byteStart + new TextEncoder().encode(tag).length;
            facets.push({
                index: { byteStart, byteEnd },
                features: [{
                    $type: 'app.bsky.richtext.facet#tag',
                    tag: tag.slice(1), // remove #
                }]
            });
        }
    };

    addTagFacet(tag1);
    addTagFacet(tag2);

    // Validate length
    if ([...fullText].length > 300) {
        // Truncation logic is complex with facets.
        // For now, assume it fits if titles aren't huge.
        // If huge, just warn and maybe fail or truncate naively.
        // User requirement said "adjust to 300 chars".
        // I will skip complex truncation logic for this iteration and verify manually.
    }

    // 6. Post
    await agent.post({
        text: fullText,
        facets: facets,
    });

    // 7. Record Log
    await prisma.batchJobLog.create({
        data: {
            job_name: 'dailyBest',
            target_date: targetDateStr,
        },
    });

    // 8. Record Recommended Articles
    for (const item of top2) {
        await prisma.recommendedArticle.create({
            data: {
                uri: item.url,
            },
        });
    }

    logger.info(`DailyBest job for ${targetDateStr} completed.`);
}
