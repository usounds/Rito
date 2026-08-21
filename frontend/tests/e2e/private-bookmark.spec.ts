import { test, expect } from '@playwright/test';
import { setupApiStubs, mockLogin } from './stubs/api';

test.describe('Private Bookmark (Space) E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`));

    await setupApiStubs(page);
    await mockLogin(page, 'did:plc:testuser', 'rito.blue');
  });

  test('should display public and private tabs on my bookmark page and sync URL', async ({ page }) => {
    await page.goto('/ja/my/bookmark');

    // 公開タブと自分のみタブが存在することを確認
    const publicTab = page.getByText('公開', { exact: true });
    const privateTab = page.getByText('自分のみ', { exact: true });

    await expect(publicTab).toBeVisible({ timeout: 10000 });
    await expect(privateTab).toBeVisible({ timeout: 10000 });

    // 初期状態は公開タブで、公開ブックマークが表示されている
    await expect(page.getByText('テストタイトル1').first()).toBeVisible();

    // 自分のみタブに切り替え
    await privateTab.click();

    // URL に isPrivate=true が付与されることを確認
    await expect(page).toHaveURL(/.*isPrivate=true/, { timeout: 5000 });

    // プライベートブックマーク一覧が表示されることを確認
    await expect(page.getByText('プライベートテストブックマーク1').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('PrivateTag').first()).toBeVisible();

    // 再び公開タブに切り替え
    await publicTab.click();

    // URL から isPrivate が除去されることを確認
    await expect(page).toHaveURL(/\/ja\/my\/bookmark$/, { timeout: 5000 });
    await expect(page.getByText('テストタイトル1').first()).toBeVisible();
  });

  test('should directly open private tab when navigating with isPrivate=true', async ({ page }) => {
    await page.goto('/ja/my/bookmark?isPrivate=true');

    // プライベートブックマーク一覧が表示されることを確認
    await expect(page.getByText('プライベートテストブックマーク1').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('PrivateTag').first()).toBeVisible();
  });

  test('should register a private bookmark from register page', async ({ page }) => {
    await page.goto('/ja/bookmark/register');

    // URLを入力
    const urlInput = page.getByLabel('URL', { exact: false });
    await urlInput.fill('https://secret.example.com/item/1');

    // 「自分のみに保存」スイッチをONにする
    const privateSwitch = page.getByLabel('自分のみに保存', { exact: false });
    await privateSwitch.check();

    // 非公開の説明文が表示されることを確認
    await expect(page.getByText('全体や検索には公開せず、ご自身のPDS内にのみ保存します')).toBeVisible();

    // 「Blueskyに投稿する」は利用可能で、「オリジナルのリンク先を使用する」がチェック・固定されていることを確認
    const postToBskyCheckbox = page.getByLabel('Blueskyに投稿する', { exact: false });
    await expect(postToBskyCheckbox).toBeEnabled();

    const useOrigCheckbox = page.getByLabel('オリジナルのリンク先を使用する', { exact: false });
    await expect(useOrigCheckbox).toBeChecked();
    await expect(useOrigCheckbox).toBeDisabled();

    // タイトルとコメントを入力
    await page.fill('input[placeholder="リト"]', '秘密のブックマークタイトル');
    const commentInput = page.getByLabel('コメント', { exact: false }).first();
    await commentInput.fill('自分用メモです。');

    // 登録ボタンをクリック
    const submitButton = page.getByRole('button', { name: '登録', exact: true });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    await submitButton.click();

    // 保存完了後にマイブックマーク画面（?isPrivate=true）にリダイレクトされることを確認
    await expect(page).toHaveURL(/.*\/my\/bookmark\?isPrivate=true/, { timeout: 15000 });
  });

  test('should load and edit an existing private bookmark via URL', async ({ page }) => {
    const spaceAturi = 'at://did:plc:testuser/space/blue.rito.space.bookmark/self/did:plc:testuser/blue.rito.private.feed.bookmark/testrkey1';
    await page.goto(`/ja/bookmark/register?aturi=${encodeURIComponent(spaceAturi)}&returnTo=%2Fja%2Fmy%2Fbookmark&isPrivate=true`);

    // 既存の非公開ブックマークの内容がフォームに復元されていることを確認
    const urlInput = page.getByLabel('URL', { exact: false });
    await expect(urlInput).toHaveValue('https://secret.example.com', { timeout: 10000 });

    const titleInput = page.getByLabel('タイトル', { exact: false }).first();
    await expect(titleInput).toHaveValue('プライベートテストブックマーク1');

    // 更新ボタンをクリック
    const submitButton = page.getByRole('button', { name: '登録', exact: true });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    await submitButton.click();

    // 保存完了後に returnTo（?isPrivate=true）にリダイレクトされることを確認
    await expect(page).toHaveURL(/.*\/my\/bookmark\?isPrivate=true/, { timeout: 15000 });
  });

  test('should delete a private bookmark from list', async ({ page }) => {
    await page.goto('/ja/my/bookmark?isPrivate=true');

    // プライベートブックマークが表示されていることを確認
    const card = page.locator('.mantine-Card-root').filter({ hasText: 'プライベートテストブックマーク1' });
    await expect(card.first()).toBeVisible({ timeout: 10000 });

    // 三点リーダーメニューをクリック
    const menuButton = card.getByRole('button', { name: 'Settings' }).first();
    await menuButton.click();

    // 削除メニュー項目が表示されることを確認
    const deleteItem = page.getByRole('menuitem', { name: '削除', exact: true });
    await expect(deleteItem).toBeVisible();
    await deleteItem.click();

    // 削除確認モーダルの「削除」ボタンをクリック
    const confirmButton = page.getByRole('dialog').getByRole('button', { name: '削除', exact: true });
    await confirmButton.click();
  });
});
