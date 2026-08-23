const mapRoot = document.querySelector("#shandongMap");

if (mapRoot && window.THREE && window.SHANDONG_TERRAIN) {
  const canvas = mapRoot.querySelector("#shandongTerrainCanvas");
  const status = mapRoot.querySelector("#mapTerrainStatus");
  const rotationInput = mapRoot.querySelector("#mapRotation");
  const rotationOutput = mapRoot.querySelector("#mapRotationValue");
  const config = window.SHANDONG_TERRAIN;

  // ==================== 地图可配置项 ====================
  // 日常调整视角、缩放和网格精度时只修改这里，不必进入渲染逻辑。
  const MAP_VIEW = {
    terrainWidth: 18,
    // 高度图为 768 x 392；使用半分辨率网格，细节更清楚且浏览器负担可控。
    gridColumns: 768 / 2,
    gridRows: 392 / 2,
    defaultDistance: 18.5,
    // 最大放大比例：5 表示地图最多放大到默认大小的 5 倍。
    maxZoomFactor: 5,
    maxDistance: 22,
    wheelSpeed: 0.012,
    pinchSpeed: 0.025,
    panSpeed: 1,
    // 只允许向上抬升视角；弧度制，不会左右转向。
    maxElevation: 1.20,
    maxPanX: 7,
    maxPanY: 4,
    viewportPadding: 1.16,
    fitScreenPadding: 0.82,
    boundaryHeightOffset: 0.045,
    boundaryColor: 0xe6d4b5,
    // 省界内缩检测距离（百分比坐标），用于去掉市级数据自带的山东外轮廓线。
    boundaryInteriorMargin: 0.7
  };
  MAP_VIEW.minDistance = MAP_VIEW.defaultDistance / MAP_VIEW.maxZoomFactor;

  try {
    const scene = new THREE.Scene();
    // 正射相机没有透视缩短，更接近标准 2D 地图的观察方式。
    const camera = new THREE.OrthographicCamera(-9, 9, 6, -6, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // 地图只需要柔和地形明暗，不启用实时阴影，避免出现灰色投影层。
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(0x000000, 0);

    scene.add(new THREE.HemisphereLight(0xe8dfca, 0x18302b, 2.4));
    const sun = new THREE.DirectionalLight(0xffe4bd, 4.8);
    sun.position.set(-5, -3, 10);
    scene.add(sun);
    const coastLight = new THREE.DirectionalLight(0x8db9aa, 2.1);
    coastLight.position.set(8, 5, 4);
    scene.add(coastLight);

    const isFilePage = window.location.protocol === "file:";
    // 保持原始 DEM 的经纬度比例，避免把山东省纵向拉长。
    const terrainWidth = MAP_VIEW.terrainWidth;
    const terrainHeightDimension = terrainWidth * (config.bounds.north - config.bounds.south) / (config.bounds.east - config.bounds.west);
    const geometry = new THREE.PlaneGeometry(terrainWidth, terrainHeightDimension, MAP_VIEW.gridColumns - 1, MAP_VIEW.gridRows - 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x55776b,
      roughness: 0.72,
      metalness: 0.02,
      clearcoat: 0.08,
      clearcoatRoughness: 0.82,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.5
    });

    let heightSamples = null;
    let maskSamples = null;
    let maskTexture = null;
    let heightWidth = 0;
    let heightHeight = 0;

    // 只把公开的本地灰度高度图读入内存，不在浏览器中加载原始 GeoTIFF。
    function loadHeightMap() {
      const inline = window.SHANDONG_TERRAIN_INLINE;
      if (isFilePage && inline) {
        heightWidth = inline.width;
        heightHeight = inline.height;
        heightSamples = Uint8Array.from(atob(inline.heightBase64), (char) => char.charCodeAt(0));
        maskSamples = Uint8Array.from(atob(inline.maskBase64), (char) => char.charCodeAt(0));
        const rgbaMask = new Uint8Array(maskSamples.length * 4);
        for (let index = 0; index < maskSamples.length; index += 1) {
          const value = maskSamples[index];
          rgbaMask[index * 4] = value;
          rgbaMask[index * 4 + 1] = value;
          rgbaMask[index * 4 + 2] = value;
          rgbaMask[index * 4 + 3] = value;
        }
        maskTexture = new THREE.DataTexture(rgbaMask, heightWidth, heightHeight, THREE.RGBAFormat, THREE.UnsignedByteType);
        maskTexture.colorSpace = THREE.NoColorSpace;
        // DataTexture 默认不翻转 Y；高度数组和普通图片都按“北到南”读取，必须统一方向。
        maskTexture.flipY = true;
        maskTexture.minFilter = THREE.NearestFilter;
        maskTexture.magFilter = THREE.NearestFilter;
        maskTexture.generateMipmaps = false;
        maskTexture.needsUpdate = true;
        material.alphaMap = maskTexture;
        material.needsUpdate = true;
        applyHeightMap();
        mapRoot.dataset.terrainBoundary = "dem-mask-inline";
        status.textContent = "山东省 DEM 30 米 · 双击打开模式";
        return;
      }
      if (!config.heightDataUrl) {
        mapRoot.dataset.terrainData = "fallback";
        return;
      }
      const image = new Image();
      image.onload = () => {
        const heightCanvas = document.createElement("canvas");
        heightCanvas.width = image.naturalWidth;
        heightCanvas.height = image.naturalHeight;
        const context = heightCanvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        let pixels;
        try {
          pixels = context.getImageData(0, 0, image.naturalWidth, image.naturalHeight).data;
        } catch (_) {
          heightSamples = null;
          status.textContent = "高度图读取受浏览器安全限制 · 请使用 node server.js";
          return;
        }
        heightWidth = image.naturalWidth;
        heightHeight = image.naturalHeight;
        heightSamples = new Uint8Array(heightWidth * heightHeight);
        for (let index = 0; index < heightSamples.length; index += 1) heightSamples[index] = pixels[index * 4];
        applyHeightMap();
      };
      image.onerror = () => { heightSamples = null; };
      image.src = config.heightDataUrl;
      if (isFilePage) return;
      const maskImage = new Image();
      maskImage.onload = () => {
        // 读取掩膜像素，供高度采样使用；可见边界由 alphaMap 负责裁剪。
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = maskImage.naturalWidth;
        maskCanvas.height = maskImage.naturalHeight;
        const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
        maskContext.drawImage(maskImage, 0, 0);
        const maskPixels = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
        heightWidth = heightWidth || maskCanvas.width;
        heightHeight = heightHeight || maskCanvas.height;
        maskSamples = new Uint8Array(maskCanvas.width * maskCanvas.height);
        for (let index = 0; index < maskSamples.length; index += 1) maskSamples[index] = maskPixels[index * 4];
        maskTexture = new THREE.Texture(maskImage);
        maskTexture.colorSpace = THREE.NoColorSpace;
        maskTexture.minFilter = THREE.NearestFilter;
        maskTexture.magFilter = THREE.NearestFilter;
        maskTexture.generateMipmaps = false;
        maskTexture.needsUpdate = true;
        material.alphaMap = maskTexture;
        material.transparent = true;
        material.alphaTest = 0.5;
        material.needsUpdate = true;
        applyHeightMap();
        mapRoot.dataset.terrainBoundary = "dem-mask";
      };
      maskImage.src = config.maskDataUrl;
    }

    function sampleHeight(percentX, percentY) {
      if (!heightSamples) return null;
      const x = Math.min(heightWidth - 1, Math.max(0, Math.round((percentX / 100) * (heightWidth - 1))));
      const y = Math.min(heightHeight - 1, Math.max(0, Math.round((percentY / 100) * (heightHeight - 1))));
      return heightSamples[y * heightWidth + x] / 255;
    }

    function sampleMask(percentX, percentY) {
      if (!maskSamples) return 255;
      const x = Math.min(heightWidth - 1, Math.max(0, Math.round((percentX / 100) * (heightWidth - 1))));
      const y = Math.min(heightHeight - 1, Math.max(0, Math.round((percentY / 100) * (heightHeight - 1))));
      return maskSamples[y * heightWidth + x];
    }

    function applyHeightMap() {
      if (!heightSamples) return;
      const sampledHeights = new Float32Array(position.count);
      const validVertices = new Uint8Array(position.count);
      for (let index = 0; index < position.count; index += 1) {
        const percentX = ((position.getX(index) + terrainWidth / 2) / terrainWidth) * 100;
        const percentY = ((terrainHeightDimension / 2 - position.getY(index)) / terrainHeightDimension) * 100;
        const value = sampleHeight(percentX, percentY);
        const maskValue = sampleMask(percentX, percentY);
        const height = value === null
          ? config.terrain.baseDepth + 0.12
          : config.terrain.baseDepth + value * config.terrain.reliefScale * config.terrain.heightExaggeration + 0.12;
        sampledHeights[index] = height;
        validVertices[index] = !maskSamples || maskValue >= 128 ? 1 : 0;
      }

      // 省外像元仍需有连续高度，否则透明边界下会暴露出陡直的 DEM 断面。
      if (maskSamples) {
        const columns = MAP_VIEW.gridColumns;
        const rows = Math.floor(position.count / columns);
        for (let index = 0; index < position.count; index += 1) {
          if (validVertices[index]) continue;
          const column = index % columns;
          const row = Math.floor(index / columns);
          let replacement = sampledHeights[index];
          for (let radius = 1; radius < Math.max(columns, rows); radius += 1) {
            let found = false;
            for (let offset = -radius; offset <= radius && !found; offset += 1) {
              const candidates = [
                [column + offset, row - radius], [column + offset, row + radius],
                [column - radius, row + offset], [column + radius, row + offset]
              ];
              for (const [candidateColumn, candidateRow] of candidates) {
                if (candidateColumn < 0 || candidateColumn >= columns || candidateRow < 0 || candidateRow >= rows) continue;
                const candidateIndex = candidateRow * columns + candidateColumn;
                if (validVertices[candidateIndex]) {
                  replacement = sampledHeights[candidateIndex];
                  found = true;
                  break;
                }
              }
            }
            if (found) break;
          }
          sampledHeights[index] = replacement;
        }
      }

      for (let index = 0; index < position.count; index += 1) {
        position.setZ(index, sampledHeights[index]);
      }
      geometry.computeVertexNormals();
      drawAdministrativeBoundaries();
      mapRoot.dataset.terrainData = "dem";
    }

    // 高度图加载前先用平面占位，加载完成后由 applyHeightMap 覆盖。
    const position = geometry.getAttribute("position");
    for (let index = 0; index < position.count; index += 1) {
      position.setZ(index, 0.02);
    }
    geometry.computeVertexNormals();

    const terrain = new THREE.Mesh(geometry, material);
    terrain.castShadow = false;
    terrain.receiveShadow = false;
    // 默认与标准 2D 地图一致：北朝上、东朝右，不额外旋转或倾斜。
    terrain.position.y = 0.12;
    scene.add(terrain);

    const boundaryMaterial = new THREE.LineBasicMaterial({
      color: MAP_VIEW.boundaryColor,
      transparent: true,
      opacity: 0.72,
      depthTest: false,
      depthWrite: false
    });
    const administrativeBoundaries = new THREE.Group();
    administrativeBoundaries.name = "山东省地级市边界";
    terrain.add(administrativeBoundaries);
    let boundaryFitPoints = [];

    function isInsideProvince(percentX, percentY) {
      if (!maskSamples) return true;
      const margin = MAP_VIEW.boundaryInteriorMargin;
      return [
        [0, 0], [-margin, 0], [margin, 0], [0, -margin], [0, margin],
        [-margin, -margin], [margin, -margin], [-margin, margin], [margin, margin]
      ].every(([offsetX, offsetY]) => sampleMask(percentX + offsetX, percentY + offsetY) >= 128);
    }

    function createBoundaryPoint(longitude, latitude) {
      const percentX = ((longitude - config.bounds.west) / (config.bounds.east - config.bounds.west)) * 100;
      const percentY = ((config.bounds.north - latitude) / (config.bounds.north - config.bounds.south)) * 100;
      if (!isInsideProvince(percentX, percentY)) return null;
      return new THREE.Vector3(
        (percentX / 100) * terrainWidth - terrainWidth / 2,
        terrainHeightDimension / 2 - (percentY / 100) * terrainHeightDimension,
        terrainHeight(percentX, percentY) + MAP_VIEW.boundaryHeightOffset
      );
    }

    function drawAdministrativeBoundaries() {
      if (!heightSamples || !Array.isArray(window.SHANDONG_PREFECTURES)) return;
      administrativeBoundaries.clear();
      boundaryFitPoints = [];
      window.SHANDONG_PREFECTURES.forEach((prefecture) => {
        prefecture.rings.forEach((ring) => {
          let segment = [];
          const flushSegment = () => {
            if (segment.length < 2) { segment = []; return; }
            boundaryFitPoints.push(...segment);
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(segment), boundaryMaterial);
            line.userData.prefecture = prefecture.name;
            line.renderOrder = 10;
            administrativeBoundaries.add(line);
            segment = [];
          };
          ring.forEach(([longitude, latitude]) => {
            const point = createBoundaryPoint(longitude, latitude);
            if (point) segment.push(point);
            else flushSegment();
          });
          flushSegment();
        });
      });
      mapRoot.dataset.administrativeBoundaries = String(administrativeBoundaries.children.length);
      fitFullView();
    }

    const cameraTarget = new THREE.Vector3(0, 0, 0);
    // 默认拉远，保证完整山东轮廓不会被视口裁掉。
    let cameraDistance = MAP_VIEW.defaultDistance;
    let fitZoom = 1;
    // 默认正上方；抬升角只由右侧滑条控制。
    let cameraElevation = 0;
    let isDragging = false;
    let lastPointer = { x: 0, y: 0 };
    const activePointers = new Map();
    let pinchDistance = 0;

    function updateCamera() {
      cameraElevation = THREE.MathUtils.clamp(cameraElevation, 0, MAP_VIEW.maxElevation);
      // 正角度滑条对应视觉上的“向上抬升”，因此相机沿 Y 轴负方向移动。
      const horizontal = Math.cos(cameraElevation) * cameraDistance;
      camera.position.set(
        cameraTarget.x,
        cameraTarget.y - Math.sin(cameraElevation) * cameraDistance,
        cameraTarget.z + horizontal
      );
      camera.zoom = fitZoom * MAP_VIEW.defaultDistance / cameraDistance;
      camera.lookAt(cameraTarget);
      camera.updateProjectionMatrix();
      // fitFullView 会在同一事件中立即投影坐标，不能等下一帧渲染再更新矩阵。
      camera.updateMatrixWorld(true);
      // 将状态写在地图元素上，便于测试和排查，不包含任何用户数据。
      mapRoot.dataset.cameraElevation = cameraElevation.toFixed(4);
      mapRoot.dataset.cameraDistance = cameraDistance.toFixed(2);
      mapRoot.dataset.cameraTargetX = cameraTarget.x.toFixed(3);
      mapRoot.dataset.cameraTargetY = cameraTarget.y.toFixed(3);
      mapRoot.dataset.cameraTargetZ = cameraTarget.z.toFixed(3);
      const elevationDegrees = Math.round(THREE.MathUtils.radToDeg(cameraElevation));
      if (rotationInput && Number(rotationInput.value) !== elevationDegrees) rotationInput.value = String(elevationDegrees);
      if (rotationOutput) rotationOutput.textContent = `${elevationDegrees}°`;
    }

    updateCamera();

    function resize() {
      const rect = mapRoot.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      const aspect = rect.width / rect.height;
      // 根据容器比例自动留出边距，窄屏也必须默认显示山东全貌。
      const viewWidth = Math.max(terrainWidth * MAP_VIEW.viewportPadding, terrainHeightDimension * MAP_VIEW.viewportPadding * aspect);
      const viewHeight = viewWidth / aspect;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      fitFullView();
    }

    // 根据当前抬升角计算地形投影包络，避免山东东西或南北边缘被裁掉。
    function fitFullView() {
      // 用默认地图距离计算“全貌基准”，不要把用户当前缩放状态混进 fitZoom。
      // 这样浏览器缩放或窗口尺寸变化后，用户仍能继续使用原来的地图缩放级别。
      const userDistance = cameraDistance;
      cameraDistance = MAP_VIEW.defaultDistance;
      fitZoom = 1;
      updateCamera();
      terrain.updateMatrixWorld(true);
      const maxTerrainHeight = config.terrain.baseDepth + config.terrain.reliefScale * config.terrain.heightExaggeration + 0.12;
      const corners = [];
      [-1, 1].forEach((x) => [-1, 1].forEach((y) => [0, maxTerrainHeight].forEach((z) => {
        const point = new THREE.Vector3(x * terrainWidth / 2, y * terrainHeightDimension / 2, z);
        terrain.localToWorld(point);
        corners.push(point.project(camera));
      })));
      boundaryFitPoints.forEach((localPoint) => {
        const point = localPoint.clone();
        terrain.localToWorld(point);
        corners.push(point.project(camera));
      });
      const maxProjectedX = Math.max(...corners.map((point) => Math.abs(point.x)), 0.01);
      const maxProjectedY = Math.max(...corners.map((point) => Math.abs(point.y)), 0.01);
      const fitFactor = Math.min(MAP_VIEW.fitScreenPadding / maxProjectedX, MAP_VIEW.fitScreenPadding / maxProjectedY, 1);
      fitZoom = Math.max(0.25, fitFactor);
      cameraDistance = userDistance;
      updateCamera();
      mapRoot.dataset.fitZoom = fitZoom.toFixed(4);
    }

    function terrainHeight(percentX, percentY) {
      const demValue = sampleHeight(percentX, percentY);
      if (maskSamples) {
        const maskX = Math.min(heightWidth - 1, Math.max(0, Math.round((percentX / 100) * (heightWidth - 1))));
        const maskY = Math.min(heightHeight - 1, Math.max(0, Math.round((percentY / 100) * (heightHeight - 1))));
        if (maskSamples[maskY * heightWidth + maskX] < 128) return config.terrain.baseDepth + 0.12;
      }
      if (demValue !== null) return config.terrain.baseDepth + demValue * config.terrain.reliefScale * config.terrain.heightExaggeration + 0.12;
      return 0.12;
    }

    // 点位与地形共享同一组百分比坐标，旋转或缩放时重新投影到屏幕。
    function projectMarkers() {
      const rect = mapRoot.getBoundingClientRect();
      mapRoot.querySelectorAll(".map-marker").forEach((marker) => {
        const percentX = Number(marker.dataset.terrainX);
        const percentY = Number(marker.dataset.terrainY);
        if (!Number.isFinite(percentX) || !Number.isFinite(percentY)) return;
        const point = new THREE.Vector3((percentX / 100) * terrainWidth - terrainWidth / 2, terrainHeightDimension / 2 - (percentY / 100) * terrainHeightDimension, terrainHeight(percentX, percentY));
        terrain.localToWorld(point);
        point.project(camera);
        const visible = point.z > -1 && point.z < 1 && point.x > -1.15 && point.x < 1.15 && point.y > -1.15 && point.y < 1.15;
        marker.style.left = `${(point.x + 1) * 50}%`;
        marker.style.top = `${(1 - point.y) * 50}%`;
        marker.style.visibility = visible ? "visible" : "hidden";
        marker.style.zIndex = String(Math.round(5 + (1 - point.z) * 10));
      });
    }

    mapRoot.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button, input, .map-legend, .map-terrain-status, .map-rotation-control")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.size === 2) {
        const [first, second] = [...activePointers.values()];
        pinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
        return;
      }
      isDragging = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      mapRoot.setPointerCapture(event.pointerId);
      mapRoot.classList.add("is-dragging");
    });
    mapRoot.addEventListener("pointermove", (event) => {
      if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.size === 2) {
        const [first, second] = [...activePointers.values()];
        const nextDistance = Math.hypot(first.x - second.x, first.y - second.y);
        if (pinchDistance) cameraDistance = THREE.MathUtils.clamp(cameraDistance - (nextDistance - pinchDistance) * MAP_VIEW.pinchSpeed, MAP_VIEW.minDistance, MAP_VIEW.maxDistance);
        pinchDistance = nextDistance;
        updateCamera();
        return;
      }
      if (!isDragging) return;
      const deltaX = event.clientX - lastPointer.x;
      const deltaY = event.clientY - lastPointer.y;
      const rect = mapRoot.getBoundingClientRect();
      const worldPerPixelX = (camera.right - camera.left) / (camera.zoom * rect.width);
      const worldPerPixelY = (camera.top - camera.bottom) / (camera.zoom * rect.height);
      // 相机和目标一起沿屏幕平移方向移动，保持相对姿态不变。
      const elements = camera.matrixWorld.elements;
      const screenRight = new THREE.Vector3(elements[0], elements[1], elements[2]);
      const screenUp = new THREE.Vector3(elements[4], elements[5], elements[6]);
      const pan = screenRight.multiplyScalar(-deltaX * worldPerPixelX * MAP_VIEW.panSpeed)
        .add(screenUp.multiplyScalar(deltaY * worldPerPixelY * MAP_VIEW.panSpeed));
      const nextTarget = cameraTarget.clone().add(pan);
      nextTarget.x = THREE.MathUtils.clamp(nextTarget.x, -MAP_VIEW.maxPanX, MAP_VIEW.maxPanX);
      nextTarget.y = THREE.MathUtils.clamp(nextTarget.y, -MAP_VIEW.maxPanY, MAP_VIEW.maxPanY);
      cameraTarget.copy(nextTarget);
      lastPointer = { x: event.clientX, y: event.clientY };
      updateCamera();
    });
    function stopDragging(event) {
      if (event?.pointerId !== undefined) activePointers.delete(event.pointerId);
      if (activePointers.size < 2) pinchDistance = 0;
      isDragging = false;
      mapRoot.classList.remove("is-dragging");
      if (event?.pointerId !== undefined && mapRoot.hasPointerCapture(event.pointerId)) mapRoot.releasePointerCapture(event.pointerId);
    }
    mapRoot.addEventListener("pointerup", stopDragging);
    mapRoot.addEventListener("pointercancel", stopDragging);
    mapRoot.addEventListener("wheel", (event) => {
      event.preventDefault();
      cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * MAP_VIEW.wheelSpeed, MAP_VIEW.minDistance, MAP_VIEW.maxDistance);
      updateCamera();
    }, { passive: false });

    function resetMapView() {
      cameraDistance = MAP_VIEW.defaultDistance;
      cameraElevation = 0;
      cameraTarget.set(0, 0, 0);
      fitFullView();
    }

    mapRoot.addEventListener("dblclick", resetMapView);
      if (rotationInput) {
      const maxElevationDegrees = Math.round(THREE.MathUtils.radToDeg(MAP_VIEW.maxElevation));
      rotationInput.min = "0";
      rotationInput.max = String(maxElevationDegrees);
      rotationInput.addEventListener("input", () => {
        cameraElevation = THREE.MathUtils.degToRad(Number(rotationInput.value));
        fitFullView();
      });
    }
    mapRoot.addEventListener("click", (event) => {
      if (event.target.closest("[data-map-reset]")) resetMapView();
    });

    new ResizeObserver(resize).observe(mapRoot);
    resize();
    mapRoot.classList.add("has-three-terrain");
    status.textContent = config.attribution;
    loadHeightMap();

    function animate() {
      requestAnimationFrame(animate);
      // 点位必须跟随相机投影，不能再使用固定的 CSS 百分比位置。
      projectMarkers();
      renderer.render(scene, camera);
    }
    animate();
  } catch (error) {
    console.warn("山东地貌初始化失败，已回退到平面地图。", error);
    status.textContent = "平面地图模式";
  }
}
