const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }]) {
      const page = await browser.newPage({ viewport, hasTouch: true, isMobile: viewport.width === 375 });
      await page.addInitScript(() => localStorage.setItem('niyun-opening-animation-enabled', 'false'));
      await page.goto('http://127.0.0.1:5173/#map');
      await page.waitForFunction(() => document.querySelector('#shandongMap')?.dataset.terrainData === 'dem');
      const map = page.locator('#shandongMap');
      await map.scrollIntoViewIfNeeded();
      await page.waitForTimeout(3500);
      await map.scrollIntoViewIfNeeded();
      const before = await map.screenshot();
      await map.screenshot({ path: path.join(process.env.TEMP, `terrain-top-${viewport.width}.png`) });
      assert.equal(await map.getAttribute('data-reference-rivers'), '7');
      assert.ok(Number(await map.getAttribute('data-lake-vertices')) > 0);
      assert.deepEqual((await map.getAttribute('data-displayed-rivers')).split(',').sort(),
        ['Huang', '沂河', '大汶河', '徒骇河', '小清河', '潍河', '大沽河', '京杭运河（山东段示意）'].sort());
      await page.locator('#mapRotation').evaluate((input) => {
        input.value = '67';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(500);
      const after = await map.screenshot({ path: path.join(process.env.TEMP, `terrain-fixed-${viewport.width}.png`) });
      assert.notDeepEqual(before, after, 'elevation must change rendered map');
      const canvasShot = await page.locator('#shandongTerrainCanvas').screenshot();
      const { data, info } = await sharp(canvasShot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let pixels = 0;
      for (let i = 0; i < data.length; i += info.channels) {
        if (data[i] > 65 && data[i + 1] > data[i] && data[i + 2] < data[i + 1]) pixels++;
      }
      assert.ok(pixels > 1000, `terrain canvas is blank: ${pixels}`);
      console.log(`${viewport.width}px: elevation interaction passed; ${pixels} terrain-colored pixels`);
      if (viewport.width === 375) {
        const cdp = await page.context().newCDPSession(page);
        const bounds = await map.boundingBox();
        const markerBounds = await map.locator('.map-marker').first().boundingBox();
        const y = markerBounds.y + markerBounds.height / 2;
        const x = markerBounds.x + markerBounds.width / 2;
        const first = { x: bounds.x + bounds.width - 90, y: y + 55, id: 1 };
        const second = { x, y, id: 2 };
        const distance = () => map.getAttribute('data-camera-distance').then(Number);
        const initial = await distance();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...first, y: first.y + 60 }, second] });
        assert.ok(await distance() < initial, 'native two-finger spread must zoom in over a marker');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        console.log('375px: native multitouch pinch over marker passed');
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
