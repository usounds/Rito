
import * as didJWT from 'did-jwt';
import { DIDDocument, DIDResolver, Resolver, ResolverRegistry } from 'did-resolver';
import { getResolver as getWebResolver } from 'web-did-resolver';

export function getResolver() {
    async function resolve(
        did: string
    ): Promise<DIDDocument> {
        const encodedDid = encodeURIComponent(did);
        const didUrl = `https://plc.directory/${encodedDid}`;
        const response = await fetch(didUrl);
        const didDoc = await response.json() as DIDDocument
        return didDoc
    }

    return { DidPlcResolver: resolve }
}

const myResolver = getResolver()
const web = getWebResolver()
const resolver: ResolverRegistry = {
    'plc': myResolver.DidPlcResolver as unknown as DIDResolver,
    'web': web.web as unknown as DIDResolver,
}
export const resolverInstance = new Resolver(resolver)
export type Service = {
    id: string;
    type: string;
    serviceEndpoint:
    | string
    | Record<string, unknown>
    | Array<Record<string, unknown>>;
};

export const verifyJWT = async (auth: string, audience: string) => {
    const authorization = auth.replace('Bearer ', '').trim()
    const decodedJWT = authorization.replace('Bearer ', '').trim()

    const result = await didJWT.verifyJWT(decodedJWT, {
        resolver: resolverInstance,
        audience: audience
    })

    return result



}

export const fetchDiDDocument = async (did: string) => {
    try {
        const didDocument = await resolverInstance.resolve(did)
        return didDocument
    } catch (error) {
        console.error('Error fetching service endpoint:', error);
    }


};

export const fetchServiceEndpoint = async (did: string) => {
    try {
        const response = await fetchDiDDocument(did);
        if (!response) {
            throw new Error('Invalid DID document response');
        }

        const didDocument = response as unknown as DIDDocument;

        // didDocument.serviceが存在するかチェック
        const service = didDocument.service?.find(
            s => s.id === '#atproto_pds'
        );

        if (service && service.serviceEndpoint) {
            return service.serviceEndpoint;
        } else {
            throw new Error('Service with id #atproto_pds not found or no service endpoint available');
        }
    } catch (error) {
        console.error('Error fetching service endpoint:', error);
    }
};


export const getSubFromJWT = (jwtToken: string): string => {
    try {
        // "DPoP ..." プレフィックスを除去
        const token = jwtToken.replace(/^DPoP\s+/i, '').trim()

        const parts = token.split('.')
        if (parts.length !== 3) return ''

        const payloadB64 = parts[1]
        const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf-8')
        const payload = JSON.parse(payloadJson)
        return payload.sub || ''
    } catch (err) {
        console.error('JWT decode error:', err)
        return ''
    }
}
