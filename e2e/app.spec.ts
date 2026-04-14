import { test, expect } from '@playwright/test';

test.describe('Express App E2E Tests', () => {
  test('should display OK on health check endpoint', async ({ page }) => {
    await page.goto('/');

    const content = await page.textContent('body');
    expect(content).toBe('OK');
  });

  test('should display index page on /node endpoint', async ({ page }) => {
    const response = await page.goto('/node');
    expect(response?.status()).toBe(200);
  });

  test('should return 404 for unknown routes', async ({ page }) => {
    const response = await page.goto('/unknown');

    expect(response?.status()).toBe(404);
  });
});
