const fs = require('node:fs/promises');
const path = require('node:path');

async function importWaterways() {
  const query = '[out:json][timeout:90];way[waterway~"^(river|canal)$"][name](34.37,114.8,38.41,122.71);out geom;';
  const response = await fetch('https://overpass-api.de/api/interpreter?' + new URLSearchParams({ data: query }), {
    signal: AbortSignal.timeout(110000),
  });
  if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
  const data = await response.json();
  if (data.remark) throw new Error(data.remark);
  const rivers = data.elements.filter(way => way.geometry?.length > 1).map(function readWaterway(way) {
    return { name: way.tags.name, osmId: way.id, coordinates: way.geometry.map(point => [point.lon, point.lat]) };
  });
  if (!rivers.length) throw new Error('No waterways returned');
  console.log(JSON.stringify({ ways: rivers.length, names: [...new Set(rivers.map(river => river.name))] }));
  await fs.writeFile(path.join(__dirname, '../data/shandong-rivers.js'),
    '/* OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright\n * Named river/canal ways via Overpass; illustrative channel width/depth. */\nwindow.SHANDONG_RIVERS = ' + JSON.stringify(rivers) + ';\n');
}

importWaterways().catch(function reportImportFailure(error) {
  console.error(error.message);
  process.exitCode = 1;
});
