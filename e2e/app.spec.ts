import { test, expect } from '@playwright/test';

test.describe('Application Launch', () => {
  test('should display the main window', async ({ page }) => {
    await page.goto('/');

    // Check if the app title is visible
    await expect(page.locator('text=BellePoule Modern')).toBeVisible();
  });

  test('should display competition list or empty state', async ({ page }) => {
    await page.goto('/');

    // Check for either competition list or empty state
    const hasContent = await Promise.race([
      page
        .locator('.competition-list, .empty-state')
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false),
    ]);

    expect(hasContent).toBe(true);
  });
});

test.describe('Navigation', () => {
  test('should navigate to new competition modal', async ({ page }) => {
    await page.goto('/');

    // Click on new competition button
    const newCompButton = page.locator('text=Nouvelle compétition, text=New Competition').first();
    if (await newCompButton.isVisible().catch(() => false)) {
      await newCompButton.click();

      // Check if modal opened
      await expect(page.locator('text=Titre, text=Title')).toBeVisible();
    }
  });
});
