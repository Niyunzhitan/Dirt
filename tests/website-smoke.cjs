const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function verifyWebsite() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of [1440, 375]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(function disableOpeningForSmokeTest() {
        localStorage.setItem('niyun-opening-animation-enabled', 'false');
      });
      // These tests exercise the UI without calling a paid upstream service.
      await page.route('**/api/ai/**', async function mockAiResponse(route) {
        const statusRequest = route.request().url().endsWith('/status');
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(statusRequest
            ? { connected: true, configured: true, verified: true }
            : { reply: 'Smoke test response', sessionId: 'smoke-session' }),
        });
      });
      await page.goto('http://127.0.0.1:5173/');
      await page.waitForFunction(() => document.querySelectorAll('.map-marker').length > 0);
      await page.waitForFunction(() => document.querySelectorAll('.quiz-option').length === 4);
      await page.locator('#openSearch').click();
      await page.locator('#searchInput').fill('临淄');
      await page.locator('#doSearch').click();
      await page.locator('[data-search-id]').first().waitFor();
      await page.locator('#closeSearch').click();
      await page.waitForFunction(() => !document.querySelector('#searchDialog').open);
      await page.locator('#openSettings').click();
      await page.locator('input[name="themeMode"][value="light"]').check();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
      await page.locator('#doneSettings').click();
      await page.waitForFunction(() => !document.querySelector('#settingsDialog').open);
      await page.locator('[data-course-id="COURSE-02"]').click();
      await page.waitForFunction(() => document.querySelector('#courseMeta').textContent.includes('2'));
      await page.locator('.quiz-option').first().click();
      await page.locator('.quiz-form button[type="submit"]').click();
      await page.locator('.quiz-explanation').waitFor();
      await page.locator('#aiQuestion').fill('test');
      await page.locator('#chatForm button[type="submit"]').click();
      await page.getByText('Smoke test response', { exact: true }).waitFor();
      assert.deepEqual(errors, [], 'page must have no uncaught script errors');
      console.log(`${width}px: initialization, search, settings, courses, quiz and AI passed`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

verifyWebsite().catch(function reportSmokeFailure(error) {
  console.error(error);
  process.exitCode = 1;
});
