import { test, expect } from '@playwright/test';

test.describe('Competition Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create a new competition', async ({ page }) => {
    // Click new competition button
    await page.click('text=Nouvelle compétition');

    // Fill in the form
    await page.fill('[placeholder="Titre"], [placeholder="Title"]', 'Test Competition');
    await page.fill('[placeholder="Lieu"], [placeholder="Location"]', 'Test Location');

    // Select weapon
    await page.selectOption('select[name="weapon"]', 'FOIL');

    // Select gender
    await page.selectOption('select[name="gender"]', 'M');

    // Select category
    await page.selectOption('select[name="category"]', 'senior');

    // Submit the form
    await page.click('button[type="submit"]');

    // Verify competition was created
    await expect(page.locator('text=Test Competition')).toBeVisible();
  });

  test('should display competition details', async ({ page }) => {
    // Click on first competition if exists
    const firstCompetition = page.locator('.competition-item').first();

    if (await firstCompetition.isVisible().catch(() => false)) {
      await firstCompetition.click();

      // Verify competition view is displayed
      await expect(page.locator('.competition-view, .competition-detail')).toBeVisible();
    }
  });

  test('should delete a competition', async ({ page }) => {
    const competitionName = await page.locator('.competition-item .title').first().textContent();

    if (competitionName) {
      // Click delete button
      await page.locator('.competition-item .delete-btn').first().click();

      // Confirm deletion
      await page.click('text=Oui, text=Yes');

      // Verify competition is removed
      await expect(page.locator(`text=${competitionName}`)).not.toBeVisible();
    }
  });
});
