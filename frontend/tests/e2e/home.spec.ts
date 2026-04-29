import { test, expect } from '@playwright/test';
import { setupApiStubs } from './stubs/api';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiStubs(page);
    await page.goto('/ja');
  });

  test('should display the correct title and sections', async ({ page }) => {
    // ページタイトルの確認
    await expect(page).toHaveTitle(/リト/);

    // カテゴリタブの「発見」の確認
    await expect(page.getByRole('button', { name: '発見' })).toBeVisible();

    // ユーザーごとの最新ブックマークセクション
    await expect(page.getByText('ユーザーごとの最新ブックマーク')).toBeVisible();
    
    // いいねされたブックマークセクション
    await expect(page.getByText('いいねされたブックマーク')).toBeVisible();
  });

  test('should display mock bookmarks in correct sections', async ({ page }) => {
    // いいねされたブックマークセクションに表示されているか
    const likedSection = page.locator('div').filter({ hasText: 'いいねされたブックマーク' }).first();
    await expect(likedSection.getByText('テストタイトル1').first()).toBeVisible({ timeout: 10000 });

    // ユーザーごとの最新ブックマークセクションに表示されているか
    const latestSection = page.locator('div').filter({ hasText: 'ユーザーごとの最新ブックマーク' }).first();
    await expect(latestSection.getByText('テストタイトル1').first()).toBeVisible();
    await expect(latestSection.getByText('テストタイトル2').first()).toBeVisible();
  });

  test('should switch categories', async ({ page }) => {
    // 「テクノロジー」カテゴリをクリック
    const techTab = page.getByRole('button', { name: 'テクノロジー' });
    await techTab.click();

    // URLが変更されるか確認
    await expect(page).toHaveURL(/.*category=technology/);
  });

  test('should display information alert', async ({ page }) => {
    await expect(page.getByText('このページは1分毎に更新されます')).toBeVisible();
  });
});
