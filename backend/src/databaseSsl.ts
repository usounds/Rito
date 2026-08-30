import { isIP } from 'node:net';

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  return first === 10
    || first === 127
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

export function shouldUseDatabaseSsl(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) return false;

  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch {
    return true;
  }

  if (
    hostname === 'localhost'
    || hostname === '::1'
    || hostname === '0.0.0.0'
    || hostname === 'host.docker.internal'
    || hostname.endsWith('.docker.internal')
    || !hostname.includes('.')
  ) {
    return false;
  }

  if (isIP(hostname) === 4 && isPrivateIpv4(hostname)) {
    return false;
  }

  return true;
}
