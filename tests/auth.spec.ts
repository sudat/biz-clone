import { test, expect } from '@playwright/test';

test.describe('認証機能', () => {
  test('ログインページの表示とレイアウト', async ({ page }) => {
    await page.goto('/login');
    
    // ページタイトルの確認
    await expect(page).toHaveTitle(/Biz Clone/);
    
    // ログインフォームの要素確認
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // サインアップページへのリンク確認
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('バリデーションエラーの表示', async ({ page }) => {
    await page.goto('/login');
    
    // 空のフォームでサブミット
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認（具体的なセレクタは実装に依存）
    await expect(page.locator('text=メールアドレスを入力してください')).toBeVisible({ timeout: 5000 });
  });

  test('無効なログイン情報でのエラー処理', async ({ page }) => {
    await page.goto('/login');
    
    // 無効な認証情報を入力
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // エラーメッセージの確認
    await expect(page.locator('text=ログインに失敗しました')).toBeVisible({ timeout: 10000 });
  });

  test('サインアップページへの遷移', async ({ page }) => {
    await page.goto('/login');
    
    // サインアップリンクをクリック
    await page.click('a[href="/signup"]');
    
    // サインアップページに遷移したことを確認
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.locator('text=アカウント作成')).toBeVisible();
  });

  test('認証が必要なページへの未認証アクセス', async ({ page }) => {
    // 未認証状態でダッシュボードにアクセス
    await page.goto('/');
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*login/);
  });

  test('認証が必要なマスターデータページへのアクセス', async ({ page }) => {
    // 未認証状態でマスターデータページにアクセス
    await page.goto('/master/accounts');
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*login/);
  });
});