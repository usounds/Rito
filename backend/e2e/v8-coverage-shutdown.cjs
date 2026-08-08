/* eslint-disable no-console */
const v8 = require('node:v8');
const http = require('node:http');

const oauthMockPort = Number(process.env.E2E_OAUTH_MOCK_PORT ?? 0);
if (oauthMockPort > 0) {
  const issuer = `http://localhost:${oauthMockPort}`;
  const server = http.createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');
    response.setHeader('x-content-type-options', 'nosniff');

    if (request.url === '/.well-known/oauth-authorization-server') {
      response.end(JSON.stringify({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        token_endpoint_auth_methods_supported: ['private_key_jwt'],
        token_endpoint_auth_signing_alg_values_supported: ['ES256'],
        dpop_signing_alg_values_supported: ['ES256'],
        client_id_metadata_document_supported: true,
      }));
      return;
    }

    if (request.method === 'POST' && request.url === '/xrpc/com.atproto.repo.putRecord') {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      console.log(JSON.stringify({
        event: 'mock-put-record',
        authorization: request.headers.authorization,
        hasDpopProof: typeof request.headers.dpop === 'string',
        body,
      }));
      response.end(JSON.stringify({
        uri: `at://${body.repo}/${body.collection}/${body.rkey}`,
        cid: 'bafyreiclp443lavogvhj3d2ob2cxbfuscni2k5jk7bebjzg7khl3esabwq',
      }));
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ error: 'not found' }));
  });

  server.on('error', (err) => {
    console.error('Mock OAuth server error:', err);
  });

  server.listen(oauthMockPort, '127.0.0.1', () => {
    console.log(JSON.stringify({ event: 'mock-oauth-pds-listening', oauthMockPort }));
  });
}

process.once('SIGTERM', () => {
  v8.takeCoverage();
  process.exit(0);
});

