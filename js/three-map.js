const mapRoot = document.querySelector("#shandongMap");

if (mapRoot && window.THREE && window.SHANDONG_TERRAIN) {
  mapRoot.dataset.mapMode = mapRoot.dataset.mapMode || "terrain";
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
    maxElevation: 1.2,
    maxPanX: 7,
    maxPanY: 4,
    viewportPadding: 1.16,
    fitScreenPadding: 0.82,
    boundaryHeightOffset: 0.006,
    boundaryColor: 0xe6d4b5,
    // 省界内缩检测距离（百分比坐标），用于去掉市级数据自带的山东外轮廓线。
    boundaryInteriorMargin: 0.7,
  };
  MAP_VIEW.minDistance = MAP_VIEW.defaultDistance / MAP_VIEW.maxZoomFactor;

  try {
    const scene = new THREE.Scene();
    // 正射相机没有透视缩短，更接近标准 2D 地图的观察方式。
    const camera = new THREE.OrthographicCamera(-9, 9, 6, -6, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // 地图只需要柔和地形明暗，不启用实时阴影，避免出现灰色投影层。
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(0x000000, 0);

    // 地图没有自动动画；只在相机、窗口或点位发生变化时请求一帧，避免离屏时持续占用 GPU。
    let mapVisible = true;
    let mapRenderFrame = 0;
    let markersNeedProjection = true;
    const requestMapRender = function requestMapRender() {
      if (!mapVisible || mapRenderFrame) return;
        mapRenderFrame = window.requestAnimationFrame(function renderRequestedMapFrame() {
        mapRenderFrame = 0;
        if (!mapVisible) return;
        if (markersNeedProjection) {
          projectMarkers();
          markersNeedProjection = false;
        }
        renderer.render(scene, camera);
      });
    };

    // 点位 DOM、平面图尺寸和地图容器可能在不同帧准备好。
    // 连续请求两帧可避开首次布局尚未稳定时得到的旧尺寸，不需要恢复持续渲染循环。
    const invalidateMarkerProjection = function invalidateMarkerProjection() {
      markersNeedProjection = true;
      requestMapRender();
      window.requestAnimationFrame(function reprojectAfterLayout() {
        markersNeedProjection = true;
        requestMapRender();
      });
    };
    window.addEventListener("shandong-map-mode-change", function handleShandongMapModeChange(event) {
      mapRoot.dataset.mapMode = event.detail?.mode === "flat" ? "flat" : "terrain";
      invalidateMarkerProjection();
    });

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
    const terrainHeightDimension =
      (terrainWidth * (config.bounds.north - config.bounds.south)) /
      (config.bounds.east - config.bounds.west);
    const geometry = new THREE.PlaneGeometry(
      terrainWidth,
      terrainHeightDimension,
      MAP_VIEW.gridColumns - 1,
      MAP_VIEW.gridRows - 1,
    );
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.72,
      metalness: 0.02,
      clearcoat: 0.08,
      clearcoatRoughness: 0.82,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.5,
    });

    let heightSamples = null;
    let maskSamples = null;
    let maskTexture = null;
    let heightWidth = 0;
    let heightHeight = 0;

    // 只把公开的本地灰度高度图读入内存，不在浏览器中加载原始 GeoTIFF。
    // 读取表示地面高低的灰度图及省界遮罩；本地双击模式使用内嵌数据。
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
        maskTexture = new THREE.DataTexture(
          rgbaMask,
          heightWidth,
          heightHeight,
          THREE.RGBAFormat,
          THREE.UnsignedByteType,
        );
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
        status.textContent = config.attribution;
        return;
      }
      if (!config.heightDataUrl) {
        mapRoot.dataset.terrainData = "fallback";
        return;
      }
      const image = new Image();
      image.onload = function readLoadedHeightMap() {
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
        for (let index = 0; index < heightSamples.length; index += 1)
          heightSamples[index] = pixels[index * 4];
        applyHeightMap();
      };
      image.onerror = function handleHeightMapError() {
        heightSamples = null;
      };
      image.src = config.heightDataUrl;
      if (isFilePage) return;
      const maskImage = new Image();
      maskImage.onload = function readLoadedProvinceMask() {
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
        for (let index = 0; index < maskSamples.length; index += 1)
          maskSamples[index] = maskPixels[index * 4];
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

    // 把地图上的相对位置换成图片像素，取出该位置的高度值。
    function sampleHeight(percentX, percentY) {
      if (!heightSamples) return null;
      const x = Math.min(heightWidth - 1, Math.max(0, Math.round((percentX / 100) * (heightWidth - 1))));
      const y = Math.min(heightHeight - 1, Math.max(0, Math.round((percentY / 100) * (heightHeight - 1))));
      return heightSamples[y * heightWidth + x] / 255;
    }

    // 从遮罩图判断当前位置是否属于省内，避免省外也长出地形。
    function sampleMask(percentX, percentY) {
      if (!maskSamples) return 255;
      const x = Math.min(heightWidth - 1, Math.max(0, Math.round((percentX / 100) * (heightWidth - 1))));
      const y = Math.min(heightHeight - 1, Math.max(0, Math.round((percentY / 100) * (heightHeight - 1))));
      return maskSamples[y * heightWidth + x];
    }

    // 按高度图调整网格顶点，并重新计算表面方向，让光照能表现山地起伏。
    function applyHeightMap() {
      if (!heightSamples) return;
      const sampledHeights = new Float32Array(position.count);
      const validVertices = new Uint8Array(position.count);
      for (let index = 0; index < position.count; index += 1) {
        const percentX = ((position.getX(index) + terrainWidth / 2) / terrainWidth) * 100;
        const percentY = ((terrainHeightDimension / 2 - position.getY(index)) / terrainHeightDimension) * 100;
        const value = sampleHeight(percentX, percentY);
        const maskValue = sampleMask(percentX, percentY);
        const height =
          value === null
            ? config.terrain.baseDepth + 0.12
            : config.terrain.baseDepth +
              value * config.terrain.reliefScale * config.terrain.heightExaggeration +
              0.12;
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
                [column + offset, row - radius],
                [column + offset, row + radius],
                [column - radius, row + offset],
                [column + radius, row + offset],
              ];
              for (const [candidateColumn, candidateRow] of candidates) {
                if (
                  candidateColumn < 0 ||
                  candidateColumn >= columns ||
                  candidateRow < 0 ||
                  candidateRow >= rows
                )
                  continue;
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
      carveRiverChannels();
      // CPU 改顶点不会自动上传 GPU；漏掉此标记会让覆盖物悬在旧平面上。
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      drawAdministrativeBoundaries();
      invalidateMarkerProjection();
      mapRoot.dataset.terrainData = "dem";
    }

    // 高度图加载前先用平面占位，加载完成后由 applyHeightMap 覆盖。
    const position = geometry.getAttribute("position");
    const terrainColors = position.clone();
    geometry.setAttribute("color", terrainColors);
    for (let index = 0; index < position.count; index += 1) {
      position.setZ(index, 0.02);
      terrainColors.setXYZ(index, 0.091, 0.184, 0.147);
    }
    geometry.computeVertexNormals();

    // 先把经纬度折线转成模型线段，距离计算不再关心数据源格式。
    function createRiverSegments() {
      const segments = [];
      (window.SHANDONG_RIVERS || []).forEach(function projectRiver(river) {
        const points = river.coordinates.map(([longitude, latitude]) => [
          (longitude - config.bounds.west) / (config.bounds.east - config.bounds.west) * terrainWidth - terrainWidth / 2,
          terrainHeightDimension / 2 - (config.bounds.north - latitude) / (config.bounds.north - config.bounds.south) * terrainHeightDimension,
        ]);
        for (let index = 1; index < points.length; index++) segments.push([points[index - 1], points[index]]);
      });
      return segments;
    }

    function distanceToRiverSegment(x, y, start, end) {
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const lengthSquared = dx * dx + dy * dy;
      // 投影限制在线段内；重复坐标退化为点，避免除以零。
      const projection = lengthSquared
        ? THREE.MathUtils.clamp(((x - start[0]) * dx + (y - start[1]) * dy) / lengthSquared, 0, 1)
        : 0;
      return Math.hypot(x - start[0] - projection * dx, y - start[1] - projection * dy);
    }

    function carveRiverChannels() {
      const segments = createRiverSegments();
      // 半径为 0.85 个网格间距，不是实测河宽；每次都在新采样的 DEM 上开槽。
      const radius = terrainWidth / (MAP_VIEW.gridColumns - 1) * 0.85;
      let carved = 0;
      for (let index = 0; index < position.count; index++) {
        const x = position.getX(index);
        const y = position.getY(index);
        let distance = radius;
        for (const [a, b] of segments) {
          if (x < Math.min(a[0], b[0]) - radius || x > Math.max(a[0], b[0]) + radius ||
              y < Math.min(a[1], b[1]) - radius || y > Math.max(a[1], b[1]) + radius) continue;
          distance = Math.min(distance, distanceToRiverSegment(x, y, a, b));
        }
        const amount = 1 - distance / radius;
        position.setZ(index, position.getZ(index) - amount * 0.055);
        terrainColors.setXYZ(index, 0.091 + amount * (0.025 - 0.091),
          0.184 + amount * (0.32 - 0.184), 0.147 + amount * (0.48 - 0.147));
        if (amount > 0) carved++;
      }
      terrainColors.needsUpdate = true;
      mapRoot.dataset.riverVertices = String(carved);
    }

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
      depthTest: true,
      depthWrite: false,
    });
    const administrativeBoundaries = new THREE.Group();
    administrativeBoundaries.name = "山东省地级市边界";
    terrain.add(administrativeBoundaries);
    let boundaryFitPoints = [];

    function isInsideProvince(percentX, percentY) {
      if (!maskSamples) return true;
      const margin = MAP_VIEW.boundaryInteriorMargin;
      return [
        [0, 0],
        [-margin, 0],
        [margin, 0],
        [0, -margin],
        [0, margin],
        [-margin, -margin],
        [margin, -margin],
        [-margin, margin],
        [margin, margin],
      ].every(([offsetX, offsetY]) => sampleMask(percentX + offsetX, percentY + offsetY) >= 128);
    }

    // 将经纬度转换为模型坐标，边界线还要贴近当地地形高度。
    function createBoundaryPoint(longitude, latitude) {
      const percentX = ((longitude - config.bounds.west) / (config.bounds.east - config.bounds.west)) * 100;
      const percentY = ((config.bounds.north - latitude) / (config.bounds.north - config.bounds.south)) * 100;
      if (!isInsideProvince(percentX, percentY)) return null;
      return new THREE.Vector3(
        (percentX / 100) * terrainWidth - terrainWidth / 2,
        terrainHeightDimension / 2 - (percentY / 100) * terrainHeightDimension,
        terrainHeight(percentX, percentY) + MAP_VIEW.boundaryHeightOffset,
      );
    }

    // 沿网格边和对角线切分：每段位于同一三角面内，插值高度才能全程贴地。
    function splitBoundaryEdge(start, end) {
      const columns = MAP_VIEW.gridColumns - 1;
      const rows = MAP_VIEW.gridRows - 1;
      const gridPoint = ([longitude, latitude]) => [
        (longitude - config.bounds.west) / (config.bounds.east - config.bounds.west) * columns,
        (config.bounds.north - latitude) / (config.bounds.north - config.bounds.south) * rows,
      ];
      const [x0, y0] = gridPoint(start);
      const [x1, y1] = gridPoint(end);
      const fractions = [0, 1];
      for (const [a, b] of [[x0, x1], [y0, y1], [x0 + y0, x1 + y1]]) {
        if (Math.abs(b - a) < 1e-10) continue;
        for (let edge = Math.floor(Math.min(a, b)) + 1; edge < Math.max(a, b); edge++) {
          fractions.push((edge - a) / (b - a));
        }
      }
      return [...new Set(fractions)].sort((a, b) => a - b).map(function interpolateBoundary(t) {
        return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
      });
    }

    // 端点排序让正向和反向线段使用同一个键；保留源坐标精度，不做模糊吸附。
    function edgeKey(start, end) {
      return [start.join(','), end.join(',')].sort().join('|');
    }

    function createExcludedBoundaryEdges() {
      // DataV 东营/滨州的独立四边形共同边：行政含义待核实，暂不作为市界展示。
      // 精确排除已报告的四条边，不按面积过滤，避免隐藏其他真实飞地或闭合边界。
      const unverifiedRectangle = [
        [118.40779, 38.026212], [118.419951, 38.025503],
        [118.419319, 38.053119], [118.410001, 38.053277], [118.40779, 38.026212],
      ];
      return new Set(unverifiedRectangle.slice(1).map((point, index) =>
        edgeKey(unverifiedRectangle[index], point)));
    }

    function collectBoundaryOwners(prefectures) {
      const edgeOwners = new Map();
      prefectures.forEach(function collectCityEdges(prefecture) {
        prefecture.rings.forEach(function collectRingEdges(ring) {
          for (let index = 1; index < ring.length; index++) {
            const key = edgeKey(ring[index - 1], ring[index]);
            if (!edgeOwners.has(key)) edgeOwners.set(key, new Set());
            edgeOwners.get(key).add(prefecture.name);
          }
        });
      });
      return edgeOwners;
    }

    // 顺序：清理旧显存 -> 统计共享边 -> 排除/去重 -> 切分贴地 -> 更新全貌视野。
    function drawAdministrativeBoundaries() {
      if (!heightSamples || !Array.isArray(window.SHANDONG_PREFECTURES)) return;
      administrativeBoundaries.children.forEach((line) => line.geometry.dispose());
      administrativeBoundaries.clear();
      boundaryFitPoints = [];
      const edgeOwners = collectBoundaryOwners(window.SHANDONG_PREFECTURES);
      const excludedEdges = createExcludedBoundaryEdges();
      const drawnEdges = new Set();
      window.SHANDONG_PREFECTURES.forEach(function drawCityBoundaries(prefecture) {
        prefecture.rings.forEach(function drawBoundaryRing(ring) {
          let segment = [];
          const flushSegment = function flushSegment() {
            if (segment.length < 2) {
              segment = [];
              return;
            }
            boundaryFitPoints.push(...segment);
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(segment), boundaryMaterial);
            line.userData.prefecture = prefecture.name;
            line.renderOrder = 10;
            administrativeBoundaries.add(line);
            segment = [];
          };
          for (let index = 1; index < ring.length; index++) {
            const key = edgeKey(ring[index - 1], ring[index]);
            if (excludedEdges.has(key) || edgeOwners.get(key).size < 2 || drawnEdges.has(key)) {
              // 被跳过的边必须断开，不能让其前后端点被自动连成新的直线。
              flushSegment();
              continue;
            }
            drawnEdges.add(key);
            const points = splitBoundaryEdge(ring[index - 1], ring[index]);
            points.forEach(function appendDrapedBoundary([longitude, latitude], pointIndex) {
              if (segment.length && pointIndex === 0) return;
              const point = createBoundaryPoint(longitude, latitude);
              if (point) segment.push(point);
              else flushSegment();
            });
          }
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
    let suppressGestureClick = false;

    // 根据旋转、缩放和拖动状态摆放相机，再让点位跟随新视角。
    function updateCamera() {
      cameraElevation = THREE.MathUtils.clamp(cameraElevation, 0, MAP_VIEW.maxElevation);
      // 正角度滑条对应视觉上的“向上抬升”，因此相机沿 Y 轴负方向移动。
      const horizontal = Math.cos(cameraElevation) * cameraDistance;
      camera.position.set(
        cameraTarget.x,
        cameraTarget.y - Math.sin(cameraElevation) * cameraDistance,
        cameraTarget.z + horizontal,
      );
      camera.zoom = (fitZoom * MAP_VIEW.defaultDistance) / cameraDistance;
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
      if (rotationInput && Number(rotationInput.value) !== elevationDegrees)
        rotationInput.value = String(elevationDegrees);
      if (rotationOutput) rotationOutput.textContent = `${elevationDegrees}°`;
      markersNeedProjection = true;
      requestMapRender();
    }

    updateCamera();

    function resize() {
      const rect = mapRoot.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      const aspect = rect.width / rect.height;
      // 根据容器比例自动留出边距，窄屏也必须默认显示山东全貌。
      const viewWidth = Math.max(
        terrainWidth * MAP_VIEW.viewportPadding,
        terrainHeightDimension * MAP_VIEW.viewportPadding * aspect,
      );
      const viewHeight = viewWidth / aspect;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      fitFullView();
      invalidateMarkerProjection();
    }

    // 计算能容纳整张地图的视野，初始化或复位时不把省界裁掉。
    function fitFullView() {
      // 用默认地图距离计算“全貌基准”，不要把用户当前缩放状态混进 fitZoom。
      // 这样浏览器缩放或窗口尺寸变化后，用户仍能继续使用原来的地图缩放级别。
      const userDistance = cameraDistance;
      cameraDistance = MAP_VIEW.defaultDistance;
      fitZoom = 1;
      updateCamera();
      terrain.updateMatrixWorld(true);
      const maxTerrainHeight =
        config.terrain.baseDepth + config.terrain.reliefScale * config.terrain.heightExaggeration + 0.12;
      const corners = [];
      [-1, 1].forEach((x) =>
        [-1, 1].forEach((y) =>
          [0, maxTerrainHeight].forEach((z) => {
            const point = new THREE.Vector3((x * terrainWidth) / 2, (y * terrainHeightDimension) / 2, z);
            terrain.localToWorld(point);
            corners.push(point.project(camera));
          }),
        ),
      );
      boundaryFitPoints.forEach((localPoint) => {
        const point = localPoint.clone();
        terrain.localToWorld(point);
        corners.push(point.project(camera));
      });
      const maxProjectedX = corners.reduce((max, point) => Math.max(max, Math.abs(point.x)), 0.01);
      const maxProjectedY = corners.reduce((max, point) => Math.max(max, Math.abs(point.y)), 0.01);
      const fitFactor = Math.min(
        MAP_VIEW.fitScreenPadding / maxProjectedX,
        MAP_VIEW.fitScreenPadding / maxProjectedY,
        1,
      );
      fitZoom = Math.max(0.25, fitFactor);
      cameraDistance = userDistance;
      updateCamera();
      mapRoot.dataset.fitZoom = fitZoom.toFixed(4);
      requestMapRender();
    }

    function terrainHeight(percentX, percentY) {
      // 与 PlaneGeometry 的三角剖分一致，包含省界附近修补过的顶点。
      const columns = MAP_VIEW.gridColumns;
      const rows = MAP_VIEW.gridRows;
      const x = THREE.MathUtils.clamp(percentX / 100, 0, 1) * (columns - 1);
      const y = THREE.MathUtils.clamp(percentY / 100, 0, 1) * (rows - 1);
      const column = Math.min(Math.floor(x), columns - 2);
      const row = Math.min(Math.floor(y), rows - 2);
      const u = x - column;
      const v = y - row;
      const a = row * columns + column;
      const topLeft = position.getZ(a);
      const topRight = position.getZ(a + 1);
      const bottomLeft = position.getZ(a + columns);
      const bottomRight = position.getZ(a + columns + 1);
      return u + v <= 1
        ? topLeft + u * (topRight - topLeft) + v * (bottomLeft - topLeft)
        : bottomRight + (1 - u) * (bottomLeft - bottomRight) + (1 - v) * (topRight - bottomRight);
    }

    // 点位与地形共享同一组百分比坐标，旋转或缩放时重新投影到屏幕。
    // 点位按钮属于网页，不属于 3D 模型；这里把地图坐标投影到屏幕位置。
    function projectMarkers() {
      const rect = mapRoot.getBoundingClientRect();
      if (mapRoot.dataset.mapMode === "flat") {
        const flatImage = mapRoot.querySelector("#shandongFlatMapImage");
        if (flatImage?.naturalWidth && flatImage?.naturalHeight) {
          const imageRatio = flatImage.naturalWidth / flatImage.naturalHeight;
          const displayWidth = Math.min(rect.width, rect.height * imageRatio);
          const displayHeight = displayWidth / imageRatio;
          const imageLeft = (rect.width - displayWidth) / 2;
          const imageTop = (rect.height - displayHeight) / 2;
          // 图片左侧保留了队伍署名，按山东轮廓的实际边界校准点位投影。
          // 这个范围只用于简化平面图；3D 版仍直接使用 DEM 的经纬度范围。
          const flatMapBounds = { left: 0.177, right: 0.966, top: 0.099, bottom: 0.911 };
          mapRoot.querySelectorAll(".map-marker").forEach((marker) => {
            const percentX = Number(marker.dataset.terrainX) / 100;
            const percentY = Number(marker.dataset.terrainY) / 100;
            if (!Number.isFinite(percentX) || !Number.isFinite(percentY)) return;
            const imageX = flatMapBounds.left + percentX * (flatMapBounds.right - flatMapBounds.left);
            const imageY = flatMapBounds.top + percentY * (flatMapBounds.bottom - flatMapBounds.top);
            marker.style.left = `${((imageLeft + imageX * displayWidth) / rect.width) * 100}%`;
            marker.style.top = `${((imageTop + imageY * displayHeight) / rect.height) * 100}%`;
            marker.style.visibility = "visible";
            marker.style.zIndex = "5";
          });
          return;
        }
      }
      mapRoot.querySelectorAll(".map-marker").forEach((marker) => {
        const percentX = Number(marker.dataset.terrainX);
        const percentY = Number(marker.dataset.terrainY);
        if (!Number.isFinite(percentX) || !Number.isFinite(percentY)) return;
        const point = new THREE.Vector3(
          (percentX / 100) * terrainWidth - terrainWidth / 2,
          terrainHeightDimension / 2 - (percentY / 100) * terrainHeightDimension,
          terrainHeight(percentX, percentY),
        );
        terrain.localToWorld(point);
        point.project(camera);
        const visible =
          point.z > -1 &&
          point.z < 1 &&
          point.x > -1.15 &&
          point.x < 1.15 &&
          point.y > -1.15 &&
          point.y < 1.15;
        marker.style.left = `${(point.x + 1) * 50}%`;
        marker.style.top = `${(1 - point.y) * 50}%`;
        marker.style.visibility = visible ? "visible" : "hidden";
        marker.style.zIndex = String(Math.round(5 + (1 - point.z) * 10));
      });
    }

    mapRoot.addEventListener("pointerdown", function handlePointerdown(event) {
      // 新的一次按下（包括控件）不应继承上一次拖动的点击抑制。
      if (activePointers.size === 0) suppressGestureClick = false;
      const interactive = event.target.closest("button, input, .map-legend, .map-terrain-status, .map-rotation-control");
      if (interactive && !(event.pointerType === "touch" && interactive.matches(".map-marker"))) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.size === 2) {
        // 双指都交给地图；单点点位时保留按钮的原生点击目标。
        activePointers.forEach((_, id) => mapRoot.setPointerCapture(id));
        const [first, second] = [...activePointers.values()];
        pinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
        suppressGestureClick = true;
        isDragging = false;
        mapRoot.classList.remove("is-dragging");
        return;
      }
      isDragging = true;
      lastPointer = { x: event.clientX, y: event.clientY };
      if (!interactive) mapRoot.setPointerCapture(event.pointerId);
      mapRoot.classList.add("is-dragging");
    });
    mapRoot.addEventListener("pointermove", function handlePointermove(event) {
      if (!activePointers.has(event.pointerId)) return;
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (activePointers.size === 2) {
        const [first, second] = [...activePointers.values()];
        const nextDistance = Math.hypot(first.x - second.x, first.y - second.y);
        if (pinchDistance)
          cameraDistance = THREE.MathUtils.clamp(
            cameraDistance - (nextDistance - pinchDistance) * MAP_VIEW.pinchSpeed,
            MAP_VIEW.minDistance,
            MAP_VIEW.maxDistance,
          );
        pinchDistance = nextDistance;
        updateCamera();
        return;
      }
      if (!isDragging) return;
      const deltaX = event.clientX - lastPointer.x;
      const deltaY = event.clientY - lastPointer.y;
      if (Math.hypot(deltaX, deltaY) > 3) suppressGestureClick = true;
      const rect = mapRoot.getBoundingClientRect();
      const worldPerPixelX = (camera.right - camera.left) / (camera.zoom * rect.width);
      const worldPerPixelY = (camera.top - camera.bottom) / (camera.zoom * rect.height);
      // 相机和目标一起沿屏幕平移方向移动，保持相对姿态不变。
      const elements = camera.matrixWorld.elements;
      const screenRight = new THREE.Vector3(elements[0], elements[1], elements[2]);
      const screenUp = new THREE.Vector3(elements[4], elements[5], elements[6]);
      const pan = screenRight
        .multiplyScalar(-deltaX * worldPerPixelX * MAP_VIEW.panSpeed)
        .add(screenUp.multiplyScalar(deltaY * worldPerPixelY * MAP_VIEW.panSpeed));
      const nextTarget = cameraTarget.clone().add(pan);
      nextTarget.x = THREE.MathUtils.clamp(nextTarget.x, -MAP_VIEW.maxPanX, MAP_VIEW.maxPanX);
      nextTarget.y = THREE.MathUtils.clamp(nextTarget.y, -MAP_VIEW.maxPanY, MAP_VIEW.maxPanY);
      cameraTarget.copy(nextTarget);
      lastPointer = { x: event.clientX, y: event.clientY };
      updateCamera();
    });
    function stopDragging(event) {
      if (!activePointers.has(event?.pointerId)) return;
      if (event?.pointerId !== undefined) activePointers.delete(event.pointerId);
      if (activePointers.size < 2) pinchDistance = 0;
      isDragging = activePointers.size === 1;
      if (isDragging) lastPointer = activePointers.values().next().value;
      mapRoot.classList.toggle("is-dragging", isDragging);
      if (event?.pointerId !== undefined && mapRoot.hasPointerCapture(event.pointerId))
        mapRoot.releasePointerCapture(event.pointerId);
    }
    mapRoot.addEventListener("pointerup", stopDragging);
    mapRoot.addEventListener("pointercancel", stopDragging);
    mapRoot.addEventListener("lostpointercapture", stopDragging);
    mapRoot.addEventListener("click", function suppressClickAfterMapGesture(event) {
      if (suppressGestureClick && event.detail !== 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    mapRoot.addEventListener(
      "wheel",
      function handleWheel(event) {
        event.preventDefault();
        cameraDistance = THREE.MathUtils.clamp(
          cameraDistance + event.deltaY * MAP_VIEW.wheelSpeed,
          MAP_VIEW.minDistance,
          MAP_VIEW.maxDistance,
        );
        updateCamera();
      },
      { passive: false },
    );

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
      rotationInput.addEventListener("input", function handleInput() {
        cameraElevation = THREE.MathUtils.degToRad(Number(rotationInput.value));
        fitFullView();
      });
    }
    mapRoot.addEventListener("click", function handleClick(event) {
      if (event.target.closest("[data-map-reset]")) resetMapView();
    });

    new ResizeObserver(resize).observe(mapRoot);
    const markerRoot = mapRoot.querySelector("#mapMarkers");
    if (markerRoot) {
      // 筛选条件变化时 map-browser.js 会重建点位；监听子节点变化后重新投影新元素。
      new MutationObserver(invalidateMarkerProjection).observe(markerRoot, { childList: true });
    }
    const flatMapImage = mapRoot.querySelector("#shandongFlatMapImage");
    if (flatMapImage) {
      if (flatMapImage.complete) invalidateMarkerProjection();
      else flatMapImage.addEventListener("load", invalidateMarkerProjection, { once: true });
    }
    const mapVisibilityObserver = new IntersectionObserver(
      function updateMapVisibility([entry]) {
        mapVisible = entry.isIntersecting;
        if (mapVisible) {
          invalidateMarkerProjection();
        }
      },
      { threshold: 0.01 },
    );
    mapVisibilityObserver.observe(mapRoot);
    document.addEventListener("visibilitychange", function handleVisibilitychange() {
      if (document.hidden && mapRenderFrame) {
        cancelAnimationFrame(mapRenderFrame);
        mapRenderFrame = 0;
      } else if (!document.hidden) {
        requestMapRender();
      }
    });
    resize();
    mapRoot.classList.add("has-three-terrain");
    status.textContent = config.attribution;
    loadHeightMap();

    requestMapRender();
  } catch (error) {
    console.warn("山东地貌初始化失败，已回退到平面地图。", error);
    status.textContent = "平面地图模式";
  }
}
