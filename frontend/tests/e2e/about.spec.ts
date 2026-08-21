import { test, expect } from '@playwright/test';
import { setupApiStubs } from './stubs/api';

test.describe('About Page E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiStubs(page);
  });

  test('should display about page with spotlight cards and action buttons', async ({ page }) => {
    await page.goto('/ja/about');

    // ページタイトルが表示されていることを確認
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 3つの機能紹介アクションボタンが表示されていることを確認
    const topBtn = page.getByRole('link', { name: 'トップページを開く' });
    const bookmarkBtn = page.getByRole('link', { name: 'マイブックマークを開く' });
    const appBtn = page.getByRole('link', { name: 'マイアプリを開く' });

    await expect(topBtn).toBeVisible();
    await expect(bookmarkBtn).toBeVisible();
    await expect(appBtn).toBeVisible();

    // トップページを開くリンクをクリックして遷移を確認
    await topBtn.click();
    await expect(page).toHaveURL(/.*\/ja$/);
  });
});
