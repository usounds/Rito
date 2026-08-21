// frontend/app/api/fetchOgp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import ogs from 'open-graph-scraper';
import { fetchSafeRemoteHtml, SafeRemoteHtmlError } from '@/logic/safeRemoteHtml';
import { verifySignedDid } from '@/logic/HandleOauthClientNode';

function normalizeRemoteUrl(value: string, baseUrl: string): string | undefined {
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const signedDid = request.cookies.get('USER_DID')?.value;
  if (!signedDid || !verifySignedDid(signedDid)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
  }

  try {
    const { html, finalUrl } = await fetchSafeRemoteHtml(url);
    const data = await ogs({
      html,
    });

    if (data.result) {
      if (data.result.ogTitle) data.result.ogTitle = data.result.ogTitle.slice(0, 255);
      if (data.result.ogDescription) data.result.ogDescription = data.result.ogDescription.slice(0, 255);
      if (Array.isArray(data.result.ogImage)) {
        data.result.ogImage = data.result.ogImage
          .map((image) => {
            const normalizedUrl = image.url ? normalizeRemoteUrl(image.url, finalUrl) : undefined;
            return normalizedUrl ? { ...image, url: normalizedUrl } : null;
          })
          .filter((image): image is NonNullable<typeof image> => image !== null);
      }
    }

    return NextResponse.json(
      { result: data.result },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    const status = err instanceof SafeRemoteHtmlError ? err.status : 500;
    return NextResponse.json(
      { error: 'OGP fetch failed' },
      { status, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
