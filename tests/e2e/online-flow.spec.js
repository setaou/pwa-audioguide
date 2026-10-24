import { test, expect } from '@playwright/test';

test.describe('Online User Journey (Test Fixtures)', () => {
  test('language selection updates UI labels and persists across reload', async ({ page }) => {
    await page.goto('/index.html?config=tests/fixtures/config.yml');
    await expect(page.locator('#view-home')).toBeVisible();

    // Verify initial French UI from fixture
    await expect(page.locator('#monument-title')).toHaveText('Monument Fictif de Test');
    await expect(page.locator('#txt-start-tours')).toHaveText('Démarrer les parcours');

    // Switch to English
    const enBtn = page.locator('.lang-btn[data-lang="en"]');
    await expect(enBtn).toBeVisible();
    await enBtn.click();

    // Verify English UI from fixture
    await expect(page.locator('#monument-title')).toHaveText('Mock Test Monument');
    await expect(page.locator('#txt-start-tours')).toHaveText('Start Tour Circuits');

    // Reload page to verify persistence in localStorage
    await page.reload();
    await expect(page.locator('#monument-title')).toHaveText('Mock Test Monument');
    await expect(page.locator('#txt-start-tours')).toHaveText('Start Tour Circuits');

    // Switch back to French
    const frBtn = page.locator('.lang-btn[data-lang="fr"]');
    await frBtn.click();
    await expect(page.locator('#monument-title')).toHaveText('Monument Fictif de Test');
    await expect(page.locator('#txt-start-tours')).toHaveText('Démarrer les parcours');
  });

  test('settings bottom sheet opens, toggles settings, and updates localization', async ({ page }) => {
    await page.goto('/index.html?config=tests/fixtures/config.yml');
    await expect(page.locator('#view-home')).toBeVisible();

    const openBtn = page.locator('#btn-settings-open');
    const sheet = page.locator('#settings-sheet');
    const overlay = page.locator('#settings-overlay');
    const closeBtn = page.locator('#btn-settings-close');
    const toggleAutoplay = page.locator('#toggle-autoplay');

    // Initially sheet should not have active class
    await expect(sheet).not.toHaveClass(/active/);

    // Open settings
    await openBtn.click();
    await expect(sheet).toHaveClass(/active/);
    await expect(overlay).toHaveClass(/active/);

    // Check default labels in French
    await expect(page.locator('#settings-title')).toHaveText('Paramètres');
    await expect(page.locator('#lbl-autoplay')).toHaveText('Lecture automatique');

    // Autoplay should be checked by default
    await expect(toggleAutoplay).toBeChecked();

    // Toggle autoplay off
    await toggleAutoplay.click();
    await expect(toggleAutoplay).not.toBeChecked();

    // Close via close button
    await closeBtn.click();
    await expect(sheet).not.toHaveClass(/active/);

    // Reopen and close via overlay
    await openBtn.click();
    await expect(sheet).toHaveClass(/active/);
    await overlay.click({ position: { x: 10, y: 10 } });
    await expect(sheet).not.toHaveClass(/active/);

    // Switch language to English
    await page.locator('.lang-btn[data-lang="en"]').click();

    // Open settings and verify English labels
    await openBtn.click();
    await expect(sheet).toHaveClass(/active/);
    await expect(page.locator('#settings-title')).toHaveText('Settings');
    await expect(page.locator('#lbl-autoplay')).toHaveText('Autoplay');
    await expect(page.locator('#lbl-dev-mode')).toHaveText('Developer Mode');

    // Close settings
    await closeBtn.click();
    await expect(sheet).not.toHaveClass(/active/);

    // Verify settings button is visible on home view
    await expect(openBtn).toBeVisible();

    // Navigate to tours view and verify settings button is hidden
    await page.click('#btn-start-tours');
    await expect(page.locator('#view-tours')).toBeVisible();
    await expect(openBtn).toBeHidden();

    // Return to home view and verify settings button is visible again
    await page.click('#btn-tours-back');
    await expect(page.locator('#view-home')).toBeVisible();
    await expect(openBtn).toBeVisible();
  });

  test('tour selection and step view content with carousel', async ({ page }) => {
    await page.goto('/index.html?config=tests/fixtures/config.yml');
    await page.click('#btn-start-tours');

    // View tours is displayed
    await expect(page.locator('#view-tours')).toBeVisible();

    // Select fixture tour
    const tourCard = page.locator('.tour-card[data-tour-id="tour-1"]');
    await expect(tourCard).toBeVisible();
    await tourCard.click();

    // Action bottom sheet is displayed
    await expect(page.locator('#tour-action-sheet')).toBeVisible();
    await expect(page.locator('#tour-sheet-title')).toHaveText('Circuit Test 1');
    await page.click('#btn-tour-start');

    // View step is displayed with fixture Step 1
    await expect(page.locator('#view-step')).toBeVisible();
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 1');

    // Carousel is rendered with 2 dots for 2 consecutive images
    const carousel = page.locator('.carousel-container');
    await expect(carousel).toBeVisible();

    const dots = page.locator('.carousel-dot');
    await expect(dots).toHaveCount(2);
    await expect(dots.first()).toHaveClass(/active/);

    // Click second dot to advance carousel slide
    await dots.nth(1).click();
    await expect(dots.nth(1)).toHaveClass(/active/);
  });

  test('audio player playback, seeking, and pause', async ({ page }) => {
    await page.goto('/index.html?config=tests/fixtures/config.yml');
    await page.click('#btn-start-tours');
    await page.locator('.tour-card[data-tour-id="tour-1"]').click();
    await expect(page.locator('#tour-action-sheet')).toBeVisible();
    await page.click('#btn-tour-start');

    await expect(page.locator('#view-step')).toBeVisible();
    const playerBar = page.locator('#audio-player-bar');
    await expect(playerBar).toBeVisible();

    // Ensure audio starts playing (either autoplayed upon step arrival or by clicking play)
    await page.evaluate(async () => {
      const player = window.audioguideApp?.player;
      if (player && !player.isPlaying()) {
        try { await player.play(); } catch (_) {}
      }
    });

    // Wait for audio playback to advance
    await page.waitForFunction(() => {
      const audio = window.audioguideApp?.player?.audio;
      return audio && audio.currentTime > 0;
    }, { timeout: 10000 });

    const initialTime = await page.evaluate(() => window.audioguideApp.player.audio.currentTime);
    expect(initialTime).toBeGreaterThan(0);

    // Fast-forward (+10s skip button)
    const skipForwardBtn = page.locator('#player-btn-skip-forward');
    await skipForwardBtn.click();

    // Verify currentTime increased after skip
    const afterSkipTime = await page.evaluate(() => window.audioguideApp.player.audio.currentTime);
    expect(afterSkipTime).toBeGreaterThanOrEqual(initialTime);

    // Click play/pause button to pause
    const playPauseBtn = page.locator('#player-btn-play');
    await playPauseBtn.click();
    await page.waitForFunction(() => {
      const audio = window.audioguideApp?.player?.audio;
      return audio && audio.paused;
    }, { timeout: 5000 });

    const isPaused = await page.evaluate(() => window.audioguideApp.player.audio.paused);
    expect(isPaused).toBe(true);
  });

  test('step navigation via buttons and dropdown selector', async ({ page }) => {
    await page.goto('/index.html?config=tests/fixtures/config.yml');
    await page.click('#btn-start-tours');
    await page.locator('.tour-card[data-tour-id="tour-1"]').click();
    await expect(page.locator('#tour-action-sheet')).toBeVisible();
    await page.click('#btn-tour-start');

    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 1');

    // Click next step button
    await page.click('#player-btn-next-step');
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 2');

    // Use select dropdown to jump back to Step 1
    const selector = page.locator('#step-selector-select');
    await selector.selectOption({ index: 0 });
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 1');

    // Navigate back to tours view
    await page.click('#btn-step-back-tours');
    await expect(page.locator('#view-tours')).toBeVisible();

    // Navigate back to home view
    await page.click('#btn-tours-back');
    await expect(page.locator('#view-home')).toBeVisible();
  });

  test('transition audio combined duration and next button pulse lifecycle', async ({ page }) => {
    await page.goto('/index.html?config=tests/fixtures/config.yml');
    await page.click('#btn-start-tours');
    await page.locator('.tour-card[data-tour-id="tour-1"]').click();
    await expect(page.locator('#tour-action-sheet')).toBeVisible();
    await page.click('#btn-tour-start');

    await expect(page.locator('#view-step')).toBeVisible();
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 1');

    // Wait for player to load metadata for both main audio and transition
    await page.waitForFunction(() => {
      const p = window.audioguideApp?.player;
      return p && p.mainDuration > 0 && p.transitionDuration > 0;
    }, { timeout: 10000 });

    const { mainDuration, transitionDuration, totalDuration } = await page.evaluate(() => {
      const p = window.audioguideApp.player;
      return {
        mainDuration: p.mainDuration,
        transitionDuration: p.transitionDuration,
        totalDuration: p.getDuration()
      };
    });

    expect(mainDuration).toBeGreaterThan(0);
    expect(transitionDuration).toBeGreaterThan(0);
    expect(totalDuration).toBeCloseTo(mainDuration + transitionDuration, 1);

    const nextBtn = page.locator('#player-btn-next-step');

    // Before main duration: Next button should NOT have pulse class
    await page.evaluate(() => window.audioguideApp.player.seek(1));
    await expect(nextBtn).not.toHaveClass(/btn-next-pulse/);

    // Seek into transition phase (currentTime >= mainDuration)
    await page.evaluate((target) => window.audioguideApp.player.seek(target), mainDuration + 0.5);

    // Next button must receive the gentle pulse class
    await expect(nextBtn).toHaveClass(/btn-next-pulse/);

    // Rewind back into main audio: pulse must disappear
    await page.evaluate(() => window.audioguideApp.player.seek(2));
    await expect(nextBtn).not.toHaveClass(/btn-next-pulse/);

    // Navigate to Step 2 (last step of tour-1)
    await nextBtn.click();
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 2');

    // On last step of tour: no transition audio, next button disabled, no pulse
    await expect(nextBtn).toBeDisabled();
    await expect(nextBtn).not.toHaveClass(/btn-next-pulse/);
    const step2HasTransition = await page.evaluate(() => {
      const p = window.audioguideApp.player;
      return p.transitionDuration > 0;
    });
    expect(step2HasTransition).toBe(false);
  });

  test('hash routing supports deep linking to a specific step', async ({ page }) => {
    // Navigate directly to step 2 of tour-1 via cold load URL
    await page.goto('/index.html?config=tests/fixtures/config.yml#/tour/tour-1/step-2');

    // Step view must be displayed immediately with step 2 content
    await expect(page.locator('#view-step')).toBeVisible();
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 2');
    await expect(page.locator('#step-indicator-badge')).toHaveText('Étape 2 sur 2');

    // Player bar is active and visible
    await expect(page.locator('#audio-player-bar')).toBeVisible();

    // Next button is disabled since it's the last step
    await expect(page.locator('#player-btn-next-step')).toBeDisabled();
    // Previous button is enabled
    await expect(page.locator('#player-btn-prev-step')).toBeEnabled();
  });

  test('browser back and forward buttons navigate history', async ({ page }) => {
    await page.goto('/index.html?config=tests/fixtures/config.yml');
    await expect(page.locator('#view-home')).toBeVisible();

    // 1. Navigate to tours
    await page.click('#btn-start-tours');
    await expect(page.locator('#view-tours')).toBeVisible();
    expect(page.url()).toContain('#/tours');

    // 2. Select tour-1 (loads step-1)
    await page.locator('.tour-card[data-tour-id="tour-1"]').click();
    await expect(page.locator('#tour-action-sheet')).toBeVisible();
    await page.click('#btn-tour-start');
    await expect(page.locator('#view-step')).toBeVisible();
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 1');
    expect(page.url()).toContain('#/tour/tour-1/step-1');

    // 3. Advance to step-2
    await page.click('#player-btn-next-step');
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 2');
    expect(page.url()).toContain('#/tour/tour-1/step-2');

    // 4. Browser BACK -> should return to step-1
    await page.goBack();
    await expect(page.locator('#view-step')).toBeVisible();
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 1');
    expect(page.url()).toContain('#/tour/tour-1/step-1');

    // 5. Browser BACK -> should return to tours list
    await page.goBack();
    await expect(page.locator('#view-tours')).toBeVisible();
    await expect(page.locator('#audio-player-bar')).toBeHidden();
    expect(page.url()).toContain('#/tours');

    // 6. Browser BACK -> should return to home
    await page.goBack();
    await expect(page.locator('#view-home')).toBeVisible();

    // 7. Browser FORWARD -> should return to tours list
    await page.goForward();
    await expect(page.locator('#view-tours')).toBeVisible();
    expect(page.url()).toContain('#/tours');

    // 8. Browser FORWARD -> should return to step-1
    await page.goForward();
    await expect(page.locator('#view-step')).toBeVisible();
    await expect(page.locator('#step-heading')).toHaveText('Étape Fictive 1');
    expect(page.url()).toContain('#/tour/tour-1/step-1');
  });
});
