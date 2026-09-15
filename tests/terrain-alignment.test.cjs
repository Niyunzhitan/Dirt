const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

async function setupMap(prefectures = [], rivers = [], referenceRivers = [], lakes = [], referenceLakes = []) {
  const THREE = await import('three');
  let scene;
  let camera;
  const frames = [];
  const input = { value: '0', addEventListener(type, handler) { this[type] = handler; } };
  const marker = { dataset: { terrainX: '43.27', terrainY: '56.13' }, style: {} };
  const handlers = {};
  const captures = new Set();
  const root = {
    dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(type, handler, options) { handlers[options === true ? `${type}Capture` : type] = handler; },
    setPointerCapture(id) { captures.add(id); },
    hasPointerCapture(id) { return captures.has(id); },
    releasePointerCapture(id) { captures.delete(id); },
    getBoundingClientRect: () => ({ width: 1000, height: 650 }),
    querySelector: (s) => s === '#mapTerrainStatus' ? {} : s === '#mapRotation' ? input : null,
    querySelectorAll: () => [marker],
  };
  const context = {
    THREE: { ...THREE, WebGLRenderer: class {
      shadowMap = {};
      setPixelRatio() {} setClearColor() {} setSize() {}
      render(s, c) { scene = s; camera = c; }
    } },
    document: { querySelector: () => root, addEventListener() {} },
    window: {
      THREE: true, location: { protocol: 'file:' }, devicePixelRatio: 1,
      requestAnimationFrame: (f) => frames.push(f), addEventListener() {},
      SHANDONG_TERRAIN_INLINE: {
        width: 4, height: 4,
        heightBase64: Buffer.from([0, 255, 0, 255, 255, 0, 255, 0, 0, 255, 0, 255, 255, 0, 255, 0]).toString('base64'),
        maskBase64: Buffer.alloc(16, 255).toString('base64'),
      },
      SHANDONG_PREFECTURES: prefectures,
      SHANDONG_RIVERS: rivers,
      SHANDONG_REFERENCE_RIVERS: referenceRivers,
      SHANDONG_LAKES: lakes,
      SHANDONG_REFERENCE_LAKES: referenceLakes,
    },
    ResizeObserver: class { observe() {} },
    IntersectionObserver: class { observe() {} },
    atob, console,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('data/shandong-terrain.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('js/three-map.js', 'utf8'), context);
  while (frames.length) frames.shift()();
  return { THREE, scene, camera, frames, input, marker, root, handlers, captures };
}

test('DEM updates reach the GPU and overlays follow mesh triangles', async () => {
  const { THREE, scene, camera, frames, input, marker } = await setupMap();
  const terrain = scene.children.find((item) => item.isMesh);
  assert.ok(terrain.geometry.attributes.position.version > 0,
    'DEM positions changed without needsUpdate: GPU keeps the flat placeholder');
  for (const angle of [0, 45, 67]) {
    input.value = String(angle);
    input.input();
    while (frames.length) frames.shift()();
    terrain.updateMatrixWorld(true);
    const x = (Number(marker.dataset.terrainX) / 100 - 0.5) * 18;
    const height = terrain.geometry.parameters.height;
    const y = (0.5 - Number(marker.dataset.terrainY) / 100) * height + terrain.position.y;
    const ray = new THREE.Raycaster(new THREE.Vector3(x, y, 10), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(terrain, false)[0];
    assert.ok(hit, 'marker must intersect terrain');
    const projected = hit.point.project(camera);
    assert.ok(Math.abs(parseFloat(marker.style.top) - (1 - projected.y) * 50) < 0.0001,
      `marker floats above rendered triangle at ${angle} degrees`);
  }
});

test('reset responds to a single click after dragging while gesture clicks stay suppressed', async () => {
  const { root, handlers, input } = await setupMap();
  const ground = { closest: () => null };
  const pointer = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100, target: ground };
  handlers.pointerdown(pointer);
  handlers.pointermove({ ...pointer, clientX: 180 });
  handlers.pointerup(pointer);
  let blocked = false;
  const click = { detail: 1, target: ground, preventDefault() {}, stopImmediatePropagation() { blocked = true; } };
  handlers.clickCapture(click);
  assert.equal(blocked, true, 'drag-generated clicks must remain blocked');
  handlers.wheel({ deltaY: -200, preventDefault() {} });
  input.value = '45';
  input.input();
  const reset = { closest: () => ({ matches: () => false }) };
  handlers.pointerdown({ ...pointer, target: reset });
  blocked = false;
  const resetClick = { ...click, target: reset };
  handlers.clickCapture(resetClick);
  if (!blocked) handlers.click(resetClick);
  assert.equal(blocked, false, 'reset button must not inherit the previous drag suppression');
  assert.equal(root.dataset.cameraDistance, '18.50');
  assert.equal(root.dataset.cameraElevation, '0.0000');
  assert.equal(root.dataset.cameraTargetX, '0.000');
});

test('single-city duplicated rings are not inter-city boundaries', async () => {
  const ring = [[118.227585, 38.037874], [118.410001, 38.053277], [118.40779, 38.026212], [118.2234, 38.00095], [118.227585, 38.037874]];
  const { scene } = await setupMap([{ name: 'Dongying', rings: [ring, [...ring].reverse()] }]);
  assert.equal(scene.children.find((item) => item.isMesh).children[0].children.length, 0);
});

test('reported Dongying-Binzhou rectangle is excluded even with two owners', async () => {
  const ring = [[118.40779,38.026212],[118.419951,38.025503],[118.419319,38.053119],[118.410001,38.053277],[118.40779,38.026212]];
  const { scene } = await setupMap([
    { name: 'Dongying', rings: [ring] },
    { name: 'Binzhou', rings: [[...ring].reverse()] },
  ]);
  assert.equal(scene.children.find((item) => item.isMesh).children[0].children.length, 0);
});

test('river centerline lowers mesh vertices, not an elevated overlay', async () => {
  const baseline = await setupMap();
  const carved = await setupMap([], [{ name: 'Huang', coordinates: [[115, 35], [122, 38]] }]);
  const original = baseline.scene.children.find((item) => item.isMesh).geometry.attributes.position;
  const updated = carved.scene.children.find((item) => item.isMesh).geometry.attributes.position;
  let lowered = 0;
  for (let index = 0; index < original.count; index++) {
    assert.ok(updated.getZ(index) <= original.getZ(index));
    if (updated.getZ(index) < original.getZ(index)) lowered++;
  }
  assert.ok(lowered > 0);
});

test('unselected waterways do not carve any terrain', async () => {
  const { root } = await setupMap([], [
    { name: 'Other', coordinates: [[115, 35], [122, 38]] },
    { name: 'Zhang', coordinates: [[116, 35], [121, 38]] },
  ]);
  assert.equal(root.dataset.riverVertices, '0');
  assert.equal(root.dataset.displayedRivers, '');
});

test('real datasets display selected rivers and Grand Canal', async () => {
  const data = { window: {} };
  for (const file of ['data/shandong-rivers.js', 'data/shandong-rivers-reference.js']) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), data);
  }
  const { root } = await setupMap([], data.window.SHANDONG_RIVERS, data.window.SHANDONG_REFERENCE_RIVERS);
  assert.deepEqual(root.dataset.displayedRivers.split(',').sort(),
    ['Huang', '沂河', '大汶河', '徒骇河', '小清河', '潍河', '大沽河', '京杭运河（山东段示意）'].sort());
  assert.ok(Number(root.dataset.riverVertices) > 0);
});

test('Yihe carves terrain near Linyi and Weishan fills lake interior', async () => {
  const data = { window: {} };
  for (const file of ['data/shandong-rivers-reference.js', 'data/shandong-lakes.js']) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), data);
  }
  const baseline = await setupMap();
  const result = await setupMap([], [], data.window.SHANDONG_REFERENCE_RIVERS, data.window.SHANDONG_LAKES);
  const original = baseline.scene.children.find(item => item.isMesh).geometry.attributes.position;
  const mesh = result.scene.children.find(item => item.isMesh);
  const updated = mesh.geometry.attributes.position;
  const x = (118.38 - 114.8102646639) / (122.706 - 114.8102646639) * 18 - 9;
  const y = mesh.geometry.parameters.height / 2 - (38.3997238086 - 35.13) / (38.3997238086 - 34.3786) * mesh.geometry.parameters.height;
  let nearest = 0;
  let distance = Infinity;
  for (let index = 0; index < updated.count; index++) {
    const next = Math.hypot(updated.getX(index) - x, updated.getY(index) - y);
    if (next < distance) { nearest = index; distance = next; }
  }
  assert.ok(updated.getZ(nearest) < original.getZ(nearest), 'Linyi river point must be lowered');
  assert.ok(Number(result.root.dataset.lakeVertices) > 0, 'lake polygon interior must be filled');
});

test('northern Nansi lake sketch adds water beyond the southern Weishan polygon', async () => {
  const data = { window: {} };
  for (const file of ['data/shandong-lakes.js', 'data/shandong-lakes-reference.js']) {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), data);
  }
  const south = await setupMap([], [], [], data.window.SHANDONG_LAKES);
  const combined = await setupMap([], [], [], data.window.SHANDONG_LAKES, data.window.SHANDONG_REFERENCE_LAKES);
  assert.ok(Number(combined.root.dataset.lakeVertices) > Number(south.root.dataset.lakeVertices) * 2);
  const mesh = combined.scene.children.find(item => item.isMesh);
  const original = south.scene.children.find(item => item.isMesh).geometry.attributes.position;
  const updated = mesh.geometry.attributes.position;
  let northernWater = 0;
  for (let i = 0; i < updated.count; i++) {
    const latitude = 38.3997238086 - (mesh.geometry.parameters.height / 2 - updated.getY(i)) / mesh.geometry.parameters.height * (38.3997238086 - 34.3786);
    if (latitude > 35.1 && updated.getZ(i) < original.getZ(i)) northernWater++;
  }
  assert.ok(northernWater > 0, 'lake must extend north toward Jining');
});

test('Yihe outlet turns southwest rather than extending to the southern map edge', () => {
  const data = { window: {} };
  vm.runInNewContext(fs.readFileSync('data/shandong-rivers-reference.js', 'utf8'), data);
  const river = data.window.SHANDONG_REFERENCE_RIVERS.find(item => item.name === '沂河');
  const last = river.coordinates.at(-1);
  const previous = river.coordinates.at(-2);
  assert.ok(last[0] < previous[0] && last[1] < previous[1]);
  assert.ok(last[1] > 34.5, 'do not extend to the map bounding-box bottom');
  assert.equal(river.extendEndToCoast, undefined, 'an inland outlet is not a sea mouth');
});

test('boundary segments follow terrain between source vertices', async () => {
  const { THREE, scene } = await setupMap([
    { name: 'first', rings: [[[115, 35], [122, 38]]] },
    { name: 'second', rings: [[[122, 38], [115, 35]]] },
  ]);
  const terrain = scene.children.find((item) => item.isMesh);
  terrain.updateMatrixWorld(true);
  const lines = terrain.children[0].children;
  assert.ok(lines.length);
  for (const line of lines) {
    const positions = line.geometry.attributes.position;
    for (let i = 1; i < positions.count; i++) {
      const midpoint = new THREE.Vector3().fromBufferAttribute(positions, i - 1)
        .add(new THREE.Vector3().fromBufferAttribute(positions, i)).multiplyScalar(0.5);
      terrain.localToWorld(midpoint);
      const ray = new THREE.Raycaster(new THREE.Vector3(midpoint.x, midpoint.y, 10), new THREE.Vector3(0, 0, -1));
      const hit = ray.intersectObject(terrain, false)[0];
      assert.ok(hit);
      assert.ok(midpoint.z - hit.point.z > 0 && midpoint.z - hit.point.z < 0.007,
        'boundary must remain just above the rendered triangle throughout each segment');
    }
  }
});

test('pinch accepts marker touches and resumes single-finger pan', async () => {
  const { root, handlers, captures } = await setupMap();
  const event = (id, x, onMarker = false) => ({
    pointerId: id, pointerType: 'touch', clientX: x, clientY: 200,
    target: { closest: () => onMarker ? { matches: (s) => s === '.map-marker' } : null },
  });
  handlers.pointerdown(event(1, 100));
  handlers.pointerdown(event(2, 200, true));
  handlers.pointermove(event(2, 250, true));
  assert.ok(Number(root.dataset.cameraDistance) < 18.5, 'spreading fingers over a marker must zoom in');
  assert.deepEqual([...captures], [1, 2], 'both fingers must remain captured');
  handlers.pointermove(event(2, 210));
  const zoom = Number(root.dataset.cameraDistance);
  assert.ok(zoom > 17.25, 'bringing fingers together must zoom out');
  handlers.pointerup(event(2, 210));
  const x = root.dataset.cameraTargetX;
  handlers.pointermove(event(1, 120));
  assert.notEqual(root.dataset.cameraTargetX, x, 'remaining finger must resume panning');
  handlers.pointercancel(event(1, 120));
  assert.equal(captures.size, 0);
  const stopped = root.dataset.cameraTargetX;
  handlers.pointermove(event(1, 160));
  assert.equal(root.dataset.cameraTargetX, stopped, 'cancelled touches must not move the map');
});
