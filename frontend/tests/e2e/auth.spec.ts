import { test, expect } from '@playwright/test';
import { setupApiStubs, mockLogin } from './stubs/api';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiStubs(page);
    await page.goto('/ja');
  });

  test('should open login modal', async ({ page, isMobile }) => {
    // モバイルの場合はバーガーメニューを開く
    if (isMobile) {
      await page.locator('.mantine-Burger-root').click();
    }

    // ログインボタンをクリック
    const loginButton = page.getByRole('button', { name: 'ログイン', exact: true });
    await loginButton.click();

    // モーダルが表示されるか確認
    await expect(page.getByRole('dialog').filter({ hasText: 'atprotoのアカウントでログイン' })).toBeVisible();
    await expect(page.getByText('atprotoのアカウントでログイン')).toBeVisible();
  });

  test('should handle handle input and validation', async ({ page, isMobile }) => {
    if (isMobile) {
      await page.locator('.mantine-Burger-root').click();
    }
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: 'atprotoのアカウントでログイン' });
    const handleInput = dialog.getByPlaceholder('alice.bsky.social');
    await handleInput.click();
    // 人間のように1文字ずつ入力して、確実にイベントを発火させる
    await handleInput.pressSequentially('rito.blue', { delay: 50 });
    
    // 入力アシストを確定させるためにEnterを押し、フォーカスを外してバリデーションを確実に実行
    await handleInput.press('Enter');
    await handleInput.blur();

    // 「合意する」チェックボックスにチェックを入れる
    await dialog.getByRole('checkbox').click();
    
    // チェック状態が反映されるまで少し待機
    await page.waitForTimeout(500);
    
    // モーダル内のログインボタンを「完全一致」で取得
    const submitButton = dialog.getByRole('button', { name: 'ログイン', exact: true });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    
    // ユーザーの指示により、実際のログイン処理（送信）は行わず、活性化の確認に留める
    // await submitButton.click();
  });

  test('should display user profile after login', async ({ page, isMobile }) => {
    // ログイン状態をモック
    await mockLogin(page, 'did:plc:testuser', 'rito.blue');
    await page.reload();

    // モバイルの場合はバーガーメニューを開く
    if (isMobile) {
      await page.locator('.mantine-Burger-root').click();
    }

    // アバターが表示されているか確認（表示されているものを取得）
    const avatar = page.locator('img[alt="rito.blue"]').filter({ visible: true }).first();
    await expect(avatar).toBeVisible({ timeout: 10000 });

    // メニューを開く
    await avatar.click();
    await expect(page.getByText('設定', { exact: true })).toBeVisible();
    await expect(page.getByText('ログアウト', { exact: true })).toBeVisible();
  });
});
