import { ClientMetadata } from '@atcute/oauth-browser-client';

export const getClientMetadata: () => ClientMetadata = () => {
    return {
        client_id: `${process.env.NEXT_PUBLIC_URL}/api/client-metadata.json`,
        client_name: "Rito",
        redirect_uris: [`${process.env.NEXT_PUBLIC_URL}/callback`],
        client_uri: `${process.env.NEXT_PUBLIC_URL}/`,
        scope: "atproto transition:generic",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        policy_uri: `${process.env.NEXT_PUBLIC_URL}/privacypolicy`,
        tos_uri: `${process.env.NEXT_PUBLIC_URL}/termofuse`,
        logo_uri: "https://cdn.bsky.app/img/avatar/plain/did:plc:xnkb4hzxcuqbvwk5np7awf2u/bafkreifux5z3qbsrj3q62xrv7dy4s7qf7qvs3lezclnbridxd32ladwqfe@jpeg",
        dpop_bound_access_tokens: true,
    }
};
