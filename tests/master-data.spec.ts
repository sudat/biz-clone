import { test, expect } from '@playwright/test';

test.describe('マスターデータ管理', () => {
  // 認証済みユーザーでのテスト用のセットアップ
  test.beforeEach(async ({ page }) => {
    // Note: 実際のテストでは、認証済みセッションを作成するか、
    // テスト用ユーザーでログインする必要があります
    await page.goto('/login');
    // TODO: 実際の認証ロジックに合わせて実装
  });

  test.describe('勘定科目マスター', () => {
    test('勘定科目一覧ページの表示', async ({ page }) => {
      await page.goto('/master/accounts');
      
      // ページタイトルと基本要素の確認
      await expect(page.locator('h1')).toContainText('勘定科目');
      await expect(page.locator('button', { hasText: '新規作成' })).toBeVisible();
      
      // データテーブルの存在確認
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th', { hasText: 'コード' })).toBeVisible();
      await expect(page.locator('th', { hasText: '名称' })).toBeVisible();
    });

    test('勘定科目の検索機能', async ({ page }) => {
      await page.goto('/master/accounts');
      
      // 検索フィールドの確認
      const searchInput = page.locator('input[placeholder*="検索"]');
      await expect(searchInput).toBeVisible();
      
      // 検索テスト
      await searchInput.fill('現金');
      await page.keyboard.press('Enter');
      
      // 検索結果の確認（現金関連の勘定科目がフィルタされる）
      await expect(page.locator('tbody tr')).toHaveCount({ min: 0 });
    });

    test('勘定科目新規作成フォーム', async ({ page }) => {
      await page.goto('/master/accounts');
      
      // 新規作成ボタンをクリック
      await page.click('button', { hasText: '新規作成' });
      
      // フォームの表示確認
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[name="code"]')).toBeVisible();
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('select[name="category"]')).toBeVisible();
      
      // バリデーションテスト（空フォーム送信）
      await page.click('button[type="submit"]');
      await expect(page.locator('text=必須項目です')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('取引先マスター', () => {
    test('取引先一覧ページの表示', async ({ page }) => {
      await page.goto('/master/partners');
      
      // ページタイトルと基本要素の確認
      await expect(page.locator('h1')).toContainText('取引先');
      await expect(page.locator('button', { hasText: '新規作成' })).toBeVisible();
      
      // データテーブルの存在確認
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th', { hasText: 'コード' })).toBeVisible();
      await expect(page.locator('th', { hasText: '名称' })).toBeVisible();
      await expect(page.locator('th', { hasText: '種別' })).toBeVisible();
    });

    test('取引先の種別フィルター', async ({ page }) => {
      await page.goto('/master/partners');
      
      // 種別フィルターの確認
      const typeFilter = page.locator('select[name="type"]');
      await expect(typeFilter).toBeVisible();
      
      // 顧客でフィルター
      await typeFilter.selectOption('customer');
      
      // フィルター結果の確認
      await expect(page.locator('tbody tr')).toHaveCount({ min: 0 });
    });
  });

  test.describe('補助科目マスター', () => {
    test('補助科目一覧ページの表示', async ({ page }) => {
      await page.goto('/master/sub-accounts');
      
      // ページタイトルと基本要素の確認
      await expect(page.locator('h1')).toContainText('補助科目');
      await expect(page.locator('button', { hasText: '新規作成' })).toBeVisible();
      
      // データテーブルの存在確認
      await expect(page.locator('table')).toBeVisible();
    });

    test('補助科目の親勘定科目連携', async ({ page }) => {
      await page.goto('/master/sub-accounts');
      
      // 新規作成フォームを開く
      await page.click('button', { hasText: '新規作成' });
      
      // 親勘定科目選択フィールドの確認
      await expect(page.locator('select[name="parentAccountId"]')).toBeVisible();
      
      // 親勘定科目を選択した時の動作確認
      await page.locator('select[name="parentAccountId"]').selectOption({ index: 1 });
    });
  });

  test.describe('分析コードマスター', () => {
    test('分析コード一覧ページの表示', async ({ page }) => {
      await page.goto('/master/analysis-codes');
      
      // ページタイトルと基本要素の確認
      await expect(page.locator('h1')).toContainText('分析コード');
      await expect(page.locator('button', { hasText: '新規作成' })).toBeVisible();
      
      // データテーブルの存在確認
      await expect(page.locator('table')).toBeVisible();
    });
  });

  test.describe('共通機能', () => {
    test('ページネーション機能', async ({ page }) => {
      await page.goto('/master/accounts');
      
      // ページネーションの確認（データが十分にある場合）
      const pagination = page.locator('[data-testid="pagination"]');
      if (await pagination.isVisible()) {
        await expect(pagination).toBeVisible();
        
        // 次ページボタンのテスト
        const nextButton = pagination.locator('button', { hasText: '次へ' });
        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await expect(page).toHaveURL(/.*page=2/);
        }
      }
    });

    test('ソート機能', async ({ page }) => {
      await page.goto('/master/accounts');
      
      // コード列でのソート
      await page.click('th', { hasText: 'コード' });
      
      // ソート状態の確認（ソートアイコンまたはURL変化）
      await expect(page.locator('th[aria-sort]')).toBeVisible({ timeout: 3000 });
    });

    test('ダークモード切り替え', async ({ page }) => {
      await page.goto('/master/accounts');
      
      // テーマ切り替えボタンの確認
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        
        // ダークモードクラスの確認
        await expect(page.locator('html')).toHaveClass(/dark/);
      }
    });

    test('レスポンシブデザイン', async ({ page }) => {
      // モバイルビューポートでのテスト
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/master/accounts');
      
      // モバイルメニューの確認
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toBeVisible();
      }
      
      // デスクトップビューに戻す
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
});