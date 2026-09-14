const fs = require('node:fs/promises');
const path = require('node:path');

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
        const inside = point[0] >= 114.8 && point[0] <= 122.71 && point[1] >= 34.37 && point[1] <= 38.41;
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
