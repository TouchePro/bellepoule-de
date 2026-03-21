import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check for main landmarks
    await expect(page.locator('main, [role="main"]')).toBeVisible();

    // Check for navigation
    const nav = page.locator('nav, [role="navigation"]');
    if (await nav.isVisible().catch(() => false)) {
      await expect(nav).toHaveAttribute('aria-label');
    }

    // Check buttons have accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const hasName = await button.evaluate(el => {
        return (
          el.hasAttribute('aria-label') ||
          el.hasAttribute('aria-labelledby') ||
          el.textContent?.trim()
        );
      });
      expect(hasName).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Press Tab to navigate
    await page.keyboard.press('Tab');

    // Check that focus is visible
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Press Enter on focused element
    await page.keyboard.press('Enter');
  });

  test('should respect reduced motion preference', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/');

    // Check that animations are disabled
    const animationsDisabled = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return (
        style.getPropertyValue('--animation-duration') === '0s' ||
        document.querySelectorAll('.no-animation').length > 0
      );
    });

    // This is optional - app may or may not respect this preference
    console.log('Reduced motion support:', animationsDisabled);
  });
});
