import dns from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

const MAX_URL_LENGTH = 2048;
const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

export class SafeRemoteHtmlError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SafeRemoteHtmlError';
  }
}

function isBlockedIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0];
  if (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff') ||
    normalized.startsWith('2001:db8:')
  ) {
    return true;
  }

  const ipv4Mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return ipv4Mapped ? isBlockedIpv4(ipv4Mapped) : false;
}

export function isPublicIpAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return !isBlockedIpv4(address);
  if (family === 6) return !isBlockedIpv6(address);
  return false;
}

function parseRemoteUrl(rawUrl: string): URL {
  if (rawUrl.length > MAX_URL_LENGTH) {
    throw new SafeRemoteHtmlError('URL is too long', 400);
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeRemoteHtmlError('Invalid URL', 400);
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new SafeRemoteHtmlError('URL is not allowed', 400);
  }

  return url;
}

async function resolvePublicAddress(url: URL): Promise<{ address: string; family: 4 | 6 }> {
  const hostname = url.hostname.startsWith('[') && url.hostname.endsWith(']')
    ? url.hostname.slice(1, -1)
    : url.hostname;
  const literalFamily = net.isIP(hostname);
  if (literalFamily) {
    if (!isPublicIpAddress(hostname)) {
      throw new SafeRemoteHtmlError('Destination is not allowed', 403);
    }
    return { address: hostname, family: literalFamily as 4 | 6 };
  }

  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SafeRemoteHtmlError('Destination could not be resolved', 502);
  }

  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new SafeRemoteHtmlError('Destination is not allowed', 403);
  }

  const selected = addresses[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

function requestHtml(url: URL, pinned: { address: string; family: 4 | 6 }): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(
      url,
      {
        method: 'GET',
        headers: {
          accept: 'text/html,application/xhtml+xml;q=0.9',
          'user-agent': 'Rito OGP Fetcher/1.0',
        },
        lookup: (_hostname, _options, callback) => {
          callback(null, pinned.address, pinned.family);
        },
      },
      (res) => {
        const declaredLength = Number(res.headers['content-length'] || 0);
        if (declaredLength > MAX_HTML_BYTES) {
          res.destroy();
          reject(new SafeRemoteHtmlError('Remote response is too large', 413));
          return;
        }

        const chunks: Buffer[] = [];
        let receivedBytes = 0;
        res.on('data', (chunk: Buffer) => {
          receivedBytes += chunk.length;
          if (receivedBytes > MAX_HTML_BYTES) {
            res.destroy(new SafeRemoteHtmlError('Remote response is too large', 413));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 502,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
        res.on('error', reject);
      },
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new SafeRemoteHtmlError('Remote request timed out', 504));
    });
    req.on('error', reject);
    req.end();
  });
}

export async function fetchSafeRemoteHtml(
  rawUrl: string,
  redirectCount = 0,
): Promise<{ html: string; finalUrl: string }> {
  const url = parseRemoteUrl(rawUrl);
  const pinned = await resolvePublicAddress(url);
  const response = await requestHtml(url, pinned);

  if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
    if (redirectCount >= MAX_REDIRECTS) {
      throw new SafeRemoteHtmlError('Too many redirects', 502);
    }
    const location = response.headers.location;
    if (!location) {
      throw new SafeRemoteHtmlError('Invalid redirect response', 502);
    }
    return fetchSafeRemoteHtml(new URL(location, url).toString(), redirectCount + 1);
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new SafeRemoteHtmlError('Remote server returned an error', 502);
  }

  const contentType = String(response.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('text/html') && !contentType.startsWith('application/xhtml+xml')) {
    throw new SafeRemoteHtmlError('Remote response is not HTML', 415);
  }

  return {
    html: response.body.toString('utf8'),
    finalUrl: url.toString(),
  };
}
