const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

async function setupMap() {
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
    addEventListener(type, handler) { handlers[type] = handler; },
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
      SHANDONG_PREFECTURES: [],
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
