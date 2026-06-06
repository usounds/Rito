import { NextResponse } from 'next/server';
import dns from 'dns';

function isPrivateIp(ip: string): boolean {
    if (ip.startsWith('127.') || ip.startsWith('10.') || ip === '0.0.0.0') {
        return true;
    }
    if (ip.startsWith('172.')) {
        const parts = ip.split('.').map(Number);
        if (parts[1] >= 16 && parts[1] <= 31) {
            return true;
        }
    }
    if (ip.startsWith('192.168.')) {
        return true;
    }
    if (ip.startsWith('169.254.')) {
        return true;
    }
    const ipv6 = ip.toLowerCase();
    if (
        ipv6 === '::1' || 
        ipv6 === '0:0:0:0:0:0:0:1' || 
        ipv6.startsWith('fe80:') || 
        ipv6.startsWith('fc00:') || 
        ipv6.startsWith('fd00:')
    ) {
        return true;
    }
    return false;
}

async function isSafeUrl(urlStr: string): Promise<boolean> {
    try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return false;
        }
        const hostname = parsed.hostname;
        if (!hostname) {
            return false;
        }
        const isLocalOrPrivate = 
            hostname === 'localhost' ||
            hostname === 'localhost.localdomain' ||
            /^127\./.test(hostname) ||
            /^10\./.test(hostname) ||
            /^192\.168\./.test(hostname) ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
            /^169\.254\./.test(hostname) ||
            /^0\./.test(hostname) ||
            hostname === '::1';

        if (isLocalOrPrivate) {
            return false;
        }

        const ip = await new Promise<string | null>((resolve) => {
            dns.lookup(hostname, (err, address) => {
                if (err) resolve(null);
                else resolve(address);
            });
        });

        if (!ip) {
            return false;
        }
        if (isPrivateIp(ip)) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    const safe = await isSafeUrl(url);
    if (!safe) {
        return NextResponse.json({ error: 'Forbidden URL' }, { status: 403 });
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
