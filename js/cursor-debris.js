(function initializeCursorDebris() {
  "use strict";

  // ==================== 鼠标尾迹配置 ====================
  // 尺寸和距离为 CSS 像素，时间为毫秒，角度为度，透明度为 0～1。
  const settings = {
    interval: 16,                 // 两次生成的最小间隔；越大越稀疏
    lifetime: 750,                // 单粒持续时间
    maxParticles: 120,            // 同时存在的粒子上限
    particlesPerStep: 4,          // 每次生成数量
    sizeMin: 6,                   // 最小尺寸
    sizeRange: 2,                 // 随机尺寸增量，即默认尺寸为 6～8
    colors: ["#ad4030", "#d47850", "#e4ad76"],
    sidewaysRange: 18,           // 左右散开总范围，即 -9～9
    fallMin: 12,                 // 最小下落距离
    fallRange: 15,               // 随机下落距离增量
    initialRotationRange: 180,   // 初始随机角度范围
    middleRotation: 35,         // 中间帧增加的角度
    finalRotation: 100,         // 最后一帧增加的角度
    middleSidewaysRatio: 0.5,   // 中间帧横移占最终横移的比例
    lift: 2,                    // 中间帧向上抬升距离
    initialOpacity: 1,
    middleOpacity: 0.85,
    middleOffset: 0.35,         // 中间帧位于整个动画的 35%
    minTravel: 4,               // 鼠标至少移动多远才生成
    maxInterpolationDistance: 80, // 超过此距离时不补画整条移动轨迹
    offsetX: -2,               // 生成点相对鼠标的偏移
    offsetY: 4,
    jitterRange: 4,             // 生成点随机抖动总范围，即 -2～2
  };

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileViewport = window.matchMedia("(max-width: 47.5rem)");
  const storageKey = "niyun-cursor-trail";
  const defaults = { enabled: true, size: settings.sizeMin, density: settings.particlesPerStep };
  let preferences = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    preferences.enabled = saved.enabled !== false;
    preferences.size = clampPreference(saved.size, 2, 8, defaults.size);
    preferences.density = clampPreference(saved.density, 1, 4, defaults.density);
  } catch (_) { /* 存储不可用或损坏时沿用默认值。 */ }
  const enabledInput = document.querySelector("#cursorTrailEnabled");
  const sizeInput = document.querySelector("#cursorTrailSize");
  const densityInput = document.querySelector("#cursorTrailDensity");
  const particles = new Map();
  let lastEmission = 0;
  let previousPoint = null;

  function clampPreference(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.round(Math.min(max, Math.max(min, value))) : fallback;
  }

  function isLocked() {
    return !finePointer.matches || mobileViewport.matches || reducedMotion.matches ||
      navigator.maxTouchPoints > 0 || document.documentElement.dataset.motion === "0";
  }

  function syncTrailControls() {
    const locked = isLocked();
    if (enabledInput) {
      enabledInput.disabled = locked;
      enabledInput.checked = !locked && preferences.enabled;
    }
    for (const input of [sizeInput, densityInput]) {
      if (input) input.disabled = locked || !preferences.enabled;
    }
    if (sizeInput) sizeInput.value = String(preferences.size);
    if (densityInput) densityInput.value = String(preferences.density);
    const sizeOutput = document.querySelector("#cursorTrailSizeValue");
    const densityOutput = document.querySelector("#cursorTrailDensityValue");
    if (sizeOutput) sizeOutput.textContent = `${preferences.size}～${preferences.size + settings.sizeRange} px`;
    if (densityOutput) densityOutput.textContent = `${preferences.density} 粒/次`;
    const note = document.querySelector("#cursorTrailLockNote");
    if (note) note.hidden = !locked;
    if (locked || !preferences.enabled) clearTrail();
  }

  function saveTrailControls() {
    if (isLocked()) { syncTrailControls(); return; }
    preferences = {
      enabled: enabledInput?.checked ?? preferences.enabled,
      size: clampPreference(Number(sizeInput?.value), 2, 8, preferences.size),
      density: clampPreference(Number(densityInput?.value), 1, 4, preferences.density),
    };
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch (_) { /* 仍允许本次页面调整。 */ }
    syncTrailControls();
  }

  function isEnabled() {
    return preferences.enabled && !isLocked() && !document.hidden;
  }

  function removeParticle(particle) {
    const animation = particles.get(particle);
    particles.delete(particle);
    if (animation) animation.cancel();
    particle.remove();
  }

  function clearTrail() {
    for (const particle of particles.keys()) removeParticle(particle);
    previousPoint = null;
  }

  function emitParticle(x, y) {
    if (particles.size >= settings.maxParticles) removeParticle(particles.keys().next().value);
    const particle = document.createElement("span");
    particle.className = "cursor-clay-debris";
    particle.setAttribute("aria-hidden", "true");
    const size = preferences.size + Math.random() * settings.sizeRange;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = settings.colors[Math.floor(Math.random() * settings.colors.length)];
    document.body.appendChild(particle);

    const sideways = (Math.random() - 0.5) * settings.sidewaysRange;
    const fall = settings.fallMin + Math.random() * settings.fallRange;
    const rotation = Math.random() * settings.initialRotationRange;
    // 固定轨迹只动画 transform/opacity；先微微飞散，再下落淡出。
    const animation = particle.animate([
      { transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`, opacity: settings.initialOpacity },
      { transform: `translate3d(${x + sideways * settings.middleSidewaysRatio}px, ${y - settings.lift}px, 0) rotate(${rotation + settings.middleRotation}deg)`, opacity: settings.middleOpacity, offset: settings.middleOffset },
      { transform: `translate3d(${x + sideways}px, ${y + fall}px, 0) rotate(${rotation + settings.finalRotation}deg)`, opacity: 0 },
    ], { duration: settings.lifetime, easing: "linear" });
    particles.set(particle, animation);
    animation.onfinish = function finishDebris() { removeParticle(particle); };
  }

  document.addEventListener("pointermove", function handleCursorMovement(event) {
    if (!isEnabled() || event.pointerType !== "mouse" || event.buttons ||
        event.target.closest("input, textarea, select, [contenteditable], dialog")) {
      clearTrail();
      return;
    }
    const now = performance.now();
    const point = { x: event.clientX, y: event.clientY };
    if (!previousPoint) { previousPoint = point; return; }
    if (now - lastEmission < settings.interval ||
        Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y) < settings.minTravel) return;
    lastEmission = now;
    // 在前后采样点之间补粒子，快速移动也不会只留下孤立点；限制跨度避免跨屏长线。
    const distance = Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
    const start = distance <= settings.maxInterpolationDistance ? previousPoint : point;
    for (let index = 0; index < preferences.density; index++) {
      const fraction = (index + 1) / preferences.density;
      emitParticle(start.x + (point.x - start.x) * fraction + settings.offsetX + (Math.random() - 0.5) * settings.jitterRange,
        start.y + (point.y - start.y) * fraction + settings.offsetY + (Math.random() - 0.5) * settings.jitterRange);
    }
    previousPoint = point;
  }, { passive: true });

  // 退出窗口、切到后台或关闭动态效果时立即清理，不保留定时循环。
  document.documentElement.addEventListener("pointerleave", clearTrail);
  document.addEventListener("pointerdown", clearTrail, { passive: true });
  window.addEventListener("blur", clearTrail);
  document.addEventListener("visibilitychange", clearTrail);
  finePointer.addEventListener("change", syncTrailControls);
  reducedMotion.addEventListener("change", syncTrailControls);
  mobileViewport.addEventListener("change", syncTrailControls);
  new MutationObserver(function handleMotionSetting() {
    syncTrailControls();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  for (const input of [enabledInput, sizeInput, densityInput]) input?.addEventListener("input", saveTrailControls);
  window.addEventListener("media-settings-reset", function resetTrailPreferences() {
    preferences = { ...defaults };
    try { localStorage.removeItem(storageKey); } catch (_) { /* 默认值仍立即生效。 */ }
    syncTrailControls();
  });
  syncTrailControls();
})();
