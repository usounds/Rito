import { test, expect } from '@playwright/test';
import { setupApiStubs, mockLogin } from './stubs/api';

test.describe('Bookmark Operations', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールログを転送
    page.on('console', msg => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));
    
    await setupApiStubs(page);
    await mockLogin(page, 'did:plc:testuser', 'rito.blue');
    await page.goto('/ja');
  });

  test('should handle successful bookmark registration', async ({ page }) => {
    await page.goto('/ja/bookmark/register');

    // 1. URLを入力
    const urlInput = page.getByLabel('URL', { exact: false });
    await urlInput.fill('https://rito.blue');

    // 2. 「タイトルを取得」をクリック
    const getOgpButton = page.getByRole('button', { name: 'タイトルを取得' });
    await getOgpButton.click();

    // タイトルが取得されて入力欄が埋まるのを待機（実在のURLから取得するため少し長めに待機）
    const titleInput = page.getByLabel('タイトル', { exact: false }).first();
    await expect(titleInput).not.toHaveValue('', { timeout: 15000 });

    // 3. コメントを入力
    const commentInput = page.getByLabel('コメント', { exact: false }).first();
    await commentInput.fill('これはE2Eテストによるコメントです。');

    // 4. 登録ボタンをクリック
    const submitButton = page.getByRole('button', { name: '登録', exact: true });
    // URLとタイトルを入力（タイトルを入力しないと登録ボタンが有効にならない）
    await page.fill('input[placeholder="https://rito.blue"]', 'https://example.com/post/1');
    await page.fill('input[placeholder="リト"]', 'テストタイトル1');

    // ボタンのローディングが解除され、有効になることを確認
    await expect(submitButton).toBeEnabled({ timeout: 20000 });
    await submitButton.click();

    // 5. 成功通知（ja.json: create.inform.success）が表示されるか確認
    // タイムアウトを長めに取り、遷移や処理の遅延を許容する
    await expect(page.getByText('登録しました')).toBeVisible({ timeout: 20000 });
  });

  test('should validate empty registration', async ({ page }) => {
    await page.goto('/ja/bookmark/register');
    
    // URLを空のまま登録ボタンをクリック
    await page.getByRole('button', { name: '登録', exact: true }).click();

    // バリデーションエラーの確認（ja.json: create.error.urlMandatory）
    await expect(page.getByText('URLは必須です')).toBeVisible();
  });

  test('should validate invalid URL format', async ({ page }) => {
    await page.goto('/ja/bookmark/register');
    
    const urlInput = page.getByLabel('URL', { exact: false });
    await urlInput.fill('invalid-url');
    await urlInput.blur(); // フォーカスを外してバリデーション実行

    // バリデーションエラーの確認（並列実行時の負荷を考慮してタイムアウトを延長）
    await expect(page.getByText('URLの形式が不正です', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('should show my bookmarks page', async ({ page, isMobile }) => {
    // モバイルの場合はバーガーメニューを開く
    if (isMobile) {
      await page.locator('.mantine-Burger-root').click();
    }

    // ヘッダーの「マイブックマーク」をクリック
    await page.getByRole('link', { name: 'マイブックマーク' }).filter({ visible: true }).first().click();
    
    await expect(page).toHaveURL(/.*\/my\/bookmark/);
    // モックデータ（api.tsのgetActorBookmarks）が表示されているか
    await expect(page.getByText('テストタイトル1').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show bookmark action menu', async ({ page }) => {
    // ログイン済みの状態でマイブックマークページへ
    await page.goto('/ja/my/bookmark');

    // 三点リーダーボタン（aria-label="Settings"）をクリック
    const menuButton = page.locator('.mantine-Card-root').filter({ hasText: 'テストタイトル1' }).getByRole('button', { name: 'Settings' }).first();
    await menuButton.click();

    // メニュー項目が表示されるか確認
    await expect(page.getByText('ブックマークメニュー')).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Blueskyでシェア', exact: true })).toBeVisible();
    // 「編集」をクリック
    await page.getByRole('menuitem', { name: '編集', exact: true }).click();
    await expect(page).toHaveURL(/.*\/bookmark\/register\?aturi=.*/);

    // 戻って「削除」を確認
    await page.goBack();
    await menuButton.click();
    await page.getByRole('menuitem', { name: '削除', exact: true }).click();
    await expect(page.getByRole('dialog').getByText('ブックマークの削除')).toBeVisible();

    // モーダルを閉じて「シェア」を確認
    await page.keyboard.press('Escape');
    await menuButton.click();
    await page.getByRole('menuitem', { name: 'Blueskyでシェア', exact: true }).click();
    await expect(page.getByRole('dialog').getByText('Blueskyで共有')).toBeVisible();
  });

  test('should navigate to registration page from other user bookmark menu', async ({ page }) => {
    // ログイン済みの状態でホーム（発見）ページへ
    await page.goto('/ja');

    // 自分以外（testuser2）が投稿したブックマーク（テストタイトル2）を探す
    const otherBookmark = page.locator('.mantine-Card-root').filter({ hasText: 'テストタイトル2' }).first();
    await expect(otherBookmark).toBeVisible();

    // そのブックマークの三点リーダーボタンをクリック
    await otherBookmark.getByRole('button', { name: 'Settings' }).click();

    // 「登録」をクリック
    await page.getByRole('menuitem', { name: '登録', exact: true }).click();
    
    // 登録ページへ遷移し、URLにsubjectが含まれていることを確認
    await expect(page).toHaveURL(/.*\/bookmark\/register\?subject=.*/);
  });
});
