const fs = require('node:fs/promises');
const path = require('node:path');

async function updatePrefectures() {
  const source = 'https://geo.datav.aliyun.com/areas_v3/bound/370000_full.json';
  const response = await fetch(source);
  if (!response.ok) throw new Error(`DataV HTTP ${response.status}`);
  const data = await response.json();
  if (data.features?.length !== 16) throw new Error('Expected 16 prefectures');
  const prefectures = data.features.map(function readPrefecture(feature) {
    const { type, coordinates } = feature.geometry;
    if (!['Polygon', 'MultiPolygon'].includes(type)) throw new Error(`Unexpected geometry: ${type}`);
    return {
      name: feature.properties.name.replace(/市$/, ''),
      // 展示层按边统计归属；这里仅展开环数组，不把不同环拼成一条折线。
      rings: type === 'MultiPolygon' ? coordinates.flat() : coordinates,
    };
  });
  const header = `/* DataV administrative polygons, not rivers. Source: ${source}\n * Full source vertices retained; cultural visualization, not survey data.\n */\n`;
  await fs.writeFile(path.join(__dirname, '../data/shandong-prefectures.js'),
    header + 'window.SHANDONG_PREFECTURES = ' + JSON.stringify(prefectures) + ';\n');
  console.log(`Updated ${prefectures.length} prefectures without vertex simplification.`);
}

updatePrefectures().catch(function reportUpdateFailure(error) {
  console.error(error.message);
  process.exitCode = 1;
});
