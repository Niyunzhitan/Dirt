const fs = require('node:fs/promises');
const path = require('node:path');

// 这里只筛选包围盒内的连续顶点，不做精确省界裁剪，也不补画缺失河段。
function isWithinMapBounds([longitude, latitude]) {
  return longitude >= 114.8 && longitude <= 122.71 && latitude >= 34.37 && latitude <= 38.41;
}

async function updateRivers() {
  const source = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson';
  const response = await fetch(source);
  if (!response.ok) throw new Error(`River source HTTP ${response.status}`);
  const data = await response.json();
  const rivers = [];
  for (const feature of data.features) {
    const lines = feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates
      : feature.geometry.type === 'LineString' ? [feature.geometry.coordinates] : [];
    for (const line of lines) {
      let segment = [];
      for (const point of line) {
        const inside = isWithinMapBounds(point);
        if (inside) segment.push(point.slice(0, 2));
        else {
          if (segment.length > 1) rivers.push({ name: feature.properties.name, coordinates: segment });
          segment = [];
        }
      }
      if (segment.length > 1) rivers.push({ name: feature.properties.name, coordinates: segment });
    }
  }
  if (!rivers.length) throw new Error('No river geometry found');
  await fs.writeFile(path.join(__dirname, '../data/shandong-rivers.js'),
    `/* Natural Earth 1:10m rivers/lake centerlines, public domain.\n * Source: ${source}\n * Generalized centerlines; channel width/depth are illustrative, not measured. */\nwindow.SHANDONG_RIVERS = ${JSON.stringify(rivers)};\n`);
  console.log(rivers.map(river => `${river.name}: ${river.coordinates.length}`).join('\n'));
}

updateRivers().catch(function reportRiverImportFailure(error) {
  console.error(error.message);
  process.exitCode = 1;
});
