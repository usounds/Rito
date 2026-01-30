import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    try {
        console.log('[ProxyImage] Fetching:', url);
        const response = await fetch(url);
        if (!response.ok) {
            console.error('[ProxyImage] Fetch failed:', response.status);
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const arrayBuffer = await response.arrayBuffer();
        console.log('[ProxyImage] Success, size:', arrayBuffer.byteLength, 'type:', contentType);

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400'
            }
        });

    } catch (err) {
        console.error('[ProxyImage] Error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
