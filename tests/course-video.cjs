const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function verifyCourseVideo() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const width of [1440, 375]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.addInitScript(() => localStorage.setItem('niyun-opening-animation-enabled', 'false'));
      await page.goto(process.env.TEST_URL || 'http://127.0.0.1:3187/');
      await page.waitForFunction(() => document.querySelector('#courseRecapVideo').readyState >= 1);
      const video = page.locator('#courseRecapVideo');
      const poster = await video.getAttribute('poster');
      const response = await page.request.get(poster);
      assert.equal(response.status(), 200);
      assert.match(response.headers()['content-type'], /^image\//);
      await video.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `docs/qa/course-video-${width}.png` });
      await video.evaluate(async (element) => {
        element.muted = true;
        await element.play();
      });
      await page.waitForFunction(() => document.querySelector('#courseRecapVideo').currentTime > 0.5);
      await video.evaluate((element) => { element.currentTime = 120; });
      await page.waitForFunction(() => {
        const element = document.querySelector('#courseRecapVideo');
        return !element.seeking && element.currentTime >= 120 && element.readyState >= 2;
      });
      assert.equal(await page.locator('#courseRecapError').isVisible(), false);
      await video.evaluate((element) => element.pause());
      await page.route('**/assets/courses/course-recap.mp4*', (route) => route.fulfill({ status: 404 }));
      await video.evaluate((element) => { element.src += '?missing'; element.load(); });
      await page.locator('#courseRecapError').waitFor({ state: 'visible' });
      await page.unroute('**/assets/courses/course-recap.mp4*');
      await video.evaluate((element) => { element.src = element.src.split('?')[0]; element.load(); });
      await page.waitForFunction(() => document.querySelector('#courseRecapVideo').readyState >= 1);
      assert.equal(await page.locator('#courseRecapError').isVisible(), false);
      console.log(`${width}px: poster, playback, seeking, error and recovery passed`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

verifyCourseVideo().catch((error) => { console.error(error); process.exitCode = 1; });
