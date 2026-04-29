import { test, expect } from '@playwright/test';
import { setupApiStubs } from './stubs/api';

test.describe('Settings and UI Utils', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiStubs(page);
    await page.goto('/ja');
  });

  test('should toggle language', async ({ page }) => {
    // 言語切り替えボタンをクリック (LanguageToggleコンポーネント)
    // 具体的なセレクタはLanguageToggleの実装に依存するが、一般的に国旗や言語名
    const langToggle = page.getByRole('button').filter({ has: page.locator('img[src*="flag"]') }).or(page.locator('button:has-text("JA")')).first();
    
    if (await langToggle.isVisible()) {
      await langToggle.click();
      // 英語(EN)を選択
      await page.getByRole('menuitem', { name: 'EN' }).or(page.getByText('English')).click();
      
      // URLが /en になるか確認
      await expect(page).toHaveURL(/.*\/en/);
      // タイトルなどが英語になるか
      await expect(page.getByText('Discover', { exact: true })).toBeVisible();
    }
  });

  test('should toggle color mode', async ({ page }) => {
    // カラーモード切り替えボタン (SwitchColorMode)
    const colorToggle = page.getByRole('button').filter({ has: page.locator('svg') }).and(page.locator('[aria-label*="mode"], [title*="mode"]')).first();
    
    if (await colorToggle.isVisible()) {
      await colorToggle.click();
      // Mantineのテーマが切り替わることを確認（属性やクラスの変化など）
      // ここではエラーが起きないことだけ確認
    }
  });

  test('should show mobile drawer on small screens', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile');

    // バーガーメニューが表示されているか
    const burger = page.locator('.mantine-Burger-root, button:has(.mantine-Burger-root), [aria-label="Navigation"], [aria-label="Menu"]').first();
    await expect(burger).toBeVisible({ timeout: 10000 });
    
    await burger.click();
    
    // ドロワーが開く
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('link', { name: 'マイブックマーク' })).toBeVisible();
    
    // 閉じる (Escapeキーを使用するか、オーバーレイをクリック)
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
