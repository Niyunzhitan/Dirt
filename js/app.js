(function () {
  // ==================== 01. 通用工具和页面状态 ====================
  // $ 查找一个元素，$$ 查找多个元素并转成数组，后面所有板块都会使用。
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  let courses = [];
  let visibleSites = [];
  let selectedImages = [];
  // 改名后启用新的会话命名空间，避免旧会话带回历史 AI 名称。
  const aiSessionStorageKey = "niyun-yinxiaoling-ai-session";
  window.sessionStorage.removeItem("nimeng-ai-session");
  let aiSessionId = window.sessionStorage.getItem(aiSessionStorageKey) || "";

  /*
   * ==================== 显示设置参数区 ====================
   * 调整设置范围、默认值和每档效果时，只修改这里，不要到事件函数里寻找数字。
   */
  // 当前项目只写入这一项；数组中的旧键仅用于一次性迁移。
  const settingsStorageKey = "niyun-display-settings";
  const legacySettingsStorageKeys = ["nimeng-display-settings", "niyun-settings"];
  const openingAnimationStorageKey = "niyun-opening-animation-enabled";
  const systemPrefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 导航时钟与弹窗动画：时间单位均为毫秒。
  const interfaceConfig = {
    clockLocale: "zh-CN",
    clockRefreshInterval: 1000,
    clockFormat: { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
  };

  // 地图点位配置：[经度, 纬度]。区县坐标优先，城市坐标用于缺少区县时兜底。
  const mapCoordinates = {
    cities: {
      "滨州": [117.97, 37.38], "聊城": [115.98, 36.45], "德州": [116.36, 37.45], "东营": [118.67, 37.43],
      "菏泽": [115.48, 35.23], "淄博": [118.05, 36.81], "济南": [117.12, 36.65], "潍坊": [119.16, 36.71],
      "临沂": [118.35, 35.10], "烟台": [121.39, 37.52], "青岛": [120.38, 36.07], "济宁": [116.59, 35.41],
      "泰安": [117.13, 36.19], "日照": [119.52, 35.42], "枣庄": [117.32, 34.81]
    },
    counties: {
      "博兴": [118.13, 37.15], "高唐": [116.23, 36.85], "东阿": [116.25, 36.33], "阳谷": [115.78, 36.12],
      "邹平": [117.74, 36.88], "高青": [117.83, 37.17], "鄄城": [115.54, 35.56], "乐陵": [117.23, 37.73],
      "陵城": [116.58, 37.33], "利津": [118.25, 37.49], "广饶": [118.41, 37.05], "周村": [117.87, 36.80],
      "淄川": [117.97, 36.65], "临淄": [118.31, 36.82], "商河": [117.16, 37.31], "章丘": [117.53, 36.71],
      "莱芜": [117.68, 36.21], "临朐": [118.54, 36.51], "潍城": [119.10, 36.71], "昌乐": [118.83, 36.70],
      "寿光": [118.79, 36.86], "安丘": [119.22, 36.48], "郯城": [118.37, 34.61], "昌邑": [119.40, 36.85],
      "高密": [119.76, 36.38], "诸城": [119.41, 35.99], "沂水": [118.64, 35.79], "沂南": [118.46, 35.55],
      "兰陵": [117.95, 34.86], "费": [117.98, 35.27], "福山": [121.27, 37.50], "龙口": [120.52, 37.65],
      "莱州": [119.94, 37.18], "牟平": [121.60, 37.39], "即墨": [120.45, 36.39], "市南": [120.40, 36.08],
      "平度": [119.99, 36.78], "邹城": [116.97, 35.40], "东平": [116.33, 35.94], "泰山": [117.13, 36.19],
      "岱岳": [117.04, 36.19], "宁阳": [116.80, 35.76], "莒": [118.87, 35.59], "武城": [116.07, 37.21],
      "汶上": [116.49, 35.72]
    }
  };

  function readCssTime(variableName) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
  }

  function readCssValue(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  }

  function runElementAnimation(element, keyframes, durationVariable, easingVariable) {
    if (!element) return null;
    element.getAnimations().forEach((animation) => animation.cancel());
    const duration = systemPrefersReducedMotion ? 1 : readCssTime(durationVariable);
    return element.animate(keyframes, {
      duration,
      easing: readCssValue(easingVariable),
      fill: "both"
    });
  }

  // 阅读设置：每个可选项对应的实际字号和行距。
  const readerSettingOptions = {
    fontSize: {
      small: "0.82rem",
      standard: "0.9rem",
      large: "1rem"
    },
    lineHeight: {
      compact: "1.6",
      comfortable: "1.8",
      loose: "2"
    }
  };

  // 动态设置：范围、步长、默认值和单位相互独立，便于以后分别调整。
  const motionSettingRanges = {
    pageMotion: { min: 0, max: 100, step: 10, defaultValue: 60, unit: "%" },
    cardTilt: { min: 0, max: 6, step: 0.5, defaultValue: 4, unit: "°" },
    backgroundDust: { min: 0, max: 64, step: 4, defaultValue: 16, unit: "粒" }
  };

  // 动态设置到底层视觉参数的换算边界。
  const motionSettingEffects = {
    cardLiftMax: 5
  };

  const defaultSettings = {
    themeMode: "auto",
    fontSize: "standard",
    lineHeight: "comfortable",
    motionIntensity: systemPrefersReducedMotion ? motionSettingRanges.pageMotion.min : motionSettingRanges.pageMotion.defaultValue,
    tiltDegrees: systemPrefersReducedMotion ? motionSettingRanges.cardTilt.min : motionSettingRanges.cardTilt.defaultValue,
    dustQuantity: systemPrefersReducedMotion ? motionSettingRanges.backgroundDust.min : motionSettingRanges.backgroundDust.defaultValue
  };
  let userSettings = { ...defaultSettings };
  let settingsNeedMigration = false;

  try {
    const currentSettings = window.localStorage.getItem(settingsStorageKey);
    const legacySettings = legacySettingsStorageKeys.map((key) => window.localStorage.getItem(key)).find(Boolean);
    const savedSettings = JSON.parse(currentSettings || legacySettings || "{}");
    if (!currentSettings && legacySettings) settingsNeedMigration = true;
    // 兼容旧版“微尘强度 0～100%”：按比例迁移为“微尘数量 0～32 粒”。
    if (savedSettings.dustQuantity === undefined && savedSettings.dustIntensity !== undefined) {
      savedSettings.dustQuantity = Math.round((Number(savedSettings.dustIntensity) / 100) * motionSettingRanges.backgroundDust.max / motionSettingRanges.backgroundDust.step) * motionSettingRanges.backgroundDust.step;
      settingsNeedMigration = true;
    }
    delete savedSettings.dustIntensity;
    userSettings = { ...defaultSettings, ...savedSettings };
  } catch (_) {
    userSettings = { ...defaultSettings };
  }

  /* 必须由 JavaScript 计算的动态视觉参数；CSS 外观参数统一放在 tokens.css。 */
  const visualEffects = {
    rippleLifetime: 600,       // 点击波纹保留时间（毫秒）
    searchFocusDelay: 700,     // 平滑滚动后移动焦点的等待时间（毫秒）
    searchHighlightLifetime: 1900, // 搜索目标描边保留时间（毫秒）
    cardTiltDegrees: motionSettingRanges.cardTilt.defaultValue, // 运行时由“卡片倾斜角度”设置更新
    cardPerspective: 800,      // 卡片 3D 透视距离
    cardLift: Math.min(motionSettingEffects.cardLiftMax, motionSettingRanges.cardTilt.defaultValue), // 随倾斜角度联动
    dustMaxParticles: motionSettingRanges.backgroundDust.max, // 粒子池数量，单位：粒
    dustSizeMin: 0.8,          // 微尘最小半径
    dustSizeRange: 2.2,        // 微尘半径随机增量
    dustHorizontalSpeed: 0.35, // 微尘水平漂移速度
    dustVerticalSpeedMin: 0.15,// 微尘最小下落速度
    dustVerticalSpeedRange: 0.4,// 微尘下落速度随机增量
    dustOpacityMin: 0.15,      // 单粒微尘最低透明度
    dustOpacityRange: 0.45,    // 单粒微尘透明度随机增量
    dustPrimaryColor: "168, 51, 42", // 主要朱砂色 RGB
    dustAccentColor: "212, 175, 55", // 少量金色 RGB
    dustPrimaryRatio: 0.6      // 朱砂微尘占比
  };

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  // 数据库中的地址只能用于图片或视频，拒绝 javascript: 等危险协议。
  const safeResourceUrl = (value) => window.MediaSecurity?.resolve(value) || "";

  // Logo 使用可选图片；配置为空或图片加载失败时保留当前“泥”字印章。
  function applyBrandLogo() {
    const logoUrl = safeResourceUrl(window.MEDIA_CONFIG?.brandLogo);
    if (!logoUrl) return;
    $$(".brand-logo-image").forEach((image) => {
      image.src = logoUrl;
      image.hidden = false;
      image.addEventListener("error", () => {
        image.hidden = true;
        const fallback = image.parentElement.querySelector(".brand-logo-fallback");
        if (fallback) fallback.hidden = false;
      }, { once: true });
      const fallback = image.parentElement.querySelector(".brand-logo-fallback");
      if (fallback) fallback.hidden = true;
    });
  }
  applyBrandLogo();

  const prefersReducedMotion = () => systemPrefersReducedMotion || Number(userSettings.motionIntensity) === 0;
  const clampNumber = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  };

  const themeSettingOptions = {
    light: "light",
    dark: "dark",
    auto: "auto"
  };

  // 自动主题时间由 index.html 在首帧绘制前提供，保证刷新前后使用同一判断标准。
  const themeSchedule = window.NIYUN_THEME_SCHEDULE || { lightStartHour: 6, lightEndHour: 18 };
  let automaticThemeTimer = null;

  function isAutomaticLightTime(date = new Date()) {
    const hour = date.getHours();
    return hour >= themeSchedule.lightStartHour && hour < themeSchedule.lightEndHour;
  }

  function resolveEffectiveTheme(mode) {
    if (mode === "dark") return "dark";
    if (mode === "light") return "light";
    return isAutomaticLightTime() ? "light" : "dark";
  }

  function scheduleAutomaticThemeUpdate() {
    if (automaticThemeTimer) window.clearTimeout(automaticThemeTimer);
    automaticThemeTimer = null;
    if (userSettings.themeMode !== "auto") return;

    const now = new Date();
    const nextBoundary = new Date(now);
    if (now.getHours() < themeSchedule.lightStartHour) {
      nextBoundary.setHours(themeSchedule.lightStartHour, 0, 0, 0);
    } else if (now.getHours() < themeSchedule.lightEndHour) {
      nextBoundary.setHours(themeSchedule.lightEndHour, 0, 0, 0);
    } else {
      nextBoundary.setDate(nextBoundary.getDate() + 1);
      nextBoundary.setHours(themeSchedule.lightStartHour, 0, 0, 0);
    }

    automaticThemeTimer = window.setTimeout(() => applyDisplaySettings(false), Math.max(1000, nextBoundary.getTime() - now.getTime() + 100));
  }

  function normalizeSettings(settings) {
    return {
      themeMode: Object.hasOwn(themeSettingOptions, settings.themeMode) ? settings.themeMode : defaultSettings.themeMode,
      fontSize: Object.hasOwn(readerSettingOptions.fontSize, settings.fontSize) ? settings.fontSize : defaultSettings.fontSize,
      lineHeight: Object.hasOwn(readerSettingOptions.lineHeight, settings.lineHeight) ? settings.lineHeight : defaultSettings.lineHeight,
      motionIntensity: clampNumber(settings.motionIntensity, motionSettingRanges.pageMotion.min, motionSettingRanges.pageMotion.max, defaultSettings.motionIntensity),
      tiltDegrees: clampNumber(settings.tiltDegrees, motionSettingRanges.cardTilt.min, motionSettingRanges.cardTilt.max, defaultSettings.tiltDegrees),
      dustQuantity: clampNumber(settings.dustQuantity, motionSettingRanges.backgroundDust.min, motionSettingRanges.backgroundDust.max, defaultSettings.dustQuantity)
    };
  }

  function applyDisplaySettings(save = true) {
    userSettings = normalizeSettings(userSettings);
    const root = document.documentElement;
    const motionScale = userSettings.motionIntensity / motionSettingRanges.pageMotion.max;
    const effectiveTheme = resolveEffectiveTheme(userSettings.themeMode);

    root.dataset.theme = effectiveTheme;
    root.dataset.themeMode = userSettings.themeMode;
    root.dataset.readerSize = userSettings.fontSize;
    root.dataset.lineHeight = userSettings.lineHeight;
    root.dataset.motion = String(userSettings.motionIntensity);
    root.style.setProperty("--reader-font-size", readerSettingOptions.fontSize[userSettings.fontSize]);
    root.style.setProperty("--reader-line-height", readerSettingOptions.lineHeight[userSettings.lineHeight]);
    root.style.setProperty("--user-motion-scale", String(motionScale));
    scheduleAutomaticThemeUpdate();

    visualEffects.cardTiltDegrees = userSettings.tiltDegrees;
    visualEffects.cardLift = userSettings.tiltDegrees ? Math.min(motionSettingEffects.cardLiftMax, userSettings.tiltDegrees) : 0;
    if (save) window.localStorage.setItem(settingsStorageKey, JSON.stringify(userSettings));
  }

  // 从休眠或后台返回时立即校正，避免错过 06:00 / 18:00 的定时切换。
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && userSettings.themeMode === "auto") applyDisplaySettings(false);
  });

  userSettings = normalizeSettings(userSettings);
  applyDisplaySettings(false);
  if (settingsNeedMigration) window.localStorage.setItem(settingsStorageKey, JSON.stringify(userSettings));
  legacySettingsStorageKeys.forEach((key) => window.localStorage.removeItem(key));
  const getKnowledge = () => window.SEAL_KNOWLEDGE || window.PPT_KNOWLEDGE;
  const getSiteSearchValues = (site) => [site.city, site.name, site.period, site.admin, site.note, ...(site.tags || []), ...site.seals];
  const findKnowledgeSites = (keyword = "") => {
    const query = keyword.trim().toLowerCase();
    const sites = getKnowledge()?.sites || [];
    return query ? sites.filter((site) => getSiteSearchValues(site).some((value) => String(value).toLowerCase().includes(query))) : sites;
  };

  // AI 回复会包含少量 Markdown。先转义 HTML，再只开放常用格式，避免插入恶意标签。
  function renderInlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  function renderMarkdown(markdown) {
    const source = String(markdown || "").replace(/\r\n?/g, "\n");
    const codeBlocks = [];
    const protectedSource = source.replace(/```(?:[\w-]+)?\n?([\s\S]*?)```/g, (_, code) => {
      const token = `@@CODE_BLOCK_${codeBlocks.length}@@`;
      codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
      return token;
    });
    const output = [];
    let listType = "";

    function closeList() {
      if (listType) output.push(`</${listType}>`);
      listType = "";
    }

    protectedSource.split("\n").forEach((line) => {
      const trimmed = line.trim();
      const unordered = trimmed.match(/^[-*+]\s+(.+)/);
      const ordered = trimmed.match(/^\d+[.)]\s+(.+)/);
      const heading = trimmed.match(/^(#{1,3})\s+(.+)/);

      if (unordered || ordered) {
        const nextType = unordered ? "ul" : "ol";
        if (listType !== nextType) { closeList(); output.push(`<${nextType}>`); listType = nextType; }
        output.push(`<li>${renderInlineMarkdown((unordered || ordered)[1])}</li>`);
        return;
      }

      closeList();
      if (!trimmed) return;
      if (/^@@CODE_BLOCK_\d+@@$/.test(trimmed)) output.push(trimmed);
      else if (heading) output.push(`<h${heading[1].length}>${renderInlineMarkdown(heading[2])}</h${heading[1].length}>`);
      else output.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    });
    closeList();
    return output.join("").replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index) => codeBlocks[Number(index)] || "");
  }

  // 页面右下角的短提示，2.6 秒后自动隐藏。
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  // 两个搜索框共用同一种清除反馈，避免重复维护 class 切换时序。
  function replayClearFeedback(input, wrapperSelector) {
    const wrapper = input.closest(wrapperSelector);
    wrapper?.classList.remove("is-cleared");
    window.requestAnimationFrame(() => wrapper?.classList.add("is-cleared"));
    input.focus();
  }

  // ==================== 02. 藏品、地图、课程和文创内容渲染 ====================
  // 有实物图时显示图片；没有图片时根据印文生成简单的数字复原图。
  function createRelicVisual(item) {
    const imageUrl = safeResourceUrl(item.imageUrl);
    if (imageUrl) {
      return `<div class="relic-visual has-image" aria-label="${escapeHtml(item.name)}实物资料图"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)}"><span class="relic-code">${escapeHtml(item.id)}</span></div>`;
    }
    const chars = [...String(item.inscription || "")].slice(0, 4);
    while (chars.length < 4) chars.push("印");
    return `<div class="relic-visual ${escapeHtml(item.tone)}" aria-label="${escapeHtml(item.name)}数字复原图"><div class="relic-disc"><div class="mini-inscription">${chars.map((char) => `<span>${escapeHtml(char)}</span>`).join("")}</div></div><span class="relic-code">${escapeHtml(item.id)}</span></div>`;
  }

  function renderRelics(items) {
    $("#collectionGrid").innerHTML = items.length ? items.map((item) => `<article class="relic-card" data-relic-card="${escapeHtml(item.id)}" tabindex="-1">${createRelicVisual(item)}<div class="relic-info"><div><span>${escapeHtml(item.period)}</span><span>${escapeHtml(item.value)}</span></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.summary)}</p><button type="button" data-relic-id="${escapeHtml(item.id)}">查看调研档案 <span>→</span></button></div></article>`).join("") : '<div class="empty-state"><strong>暂未找到相关封泥</strong><p>换一个名称、年代或地点试试。</p></div>';
  }

  // 点击地图点位后，把该地点的信息写入右侧详情面板。
  function updateSitePanel(site, index = 0) {
    $("#siteNumber").textContent = String(index + 1).padStart(2, "0");
    $("#siteCity").textContent = site.city;
    $("#siteName").textContent = site.name;
    const description = $("#siteDescription");
    description.textContent = site.description;
    // 说明区域独立滚动；切换地点时回到开头，避免继承上一地点的滚动位置。
    description.scrollTop = 0;
    $("#sitePeriod").textContent = site.period;
    $("#siteCount").textContent = `${site.count} 条`;
  }

  function renderSites(sites) {
    visibleSites = sites;
    const root = $("#mapMarkers");
    const bounds = window.SHANDONG_TERRAIN?.bounds || { west: 114.81, east: 122.71, north: 38.4, south: 34.38 };
    root.innerHTML = sites.map((site, index) => {
      const city = String(site.city || "").split(" · ")[0];
      const county = String(site.city || "").split(" · ")[1]?.replace(/[县市区]$/, "");
      const coordinate = mapCoordinates.counties[county] || mapCoordinates.cities[city];
      const x = coordinate ? ((coordinate[0] - bounds.west) / (bounds.east - bounds.west)) * 100 : Number(site.x) || 0;
      const y = coordinate ? ((bounds.north - coordinate[1]) / (bounds.north - bounds.south)) * 100 : Number(site.y) || 0;
      const safeX = Math.min(100, Math.max(0, x));
      const safeY = Math.min(100, Math.max(0, y));
      const label = county ? `${city}·${county}` : city;
      return `<button class="map-marker${index === 0 ? " active" : ""}" type="button" style="left:${safeX}%;top:${safeY}%" data-terrain-x="${safeX}" data-terrain-y="${safeY}" data-site-id="${escapeHtml(site.id)}" aria-label="查看${escapeHtml(label)}"><i></i><span>${escapeHtml(label)}</span></button>`;
    }).join("");
    if (sites.length) updateSitePanel(sites[0]);
  }

  // 切换当前选中的课程，并同步更新主课程区域。
  function selectCourse(id) {
    const course = courses.find((item) => item.id === id) || courses[0];
    if (!course) return;
    $("#courseMeta").textContent = `第 ${course.lesson} 课 · ${course.duration}`;
    $("#courseTitle").textContent = course.title;
    $("#courseDescription").textContent = course.description;
    $$("[data-course-id]").forEach((button) => button.classList.toggle("active", button.dataset.courseId === course.id));
    const player = $("#coursePlayer");
    const videoUrl = safeResourceUrl(course.videoUrl);
    const posterUrl = safeResourceUrl(course.posterUrl);
    player.dataset.videoUrl = videoUrl;
    player.style.backgroundImage = "";
    player.innerHTML = videoUrl
      ? `<video class="course-video" controls playsinline preload="metadata"${posterUrl ? ` poster="${escapeHtml(posterUrl)}"` : ""} src="${escapeHtml(videoUrl)}"></video>`
      : '<div class="video-placeholder"><button id="playCourse" type="button" aria-label="播放课程"><span aria-hidden="true">▶</span></button><p>课程视频素材待接入</p></div>';
  }

  function renderCourses(items) {
    courses = items;
    $("#courseList").innerHTML = items.map((course) => `<button type="button" data-course-id="${escapeHtml(course.id)}"><span>0${Number(course.lesson) || 0}</span><div><strong>${escapeHtml(course.title)}</strong><small>${escapeHtml(course.duration)} · 开源研学课程</small></div><i>→</i></button>`).join("");
    selectCourse(items[0]?.id);
  }

  function renderCreativeWorks(items) {
    const grid = $("#creativeGrid");
    if (!grid) return;
    grid.innerHTML = items.map((item, index) => `<article class="creative-card creative-${index + 1}"><div class="creative-art"><span>${escapeHtml(item.mark)}</span><i>${String(index + 1).padStart(2, "0")}</i></div><div><small>${escapeHtml(item.category)}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></div></article>`).join("");
  }

  // 将 ppt-knowledge.js 中整理的研究发现写入页面。
  function renderSourceFindings() {
    const knowledge = getKnowledge();
    if (!knowledge || !knowledge.findings) return;
    $("#sourceFindings").innerHTML = knowledge.findings.map((item, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join("");
  }

  // 主页面精选与弹窗完整列表共用同一份卡片模板。
  function sourceCardTemplate(site) {
    return `<article data-source-card="${site.id}" tabindex="-1"><div><span>${escapeHtml(site.city)}</span><strong>${escapeHtml(site.seals.slice(0, 3).join(" · "))}${site.seals.length > 3 ? ` 等 ${site.count} 条` : ""}</strong></div><p>${escapeHtml(site.period)}<br>${escapeHtml(site.admin)}</p><a href="#map" data-source-site="${site.id}">在地图查看 <b aria-hidden="true">→</b></a></article>`;
  }

  function renderSourceCards(root, items) {
    root.innerHTML = items.length
      ? items.map(sourceCardTemplate).join("")
      : '<p class="source-empty">没有匹配资料，请尝试现代区县、古地名、印文或郡国名称。</p>';
  }

  // 页面只展示前三处；完整筛选结果只在弹窗中渲染。
  function renderSourcePreview() {
    const sites = getKnowledge()?.sites || [];
    renderSourceCards($("#sourceIndex"), sites.slice(0, 3));
    $("#sourceSearchFeedback").textContent = `显示精选 ${Math.min(3, sites.length)} 处区县资料`;
    $("#openSourceIndex").firstChild.textContent = `查看其余 ${Math.max(0, sites.length - 3)} 处资料 `;
  }

  function renderSourceDialogIndex(keyword = "") {
    const query = keyword.trim().toLowerCase();
    const items = findKnowledgeSites(query);
    renderSourceCards($("#sourceDialogIndex"), items);
    $("#clearSourceDialogSearch").hidden = !query;
    $("#sourceDialogFeedback").textContent = query ? `找到 ${items.length} 处匹配资料` : `显示全部 ${items.length} 处区县资料`;
  }

  // ==================== 03. 数字手卷交互 ====================
  // 支持按钮、方向键、鼠标滚轮和拖动；每次移动后同步幕数和进度条。
  function initScrollStory() {
    const viewport = $("#scrollViewport");
    if (!viewport) return;
    const track = $("#scrollTrack");
    const panels = $$(".scroll-panel", viewport);
    const previous = $("#scrollPrev");
    const next = $("#scrollNext");
    const progress = $("#scrollProgress");
    const status = $("#scrollStatus");
    let activeIndex = 0;
    let dragging = false;
    let dragStart = 0;
    let scrollStart = 0;
    let chapterStops = [];

    // 重新计算每一幕居中时的横向位置，窗口尺寸变化后也要重新计算。
    function refreshChapterStops() {
      const firstPanel = panels[0];
      const lastPanel = panels[panels.length - 1];
      track.style.paddingInlineStart = `${Math.max(0, (viewport.clientWidth - firstPanel.offsetWidth) / 2)}px`;
      track.style.paddingInlineEnd = `${Math.max(0, (viewport.clientWidth - lastPanel.offsetWidth) / 2)}px`;
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const viewportRect = viewport.getBoundingClientRect();
      chapterStops = panels.map((panel) => {
        const panelRect = panel.getBoundingClientRect();
        const panelStart = panelRect.left - viewportRect.left + viewport.scrollLeft;
        const centered = panelStart - (viewport.clientWidth - panelRect.width) / 2;
        return Math.max(0, Math.min(centered, max));
      });
    }

    function updateStory() {
      const max = Math.max(1, viewport.scrollWidth - viewport.clientWidth);
      const ratio = Math.min(1, viewport.scrollLeft / max);
      progress.style.transform = `scaleX(${Math.max(.02, ratio)})`;
      const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
      activeIndex = panels.reduce((closest, panel, index) => {
        const panelCenter = panel.offsetLeft + panel.offsetWidth / 2;
        const closestCenter = panels[closest].offsetLeft + panels[closest].offsetWidth / 2;
        return Math.abs(panelCenter - viewportCenter) < Math.abs(closestCenter - viewportCenter) ? index : closest;
      }, 0);
      status.innerHTML = `<span>${escapeHtml(panels[activeIndex].dataset.scrollTitle || "展卷")}</span><b>${String(activeIndex + 1).padStart(2, "0")} / ${String(panels.length).padStart(2, "0")}</b>`;
      panels.forEach((panel, index) => panel.toggleAttribute("data-current", index === activeIndex));
      previous.disabled = viewport.scrollLeft <= 1;
      next.disabled = viewport.scrollLeft >= max - 1;
    }

    function moveToChapter(direction) {
      const tolerance = 4;
      const current = viewport.scrollLeft;
      const target = direction > 0
        ? chapterStops.find((stop) => stop > current + tolerance)
        : [...chapterStops].reverse().find((stop) => stop < current - tolerance);
      if (target === undefined) return;
      viewport.scrollTo({ left: target, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }

    function moveToEdge(edge) {
      viewport.scrollTo({ left: edge === "start" ? 0 : viewport.scrollWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }

    previous.addEventListener("click", () => moveToChapter(-1));
    next.addEventListener("click", () => moveToChapter(1));
    viewport.addEventListener("scroll", updateStory, { passive: true });
    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); moveToChapter(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); moveToChapter(1); }
      if (event.key === "Home") { event.preventDefault(); moveToEdge("start"); }
      if (event.key === "End") { event.preventDefault(); moveToEdge("end"); }
    });
    viewport.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const atStart = viewport.scrollLeft <= 0 && event.deltaY < 0;
      const atEnd = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1 && event.deltaY > 0;
      if (atStart || atEnd) return;
      event.preventDefault();
      viewport.scrollLeft += event.deltaY;
    }, { passive: false });
    viewport.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      dragging = true; dragStart = event.clientX; scrollStart = viewport.scrollLeft;
      viewport.setPointerCapture(event.pointerId); viewport.classList.add("is-dragging");
    });
    viewport.addEventListener("pointermove", (event) => { if (dragging) viewport.scrollLeft = scrollStart - (event.clientX - dragStart); });
    viewport.addEventListener("pointerup", (event) => { dragging = false; viewport.releasePointerCapture(event.pointerId); viewport.classList.remove("is-dragging"); });
    viewport.addEventListener("pointercancel", () => { dragging = false; viewport.classList.remove("is-dragging"); });
    window.addEventListener("resize", () => { refreshChapterStops(); updateStory(); });
    refreshChapterStops();
    updateStory();
  }

  // ==================== 04. 页面初始化与封泥卷轴开馆动画 ====================
  // 开屏动画集中配置：文案、速度、粒子数量和卷轴尺寸都在这里调整。
  const openingLoaderConfig = {
    stages: [
      { text: "正在辨识战国秦汉封泥……", progress: 15 },
      { text: "封缄受力，封泥渐生细纹……", progress: 38 },
      { text: "封泥碎裂脱落，丝绳松解……", progress: 68 },
      { text: "齐鲁图卷徐徐展开……", progress: 88 },
      { text: "展厅已开启，欢迎进入泥云智探", progress: 100 }
    ],
    stageIntervalMs: 750,
    fallbackMs: 5500,
    fullOpenHoldMs: 1400,
    removeDelayMs: 1100,
    initialProgress: 8,
    progressEase: 0.12,
    progressStopThreshold: 0.2,
    particleFrameIntervalMs: 32,
    debrisCooldownMs: { crack: 140, break: 110, burst: 90 },
    debrisCount: { crack: 2, break: 4, burst: 6, finalBurst: 14 },
    mobileBreakpoint: 640,
    earlyExpandHalfWidth: { mobile: 110, desktop: 160 },
    earlyExpandRatio: 0.35,
    finalWidthRatio: { mobile: 0.86, desktop: 0.78 },
    finalExtraWidth: 96,
    contentRevealRatio: 0.4
  };

  const openingLoader = $("#openingLoader");
  const openingAnimationEnabled = window.localStorage.getItem("niyun-opening-animation-enabled") !== "false";
  const openingLoaderStatus = $("#openingLoaderStatus");
  const openingLoaderProgress = $("#openingLoaderProgress");
  const openingProgressPercent = $("#openingProgressPercent");
  const scrollRollerLeft = $("#scrollRollerLeft");
  const scrollRollerRight = $("#scrollRollerRight");
  const scrollPaperContainer = $("#scrollPaperContainer");
  const scrollPaper = scrollPaperContainer?.querySelector(".scroll-paper");
  const scrollContent = $("#scrollContent");
  const scrollCord = $("#scrollCord");
  const claySealEntity = $("#claySealEntity");
  const sealCracksSvg = $("#sealCracksSvg");
  const sealCrackPaths = sealCracksSvg ? [...sealCracksSvg.querySelectorAll(".crack-path, .crack-highlight")] : [];
  const sealParticlesCanvas = $("#sealParticlesCanvas");
  const sealFragments = [
    [$("#fragNW"), "shatter-nw"],
    [$("#fragNE"), "shatter-ne"],
    [$("#fragSW"), "shatter-sw"],
    [$("#fragSE"), "shatter-se"]
  ];

  // 封泥脱落碎屑粒子系统
  let particles = [];
  let particleAnimId = null;
  let lastParticleFrame = 0;
  let lastDebrisTime = 0;

  function initSealParticles() {
    if (!sealParticlesCanvas) return;
    const ctx = sealParticlesCanvas.getContext("2d");
    if (!ctx) return;

    const width = sealParticlesCanvas.width;
    const height = sealParticlesCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    function createDebris(count = 5, burst = false) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 45;
        const speed = burst ? (2.5 + Math.random() * 5.5) : (0.6 + Math.random() * 2.2);
        particles.push({
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.2,
          vy: Math.sin(angle) * speed + (burst ? -1.5 + Math.random() * 3 : 1.2),
          gravity: 0.12,
          size: burst ? (2 + Math.random() * 5.5) : (1.2 + Math.random() * 3.5),
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.25,
          color: Math.random() > 0.4 ? "#8c3323" : (Math.random() > 0.5 ? "#ba5d45" : "#4a180e"),
          alpha: 1,
          decay: burst ? (0.015 + Math.random() * 0.02) : (0.02 + Math.random() * 0.03)
        });
      }
      wakeParticles();
    }

    function renderParticles(timestamp = 0) {
      // 空闲时不持续占用主线程；有新碎片时再恢复动画帧。
      if (!particles.length) {
        particleAnimId = null;
        return;
      }
      if (timestamp - lastParticleFrame < openingLoaderConfig.particleFrameIntervalMs) {
        particleAnimId = requestAnimationFrame(renderParticles);
        return;
      }
      lastParticleFrame = timestamp;
      ctx.clearRect(0, 0, width, height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > height + 20) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        // 绘制不规则碎泥小块
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.8);
        ctx.lineTo(p.size * 1.1, -p.size * 0.6);
        ctx.lineTo(p.size * 0.8, p.size * 0.9);
        ctx.lineTo(-p.size * 0.9, p.size * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      particleAnimId = requestAnimationFrame(renderParticles);
    }

    function wakeParticles() {
      if (!particleAnimId) particleAnimId = requestAnimationFrame(renderParticles);
    }

    return { createDebris };
  }

  let sealParticleEngine = null;
  let currentProgressVal = 0;
  let targetProgressVal = openingLoaderConfig.initialProgress;
  let progressAnimFrame = null;
  let stageIndex = 0;
  let openingIntervalTimer = null;
  let openingFallbackTimer = null;
  let openingFinishedAt = 0;
  let openingRemoveTimer = null;
  let cachedPaperWidth = null; // 缓存卷轴宽度，避免重复计算

  function updateLoaderVisuals(progress) {
    if (!openingLoader) return;
    const clamped = Math.max(0, Math.min(100, progress));
    const now = performance.now();

    // 更新进度条和百分比文字
    if (openingLoaderProgress) openingLoaderProgress.style.width = `${clamped}%`;
    if (openingProgressPercent) openingProgressPercent.textContent = `${Math.round(clamped)}%`;

    // 阶段1：0% ~ 25% (初始准备与封泥产生张力)
    if (clamped < 25) {
      if (scrollPaperContainer) scrollPaperContainer.style.width = "0px";
      if (scrollRollerLeft) scrollRollerLeft.style.transform = "translateX(0px)";
      if (scrollRollerRight) scrollRollerRight.style.transform = "translateX(0px)";
      if (sealCracksSvg) sealCracksSvg.style.opacity = "0";
      if (claySealEntity) claySealEntity.classList.remove("shaking");
    }
    // 阶段2：25% ~ 55% (封泥出现细密裂纹，轻微震颤脱落微小颗粒)
    else if (clamped < 55) {
      const crackRatio = (clamped - 25) / 30; // 0 ~ 1
      if (sealCracksSvg) {
        sealCracksSvg.style.opacity = `${Math.min(1, crackRatio * 1.4)}`;
        sealCrackPaths.forEach((p) => {
          const offset = 180 * (1 - crackRatio);
          p.style.strokeDashoffset = `${offset}`;
        });
      }
      if (claySealEntity) {
        claySealEntity.classList.add("shaking");
      }
      if (sealParticleEngine && now - lastDebrisTime > openingLoaderConfig.debrisCooldownMs.crack) {
        sealParticleEngine.createDebris(openingLoaderConfig.debrisCount.crack, false);
        lastDebrisTime = now;
      }
    }
    // 阶段3：55% ~ 80% (封泥大面积破损脱落，丝绳崩断，卷轴微张)
    else if (clamped < 80) {
      const expandRatio = (clamped - 55) / 25; // 0 ~ 1
      if (scrollCord) scrollCord.classList.add("cord-snapped");
      if (sealCracksSvg) sealCracksSvg.style.opacity = "1";
      if (claySealEntity) {
        claySealEntity.classList.add("shaking");
        claySealEntity.style.transform = `scale(${1 - expandRatio * 0.15})`;
      }
      if (sealParticleEngine && now - lastDebrisTime > openingLoaderConfig.debrisCooldownMs.break) {
        sealParticleEngine.createDebris(openingLoaderConfig.debrisCount.break, false);
        lastDebrisTime = now;
      }

      // 卷轴开始轻度向两侧微扩
      const isMobile = window.innerWidth < openingLoaderConfig.mobileBreakpoint;
      const maxHalfWidth = isMobile ? openingLoaderConfig.earlyExpandHalfWidth.mobile : openingLoaderConfig.earlyExpandHalfWidth.desktop;
      const currentHalf = maxHalfWidth * expandRatio * openingLoaderConfig.earlyExpandRatio;
      if (scrollPaperContainer) scrollPaperContainer.style.width = `${currentHalf * 2}px`;
      if (scrollRollerLeft) scrollRollerLeft.style.transform = `translateX(-${currentHalf}px)`;
      if (scrollRollerRight) scrollRollerRight.style.transform = `translateX(${currentHalf}px)`;
    }
    // 阶段4：80% ~ 100% (封泥彻底碎裂四散飞落，卷轴完全展开，露出典雅内容)
    else {
      const openRatio = (clamped - 80) / 20; // 0 ~ 1
      if (claySealEntity) {
        claySealEntity.classList.remove("shaking");
        claySealEntity.style.opacity = `${Math.max(0, 1 - openRatio * 2.5)}`;
        claySealEntity.style.transform = `scale(${0.85 - openRatio * 0.4})`;
      }

      // 触发四大块封泥向四周炸开脱落飞散
      sealFragments.forEach(([fragment, className]) => fragment?.classList.add(className));

      if (sealParticleEngine && clamped < 96 && now - lastDebrisTime > openingLoaderConfig.debrisCooldownMs.burst) {
        sealParticleEngine.createDebris(openingLoaderConfig.debrisCount.burst, true);
        lastDebrisTime = now;
      }

      // 卷轴完整展开
      // 最终宽度必须至少容纳卷轴纸面的真实宽度，否则进度到 100% 时内容仍会被裁掉。
      // 缓存 paperWidth 避免每帧都触发 getBoundingClientRect 导致性能卡顿
      if (!cachedPaperWidth && scrollPaper) {
        cachedPaperWidth = scrollPaper.getBoundingClientRect().width || 704;
      }
      const paperWidth = cachedPaperWidth || 704;
      const widthRatio = window.innerWidth < openingLoaderConfig.mobileBreakpoint
        ? openingLoaderConfig.finalWidthRatio.mobile
        : openingLoaderConfig.finalWidthRatio.desktop;
      const viewportWidth = window.innerWidth * widthRatio;
      const targetFullWidth = Math.min(Math.max(viewportWidth, paperWidth), paperWidth + openingLoaderConfig.finalExtraWidth);
      const currentWidth = (targetFullWidth * 0.35) + (targetFullWidth * 0.65 * openRatio);
      const halfW = currentWidth / 2;

      if (scrollPaperContainer) scrollPaperContainer.style.width = `${currentWidth}px`;
      if (scrollRollerLeft) scrollRollerLeft.style.transform = `translateX(-${halfW}px)`;
      if (scrollRollerRight) scrollRollerRight.style.transform = `translateX(${halfW}px)`;

      if (openRatio > openingLoaderConfig.contentRevealRatio && scrollContent) {
        scrollContent.classList.add("is-visible");
      }
    }
  }

  function tickProgress() {
    if (!openingLoader) return;
    if (Math.abs(targetProgressVal - currentProgressVal) > openingLoaderConfig.progressStopThreshold) {
      currentProgressVal += (targetProgressVal - currentProgressVal) * openingLoaderConfig.progressEase;
      updateLoaderVisuals(currentProgressVal);
    }
    if (Math.abs(targetProgressVal - currentProgressVal) > openingLoaderConfig.progressStopThreshold || particles.length) {
      progressAnimFrame = requestAnimationFrame(tickProgress);
    } else {
      progressAnimFrame = null;
    }
  }

  function wakeProgressAnimation() {
    if (!progressAnimFrame) progressAnimFrame = requestAnimationFrame(tickProgress);
  }

  function startOpeningLoader() {
    if (!openingLoader) return;
    if (!openingAnimationEnabled) {
      openingLoader.remove();
      return;
    }
    sealParticleEngine = initSealParticles();
    wakeProgressAnimation();

    stageIndex = 0;
    openingLoaderStatus.textContent = openingLoaderConfig.stages[stageIndex].text;
    targetProgressVal = openingLoaderConfig.stages[stageIndex].progress;

    openingIntervalTimer = window.setInterval(() => {
      if (stageIndex < openingLoaderConfig.stages.length - 2) {
        stageIndex++;
        openingLoaderStatus.textContent = openingLoaderConfig.stages[stageIndex].text;
        targetProgressVal = openingLoaderConfig.stages[stageIndex].progress;
      }
    }, openingLoaderConfig.stageIntervalMs);

    openingFallbackTimer = window.setTimeout(() => finishOpeningLoader(false), openingLoaderConfig.fallbackMs);
  }

  // 让出一次绘制机会，避免数据渲染连续占满主线程，开馆动画可以继续流畅播放。
  function yieldToBrowser() {
    return new Promise((resolve) => {
      if ("scheduler" in window && typeof window.scheduler?.postTask === "function") {
        window.scheduler.postTask(resolve, { priority: "user-visible" });
        return;
      }
      window.requestAnimationFrame(() => window.setTimeout(resolve, 0));
    });
  }

  function finishOpeningLoader(success = true) {
    if (!openingLoader?.isConnected || openingLoader.classList.contains("is-closing")) return;
    if (openingIntervalTimer) window.clearInterval(openingIntervalTimer);
    if (openingFallbackTimer) window.clearTimeout(openingFallbackTimer);

    // 数据完成只触发动画收尾，不直接隐藏加载层。
    stageIndex = openingLoaderConfig.stages.length - 1;
    openingLoaderStatus.textContent = success ? openingLoaderConfig.stages[stageIndex].text : "展厅已打开，部分资料稍后加载";
    targetProgressVal = 100;
    wakeProgressAnimation();

    // 确保粒子再爆发一次
    if (sealParticleEngine) {
      sealParticleEngine.createDebris(openingLoaderConfig.debrisCount.finalBurst, true);
    }

    // 等待进度过渡到 100% 并在完全展开后停留片刻，之后再平滑淡出退出。
    const removeOpeningLoader = () => {
      if (!openingLoader?.isConnected || openingLoader.classList.contains("is-closing")) return;
      openingLoader.classList.add("is-closing");
      openingRemoveTimer = window.setTimeout(() => {
        if (particleAnimId) cancelAnimationFrame(particleAnimId);
        if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);
        openingLoader.remove();
        openingRemoveTimer = null;
      }, openingLoaderConfig.removeDelayMs);
    };

    const checkFullOpenAndExit = () => {
      const paperWidth = scrollPaper?.offsetWidth || 704;
      const containerWidth = scrollPaperContainer?.offsetWidth || 0;
      const contentVisible = scrollContent?.classList.contains("is-visible");
      const fullyOpen = currentProgressVal >= 99.5 && containerWidth >= paperWidth && contentVisible;
      if (!fullyOpen) {
        requestAnimationFrame(checkFullOpenAndExit);
        return;
      }

      if (!openingFinishedAt) openingFinishedAt = performance.now();
      if (performance.now() - openingFinishedAt < openingLoaderConfig.fullOpenHoldMs) {
        requestAnimationFrame(checkFullOpenAndExit);
        return;
      }

       removeOpeningLoader();
    };

    checkFullOpenAndExit();
    // 移动端字体回流或浏览器缩放可能让尺寸条件无法精确满足，不能因此卡住主页面。
    window.setTimeout(removeOpeningLoader, openingLoaderConfig.fullOpenHoldMs + 2600);
  }

  async function init() {
    startOpeningLoader();
    const [stats, mapConfig, sites, relics, courseItems, creativeItems] = await Promise.all([ApiService.getStats(), ApiService.getMapConfig(), ApiService.getSites(), ApiService.getRelics(), ApiService.getCourses(), ApiService.getCreativeWorks()]);
    $("#statRelics").textContent = stats.relics;
    $("#statSites").textContent = stats.sites;
    $("#statCourses").textContent = stats.courses;
    if (mapConfig.imageUrl) {
      const image = $("#mapSourceImage");
      image.src = mapConfig.imageUrl;
      image.hidden = false;
      $("#shandongMap").classList.add("has-source-image");
    }
    renderSites(sites);
    await yieldToBrowser();
    renderRelics(relics.items);
    await yieldToBrowser();
    renderCourses(courseItems);
    renderCreativeWorks(creativeItems);
    await yieldToBrowser();
    renderSourceFindings();
    renderSourcePreview();
    initScrollStory();
    renderAiStatus(await AiService.getStatus());
    finishOpeningLoader(true);
  }

  // ==================== 05. 导航、地图筛选和课程事件 ====================
  const menuToggle = $("#menuToggle");
  const mainNav = $("#mainNav");

  function setMenuOpen(open) {
    mainNav.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
  }

  menuToggle.addEventListener("click", () => setMenuOpen(!mainNav.classList.contains("open")));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mainNav.classList.contains("open")) {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });
  function getLayoutTop(element) {
    let top = 0;
    for (let current = element; current; current = current.offsetParent) top += current.offsetTop;
    return top;
  }

  // 所有栏目入口共用同一套锚点计算，避免首屏、顶部和页脚出现不同停靠位置。
  const sectionLinkSelector = "#mainNav a, .footer-links a, .hero-actions a, .scroll-cue";
  function navigateToSection(link, event) {
    const target = $(link.getAttribute("href"));
    if (!target) return false;
    event.preventDefault();
    setMenuOpen(false);
    const anchorOffset = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    window.scrollTo({ top: Math.max(0, getLayoutTop(target) - anchorOffset), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    window.history.pushState(null, "", link.getAttribute("href"));
    return true;
  }
  $$(sectionLinkSelector).forEach((link) => link.addEventListener("click", (event) => navigateToSection(link, event)));

  // 资料索引的“在地图查看”使用独立停靠点：保留地图说明、筛选栏和地图主体。
  function navigateToMapIndex(event) {
    const mapSection = $("#map");
    const mapToolbar = mapSection?.querySelector(".map-toolbar");
    if (!mapSection || !mapToolbar) return;
    event.preventDefault();
    const rootStyle = getComputedStyle(document.documentElement);
    const fontSize = Number.parseFloat(rootStyle.fontSize) || 16;
    const headerVariable = window.matchMedia("(max-width: 47.5rem)").matches
      ? "--layout-header-height-mobile"
      : "--layout-header-height";
    const headerHeight = Number.parseFloat(rootStyle.getPropertyValue(headerVariable)) * fontSize;
    const specialOffset = headerHeight + 6.5 * fontSize;
    window.scrollTo({ top: Math.max(0, getLayoutTop(mapToolbar) - specialOffset), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    window.history.pushState(null, "", "#map");
    setMenuOpen(false);
  }
  // 搜索与分享弹窗共用同一组位移、缩放、时长和缓动参数。
  function openModalAnimation(panel) {
    return runElementAnimation(panel, [
      { opacity: 0, transform: `translateY(${readCssValue("--motion-search-travel-y")}) scale(${readCssValue("--motion-search-scale-from")})` },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ], "--motion-search-enter", "--ease-out");
  }

  function closeModalAnimation(panel) {
    return runElementAnimation(panel, [
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 0, transform: `translateY(${readCssValue("--motion-search-travel-y")}) scale(${readCssValue("--motion-search-scale-from")})` }
    ], "--motion-search-exit", "--ease-in-out");
  }

  // 导航栏时钟：使用本机时间，每秒检查一次，显示为 24 小时制 HH:mm。
  const headerClock = $("#headerClock");
  function updateHeaderClock() {
    if (!headerClock) return;
    const now = new Date();
    headerClock.dateTime = now.toISOString();
    headerClock.textContent = new Intl.DateTimeFormat(interfaceConfig.clockLocale, interfaceConfig.clockFormat).format(now);
  }
  updateHeaderClock();
  window.setInterval(updateHeaderClock, interfaceConfig.clockRefreshInterval);

  // 导航栏显示设置：即时预览、自动保存，并在关闭后把键盘焦点交还给设置按钮。
  const settingsDialog = $("#settingsDialog");
  const settingsForm = $("#settingsForm");
  const openSettingsButton = $("#openSettings");
  let settingsPanelAnimation = null;
  const settingOutputs = {
    motionIntensity: $("#motionValue"),
    tiltDegrees: $("#tiltValue"),
    dustQuantity: $("#dustValue")
  };

  function describeMotion(value) {
    if (value === 0) return "0%，关闭空间位移";
    if (value <= 30) return `${value}%，轻微动效`;
    if (value <= 70) return `${value}%，标准动效`;
    return `${value}%，明显动效`;
  }

  function describeTilt(value) {
    if (value === 0) return "0 度，关闭卡片倾斜";
    if (value <= 2) return `${value} 度，轻微立体效果`;
    if (value <= 4) return `${value} 度，标准立体效果`;
    return `${value} 度，明显立体效果`;
  }

  function describeDust(value) {
    if (value === 0) return "0 粒，关闭背景微尘";
    if (value <= 8) return `${value} 粒，少量微尘`;
    if (value <= 20) return `${value} 粒，适量微尘`;
    return `${value} 粒，较多微尘`;
  }

  function syncSettingsForm() {
    if (!settingsForm) return;
    const themeOption = settingsForm.querySelector(`[name="themeMode"][value="${userSettings.themeMode}"]`);
    if (themeOption) themeOption.checked = true;
    const openingAnimationInput = $("#openingAnimationEnabled");
    if (openingAnimationInput) openingAnimationInput.checked = window.localStorage.getItem(openingAnimationStorageKey) !== "false";
    const fontOption = settingsForm.querySelector(`[name="fontSize"][value="${userSettings.fontSize}"]`);
    const lineOption = settingsForm.querySelector(`[name="lineHeight"][value="${userSettings.lineHeight}"]`);
    if (fontOption) fontOption.checked = true;
    if (lineOption) lineOption.checked = true;

    const rangeBindings = {
      motionIntensity: motionSettingRanges.pageMotion,
      tiltDegrees: motionSettingRanges.cardTilt,
      dustQuantity: motionSettingRanges.backgroundDust
    };
    Object.entries(rangeBindings).forEach(([name, range]) => {
      const input = settingsForm.elements[name];
      if (!input) return;
      input.min = String(range.min);
      input.max = String(range.max);
      input.step = String(range.step);
      input.value = String(userSettings[name]);
    });
    settingOutputs.motionIntensity.value = `${userSettings.motionIntensity}${motionSettingRanges.pageMotion.unit}`;
    settingOutputs.tiltDegrees.value = `${userSettings.tiltDegrees}${motionSettingRanges.cardTilt.unit}`;
    settingOutputs.dustQuantity.value = `${userSettings.dustQuantity} ${motionSettingRanges.backgroundDust.unit}`;
    settingsForm.elements.motionIntensity?.setAttribute("aria-valuetext", describeMotion(userSettings.motionIntensity));
    settingsForm.elements.tiltDegrees?.setAttribute("aria-valuetext", describeTilt(userSettings.tiltDegrees));
    settingsForm.elements.dustQuantity?.setAttribute("aria-valuetext", describeDust(userSettings.dustQuantity));
    $("#systemMotionNote").hidden = !systemPrefersReducedMotion;
  }

  function openSettingsAnimation() {
    const panel = settingsDialog?.querySelector(".settings-panel");
    settingsPanelAnimation = runElementAnimation(panel, [
      { clipPath: `inset(0 0 0 ${readCssValue("--motion-settings-reveal-start")})` },
      { clipPath: "inset(0 0 0 0)" }
    ], "--motion-settings-enter", "--ease-in-out");
  }

  async function closeSettingsAnimation() {
    const panel = settingsDialog?.querySelector(".settings-panel");
    settingsPanelAnimation = runElementAnimation(panel, [
      { clipPath: "inset(0 0 0 0)" },
      { clipPath: `inset(0 0 0 ${readCssValue("--motion-settings-reveal-start")})` }
    ], "--motion-settings-exit", "--ease-in-out");
    if (settingsPanelAnimation) {
      try { await settingsPanelAnimation.finished; } catch (_) { return false; }
    }
    return true;
  }

  async function closeSettingsDialog() {
    if (!settingsDialog?.open || settingsDialog.classList.contains("is-closing")) return;
    settingsDialog.classList.add("is-closing");
    const completed = await closeSettingsAnimation();
    if (!completed || !settingsDialog.open) return;
    settingsDialog.classList.remove("is-closing");
    settingsDialog.close();
  }

  openSettingsButton?.addEventListener("click", () => {
    syncSettingsForm();
    settingsDialog.classList.remove("is-closing");
    settingsDialog.showModal();
    openSettingsAnimation();
    openSettingsButton.setAttribute("aria-expanded", "true");
    window.setTimeout(() => $("#closeSettings")?.focus(), 50);
  });
  $("#closeSettings")?.addEventListener("click", closeSettingsDialog);
  $("#doneSettings")?.addEventListener("click", closeSettingsDialog);
  settingsDialog?.addEventListener("click", (event) => { if (event.target === settingsDialog) closeSettingsDialog(); });
  settingsDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeSettingsDialog(); });
  settingsDialog?.addEventListener("close", () => {
    openSettingsButton?.setAttribute("aria-expanded", "false");
    openSettingsButton?.focus();
  });

  settingsForm?.addEventListener("input", (event) => {
    const input = event.target;
    if (input.id === "openingAnimationEnabled") {
      window.localStorage.setItem(openingAnimationStorageKey, String(input.checked));
      return;
    }
    if (!input.name) return;
    userSettings[input.name] = input.type === "range" ? Number(input.value) : input.value;
    applyDisplaySettings();
    syncSettingsForm();
  });

  $("#resetSettings")?.addEventListener("click", () => {
    userSettings = { ...defaultSettings };
    applyDisplaySettings();
    window.localStorage.setItem(openingAnimationStorageKey, "true");
    window.localStorage.setItem("niyun-ai-pet-enabled", "true");
    window.localStorage.setItem("niyun-ai-pet-dynamic-greeting", "true");
    window.dispatchEvent(new CustomEvent("media-settings-reset"));
    $("#openingAnimationEnabled")?.setAttribute("checked", "");
    $("#aiPetEnabled")?.setAttribute("checked", "");
    $("#aiPetDynamicGreeting")?.setAttribute("checked", "");
    window.dispatchEvent(new CustomEvent("ai-pet-settings-reset"));
    syncSettingsForm();
    showToast("显示设置已恢复默认");
  });
  syncSettingsForm();

  // 地图按钮和搜索定位共用筛选入口，保证按钮状态与点位数据同步。
  async function applyMapFilter(period = "全部") {
    $$(".filter-chip").forEach((button) => button.classList.toggle("active", button.dataset.period === period));
    renderSites(await ApiService.getSites(period));
  }

  $$(".filter-chip").forEach((button) => button.addEventListener("click", () => applyMapFilter(button.dataset.period)));
  $("#mapMarkers").addEventListener("click", (event) => {
    const marker = event.target.closest(".map-marker");
    if (!marker) return;
    const root = event.currentTarget;
    $$(".map-marker", root).forEach((item) => item.classList.toggle("active", item === marker));
    const index = visibleSites.findIndex((site) => site.id === Number(marker.dataset.siteId));
    if (index >= 0) updateSitePanel(visibleSites[index], index);
  });
  $("#courseList").addEventListener("click", (event) => { const button = event.target.closest("[data-course-id]"); if (button) selectCourse(button.dataset.courseId); });
  const sourceDialog = $("#sourceDialog");
  const sourceDialogPanel = sourceDialog?.querySelector(".source-dialog-panel");
  const sourceDialogSearch = $("#sourceDialogSearch");
  const clearSourceDialogSearch = $("#clearSourceDialogSearch");

  async function closeSourceDialog() {
    if (!sourceDialog?.open || sourceDialog.classList.contains("is-closing")) return;
    sourceDialog.classList.add("is-closing");
    const animation = closeModalAnimation(sourceDialogPanel);
    if (animation) {
      try { await animation.finished; } catch (_) { return; }
    }
    sourceDialog.classList.remove("is-closing");
    sourceDialog.close();
  }

  // 主列表和完整弹窗都通过 data-source-site 跳转地图地点。
  function handleSourceSiteClick(event) {
    const link = event.target.closest("[data-source-site]");
    if (!link) return;
    navigateToMapIndex(event);
    const marker = $(`[data-site-id="${link.dataset.sourceSite}"]`);
    if (sourceDialog?.open) closeSourceDialog();
    if (marker) window.setTimeout(() => marker.click(), 400);
  }
  $("#sourceIndex").addEventListener("click", handleSourceSiteClick);
  $("#sourceDialogIndex").addEventListener("click", handleSourceSiteClick);

  // 完整图录弹窗只在打开后渲染，减少首页首次加载的 DOM 数量。
  $("#openSourceIndex").addEventListener("click", () => {
    renderSourceDialogIndex();
    sourceDialog.classList.remove("is-closing");
    sourceDialog.showModal();
    openModalAnimation(sourceDialogPanel);
    sourceDialogSearch.focus();
  });
  $("#closeSourceIndex").addEventListener("click", () => closeSourceDialog());
  sourceDialog.addEventListener("click", (event) => { if (event.target === sourceDialog) closeSourceDialog(); });
  sourceDialog.addEventListener("cancel", (event) => { event.preventDefault(); closeSourceDialog(); });
  sourceDialogSearch.addEventListener("input", (event) => renderSourceDialogIndex(event.target.value));
  clearSourceDialogSearch.addEventListener("click", () => {
    sourceDialogSearch.value = "";
    renderSourceDialogIndex();
    replayClearFeedback(sourceDialogSearch, ".source-search-wrap");
  });
  $("#coursePlayer").addEventListener("click", (event) => {
    if (!event.target.closest("#playCourse")) return;
    showToast("课程视频接口已预留，请在 data/media-config.js 中填写 videoUrl");
  });

  // ==================== 06. 全站搜索弹窗 ====================
  const searchDialog = $("#searchDialog");
  const searchInput = $("#searchInput");
  const searchResults = $("#searchResults");
  const clearSearchButton = $("#clearSearch");
  const initialSearchMessage = "<p>输入关键词以检索封泥藏品、古地名与调研档案。</p>";
  let searchBoxAnimation = null;

  // 输入框有内容时显示清除按钮；为空时隐藏，避免出现无效操作。
  function updateSearchClearButton() {
    if (clearSearchButton) clearSearchButton.hidden = !searchInput?.value;
  }

  // 所有关闭方式共用同一个函数，防止关闭按钮、遮罩和结果点击行为不一致。
  function openSearchAnimation() {
    const box = searchDialog?.querySelector(".search-box");
    searchBoxAnimation = openModalAnimation(box);
  }

  async function closeSearchAnimation() {
    const box = searchDialog?.querySelector(".search-box");
    searchBoxAnimation = closeModalAnimation(box);
    if (searchBoxAnimation) {
      try { await searchBoxAnimation.finished; } catch (_) { return false; }
    }
    return true;
  }

  async function closeSearchDialog() {
    if (!searchDialog?.open || searchDialog.classList.contains("is-closing")) return;
    searchDialog.classList.add("is-closing");
    const completed = await closeSearchAnimation();
    if (!completed || !searchDialog.open) return;
    searchDialog.classList.remove("is-closing");
    searchDialog.close();
  }

  if ($("#openSearch") && searchDialog) {
    $("#openSearch").addEventListener("click", () => {
      searchDialog.classList.remove("is-closing");
      searchDialog.showModal();
      openSearchAnimation();
      updateSearchClearButton();
      window.setTimeout(() => searchInput?.focus(), 50);
    });
  }

  // 支持右上角按钮、点击灰色遮罩和浏览器原生 Esc 三种关闭方式。
  $("#closeSearch")?.addEventListener("click", closeSearchDialog);
  searchDialog?.addEventListener("click", (event) => { if (event.target === searchDialog) closeSearchDialog(); });
  searchDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeSearchDialog(); });
  searchDialog?.addEventListener("keydown", (event) => {
    // 部分内嵌浏览器不会自动触发 dialog 的 cancel 事件，因此显式处理 Escape。
    if (event.key === "Escape") { event.preventDefault(); closeSearchDialog(); }
  });
  searchDialog?.addEventListener("close", () => $("#openSearch")?.focus());

  searchInput?.addEventListener("input", updateSearchClearButton);
  // 清除后保留输入焦点，并用文字和短暂底色同时提供视觉反馈。
  clearSearchButton?.addEventListener("click", () => {
    searchInput.value = "";
    searchResults.innerHTML = '<p class="search-feedback">已清除搜索内容，可以输入新的关键词。</p>';
    updateSearchClearButton();
    replayClearFeedback(searchInput, ".search-input-wrap");
  });

  async function search() {
    if (!searchInput || !searchResults) return;
    const keyword = searchInput.value.trim();
    if (!keyword) { searchResults.innerHTML = initialSearchMessage; searchInput.focus(); return; }
    searchResults.innerHTML = "<p>正在检索封泥档案……</p>";
    const response = await ApiService.getRelics({ keyword });
    const query = keyword.toLowerCase();

    // 将 45 区县图录的地点、古县、行政归属、备注和全部印文一并纳入全站搜索。
    const sourceMatches = findKnowledgeSites(query);
    const total = response.total + sourceMatches.length;
    const relicGroup = response.items.length
      ? `<div class="search-result-group"><h3>代表藏品 <span>${response.total}</span></h3>${response.items.map((item) => `<button type="button" data-search-id="${item.id}"><strong>${item.name}</strong><span>${item.period} · ${item.location}</span></button>`).join("")}</div>`
      : "";
    const sourceGroup = sourceMatches.length
      ? `<div class="search-result-group"><h3>45区县金石图录 <span>${sourceMatches.length}</span></h3>${sourceMatches.map((site) => {
          const matchedSeals = site.seals.filter((seal) => seal.toLowerCase().includes(query));
          const detail = matchedSeals.length ? matchedSeals.slice(0, 2).join(" · ") : `${site.period} · ${site.admin}`;
          return `<button type="button" data-search-site-id="${site.id}"><strong>${escapeHtml(site.city)} · ${escapeHtml(site.name)}</strong><span>${escapeHtml(detail)}</span></button>`;
        }).join("")}</div>`
      : "";
    searchResults.innerHTML = total
      ? `<p class="search-count">共找到 ${total} 条相关档案，点击即可前往对应位置。</p>${relicGroup}${sourceGroup}`
      : `<p>没有找到“${escapeHtml(keyword)}”，可以尝试“临淄”“守印”或“仓府”。</p>`;
  }
  $("#searchForm")?.addEventListener("submit", (e) => { e.preventDefault(); search(); });
  // 藏品和图录共用一个结果监听；根据 data 属性分流，避免重复绑定事件。
  searchResults?.addEventListener("click", async (event) => {
    const resultButton = event.target.closest("[data-search-id], [data-search-site-id]");
    if (!resultButton) return;

    if (resultButton.dataset.searchId) {
      const relic = await ApiService.getRelicById(resultButton.dataset.searchId);
      closeSearchDialog();
      window.setTimeout(() => {
        const target = $(`[data-relic-card="${resultButton.dataset.searchId}"]`);
        if (!target) return $("#collection")?.scrollIntoView();
        revealTarget(target);
        if (relic) showToast(`已定位：${relic.name} · ${relic.location}`);
      }, 80);
      return;
    }

    const site = getKnowledge()?.sites?.find((item) => item.id === Number(resultButton.dataset.searchSiteId));
    if (!site) return;
    closeSearchDialog();

    // 搜索结果直接打开完整图录弹窗，并定位对应卡片。
    renderSourceDialogIndex(site.city);
    sourceDialog.classList.remove("is-closing");
    sourceDialog.showModal();
    openModalAnimation(sourceDialogPanel);
    window.setTimeout(() => {
      const targetCard = $(`#sourceDialogIndex [data-source-card="${site.id}"]`);
      targetCard?.classList.add("search-target");
      targetCard?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
      showToast(`已定位图录：${site.city} · ${site.seals[0]}`);
    }, 80);
  });

  // ==================== 07. AI 聊天、图片预览和会话保存 ====================
  function appendMessage(text, role) {
    const messages = $("#chatMessages");
    const message = document.createElement("div");
    message.className = `chat-message ${role}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }
  function normalizeDisplayedAiName(text) {
    return String(text || "").replaceAll("于见泥", "印小灵");
  }
  function clearSelectedImages() {
    selectedImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    selectedImages = [];
    $("#aiImage").value = "";
    renderSelectedImages();
  }
  function renderSelectedImages() {
    const preview = $("#uploadPreview");
    preview.hidden = selectedImages.length === 0;
    $("#uploadCount").textContent = `已选择 ${selectedImages.length} 张图片`;
    $("#uploadThumbnails").innerHTML = selectedImages.map((item, index) => `<div class="upload-item"><img src="${item.previewUrl}" alt="待上传图片 ${index + 1}"><button type="button" data-remove-image="${item.id}" aria-label="移除${escapeHtml(item.file.name)}">×</button><span title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span></div>`).join("");
  }
  // 发送期间禁用按钮；成功后保存 sessionId，让百炼能够接着上一次对话回答。
  async function sendAiMessage(message) {
    const images = selectedImages.map((item) => item.file);
    if (!message && !images.length) return;
    const uploadText = images.length ? `已附带 ${images.length} 张图片` : "";
    appendMessage([message, uploadText].filter(Boolean).join(" · "), "user");
    $("#aiQuestion").value = "";
    clearSelectedImages();
    const pending = appendMessage("思考中……", "assistant pending");
    const submitButton = $("#chatForm button[type='submit']"); submitButton.disabled = true;
    try {
      const result = await AiService.chat({ message, images, sessionId: aiSessionId });
      pending.innerHTML = renderMarkdown(normalizeDisplayedAiName(result.reply));
      pending.classList.remove("pending");
      if (result.sessionId) {
        aiSessionId = result.sessionId;
        window.sessionStorage.setItem(aiSessionStorageKey, aiSessionId);
      }
    } catch (error) {
      pending.textContent = normalizeDisplayedAiName(error.message);
      pending.classList.remove("pending");
    } finally {
      submitButton.disabled = false;
    }
  }
  function renderAiStatus(status) {
    const statusElement = $("#aiStatus");
    if (!statusElement) return;
    statusElement.classList.toggle("disconnected", !status.connected);
    statusElement.innerHTML = `<i></i> ${status.connected ? "AI助手已连接" : "AI服务未连接"}`;
  }
  window.addEventListener("ai-status-change", (event) => renderAiStatus(event.detail || { connected: false }));
  $("#chatForm").addEventListener("submit", (event) => { event.preventDefault(); sendAiMessage($("#aiQuestion").value.trim()); });
  $$("[data-prompt]").forEach((button) => button.addEventListener("click", () => sendAiMessage(button.dataset.prompt)));
  $("#aiImage").addEventListener("change", () => {
    const files = [...$("#aiImage").files];
    const availableSlots = Math.max(0, 4 - selectedImages.length);
    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) { showToast(`${file.name} 超过 5MB，未加入上传队列`); return false; }
      return true;
    }).slice(0, availableSlots);
    if (files.length > availableSlots) showToast("一次最多选择 4 张图片");
    validFiles.forEach((file) => selectedImages.push({ id: `${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file) }));
    $("#aiImage").value = "";
    renderSelectedImages();
  });
  $("#uploadThumbnails").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-image]");
    if (!button) return;
    const index = selectedImages.findIndex((item) => item.id === button.dataset.removeImage);
    if (index < 0) return;
    URL.revokeObjectURL(selectedImages[index].previewUrl);
    selectedImages.splice(index, 1);
    renderSelectedImages();
  });
  $("#clearImages").addEventListener("click", clearSelectedImages);
  $("#clearChat").addEventListener("click", () => { $("#chatMessages").innerHTML = '<div class="chat-message assistant">对话已清空。印小灵还可以继续陪你了解封泥。</div>'; aiSessionId = ""; window.sessionStorage.removeItem(aiSessionStorageKey); clearSelectedImages(); });

  // ==================== 08. 通用点击提示和藏品详情 ====================
  document.addEventListener("click", async (event) => {
    const notice = event.target.closest("[data-notice]"); if (notice) showToast(notice.dataset.notice);
    const detail = event.target.closest("[data-relic-id]"); if (detail) { const relic = await ApiService.getRelicById(detail.dataset.relicId); if (relic) showToast(`${relic.name}：${relic.inscription}，${relic.location}`); }
  });

  // ==================== 09. 滚动观察：导航高亮和板块渐显 ====================
  const navLinks = $$("#mainNav a");
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`)); }), { rootMargin: "-35% 0px -55%" });
  $$('main section[id]').forEach((section) => observer.observe(section));
  // 栏目进入时播放出现动画，完全离开后按离开方向消失；再次进入会重新播放。
  const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
    const section = entry.target;
    if (entry.isIntersecting) {
      section.classList.remove("is-exiting-up", "is-exiting-down");
      section.classList.add("is-visible");
      return;
    }
    section.classList.remove("is-visible");
    // Observer 在元素刚越过边界时触发，此时元素可能尚未完全出屏；用中心位置判断方向更稳定。
    const exitsAbove = entry.boundingClientRect.top + entry.boundingClientRect.height / 2 < window.innerHeight / 2;
    section.classList.toggle("is-exiting-up", exitsAbove);
    section.classList.toggle("is-exiting-down", !exitsAbove);
  }), { rootMargin: "-8% 0px -8%", threshold: 0.01 });
  $$('[data-reveal]').forEach((section) => revealObserver.observe(section));

  /* 1. Global Reading Progress Cord & Parallax */
  const pageScrollTrack = $("#pageScrollTrack");
  const pageProgressBar = $("#pageProgressBar");
  let scrollTicking = false;

  function getPageScrollRange() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function updatePageScrollPosition(percent) {
    const clampedPercent = Math.min(100, Math.max(0, percent));
    window.scrollTo({ top: getPageScrollRange() * clampedPercent / 100, behavior: "auto" });
  }

  function updatePageScrollFromPointer(event) {
    if (!pageScrollTrack) return;
    const bounds = pageScrollTrack.getBoundingClientRect();
    const percent = bounds.width > 0 ? ((event.clientX - bounds.left) / bounds.width) * 100 : 0;
    updatePageScrollPosition(percent);
  }

  if (pageScrollTrack) {
    pageScrollTrack.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      pageScrollTrack.setPointerCapture(event.pointerId);
      pageScrollTrack.classList.add("is-dragging");
      document.documentElement.classList.add("is-page-scrubbing");
      updatePageScrollFromPointer(event);
    });
    pageScrollTrack.addEventListener("pointermove", (event) => {
      if (pageScrollTrack.hasPointerCapture(event.pointerId)) updatePageScrollFromPointer(event);
    });
    const stopPageScrollDrag = (event) => {
      if (pageScrollTrack.hasPointerCapture(event.pointerId)) pageScrollTrack.releasePointerCapture(event.pointerId);
      pageScrollTrack.classList.remove("is-dragging");
      document.documentElement.classList.remove("is-page-scrubbing");
    };
    pageScrollTrack.addEventListener("pointerup", stopPageScrollDrag);
    pageScrollTrack.addEventListener("pointercancel", stopPageScrollDrag);
    pageScrollTrack.addEventListener("keydown", (event) => {
      const currentPercent = getPageScrollRange() > 0 ? (window.scrollY / getPageScrollRange()) * 100 : 0;
      const keySteps = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2, PageUp: -10, PageDown: 10 };
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        updatePageScrollPosition(event.key === "Home" ? 0 : 100);
      } else if (Object.hasOwn(keySteps, event.key)) {
        event.preventDefault();
        updatePageScrollPosition(currentPercent + keySteps[event.key]);
      }
    });
  }

  window.addEventListener("scroll", () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        if (pageProgressBar) {
          const clampedPercent = Math.min(100, Math.max(0, scrollPercent));
          pageProgressBar.style.width = `${clampedPercent}%`;
          pageScrollTrack?.setAttribute("aria-valuenow", String(Math.round(clampedPercent)));
          pageScrollTrack?.setAttribute("aria-valuetext", clampedPercent <= 0 ? "页面顶部" : clampedPercent >= 100 ? "页面底部" : `页面 ${Math.round(clampedPercent)}%`);
        }

        if (!prefersReducedMotion()) {
          const shift = Math.min(scrollTop, window.innerHeight) / window.innerHeight;
          $$('[data-parallax]').forEach((item) => { item.style.setProperty("--parallax-y", `${shift * Number(item.dataset.parallax || 0) * (userSettings.motionIntensity / motionSettingRanges.pageMotion.max)}px`); });
        }
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });
  window.dispatchEvent(new Event("scroll"));

  // 搜索定位统一使用该函数：滚动、描边、焦点和动画清理只维护一份。
  function revealTarget(target) {
    if (!target) return;
    const reduceMotion = prefersReducedMotion();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    target.classList.remove("search-target");
    window.requestAnimationFrame(() => target.classList.add("search-target"));
    window.setTimeout(() => target.focus({ preventScroll: true }), reduceMotion ? 0 : visualEffects.searchFocusDelay);
    window.setTimeout(() => target.classList.remove("search-target"), visualEffects.searchHighlightLifetime);
  }

  /* 2. Interactive Tactile Stamp Ripple on Clickable Buttons */
  document.addEventListener("click", (event) => {
    const target = event.target.closest(".button, .filter-chip, .search-row button, .chat-form button, .scroll-story-controls button, .quick-prompts button");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "stamp-ripple";
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), visualEffects.rippleLifetime);
  });

  /* 3. 3D 卡片倾斜：计算和复位方式与 Web-backup 中的原函数保持一致。 */
  if (window.matchMedia("(pointer: fine)").matches) {
    const cardSelector = [
      ".relic-card", ".story-card", ".creative-card", ".research-grid article",
      ".knowledge-values dl div", ".value-grid article", ".story-details article",
      ".course-list button", ".source-findings article", ".source-index article"
    ].join(", ");

    document.addEventListener("mousemove", (event) => {
      const card = event.target.closest(cardSelector);
      if (!card) return;
      if (userSettings.tiltDegrees === 0) { card.style.transform = ""; return; }
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -visualEffects.cardTiltDegrees;
      const rotateY = ((x - centerX) / centerX) * visualEffects.cardTiltDegrees;
      card.style.transform = `perspective(${visualEffects.cardPerspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-${visualEffects.cardLift}px)`;
    });

    document.addEventListener("mouseout", (event) => {
      const card = event.target.closest(cardSelector);
      if (card && (!event.relatedTarget || !card.contains(event.relatedTarget))) {
        card.style.transform = "";
      }
    });
  }

  /* 4. Ambient Floating Dust Canvas (Golden Ink & Clay Particles) */
  (function initAmbientDust() {
    const canvas = $("#ambientCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particleCount = visualEffects.dustMaxParticles;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * visualEffects.dustSizeRange + visualEffects.dustSizeMin,
      speedX: (Math.random() - 0.5) * visualEffects.dustHorizontalSpeed,
      speedY: Math.random() * visualEffects.dustVerticalSpeedRange + visualEffects.dustVerticalSpeedMin,
      opacity: Math.random() * visualEffects.dustOpacityRange + visualEffects.dustOpacityMin,
      color: Math.random() < visualEffects.dustPrimaryRatio ? visualEffects.dustPrimaryColor : visualEffects.dustAccentColor
    }));

    function animate() {
      ctx.clearRect(0, 0, width, height);
      const activeCount = Math.min(particles.length, userSettings.dustQuantity);
      particles.slice(0, activeCount).forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y > height) { p.y = -5; p.x = Math.random() * width; }
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }());

  /* 5. 图片懒加载：监听图片加载完成，添加淡入效果 */
  (function initLazyImageLoading() {
    // 现代浏览器支持原生 loading="lazy"，我们只需监听加载完成事件
    const lazyImages = $$('img[loading="lazy"]');

    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            // 图片进入视口后，等待其加载完成
            if (img.complete) {
              img.classList.add('loaded');
            } else {
              img.addEventListener('load', function onLoad() {
                img.classList.add('loaded');
                img.removeEventListener('load', onLoad);
              }, { once: true });
            }
            imageObserver.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px' // 提前50px开始加载
      });

      lazyImages.forEach((img) => {
        // 如果图片已经加载完成（可能是缓存），直接添加类名
        if (img.complete) {
          img.classList.add('loaded');
        } else {
          imageObserver.observe(img);
        }
      });
    } else {
      // 降级处理：不支持 IntersectionObserver 的浏览器直接显示
      lazyImages.forEach((img) => img.classList.add('loaded'));
    }
  })();

  init().catch(() => { finishOpeningLoader(false); showToast("部分页面资料加载失败，请稍后重试"); });
}());
