import { NodeOAuthClient, NodeSavedState, NodeSavedSession } from '@atproto/oauth-client-node'
import { JoseKey } from '@atproto/jwk-jose'
import { prisma } from '@/logic/HandlePrismaClient';
import { SCOPE } from "@/type/OauthConstants";
import crypto from "crypto";

const COOKIE_SECRET = process.env.COOKIE_SECRET || "secret";

// 署名付き DID を検証して返す
export function verifySignedDid(signedDid: string): string | null {
  const index = signedDid.lastIndexOf(".");
  if (index === -1) return null;

  const did = signedDid.slice(0, index);
  const signature = signedDid.slice(index + 1);

  if (!did || !signature) return null;

  const hmac = crypto.createHmac("sha256", COOKIE_SECRET);
  hmac.update(did);
  const expected = hmac.digest("hex");

  return expected === signature ? did : null;
}

const stateStore = {
  async set(key: string, internalState: NodeSavedState): Promise<void> {
    await prisma.nodeOAuthState.upsert({
      where: { key },
      update: { state: JSON.stringify(internalState) },
      create: { key, state: JSON.stringify(internalState) },
    })
  },

  async get(key: string): Promise<NodeSavedState | undefined> {
    const record = await prisma.nodeOAuthState.findUnique({ where: { key } })
    if (!record) return undefined

    try {
      return JSON.parse(record.state) as NodeSavedState
    } catch (err) {
      console.error('Invalid NodeOAuthState JSON:', err)
      return undefined
    }
  },

  async del(key: string): Promise<void> {
    await prisma.nodeOAuthState.delete({ where: { key } }).catch(() => {})
  },
}

const sessionStore = {
  async set(sub: string, session: NodeSavedSession): Promise<void> {
    await prisma.nodeOAuthSession.upsert({
      where: { key: sub },
      update: { session: JSON.stringify(session) },
      create: { key: sub, session: JSON.stringify(session) },
    })
  },

  async get(sub: string): Promise<NodeSavedSession | undefined> {
    const record = await prisma.nodeOAuthSession.findUnique({ where: { key: sub } })
    if (!record) return undefined

    try {
      return JSON.parse(record.session) as NodeSavedSession
    } catch (err) {
      console.error('Invalid NodeOAuthSession JSON:', err)
      return undefined
    }
  },

  async del(sub: string): Promise<void> {
    await prisma.nodeOAuthSession.delete({ where: { key: sub } }).catch(() => {})
  },
}

// まず鍵を読み取って、改行を戻す
const privateKey = process.env.PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!privateKey) {
  throw new Error('PRIVATE_KEY is not defined');
}

// JoseKey を生成
const key1 = await JoseKey.fromImportable(privateKey, 'key1')

export const client = new NodeOAuthClient({
  // This object will be used to build the payload of the /client-metadata.json
  // endpoint metadata, exposing the client metadata to the OAuth server.
  clientMetadata: {
    // Must be a URL that will be exposing this metadata
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

  // Used to authenticate the client to the token endpoint. Will be used to
  // build the jwks object to be exposed on the "jwks_uri" endpoint.
  keyset: [key1],

  // Interface to store authorization state data (during authorization flows)
  stateStore,

  // Interface to store authenticated session data
  sessionStore,

  // A lock to prevent concurrent access to the session store. Optional if only one instance is running.

  requestLock: async (_key, fn) => await fn(),
})