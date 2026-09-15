const fs = require('node:fs/promises');
const path = require('node:path');

async function updateWeishanLake() {
  const source = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson';
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Lake source HTTP ${response.status}`);
  const data = await response.json();
  const feature = data.features.find(item => item.properties.name === 'Weishan Hu');
  if (!feature || feature.geometry.type !== 'Polygon') throw new Error('Weishan polygon missing');
  await fs.writeFile(path.join(__dirname, '../data/shandong-lakes.js'),
    `/* Natural Earth 1:10m lakes, public domain. Source: ${source}\n * Generalized lake outline; displayed depth is illustrative. */\nwindow.SHANDONG_LAKES = ${JSON.stringify([{ name: '微山湖', rings: feature.geometry.coordinates }])};\n`);
  console.log('Imported Weishan Hu polygon including interior rings.');
}

updateWeishanLake().catch(function reportLakeImportFailure(error) {
  console.error(error.message);
  process.exitCode = 1;
});
