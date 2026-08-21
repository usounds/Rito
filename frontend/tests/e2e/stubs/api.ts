import { Page } from '@playwright/test';

export async function setupApiStubs(page: Page) {
  // アニメーションを無効化し、通知・Affixを非表示にするCSSを永続注入
  await page.addInitScript(() => {
    const css = `
      *, *::before, *::after {
        transition-property: none !important;
        transform: none !important;
        animation: none !important;
        transition-duration: 0s !important;
      }
      .mantine-Notifications-root,
      .mantine-Affix-root {
        display: none !important;
      }
    `;
    const style = document.createElement('style');
    style.innerHTML = css;
    if (document.head) {
      document.head.appendChild(style);
    }
    document.addEventListener('DOMContentLoaded', () => {
      document.head.appendChild(style);
    });
  });

  // Mock /api/status
  await page.route('**/api/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        comment: 'System is operating normally.',
        diffMinutes: 0,
      }),
    });
  });

  // Mock /api/me (Not logged in by default)
  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Not authenticated' }),
    });
  });

  // Mock /api/csrf
  await page.route('**/api/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'test-csrf-token' }),
    });
  });

  // Mock /xrpc/blue.rito.feed.getLatestBookmarkTag
  await page.route('**/xrpc/blue.rito.feed.getLatestBookmarkTag', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { name: 'Tech', count: 10 },
        { name: 'Verified', count: 5 },
      ]),
    });
  });

  // Mock actor bookmarks
  await page.route('**/xrpc/blue.rito.feed.getActorBookmarks**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

export async function mockLogin(page: Page, did: string, handle: string) {
  // Mock /api/me to return logged in user
  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          did,
          handle,
          displayName: 'rito.blue',
          description: 'E2Eテスト用のモックプロフィールです。',
          avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          banner: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          followersCount: 123,
          followsCount: 456,
          postsCount: 789,
          indexedAt: new Date().toISOString(),
        },
        scope: 'atproto repo:app.bsky.feed.post?action=create rpc:app.bsky.actor.getProfile?aud=did:web:api.bsky.app%23bsky_appview blob:*/* repo?collection=blue.rito.feed.bookmark&collection=blue.rito.feed.like&collection=blue.rito.service.schema rpc?lxm=blue.rito.preference.getPreference&lxm=blue.rito.preference.putPreference&aud=*',
      }),
    });
  });

  // Mock actor bookmarks for this user
  await page.route(/\/xrpc\/blue\.rito\.feed\.getActorBookmarks/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          uri: 'at://did:plc:testuser/app.bsky.feed.post/123',
          did,
          handle,
          subject: 'https://example.com/post/1',
          ogp_title: 'Test Post 1',
          tags: [],
          comments: [
            {
              lang: 'ja',
              title: 'テストタイトル1',
              comment: 'E2Eテスト用のコメントです。'
            }
          ],
          created_at: new Date().toISOString(),
        },
      ]),
    });
  });

  // 登録処理のモック
  await page.route('**/xrpc/com.atproto.repo.applyWrites*', async (route) => {
    console.log('MOCK: applyWrites request received');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ commit: { rev: 'mock', cid: 'mock' } }),
    });
    console.log('MOCK: applyWrites response sent');
  });

  // CSRF
  await page.route('**/api/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'mock-csrf' }),
    });
  });

  // Settings preference authorization
  await page.route('**/api/oauth/getServideAuth?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'mock-service-auth-token' }),
    });
  });

  await page.route('**/xrpc/blue.rito.preference.getPreference', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        enableAutoGenerateBookmark: false,
        unblurModerationCategories: [],
      }),
    });
  });

  // OGP preview
  await page.route('**/api/fetchOgp?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        result: {
          ogTitle: '取得したページタイトル',
          ogDescription: '取得したページの説明',
          ogImage: [],
        },
      }),
    });
  });

  // Session info for private bookmarks
  await page.route('**/api/session-info', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hasSession: true,
        scope: 'atproto blob:*/* space:blue.rito.space.bookmark',
        hasSpaceScope: true,
        spaceUri: `at://${did}/space/blue.rito.space.bookmark/self`,
      }),
    });
  });

  // Space Capability & Space Check
  await page.route(/\/xrpc\/com\.atproto\.(simplespace|space)\.getSpace/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uri: `at://${did}/space/blue.rito.space.bookmark/self`,
        policy: { $type: 'com.atproto.simplespace.defs#memberListPolicy', members: [did] },
        appAccess: { $type: 'com.atproto.simplespace.defs#open' },
      }),
    });
  });

  // List Private Records
  await page.route(/\/xrpc\/com\.atproto\.space\.listRecords/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        records: [
          {
            uri: `at://${did}/space/blue.rito.space.bookmark/self/${did}/blue.rito.private.feed.bookmark/testrkey1`,
            cid: 'bafyreitest1',
            value: {
              $type: 'blue.rito.private.feed.bookmark',
              subject: 'https://secret.example.com',
              comments: [
                {
                  lang: 'ja',
                  title: 'プライベートテストブックマーク1',
                  comment: 'これは非公開コメントです。',
                },
              ],
              tags: ['PrivateTag'],
              ogpTitle: 'プライベートテストブックマーク1',
              ogpDescription: '非公開のテスト説明です',
              createdAt: new Date().toISOString(),
            },
          },
        ],
        cursor: null,
      }),
    });
  });

  // Get Private Record
  await page.route(/\/xrpc\/com\.atproto\.space\.getRecord/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uri: `at://${did}/space/blue.rito.space.bookmark/self/${did}/blue.rito.private.feed.bookmark/testrkey1`,
        cid: 'bafyreitest1',
        value: {
          $type: 'blue.rito.private.feed.bookmark',
          subject: 'https://secret.example.com',
          comments: [
            {
              lang: 'ja',
              title: 'プライベートテストブックマーク1',
              comment: 'これは非公開コメントです。',
            },
          ],
          tags: ['PrivateTag'],
          ogpTitle: 'プライベートテストブックマーク1',
          ogpDescription: '非公開のテスト説明です',
          createdAt: new Date().toISOString(),
        },
      }),
    });
  });

  // Put Private Record
  await page.route('**/xrpc/com.atproto.space.putRecord', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uri: `at://${did}/space/blue.rito.space.bookmark/self/${did}/blue.rito.private.feed.bookmark/testrkey1`,
        cid: 'bafyreiput1',
      }),
    });
  });

  // Create Private Record
  await page.route('**/xrpc/com.atproto.space.createRecord', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uri: `at://${did}/space/blue.rito.space.bookmark/self/${did}/blue.rito.private.feed.bookmark/newrkey`,
        cid: 'bafyreinew1',
      }),
    });
  });

  // Delete Private Record
  await page.route('**/xrpc/com.atproto.space.deleteRecord', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  // Delete Private Bookmark Space
  await page.route('**/xrpc/com.atproto.simplespace.deleteSpace', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // 重複チェックのモック
  await page.route(/\/xrpc\/blue.rito.feed.getBookmarkBySubject\?.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}
