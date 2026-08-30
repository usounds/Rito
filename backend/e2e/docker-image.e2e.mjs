import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = `${process.pid}-${Date.now()}`;
const image = process.env.BACKEND_E2E_IMAGE ?? 'rito-backend:e2e';
const network = `rito-backend-e2e-${runId}`;
const postgres = `rito-backend-e2e-postgres-${runId}`;
const mock = `rito-backend-e2e-jetstream-${runId}`;
const backend = `rito-backend-e2e-app-${runId}`;
const databaseName = 'rito_e2e';
const databaseUser = 'rito_e2e';
const databasePassword = 'rito_e2e_password';
const testDid = 'did:plc:ewvi7nxzyoun6zhxrhs64oiz';
const memoryLimitBytes = 384 * 1024 * 1024;
const minimumBackendFunctionCoverage = 95;
const coverageScriptSuffixes = [
  '/dist/index.js',
  '/dist/handlers/bookmark.js',
  '/dist/handlers/like.js',
  '/dist/handlers/post.js',
  '/dist/handlers/resolver.js',
  '/dist/runtime/queues.js',
  '/dist/services/contentAnalysis.js',
];
const coverageDir = mkdtempSync(path.join(os.tmpdir(), 'rito-backend-e2e-coverage-'));

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: backendDir,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });

  if (!options.allowFailure && result.status !== 0) {
    throw new Error([
      `Command failed: ${command} ${args.join(' ')}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }

  return result;
}

function docker(...args) {
  return runCommand('docker', args);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Unable to allocate a PostgreSQL port'));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

async function waitFor(check, description, timeoutMilliseconds = 30_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

function removeResources() {
  runCommand('docker', ['rm', '-f', backend, mock, postgres], { allowFailure: true });
  runCommand('docker', ['network', 'rm', network], { allowFailure: true });
}

function readFunctionCoverage(directory, expectedSourceLengths) {
  const scripts = [];
  const matchingScripts = [];

  for (const filename of readdirSync(directory).filter((name) => name.endsWith('.json'))) {
    const coverage = JSON.parse(readFileSync(path.join(directory, filename), 'utf8'));
    for (const script of coverage.result ?? []) {
      const scriptSuffix = coverageScriptSuffixes.find((suffix) => script.url.endsWith(suffix));
      if (!scriptSuffix) continue;
      matchingScripts.push({
        scriptId: script.scriptId,
        scriptSuffix,
        functionCount: script.functions.length,
        maxOffset: Math.max(0, ...script.functions.flatMap((entry) => entry.ranges.map((range) => range.endOffset))),
      });
      scripts.push({ script, scriptSuffix });
    }
  }

  const applicationScripts = scripts.filter(({ script, scriptSuffix }) => {
    const maxOffset = Math.max(0, ...script.functions.flatMap((entry) => entry.ranges.map((range) => range.endOffset)));
    return maxOffset === expectedSourceLengths[scriptSuffix];
  });
  const functions = new Map();
  for (const { script, scriptSuffix } of applicationScripts) {
    for (const entry of script.functions) {
        const rootRange = entry.ranges[0];
        if (!rootRange) continue;
        const key = `${scriptSuffix}:${rootRange.startOffset}:${rootRange.endOffset}`;
        const previous = functions.get(key);
        functions.set(key, {
          covered: (previous?.covered ?? false) || rootRange.count > 0,
          name: entry.functionName || '<anonymous>',
          scriptSuffix,
          startOffset: rootRange.startOffset,
        });
    }
  }

  if (functions.size === 0) {
    throw new Error(`No V8 function coverage matched backend application modules`);
  }

  const covered = [...functions.values()].filter((entry) => entry.covered).length;
  if (process.env.BACKEND_E2E_REPORT_UNCOVERED === '1') {
    const uncoveredFunctions = [...functions.values()]
      .filter((entry) => !entry.covered)
      .map(({ name, scriptSuffix, startOffset }) => ({ name, scriptSuffix, startOffset }));
    console.error(JSON.stringify({ matchingScripts, uncoveredFunctions }, null, 2));
  }
  return {
    covered,
    total: functions.size,
    percent: Math.round((covered / functions.size) * 1000) / 10,
  };
}

const postgresPort = await getFreePort();
const hostDatabaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${postgresPort}/${databaseName}`;
const containerDatabaseUrl = `postgresql://${databaseUser}:${databasePassword}@${postgres}:5432/${databaseName}`;
const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const oauthPrivateJwk = JSON.stringify(privateKey.export({ format: 'jwk' }));
const oauthIssuer = 'http://localhost:8082';
const mockApiBaseUrl = 'http://oauth-e2e:8081';
const dpopJwk = {
  ...privateKey.export({ format: 'jwk' }),
  alg: 'ES256',
  use: 'sig',
  kid: 'e2e-dpop',
};
const savedOAuthSession = JSON.stringify({
  dpopJwk,
  authMethod: { method: 'private_key_jwt', kid: 'key1' },
  tokenSet: {
    iss: oauthIssuer,
    aud: oauthIssuer,
    sub: testDid,
    scope: 'atproto include:blue.rito.permissionSet repo:app.bsky.feed.post',
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'DPoP',
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  },
}).replaceAll("'", "''");

try {
  if (process.env.BACKEND_E2E_SKIP_BUILD !== '1') {
    docker('build', '-t', image, '.');
  }

  const expectedSourceLengths = JSON.parse(docker(
    'run', '--rm', image, 'node', '-e',
    `const fs=require('node:fs');const suffixes=${JSON.stringify(coverageScriptSuffixes)};process.stdout.write(JSON.stringify(Object.fromEntries(suffixes.map(suffix=>[suffix,fs.readFileSync('/app'+suffix,'utf8').length]))))`,
  ).stdout);
  if (coverageScriptSuffixes.some((suffix) => !Number.isInteger(expectedSourceLengths[suffix]) || expectedSourceLengths[suffix] <= 0)) {
    throw new Error(`Unable to read backend application source lengths from ${image}`);
  }

  docker('network', 'create', network);
  docker(
    'run', '-d', '--name', postgres,
    '--network', network,
    '--tmpfs', '/var/lib/postgresql/data:rw,noexec,nosuid,size=256m',
    '-p', `127.0.0.1:${postgresPort}:5432`,
    '-e', `POSTGRES_DB=${databaseName}`,
    '-e', `POSTGRES_USER=${databaseUser}`,
    '-e', `POSTGRES_PASSWORD=${databasePassword}`,
    'postgres:17-alpine',
  );

  await waitFor(() => {
    const result = runCommand('docker', [
      'exec', postgres,
      'pg_isready', '-U', databaseUser, '-d', databaseName,
    ], { allowFailure: true });
    return result.status === 0;
  }, 'PostgreSQL readiness');

  runCommand('pnpm', ['exec', 'prisma', 'db', 'push'], {
    env: { ...process.env, DATABASE_URL: hostDatabaseUrl },
  });

  docker(
    'exec', postgres,
    'psql', '-U', databaseUser, '-d', databaseName, '-v', 'ON_ERROR_STOP=1', '-c',
    `INSERT INTO "UserDidHandle" ("did", "handle") VALUES ('${testDid}', 'e2e.invalid');
     INSERT INTO "Bookmark" ("uri", "did", "subject") VALUES ('at://${testDid}/blue.rito.feed.bookmark/seeded-bookmark', '${testDid}', 'https://example.com/bookmark');
     INSERT INTO "Comment" ("bookmark_uri", "lang", "title", "comment") VALUES ('at://${testDid}/blue.rito.feed.bookmark/seeded-bookmark', 'en', 'Seeded E2E', 'Coverage seed');
     INSERT INTO "Tag" ("name") VALUES ('seeded');
     INSERT INTO "BookmarkTag" ("bookmark_uri", "tag_id") SELECT 'at://${testDid}/blue.rito.feed.bookmark/seeded-bookmark', "id" FROM "Tag" WHERE "name" = 'seeded';
     INSERT INTO "Post" ("uri", "did", "text", "lang") VALUES ('at://${testDid}/app.bsky.feed.post/seeded-post', '${testDid}', 'seeded', ARRAY['en']);
     INSERT INTO "PostUri" ("postUri", "uri") VALUES ('at://${testDid}/app.bsky.feed.post/seeded-post', 'https://example.com/post');
     INSERT INTO "PostToBookmark" ("sub", "lang") VALUES ('${testDid}', 'en');
     INSERT INTO "NodeOAuthSession" ("key", "session") VALUES ('${testDid}', '${savedOAuthSession}');`,
  );

  const mockScript = path.join(backendDir, 'e2e', 'mock-jetstream.mjs');
  const coverageShutdownScript = path.join(backendDir, 'e2e', 'v8-coverage-shutdown.cjs');
  docker(
    'run', '-d', '--name', mock,
    '--network', network,
    '--network-alias', 'oauth-e2e',
    '-e', 'UNRELATED_POST_COUNT=20000',
    '--mount', `type=bind,source=${mockScript},target=/app/mock-jetstream.mjs,readonly`,
    image,
    'node', '/app/mock-jetstream.mjs',
  );

  await waitFor(() => {
    const logs = docker('logs', mock).stdout;
    return logs.includes('mock-jetstream-listening') && logs.includes('mock-openai-listening');
  }, 'mock Jetstream and OpenAI readiness');

  docker(
    'run', '-d', '--name', backend,
    '--network', network,
    '--memory', '512m',
    '--mount', `type=bind,source=${coverageDir},target=/coverage`,
    '--mount', `type=bind,source=${coverageShutdownScript},target=/e2e/v8-coverage-shutdown.cjs,readonly`,
    '--add-host', 'plc.directory:127.0.0.1',
    '--add-host', 'public.api.bsky.app:127.0.0.1',
    '--add-host', 'api.openai.com:127.0.0.1',
    '--add-host', 'rito.blue:127.0.0.1',
    '--add-host', 'dns.google:127.0.0.1',
    '--add-host', 'e2e.invalid:127.0.0.1',
    '-e', `DATABASE_URL=${containerDatabaseUrl}`,
    '-e', `JETSREAM_URL=ws://${mock}:8080/subscribe`,
    '-e', 'CURSOR_UPDATE_INTERVAL=5000',
    '-e', 'OPENAI_API_KEY=e2e-not-used',
    '-e', `OPENAI_BASE_URL=http://${mock}:8081/v1`,
    '-e', 'E2E_OAUTH_MOCK_PORT=8082',
    '-e', 'OAUTH_ALLOW_HTTP=true',
    '-e', `OAUTH_PRIVATE_JWK=${oauthPrivateJwk}`,
    '-e', `RITO_API_BASE_URL=${mockApiBaseUrl}`,
    '-e', 'NEXT_PUBLIC_URL=https://e2e.invalid',
    '-e', 'LOG_LEVEL=info',
    '-e', 'NODE_V8_COVERAGE=/coverage',
    image,
    'node', '--require', '/e2e/v8-coverage-shutdown.cjs', 'dist/index.js',
  );

  const bookmarkUri = `at://${testDid}/blue.rito.feed.bookmark/seeded-bookmark`;
  const postUri = `at://${testDid}/app.bsky.feed.post/seeded-post`;
  await waitFor(() => {
    const logs = docker('logs', backend).stdout;
    return logs.includes('"event":"mock-oauth-pds-listening"')
      && logs.includes(`Deleted bookmark: ${bookmarkUri}`)
      && logs.includes(`Deleted post: ${postUri} (1 records)`)
      && logs.includes(`Post to bookmark created: at://${testDid}/app.bsky.feed.post/candidate-post`)
      && logs.includes(`Deleted like: at://${testDid}/blue.rito.feed.like/like-lifecycle`)
      && logs.includes(`Deleted resolver: blue.rito.e2e -> ${testDid}`)
      && logs.includes(`Verified via DNS TXT: _lexicon.rito.blue -> ${testDid}`)
      && logs.includes(`Upserted resolver: blue.rito.e2e -> ${testDid}`)
      && logs.includes(`Async analysis complete for ${bookmarkUri}: technology and Moderation: null`)
      && logs.includes('Jetstream error: record validation failed for app.bsky.feed.post')
      && logs.includes('Cursor updated to:');
  }, 'create, update, and delete event processing');

  const inspection = JSON.parse(docker('inspect', backend).stdout)[0];
  if (!inspection.State.Running) {
    throw new Error(`Backend stopped unexpectedly: ${inspection.State.Error || inspection.State.Status}`);
  }

  const logs = docker('logs', backend).stdout;
  if (logs.includes('queue reached')) {
    throw new Error(`Queue saturation was detected:\n${logs}`);
  }

  const memoryBytes = Number(docker(
    'exec', backend, 'cat', '/sys/fs/cgroup/memory.current',
  ).stdout.trim());
  if (!Number.isFinite(memoryBytes) || memoryBytes >= memoryLimitBytes) {
    throw new Error(`Backend memory ${memoryBytes} bytes exceeded the E2E limit ${memoryLimitBytes} bytes`);
  }

  const databaseCounts = docker(
    'exec', postgres,
    'psql', '-U', databaseUser, '-d', databaseName, '-At', '-c',
    'SELECT (SELECT count(*) FROM "Bookmark"), (SELECT count(*) FROM "Post"), (SELECT count(*) FROM "PostUri"), (SELECT count(*) FROM "Like"), (SELECT count(*) FROM "resolver");',
  ).stdout.trim();
  if (databaseCounts !== '0|0|0|0|0') {
    throw new Error(`Unexpected database mutations: ${databaseCounts}`);
  }

  const mockLogs = docker('logs', mock).stdout;
  if (!mockLogs.includes('"unrelatedCount":20000')
    || !mockLogs.includes('"filteredBranchCount":4')
    || !mockLogs.includes('"malformedFacetCount":3')
    || !mockLogs.includes('"malformedRecordCount":1')
    || !mockLogs.includes('"relevantPostCount":2')
    || !mockLogs.includes('"lifecycleEventCount":10')) {
    throw new Error(`Mock Jetstream did not send the expected events:\n${mockLogs}`);
  }

  const putRecords = logs
    .split('\n')
    .filter((line) => line.includes('"event":"mock-put-record"'))
    .map((line) => JSON.parse(line));
  if (putRecords.length !== 2) {
    throw new Error(`Expected two OAuth putRecord calls, received ${putRecords.length}:\n${mockLogs}`);
  }
  const uniqueBookmarkRkeys = new Set(putRecords.map(({ body }) => body.rkey));
  if (uniqueBookmarkRkeys.size !== 1 || !uniqueBookmarkRkeys.has('candidate-post')) {
    throw new Error(`Repeated post updates targeted different bookmark rkeys: ${JSON.stringify([...uniqueBookmarkRkeys])}`);
  }
  for (const [index, putRecord] of putRecords.entries()) {
    const { body } = putRecord;
    if (!putRecord.authorization?.startsWith('DPoP e2e-access-token')
      || putRecord.hasDpopProof !== true
      || body.repo !== testDid
      || body.collection !== 'blue.rito.feed.bookmark'
      || body.record?.subject !== 'https://example.com/e2e'
      || body.record?.comments?.[0]?.lang !== 'en'
      || body.record?.comments?.[0]?.comment !== (index === 0 ? '' : 'updated')
      || body.record?.ogpTitle !== 'OAuth E2E'
      || body.record?.ogpDescription !== 'Docker image E2E candidate'
      || body.record?.ogpImage !== 'https://example.com/e2e.png'
      || !Array.isArray(body.record?.tags)
      || body.record.tags.length !== 0) {
      throw new Error(`Unexpected OAuth putRecord payload: ${JSON.stringify(putRecord)}`);
    }
  }

  docker('stop', '--time', '10', backend);
  const backendFunctionCoverage = readFunctionCoverage(coverageDir, expectedSourceLengths);
  if (backendFunctionCoverage.percent < minimumBackendFunctionCoverage) {
    throw new Error(`Backend function coverage ${backendFunctionCoverage.percent}% is below ${minimumBackendFunctionCoverage}%`);
  }

  console.log(JSON.stringify({
    status: 'passed',
    image,
    unrelatedPostsFiltered: 20_000,
    filteredPostBranches: 4,
    malformedFacetsFiltered: 3,
    malformedRecordsRejected: 1,
    relevantPostsQueued: 2,
    lifecycleEventsProcessed: 10,
    oauthPutRecordsVerified: putRecords.length,
    uniqueBookmarkRkeys: uniqueBookmarkRkeys.size,
    databaseCounts,
    memoryMiB: Math.round((memoryBytes / 1024 / 1024) * 10) / 10,
    queueSaturationDetected: false,
    backendFunctionCoverage,
  }, null, 2));
} catch (error) {
  const backendLogs = runCommand('docker', ['logs', backend], { allowFailure: true });
  const mockLogs = runCommand('docker', ['logs', mock], { allowFailure: true });
  const postgresLogs = runCommand('docker', ['logs', postgres], { allowFailure: true });
  console.error('Backend logs:\n', backendLogs.stdout || backendLogs.stderr);
  console.error('Mock Jetstream logs:\n', mockLogs.stdout || mockLogs.stderr);
  console.error('PostgreSQL logs:\n', postgresLogs.stdout || postgresLogs.stderr);
  throw error;
} finally {
  removeResources();
  rmSync(coverageDir, { recursive: true, force: true });
}
