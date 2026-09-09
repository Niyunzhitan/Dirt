const root = document.querySelector("#product3dShowcase");

/*
 * ==================== 3D 展厅交互参数 ====================
 * 单位：角度使用弧度，相机距离使用 Three.js 场景单位，速度为每秒弧度。
 */
const showcaseSettings = {
  defaultAutoRotate: false,
  initialRotationX: 0,
  initialRotationY: 0,
  cameraPositionY: 0,
  pokerCameraDistance: 11.5,
  mahjongCameraDistance: 10.5,
  cameraMinDistance: 7,
  cameraMaxDistance: 16,
  dragRotateX: 0.009,
  dragRotateY: 0.012,
  wheelZoomSpeed: 0.008,
  autoRotateSpeed: 0.32,
  rotationSmoothing: 0.09,
};

if (root && window.SEAL_3D_PRODUCTS) {
  const config = window.SEAL_3D_PRODUCTS;
  const canvas = root.querySelector("#product3dCanvas");
  const viewport = root.querySelector(".product-3d-viewport");
  const status = root.querySelector("#product3dStatus");
  const title = root.querySelector("#product3dTitle");
  const subtitle = root.querySelector("#product3dSubtitle");
  const description = root.querySelector("#product3dDescription");
  const counter = root.querySelector("#product3dCounter");
  const autoRotateButton = root.querySelector("#product3dAutoRotate");
  const flipButton = root.querySelector("#product3dFlip");
  const resetButton = root.querySelector("#product3dReset");
  const fullscreenButton = root.querySelector("#product3dFullscreen");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // 封泥牌具不使用投影阴影，避免模型下方出现深色阴影块。
  renderer.shadowMap.enabled = false;
  renderer.setClearColor(0x000000, 0);

  scene.add(new THREE.HemisphereLight(0xf5ead8, 0x1f302b, 2.35));
  const keyLight = new THREE.DirectionalLight(0xfff1d6, 4.5);
  keyLight.position.set(5, 7, 7);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x9dbeb2, 2.2);
  rimLight.position.set(-5, 2, -4);
  scene.add(rimLight);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  let mode = "mahjong";
  let itemIndex = 0;
  let model = null;
  let autoRotate = showcaseSettings.defaultAutoRotate;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let targetRotation = { x: showcaseSettings.initialRotationX, y: showcaseSettings.initialRotationY };
  let flipped = false;
  let loadRevision = 0;
  let showcaseVisible = true;
  let animationFrameId = 0;

  const textureLoader = new THREE.TextureLoader();

  // 在中心点周围画圆角矩形，后面把它加厚就得到扑克牌的实体。
  function roundedRectShape(width, height, radius) {
    const x = -width / 2;
    const y = -height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
  }

  // 图片加载失败时仍显示带牌名的备用牌面，不让模型变成空白。
  function makePlaceholderTexture(item, type, face) {
    const size = type === "poker" ? { width: 750, height: 1050 } : { width: 768, height: 1024 };
    const surface = document.createElement("canvas");
    surface.width = size.width;
    surface.height = size.height;
    const ctx = surface.getContext("2d");
    const dark = face === "back" || face === "side";
    ctx.fillStyle = dark ? "#243b34" : "#eee8dc";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.strokeStyle = dark ? "#b43b31" : "#9f3028";
    ctx.lineWidth = Math.round(size.width * 0.018);
    ctx.strokeRect(size.width * 0.06, size.height * 0.045, size.width * 0.88, size.height * 0.91);
    ctx.setLineDash([18, 12]);
    ctx.lineWidth = 3;
    ctx.strokeRect(size.width * 0.09, size.height * 0.07, size.width * 0.82, size.height * 0.86);
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = dark ? "#ede1cf" : "#3a302b";
    ctx.font = `700 ${Math.round(size.width * 0.17)}px serif`;
    ctx.fillText(face === "front" ? item.code : "泥云智探", size.width / 2, size.height * 0.38);
    ctx.fillStyle = dark ? "#d5ad74" : "#a5322a";
    ctx.font = `700 ${Math.round(size.width * 0.09)}px serif`;
    ctx.fillText(face === "front" ? item.title : "齐鲁封泥牌具", size.width / 2, size.height * 0.57);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  // 麻将侧边没有单独的图片，用画布生成木纹和边框。
  function makeMahjongEdgeTexture(direction = "vertical") {
    const surface = document.createElement("canvas");
    surface.width = 512;
    surface.height = 512;
    const ctx = surface.getContext("2d");

    const base = ctx.createLinearGradient(
      0,
      0,
      direction === "vertical" ? surface.width : 0,
      direction === "vertical" ? 0 : surface.height,
    );
    base.addColorStop(0, "#d7d7c5");
    base.addColorStop(0.18, "#eee9da");
    base.addColorStop(0.5, "#f5efe2");
    base.addColorStop(0.82, "#e7e3d4");
    base.addColorStop(1, "#c7cbc0");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, surface.width, surface.height);

    // 细木纹与纸纤维只提供近看质感，不与正面封泥图案争夺注意力。
    ctx.lineWidth = 1;
    for (let index = 0; index < 34; index += 1) {
      const offset = 18 + index * 15;
      const bend = Math.sin(index * 1.7) * 8;
      ctx.beginPath();
      if (direction === "vertical") {
        ctx.moveTo(offset, 0);
        ctx.bezierCurveTo(offset + bend, 150, offset - bend, 350, offset + bend * 0.4, 512);
      } else {
        ctx.moveTo(0, offset);
        ctx.bezierCurveTo(150, offset + bend, 350, offset - bend, 512, offset + bend * 0.4);
      }
      ctx.strokeStyle = index % 3 === 0 ? "rgba(91, 111, 119, 0.12)" : "rgba(145, 111, 82, 0.08)";
      ctx.stroke();
    }

    ctx.strokeStyle = "#657b84";
    ctx.lineWidth = 16;
    ctx.strokeRect(12, 12, 488, 488);
    ctx.strokeStyle = "rgba(101, 123, 132, 0.58)";
    ctx.lineWidth = 3;
    ctx.strokeRect(34, 34, 444, 444);

    // 中央暗记采用无文字菱形印纹，任意方向观看都成立。
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "rgba(185, 74, 50, 0.1)";
    ctx.strokeStyle = "rgba(185, 74, 50, 0.58)";
    ctx.lineWidth = 5;
    ctx.fillRect(-62, -62, 124, 124);
    ctx.strokeRect(-62, -62, 124, 124);
    ctx.strokeStyle = "rgba(101, 123, 132, 0.7)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-43, -43, 86, 86);
    ctx.restore();

    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  // 双击网页时读内嵌图片，网站模式读安全地址；两种方式失败都返回备用牌面。
  async function loadTexture(path, fallback) {
    if (window.location.protocol === "file:") {
      const inlineSource = window.SEAL_INLINE_TEXTURES?.[path];
      if (!inlineSource) return fallback;
      try {
        const image = await new Promise((resolve, reject) => {
          const localImage = new Image();
          localImage.addEventListener(
            "load",
            function handleLoad() {
              return resolve(localImage);
            },
            { once: true },
          );
          localImage.addEventListener("error", reject, { once: true });
          localImage.src = inlineSource;
        });
        const texture = new THREE.Texture(image);
        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return texture;
      } catch (_) {
        return fallback;
      }
    }
    const safePath = window.MediaSecurity?.resolve(path) || "";
    if (!safePath) return fallback;
    try {
      const texture = await textureLoader.loadAsync(safePath);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    } catch (_) {
      return fallback;
    }
  }

  // 换牌时释放旧模型占用的显存，仅从页面移除对象并不会自动释放这些资源。
  function disposeModel() {
    while (modelRoot.children.length) {
      const child = modelRoot.children.pop();
      child.traverse((object) => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => {
          material.map?.dispose();
          material.dispose?.();
        });
      });
    }
  }

  // 把图片贴在牌的正面或背面，稍微离开实体表面以免两层画面闪烁。
  function makeFace(width, height, depth, texture, back = false) {
    // 标准平面自带 0～1 UV，Photoshop 导出的整张贴图可以无损铺满。
    const geometry = new THREE.PlaneGeometry(width * 0.94, height * 0.94);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.58,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const faceOffset = depth / 2 + 0.04;
    mesh.position.z = back ? -faceOffset : faceOffset;
    if (back) mesh.rotation.y = Math.PI;
    return mesh;
  }

  // 将薄的圆角牌身与正反两张牌面组合成一张扑克牌。
  function buildPoker(item, textures) {
    const size = config.poker.model;
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRectShape(size.width, size.height, size.radius), {
        depth: size.depth,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.035,
        bevelThickness: 0.025,
        curveSegments: 14,
      }),
      new THREE.MeshStandardMaterial({ color: 0xe9e1d3, roughness: 0.74, metalness: 0 }),
    );
    body.geometry.center();
    group.add(
      body,
      makeFace(size.width, size.height, size.depth, textures.front),
      makeFace(size.width, size.height, size.depth, textures.back, true),
    );
    return group;
  }

  // 麻将由较厚的牌身、侧边纹理和正反牌面组成。
  function buildMahjong(item, textures) {
    const size = config.mahjong.model;
    const group = new THREE.Group();
    const sideMaterial = new THREE.MeshPhysicalMaterial({
      map: textures.side,
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.24,
      clearcoatRoughness: 0.56,
    });
    const capMaterial = new THREE.MeshPhysicalMaterial({
      map: textures.cap,
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.24,
      clearcoatRoughness: 0.56,
    });
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe9e5d8,
      roughness: 0.32,
      metalness: 0,
      clearcoat: 0.28,
      clearcoatRoughness: 0.52,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(size.width, size.height, size.depth, 6, 8, 5), [
      sideMaterial,
      sideMaterial,
      capMaterial,
      capMaterial,
      bodyMaterial,
      bodyMaterial,
    ]);
    group.add(body);
    const front = makeFace(size.width, size.height, size.depth, textures.front);
    const back = makeFace(size.width, size.height, size.depth, textures.back, true);
    group.add(front, back);
    return group;
  }

  // 加载当前选中的牌；编号用来识别过期请求，防止连续切换后显示上一张。
  async function loadCurrentItem() {
    const revision = ++loadRevision;
    const collection = config[mode];
    const item = collection.items[itemIndex];
    status.textContent = "正在加载牌具…";
    title.textContent = item.title;
    subtitle.textContent = item.subtitle;
    description.textContent = item.description;
    counter.textContent = `${String(itemIndex + 1).padStart(2, "0")} / ${String(collection.items.length).padStart(2, "0")}`;

    const frontFallback = makePlaceholderTexture(item, mode, "front");
    const backFallback = makePlaceholderTexture(item, mode, "back");
    const sideFallback =
      mode === "mahjong" ? makeMahjongEdgeTexture("vertical") : makePlaceholderTexture(item, mode, "side");
    const capFallback = mode === "mahjong" ? makeMahjongEdgeTexture("horizontal") : sideFallback;
    const [front, back, side] = await Promise.all([
      loadTexture(item.front, frontFallback),
      loadTexture(item.back, backFallback),
      Promise.resolve(sideFallback),
    ]);
    if (revision !== loadRevision) return;
    disposeModel();
    model =
      mode === "poker"
        ? buildPoker(item, { front, back, side })
        : buildMahjong(item, { front, back, side, cap: capFallback });
    model.rotation.set(targetRotation.x, targetRotation.y, 0);
    modelRoot.add(model);
    flipped = false;
    status.textContent = "拖动旋转 · 滚轮缩放 · 双击翻面";
    updateButtons();
  }

  // 根据实际状态更新按钮文字和选中标记，让按钮与模型保持一致。
  function updateButtons() {
    autoRotateButton.setAttribute("aria-pressed", String(autoRotate));
    autoRotateButton.textContent = autoRotate ? "暂停旋转" : "自动旋转";
    flipButton.textContent = flipped ? "查看正面" : "翻到背面";
    root.querySelectorAll("[data-product-mode]").forEach((button) => {
      const active = button.dataset.productMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  // 换牌具种类时回到该组第一件，同时恢复合适的相机距离。
  function setMode(nextMode) {
    if (!config[nextMode] || nextMode === mode) return;
    mode = nextMode;
    itemIndex = 0;
    resetView();
    updateButtons();
    loadCurrentItem();
  }

  // 恢复初始角度和距离，不改变用户正在看的牌具种类。
  function resetView() {
    targetRotation = { x: showcaseSettings.initialRotationX, y: showcaseSettings.initialRotationY };
    camera.position.set(
      0,
      showcaseSettings.cameraPositionY,
      mode === "poker" ? showcaseSettings.pokerCameraDistance : showcaseSettings.mahjongCameraDistance,
    );
    camera.lookAt(0, 0, 0);
    if (model) model.rotation.set(targetRotation.x, targetRotation.y, 0);
    flipped = false;
  }

  // 容器尺寸变化后同步画布与相机比例，避免模型被拉宽或压扁。
  function resize() {
    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  // direction 为 1 是下一件，-1 是上一件；到头后从另一端继续。
  function changeItem(direction) {
    const count = config[mode].items.length;
    itemIndex += direction;
    if (itemIndex < 0) itemIndex = count - 1;
    if (itemIndex >= count) itemIndex = 0;
    loadCurrentItem();
  }

  // 每次再转半圈；按钮点击和双击模型共用这一入口。
  function flipItem() {
    flipped = !flipped;
    targetRotation.y += Math.PI;
    updateButtons();
  }

  root.addEventListener("click", function handleClick(event) {
    const modeButton = event.target.closest("[data-product-mode]");
    if (modeButton) return setMode(modeButton.dataset.productMode);
    if (event.target.closest("#product3dPrev")) changeItem(-1);
    if (event.target.closest("#product3dNext")) changeItem(1);
    if (event.target.closest("#product3dFlip")) flipItem();
    if (event.target.closest("#product3dAutoRotate")) {
      autoRotate = !autoRotate;
      updateButtons();
    }
    if (event.target.closest("#product3dReset")) {
      resetView();
      updateButtons();
    }
    if (event.target.closest("#product3dFullscreen")) viewport.requestFullscreen?.();
  });

  viewport.addEventListener("pointerdown", function handlePointerdown(event) {
    if (event.target.closest("button, .product-3d-mode, .product-3d-controls")) return;
    isDragging = true;
    autoRotate = false;
    dragStart = { x: event.clientX, y: event.clientY };
    viewport.setPointerCapture(event.pointerId);
    updateButtons();
  });
  viewport.addEventListener("pointermove", function handlePointermove(event) {
    if (!isDragging) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    targetRotation.y += dx * showcaseSettings.dragRotateY;
    targetRotation.x = THREE.MathUtils.clamp(
      targetRotation.x + dy * showcaseSettings.dragRotateX,
      -1.15,
      1.15,
    );
    dragStart = { x: event.clientX, y: event.clientY };
  });
  viewport.addEventListener("pointerup", function handlePointerup() {
    isDragging = false;
  });
  viewport.addEventListener("pointercancel", function handlePointercancel() {
    isDragging = false;
  });
  viewport.addEventListener("dblclick", function handleDblclick(event) {
    if (!event.target.closest("button")) flipItem();
  });
  viewport.addEventListener(
    "wheel",
    function handleWheel(event) {
      event.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(
        camera.position.z + event.deltaY * showcaseSettings.wheelZoomSpeed,
        showcaseSettings.cameraMinDistance,
        showcaseSettings.cameraMaxDistance,
      );
    },
    { passive: false },
  );

  new ResizeObserver(resize).observe(viewport);
  document.addEventListener("fullscreenchange", resize);

  // 3D 展厅离开视口或页面切到后台时暂停渲染，回来后再从当前状态继续。
  const showcaseVisibilityObserver = new IntersectionObserver(
    ([entry]) => {
      showcaseVisible = entry.isIntersecting;
      if (showcaseVisible && !document.hidden && !animationFrameId) animate();
    },
    { threshold: 0.01 },
  );
  showcaseVisibilityObserver.observe(root);
  document.addEventListener("visibilitychange", function handleVisibilitychange() {
    if (document.hidden && animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    } else if (!document.hidden && showcaseVisible && !animationFrameId) {
      animate();
    }
  });

  const clock = new THREE.Clock();
  // 模型逐帧靠近拖动的目标角度；离开视口后暂停，减少不必要的绘制。
  function animate() {
    if (!showcaseVisible || document.hidden) {
      animationFrameId = 0;
      return;
    }
    animationFrameId = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.04);
    if (model) {
      if (autoRotate && document.documentElement.dataset.motion !== "0")
        targetRotation.y += delta * showcaseSettings.autoRotateSpeed;
      model.rotation.x += (targetRotation.x - model.rotation.x) * showcaseSettings.rotationSmoothing;
      model.rotation.y += (targetRotation.y - model.rotation.y) * showcaseSettings.rotationSmoothing;
    }
    renderer.render(scene, camera);
  }

  resetView();
  resize();
  updateButtons();
  loadCurrentItem();
  animate();
}
