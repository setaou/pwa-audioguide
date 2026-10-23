import { test, expect } from '@playwright/test';

test.describe('Offline Tour & Service Worker Journey (Test Fixtures)', () => {
  test('service worker registers, preloads tour assets, and supports offline playback', async ({ page, context }) => {
    // 1. Load application with fixtures
    await page.goto('/index.html?config=tests/fixtures/config.yml');
    await expect(page.locator('#view-home')).toBeVisible();

    // 2. Wait for Service Worker registration and activation
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg && reg.active);
    });
    expect(swRegistered).toBe(true);

    // 3. Navigate to Tours view
    await page.click('#btn-start-tours');
    await expect(page.locator('#view-tours')).toBeVisible();

    // 4. Trigger tour preloading
    const preloadBtn = page.locator('#btn-preload-tour-1');
    await expect(preloadBtn).toBeVisible();
    await preloadBtn.click();

    // Wait for preloader to finish caching all tour assets
    const preloadStatus = page.locator('#preload-status-tour-1');
    await expect(preloadStatus).toHaveText('Prêt hors-ligne', { timeout: 15000 });
    await expect(preloadBtn).toContainText('Prêt hors-ligne');

    // Verify assets are cached in CacheStorage
    const cachedFiles = await page.evaluate(async () => {
      if (!('caches' in window)) return [];
      const cache = await caches.open('audioguide-v1');
      const keys = await cache.keys();
      return keys.map(k => k.url);
    });
    expect(cachedFiles.length).toBeGreaterThan(0);
    const hasConfig = cachedFiles.some(u => u.includes('config.yml'));
    const hasMarkdown = cachedFiles.some(u => u.includes('step-1.md'));
    const hasAudio = cachedFiles.some(u => u.includes('step-1.webm') || u.includes('step-1.m4a'));
    const hasTransitionAudio = cachedFiles.some(u => u.includes('step-1-trans.webm') || u.includes('step-1-trans.m4a'));
    expect(hasConfig).toBe(true);
    expect(hasMarkdown).toBe(true);
    expect(hasAudio).toBe(true);
    expect(hasTransitionAudio).toBe(true);

    // 5. Cut network connection completely
    await context.setOffline(true);

    // 6. Enter the tour while offline
    await page.locator('.tour-card[data-tour-id="tour-1"] .tour-card-title').click();
    await expect(page.locator('#view-step')).toBeVisible();
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 1');

    // Verify text rendered from offline cache
    await expect(page.locator('#step-body-markdown')).toContainText('Voici une description détaillée');

    // Verify carousel images load from offline cache
    await page.waitForFunction(() => {
      const img = document.querySelector('.carousel-slide img');
      return Boolean(img && img.complete && img.naturalWidth > 0);
    }, { timeout: 10000 });

    // 7. Test offline audio playback
    await page.evaluate(async () => {
      const player = window.audioguideApp?.player;
      if (player && !player.isPlaying()) {
        try { await player.play(); } catch (_) {}
      }
    });

    await page.waitForFunction(() => {
      const audio = window.audioguideApp?.player?.audio;
      return audio && audio.currentTime > 0;
    }, { timeout: 10000 });

    const offlineTime = await page.evaluate(() => window.audioguideApp.player.audio.currentTime);
    expect(offlineTime).toBeGreaterThan(0);

    // Test offline audio seeking (handled by Service Worker range 206)
    await page.click('#player-btn-skip-forward');
    const afterSeekTime = await page.evaluate(() => window.audioguideApp.player.audio.currentTime);
    expect(afterSeekTime).toBeGreaterThanOrEqual(offlineTime);

    // 8. Navigate to Step 2 while offline
    await page.click('#player-btn-next-step');
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 2');
    await expect(page.locator('#step-body-markdown')).toContainText('deuxième étape');

    // Restore network
    await context.setOffline(false);
  });
});
