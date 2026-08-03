import { WebSocketServer } from 'ws';
import http from 'node:http';

const port = Number(process.env.MOCK_JETSTREAM_PORT ?? 8080);
const apiPort = Number(process.env.MOCK_API_PORT ?? 8081);
const unrelatedCount = Number(process.env.UNRELATED_POST_COUNT ?? 20_000);
const testDid = 'did:plc:ewvi7nxzyoun6zhxrhs64oiz';
const server = new WebSocketServer({ port });
let chatCompletionCount = 0;
const apiServer = http.createServer(async (request, response) => {
  response.setHeader('content-type', 'application/json');

  if (request.url === '/v1/moderations') {
    response.end(JSON.stringify({
      id: 'modr-e2e',
      model: 'omni-moderation-latest',
      results: [{ flagged: false, categories: {} }],
    }));
    return;
  }

  if (request.url === '/v1/chat/completions') {
    const category = chatCompletionCount % 3 === 1 ? 'photo' : 'technology';
    chatCompletionCount += 1;
    response.end(JSON.stringify({
      id: 'chatcmpl-e2e',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-5-nano',
      choices: [{ index: 0, message: { role: 'assistant', content: category }, finish_reason: 'stop' }],
    }));
    return;
  }

  if (request.url?.startsWith('/api/checkDomain?')) {
    response.end(JSON.stringify({ result: false }));
    return;
  }

  if (request.url?.startsWith('/api/fetchOgp?')) {
    response.end(JSON.stringify({
      result: {
        ogTitle: 'OAuth E2E',
        ogDescription: 'Created through the production OAuth path',
        ogImage: [{ url: 'https://example.com/e2e.png' }],
      },
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
      cid: 'bafyreie2etestcid',
    }));
    return;
  }

  response.statusCode = 404;
  response.end(JSON.stringify({ error: 'not found' }));
});

function commitEvent({ index, collection, operation = 'create', record, rkey = `e2e-${index}` }) {
  return {
    did: testDid,
    time_us: Date.now() * 1000 + index,
    kind: 'commit',
    commit: {
      rev: `3e2e${index}`,
      operation,
      collection,
      rkey,
      ...(record === undefined ? {} : { record }),
    },
  };
}

server.on('connection', (socket) => {
  let index = 0;
  const send = (event) => {
    socket.send(JSON.stringify(commitEvent({ index, ...event })));
    index += 1;
  };

  for (let index = 0; index < unrelatedCount; index += 1) {
    socket.send(JSON.stringify(commitEvent({
      index,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        createdAt: new Date().toISOString(),
        text: `unrelated post ${index}`,
        facets: [],
      },
    })));
  }

  index = unrelatedCount;

  const candidateRecord = {
    $type: 'app.bsky.feed.post',
    createdAt: new Date().toISOString(),
    text: '#rito.blue https://example.com/e2e',
    facets: [{
      features: [{
        $type: 'app.bsky.richtext.facet#tag',
        tag: 'rito.blue',
      }],
    }],
    embed: {
      $type: 'app.bsky.embed.external',
      external: {
        uri: 'https://example.com/e2e',
        title: 'E2E',
        description: 'Docker image E2E candidate',
      },
    },
  };

  send({
    collection: 'app.bsky.feed.post',
    record: { ...candidateRecord, facets: [] },
    rkey: 'filtered-missing-tag',
  });
  send({
    collection: 'app.bsky.feed.post',
    record: { ...candidateRecord, via: 'Rito' },
    rkey: 'filtered-via-rito',
  });
  send({
    collection: 'app.bsky.feed.post',
    record: { ...candidateRecord, embed: undefined },
    rkey: 'filtered-missing-embed',
  });
  send({
    collection: 'app.bsky.feed.post',
    record: { ...candidateRecord, $type: 'blue.rito.feed.bookmark' },
    rkey: 'filtered-wrong-type',
  });

  send({
    collection: 'app.bsky.feed.post',
    record: candidateRecord,
    rkey: 'candidate-create',
  });
  send({
    collection: 'app.bsky.feed.post',
    operation: 'update',
    record: { ...candidateRecord, text: '#rito.blue updated' },
    rkey: 'candidate-update',
  });
  send({
    collection: 'app.bsky.feed.post',
    operation: 'delete',
    rkey: 'seeded-post',
  });

  const likeRecord = {
    $type: 'blue.rito.feed.like',
    subject: 'https://example.com/e2e',
    createdAt: new Date().toISOString(),
  };
  send({ collection: 'blue.rito.feed.like', record: likeRecord, rkey: 'like-lifecycle' });
  send({ collection: 'blue.rito.feed.like', operation: 'update', record: likeRecord, rkey: 'like-lifecycle' });
  send({ collection: 'blue.rito.feed.like', operation: 'delete', rkey: 'like-lifecycle' });

  const resolverRecord = {
    $type: 'blue.rito.service.schema',
    schema: '{"lexicon":1}',
  };
  send({ collection: 'blue.rito.service.schema', record: resolverRecord, rkey: 'blue.rito.e2e' });
  send({ collection: 'blue.rito.service.schema', operation: 'update', record: resolverRecord, rkey: 'blue.rito.e2e' });
  send({ collection: 'blue.rito.service.schema', operation: 'delete', rkey: 'blue.rito.e2e' });

  const bookmarkRecord = {
    $type: 'blue.rito.feed.bookmark',
    subject: 'https://example.com/bookmark',
    createdAt: new Date().toISOString(),
    comments: [{ lang: 'en', title: 'E2E', comment: 'Docker image coverage' }],
    ogpTitle: 'E2E bookmark',
    ogpDescription: 'Docker image coverage',
    tags: ['e2e'],
  };
  send({ collection: 'blue.rito.feed.bookmark', record: bookmarkRecord, rkey: 'seeded-bookmark' });
  send({
    collection: 'blue.rito.feed.bookmark',
    operation: 'update',
    record: { ...bookmarkRecord, tags: ['e2e', 'updated'] },
    rkey: 'seeded-bookmark',
  });
  send({ collection: 'blue.rito.feed.bookmark', operation: 'delete', rkey: 'seeded-bookmark' });

  console.log(JSON.stringify({
    event: 'mock-events-sent',
    unrelatedCount,
    filteredBranchCount: 4,
    relevantPostCount: 2,
    lifecycleEventCount: 10,
  }));
});

console.log(JSON.stringify({ event: 'mock-jetstream-listening', port }));
apiServer.listen(apiPort, () => {
  console.log(JSON.stringify({ event: 'mock-openai-listening', apiPort }));
});
