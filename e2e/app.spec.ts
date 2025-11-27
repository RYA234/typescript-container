import { test, expect } from '@playwright/test';

test.describe('Express App E2E Tests', () => {
  test('should display OK on health check endpoint', async ({ page }) => {
    await page.goto('/');

    const content = await page.textContent('body');
    expect(content).toBe('OK');
  });

  test('should display welcome message on /node endpoint', async ({ page }) => {
    await page.goto('/node');

    const content = await page.textContent('body');
    expect(content).toBe('Hello from Node.js on ECS!');
  });

  test('should return 404 for unknown routes', async ({ page }) => {
    const response = await page.goto('/unknown');

    expect(response?.status()).toBe(404);
  });
});
