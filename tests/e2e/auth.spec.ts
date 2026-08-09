import { expect, test } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('displays validation error for invalid email format on login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="email"]', 'not-an-email');
    await page.fill('input[id="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page.locator('input[id="email"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('displays validation error for short password on login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[id="email"]', 'valid@example.com');
    await page.fill('input[id="password"]', 'short');
    await page.click('button[type="submit"]');

    await expect(page.locator('input[id="password"]')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Password must be at least 8 characters long')).toBeVisible();
  });

  test('handles sign up flow and shows verification instructions', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `testuser_${timestamp}@example.com`;

    await page.goto('/signup');
    await page.fill('input[id="fullName"]', 'Test User');
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', 'Password123!');
    await page.fill('input[id="confirmPassword"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Check your email')).toBeVisible();
  });

  test('handles forgot password flow', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('input[id="email"]', 'user@example.com');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Check your email')).toBeVisible();
  });

  test('handles reset password flow', async ({ page }) => {
    await page.goto('/reset-password');
    await page.fill('input[id="password"]', 'NewPassword123!');
    await page.fill('input[id="confirmPassword"]', 'NewPassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login\?message=password-updated/);
    await expect(
      page.getByText(
        'Your password has been successfully updated. Please sign in with your new password.',
      ),
    ).toBeVisible();
  });
});
