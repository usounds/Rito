// HandleOauthClientNode.ts
import { NodeOAuthClient, NodeSavedState, NodeSavedSession } from '@atproto/oauth-client-node'
import { JoseKey } from '@atproto/jwk-jose'
import { prisma } from '@/logic/HandlePrismaClient'
import { SCOPE } from "@/type/OauthConstants"
import crypto from "crypto"
import { LRUCache } from 'lru-cache';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-node';

const COOKIE_SECRET = process.env.COOKIE_SECRET || "secret"

interface CachedAgent {
  agent: Agent;
  session: OAuthSession;
}

const agentCache = new LRUCache<string, CachedAgent>({
  max: 100,               // 最大100ユーザーまで
  ttl: 1000 * 60 * 30,    // 30分で自動破棄
});

export async function getAgent(did: string, client: NodeOAuthClient): Promise<CachedAgent> {
  // キャッシュ済みなら即返す
  const cached = agentCache.get(did);
  if (cached) return cached;

  // restore して Agent を作る
  const session: OAuthSession = await client.restore(did);
  const agent = new Agent(session);

  const newCache: CachedAgent = { agent, session };
  agentCache.set(did, newCache);

  return newCache;
}

export function verifySignedDid(signedDid: string): string | null {
  const index = signedDid.lastIndexOf(".")
  if (index === -1) return null

  const did = signedDid.slice(0, index)
  const signature = signedDid.slice(index + 1)

  if (!did || !signature) return null

  const hmac = crypto.createHmac("sha256", COOKIE_SECRET)
  hmac.update(did)
  const expected = hmac.digest("hex")

  return expected === signature ? did : null
}

export async function getOAuthClient() {
const key1 = await JoseKey.fromImportable(process.env.OAUTH_PRIVATE_JWK||'', 'key1')

  const stateStore = {
    async set(key: string, internalState: NodeSavedState) {
      await prisma.nodeOAuthState.upsert({
        where: { key },
        update: { state: JSON.stringify(internalState) },
        create: { key, state: JSON.stringify(internalState) },
      })
    },
    async get(key: string) {
      const record = await prisma.nodeOAuthState.findUnique({ where: { key } })
      if (!record) return undefined
      try {
        return JSON.parse(record.state) as NodeSavedState
      } catch {
        return undefined
      }
    },
    async del(key: string) {
      await prisma.nodeOAuthState.delete({ where: { key } }).catch(() => {})
    },
  }

  const sessionStore = {
    async set(sub: string, session: NodeSavedSession) {
      await prisma.nodeOAuthSession.upsert({
        where: { key: sub },
        update: { session: JSON.stringify(session) },
        create: { key: sub, session: JSON.stringify(session) },
      })
    },
    async get(sub: string) {
      const record = await prisma.nodeOAuthSession.findUnique({ where: { key: sub } })
      if (!record) return undefined
      try {
        return JSON.parse(record.session) as NodeSavedSession
      } catch {
        return undefined
      }
    },
    async del(sub: string) {
      await prisma.nodeOAuthSession.delete({ where: { key: sub } }).catch(() => {})
    },
  }

  return new NodeOAuthClient({
    clientMetadata: {
      client_id: `${process.env.NEXT_PUBLIC_URL}/api/client-metadata.json`,
      client_name: 'Rito',
      client_uri: `${process.env.NEXT_PUBLIC_URL}`,
      logo_uri: `${process.env.NEXT_PUBLIC_URL}/favicon.ico`,
      tos_uri: `${process.env.NEXT_PUBLIC_URL}/tos`,
      policy_uri: `${process.env.NEXT_PUBLIC_URL}/privacy`,
      redirect_uris: [`${process.env.NEXT_PUBLIC_URL}/api/oauth/callback`],
      grant_types: ['authorization_code', 'refresh_token'],
      scope: SCOPE.join(" "),
      response_types: ['code'],
      application_type: 'web',
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: 'RS256',
      dpop_bound_access_tokens: true,
      jwks_uri: `${process.env.NEXT_PUBLIC_URL}/api/jwks.json`,
    },
    keyset: [key1],
    stateStore,
    sessionStore,
    requestLock: async (_key, fn) => await fn(),
  })
}
