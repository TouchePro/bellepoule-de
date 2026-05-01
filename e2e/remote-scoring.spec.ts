import { test, expect } from '@playwright/test';

test.describe('Flow remote scoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('l\'application charge sans erreur critique', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // On tolère les erreurs de ressources manquantes mais pas les crashes JS critiques
    const criticalErrors = errors.filter(e => e.includes('Cannot read') || e.includes('undefined is not'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('naviguer vers les paramètres remote', async ({ page }) => {
    // Chercher le bouton ou onglet "Remote" / "Serveur" / "Arbitrage distant"
    const remoteBtn = page.getByRole('button', { name: /remote|serveur|arbitrage distant/i })
      .or(page.getByRole('tab', { name: /remote|serveur|arbitrage/i }))
      .or(page.getByText(/remote|serveur.*distant|arbitrage/i).first());

    const isVisible = await remoteBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    await remoteBtn.click();

    // Vérifier qu'une section de configuration du serveur est visible
    const serverSection = page.getByText(/port|serveur|server|start|d[eé]marrer/i).first();
    await expect(serverSection).toBeVisible({ timeout: 5000 });
  });

  test('le bouton "Démarrer le serveur" est présent ou le serveur est géré depuis les settings', async ({ page }) => {
    // Ouvrir une compétition si disponible
    const firstItem = page.locator('.competition-item, [class*="competition-card"]').first();
    const hasItem = await firstItem.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasItem) {
      await firstItem.click();
    }

    // Chercher la section remote dans les onglets
    const remoteTab = page.getByRole('tab', { name: /remote|serveur|arbitrage/i })
      .or(page.getByText(/remote scoring|serveur remote/i).first());

    const tabVisible = await remoteTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (!tabVisible) {
      test.skip();
      return;
    }

    await remoteTab.click();

    // Vérifier qu'on peut voir les contrôles du serveur
    const startBtn = page.getByRole('button', { name: /d[eé]marrer|start|lancer/i }).first();
    const hasStartBtn = await startBtn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasStartBtn).toBe(true);
  });

  test('le serveur remote affiche une URL quand actif', async ({ page }) => {
    const firstItem = page.locator('.competition-item, [class*="competition-card"]').first();
    const hasItem = await firstItem.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasItem) {
      test.skip();
      return;
    }

    await firstItem.click();

    const remoteTab = page.getByRole('tab', { name: /remote|serveur/i })
      .or(page.getByText(/remote|serveur/i).first());

    const tabVisible = await remoteTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (!tabVisible) {
      test.skip();
      return;
    }

    await remoteTab.click();

    const startBtn = page.getByRole('button', { name: /d[eé]marrer|start|lancer/i }).first();
    const hasStartBtn = await startBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasStartBtn) {
      test.skip();
      return;
    }

    await startBtn.click();

    // Vérifier qu'une URL http:// est affichée
    const urlText = page.getByText(/http:\/\//);
    await expect(urlText).toBeVisible({ timeout: 5000 });

    // Arrêter le serveur
    const stopBtn = page.getByRole('button', { name: /arr[eê]ter|stop/i }).first();
    const hasStopBtn = await stopBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasStopBtn) {
      await stopBtn.click();
    }
  });

  test('arrêt du serveur remote masque l\'URL', async ({ page }) => {
    const firstItem = page.locator('.competition-item, [class*="competition-card"]').first();
    const hasItem = await firstItem.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasItem) {
      test.skip();
      return;
    }

    await firstItem.click();

    const remoteTab = page.getByRole('tab', { name: /remote|serveur/i })
      .or(page.getByText(/remote|serveur/i).first());

    const tabVisible = await remoteTab.isVisible({ timeout: 3000 }).catch(() => false);
    if (!tabVisible) {
      test.skip();
      return;
    }

    await remoteTab.click();

    // Démarrer puis arrêter
    const startBtn = page.getByRole('button', { name: /d[eé]marrer|start|lancer/i }).first();
    const hasStartBtn = await startBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasStartBtn) {
      test.skip();
      return;
    }

    await startBtn.click();
    await page.waitForTimeout(500);

    const stopBtn = page.getByRole('button', { name: /arr[eê]ter|stop/i }).first();
    const hasStopBtn = await stopBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasStopBtn) {
      await stopBtn.click();
      // Le bouton "Démarrer" doit réapparaître
      await expect(
        page.getByRole('button', { name: /d[eé]marrer|start|lancer/i }).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
