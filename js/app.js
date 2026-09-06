(function () {
  // ==================== 01. 通用工具和页面状态 ====================
  // $ 查找一个元素，$$ 查找多个元素并转成数组，后面所有板块都会使用。
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  let visibleSites = [];
  // 改名后启用新的会话命名空间，避免旧会话带回历史 AI 名称。
  const aiSessionStorageKey = "niyun-yinxiaoling-ai-session";
  window.sessionStorage.removeItem("nimeng-ai-session");

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
    backgroundDust: { min: 0, max: 64, step: 4, defaultValue: 16, unit: "粒" },
    backgroundDustSpeed: { min: 0, max: 200, step: 5, defaultValue: 100, initialValue: 25, unit: "%" }
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
    dustQuantity: systemPrefersReducedMotion ? motionSettingRanges.backgroundDust.min : motionSettingRanges.backgroundDust.defaultValue,
    dustSpeed: systemPrefersReducedMotion ? motionSettingRanges.backgroundDustSpeed.min : motionSettingRanges.backgroundDustSpeed.defaultValue
  };
  let userSettings = { ...defaultSettings };
  let settingsNeedMigration = false;

  try {
    const currentSettings = window.localStorage.getItem(settingsStorageKey);
    const legacySettings = legacySettingsStorageKeys.map((key) => window.localStorage.getItem(key)).find(Boolean);
    const savedSettings = JSON.parse(currentSettings || legacySettings || "{}");
    if (!currentSettings && legacySettings) settingsNeedMigration = true;
    // 新增速度设置首次使用时从 25% 开始；“恢复默认”仍回到 100%。
    if (savedSettings.dustSpeed === undefined) {
      savedSettings.dustSpeed = systemPrefersReducedMotion ? motionSettingRanges.backgroundDustSpeed.min : motionSettingRanges.backgroundDustSpeed.initialValue;
      settingsNeedMigration = true;
    }
    // 兼容旧版“微尘强度 0～100%”：按比例迁移为“微尘数量 0～32 粒”。
    if (savedSettings.dustQuantity === undefined && savedSettings.dustIntensity !== undefined) {
      savedSettings.dustQuantity = Math.round((Number(savedSettings.dustIntensity) / 100) * motionSettingRanges.backgroundDust.max / motionSettingRanges.backgroundDust.step) * motionSettingRanges.backgroundDust.step;
      settingsNeedMigration = true;
    }
    delete savedSettings.dustIntensity;
    userSettings = { ...defaultSettings, ...savedSettings };
  } catch (_) {
    userSettings = {
      ...defaultSettings,
      dustSpeed: systemPrefersReducedMotion ? motionSettingRanges.backgroundDustSpeed.min : motionSettingRanges.backgroundDustSpeed.initialValue
    };
  }

  /* 必须由 JavaScript 计算的动态视觉参数；CSS 外观参数统一放在 tokens.css。 */
  const visualEffects = {
    rippleLifetime: 600,       // 点击波纹保留时间（毫秒）
    searchFocusDelay: 700,     // 平滑滚动后移动焦点的等待时间（毫秒）
    searchHighlightLifetime: 1900, // 搜索目标描边保留时间（毫秒）
    cardTiltDegrees: motionSettingRanges.cardTilt.defaultValue, // 运行时由“卡片倾斜角度”设置更新
    cardPerspective: 800,      // 卡片 3D 透视距离
    cardLift: Math.min(motionSettingEffects.cardLiftMax, motionSettingRanges.cardTilt.defaultValue), // 随倾斜角度联动
    dustSpeedScale: motionSettingRanges.backgroundDustSpeed.defaultValue / 100, // 运行时由“背景微尘速度”设置更新
    dustMaxParticles: motionSettingRanges.backgroundDust.max, // 粒子池数量，单位：粒
    dustSizeMin: 0.8,          // 微尘最小半径
    dustSizeRange: 2.2,        // 微尘半径随机增量
    dustBaseSpeedScale: 2.5,    // 将当前基准速度提升为原来的 2.5 倍
    dustHorizontalSpeed: 0.35, // 微尘水平漂移速度
    dustVerticalSpeedMin: 0.15,// 微尘最小下落速度
    dustVerticalSpeedRange: 0.4,// 微尘下落速度随机增量
    dustOpacityMin: 0.15,      // 单粒微尘最低透明度
    dustOpacityRange: 0.45,    // 单粒微尘透明度随机增量
    dustPrimaryColor: "168, 51, 42", // 主要朱砂色 RGB
    dustAccentColor: "212, 175, 55", // 少量金色 RGB
    dustPrimaryRatio: 0.6,      // 朱砂微尘占比
    dustFrameIntervalMs: 32     // 微尘绘制间隔，约 31 FPS；页面装饰不需要 60 FPS
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
      dustQuantity: clampNumber(settings.dustQuantity, motionSettingRanges.backgroundDust.min, motionSettingRanges.backgroundDust.max, defaultSettings.dustQuantity),
      dustSpeed: clampNumber(settings.dustSpeed, motionSettingRanges.backgroundDustSpeed.min, motionSettingRanges.backgroundDustSpeed.max, defaultSettings.dustSpeed)
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
    visualEffects.dustSpeedScale = userSettings.dustSpeed / 100;
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
    $("#collectionGrid").innerHTML = items.length ? items.map((item) => {
      const archiveLabel = item.id === "NMX-001" ? "在图录中定位" : "打开完整图录";
      return `<article class="relic-card" data-relic-card="${escapeHtml(item.id)}" tabindex="-1">${createRelicVisual(item)}<div class="relic-info"><div><span>${escapeHtml(item.period)}</span><span>${escapeHtml(item.value)}</span></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.summary)}</p><button type="button" data-relic-id="${escapeHtml(item.id)}">${archiveLabel} <span>→</span></button></div></article>`;
    }).join("") : '<div class="empty-state"><strong>暂未找到相关封泥</strong><p>换一个名称、年代或地点试试。</p></div>';
  }

  const relicArchiveLinks = {
    "NMX-001": { query: "临淄守印", siteId: 114 },
    "NMX-002": { query: "墓印篆" },
    "NMX-003": { query: "仓府" },
    "NMX-004": { query: "齐北船丞" }
  };

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
    const bounds = window.SHANDONG_TERRAIN?.bounds || { west: 114.8102646639, east: 122.706, north: 38.3997238086, south: 34.3786 };
    root.innerHTML = sites.map((site, index) => {
      const city = String(site.city || "").split(" · ")[0];
      const county = String(site.city || "").split(" · ")[1]?.replace(/[县市区]$/, "");
      // 两种地图统一使用县级经纬度；site.x/site.y 只作为缺少县级坐标时的旧数据兜底。
      const coordinate = mapCoordinates.counties[county] || mapCoordinates.cities[city];
      const x = coordinate
        ? ((coordinate[0] - bounds.west) / (bounds.east - bounds.west)) * 100
        : Number(site.x) || 0;
      const y = coordinate
        ? ((bounds.north - coordinate[1]) / (bounds.north - bounds.south)) * 100
        : Number(site.y) || 0;
      const safeX = Math.min(100, Math.max(0, x));
      const safeY = Math.min(100, Math.max(0, y));
      const label = county ? `${city}·${county}` : city;
      return `<button class="map-marker${index === 0 ? " active" : ""}" type="button" style="left:${safeX}%;top:${safeY}%" data-terrain-x="${safeX}" data-terrain-y="${safeY}" data-site-id="${escapeHtml(site.id)}" aria-label="查看${escapeHtml(label)}"><i></i><span>${escapeHtml(label)}</span></button>`;
    }).join("");
    if (sites.length) updateSitePanel(sites[0]);
  }

  // 将 ppt-knowledge.js 中整理的研究发现写入页面。
  function renderSourceFindings() {
    const knowledge = getKnowledge();
    if (!knowledge || !knowledge.findings) return;
    $("#sourceFindings").innerHTML = knowledge.findings.map((item, index) => `<article><span class="card-index">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join("");
  }

  // 补充史料全部来自本地数据文件，图片、目录与证据栏均在浏览器端生成。
  // 补充史料直接嵌入45区县图录卡片，数据仍只来自本地前端文件。
  function supplementaryList(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function getSupplementarySource(site) {
    return (window.SUPPLEMENTARY_SOURCES?.entries || [])
      .find((entry) => Number(entry.mapSiteId) === Number(site.id));
  }

  function sourceCardSupplementImageTemplate(image, index) {
    const imageUrl = safeResourceUrl(image.src);
    if (!imageUrl) return "";
    return `<figure class="source-card-supplement-figure">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(image.alt || "补充史料图片")}" decoding="async">
      <figcaption>${escapeHtml(image.kind || "史料图")} ${String(index + 1).padStart(2, "0")} · ${escapeHtml(image.caption || "")}</figcaption>
    </figure>`;
  }

  function sourceCardSupplementDebateTemplate(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return `<div class="source-card-supplement-debate" aria-label="两种学术观点">
      <strong>学术争议：两说并存</strong>
      <div>${items.map((item) => `<p><b>${escapeHtml(item.label)}</b>${escapeHtml(item.text)}</p>`).join("")}</div>
    </div>`;
  }

  function sourceCardSupplementTemplate(entry) {
    const images = Array.isArray(entry.images) ? entry.images : [];
    return `<section class="source-card-supplement${entry.debate ? " is-debated" : ""}" aria-label="补充史料：${escapeHtml(entry.title)}">
      <div class="source-card-supplement-heading"><span class="source-card-supplement-label">补充史料</span><span class="source-card-supplement-category">${escapeHtml(entry.category)}</span></div>
      <h4 class="source-card-supplement-title">${escapeHtml(entry.title)}</h4>
      <p class="source-card-supplement-lead">${escapeHtml(entry.lead)}</p>
      ${images.length ? `<div class="source-card-supplement-gallery${images.length === 1 ? " is-single" : ""}">${images.map(sourceCardSupplementImageTemplate).join("")}</div>` : ""}
      <aside class="source-card-supplement-insight"><span>关键认识</span><p>${escapeHtml(entry.insight)}</p></aside>
      ${sourceCardSupplementDebateTemplate(entry.debate)}
      <details class="source-card-supplement-details">
        <summary>展开考古证据、传世文献与出处</summary>
        <div class="source-card-supplement-details-content">
          <div class="source-card-supplement-detail-grid">
            <section><h5>考古证据</h5>${supplementaryList(entry.archaeology)}</section>
            <section><h5>传世文献与研究</h5>${supplementaryList(entry.transmittedSources)}</section>
          </div>
          <div class="source-card-supplement-references"><h5>史料出处</h5>${supplementaryList(entry.references)}</div>
          <p class="source-card-supplement-caution"><strong>谨慎说明：</strong>${escapeHtml(entry.caution)}</p>
        </div>
      </details>
    </section>`;
  }

  function sourceCardTemplate(site) {
    const seals = Array.isArray(site.seals) ? site.seals : [];
    const supplement = getSupplementarySource(site);
    return `<article class="${supplement ? "has-supplement" : ""}" data-source-card="${site.id}" tabindex="-1">
      <div class="source-card-heading"><span>${escapeHtml(site.city)}</span><strong>${escapeHtml(seals.slice(0, 3).join(" · "))}${seals.length > 3 ? ` 等 ${site.count} 条` : ""}</strong></div>
      <p class="source-card-meta">${escapeHtml(site.period)}<br>${escapeHtml(site.admin)}</p>
      ${supplement ? sourceCardSupplementTemplate(supplement) : ""}
      <a class="source-card-map-link" href="#map" data-source-site="${site.id}">在地图查看 <b aria-hidden="true">→</b></a>
    </article>`;
  }

  function renderSourceCards(root, items) {
    root.innerHTML = items.length
      ? items.map(sourceCardTemplate).join("")
      : '<p class="source-empty">没有匹配资料，请尝试现代区县、古地名、印文或郡国名称。</p>';
    cacheSourceSupplementHeights(root);
  }

  // Measure accordion content while rendering, so the first click does not pay the layout cost.
  function cacheSourceSupplementHeights(root) {
    if (!root) return;
    root.querySelectorAll(".source-card-supplement-details").forEach((details) => {
      if (details.open) return;
      details.open = true;
      details.dataset.openHeight = String(details.scrollHeight);
      details.open = false;
    });
  }


  // Animate the accordion height while keeping the readable text visually steady.
  async function animateSourceSupplementDetails(details, shouldOpen) {
    const summary = details.querySelector(":scope > summary");
    const content = details.querySelector(":scope > .source-card-supplement-details-content");
    if (!summary || !content || details.classList.contains("is-animating")) return;

    if (prefersReducedMotion()) {
      details.open = shouldOpen;
      return;
    }

    const startHeight = details.getBoundingClientRect().height;
    const duration = shouldOpen
      ? Math.min(260, Math.max(200, readCssTime("--dur-short")))
      : Math.min(280, Math.max(240, readCssTime("--dur-short")));
    const contentDuration = shouldOpen ? duration : 360;
    const heightDuration = shouldOpen ? duration : 230;
    const heightDelay = 0;
    const easing = readCssValue("--ease-out");

    details.classList.add("is-animating");
    details.style.height = `${startHeight}px`;
    // Hide the content before opening <details>, so the first painted frame cannot flash it in.
    content.style.opacity = shouldOpen ? "0" : "1";
    if (shouldOpen) details.open = true;
    // The full height was measured during rendering; avoid a first-click layout read.
    const endHeight = shouldOpen
      ? Number(details.dataset.openHeight) || details.scrollHeight
      : summary.getBoundingClientRect().height;

    const heightAnimation = details.animate([
      { height: `${startHeight}px` },
      { height: `${endHeight}px` }
    ], { duration: heightDuration, delay: heightDelay, easing, fill: "both" });
    const contentAnimation = content.animate(
      shouldOpen ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: contentDuration, easing, fill: "both" }
    );

    try {
      await Promise.all([heightAnimation.finished, contentAnimation.finished]);
    } catch (_) {
      return;
    } finally {
      if (!shouldOpen) details.open = false;
      heightAnimation.cancel();
      contentAnimation.cancel();
      content.style.removeProperty("opacity");
      details.style.removeProperty("height");
      details.classList.remove("is-animating");
    }
  }

  function handleSourceSupplementDetailsClick(event) {
    const summary = event.target.closest(".source-card-supplement-details > summary");
    if (!summary || !event.currentTarget.contains(summary)) return;
    event.preventDefault();
    animateSourceSupplementDetails(summary.parentElement, !summary.parentElement.open);
  }

  // 页面只展示三处精选；完整筛选结果只在弹窗中渲染，数量文案跟随数据变化。
  function renderSourcePreview() {
    const sites = getKnowledge()?.sites || [];
    const featuredIds = [120, 129, 138];
    const featuredSites = featuredIds
      .map((id) => sites.find((site) => Number(site.id) === id))
      .filter(Boolean);
    const previewSites = featuredSites.length ? featuredSites : sites.slice(0, 3);
    renderSourceCards($("#sourceIndex"), previewSites);
    const remaining = Math.max(0, sites.length - previewSites.length);
    const moreLabel = $("#sourceIndexMoreLabel");
    if (moreLabel) moreLabel.textContent = remaining ? `查看其余 ${remaining} 处` : "查看完整图录";
  }

  function renderSourceDialogIndex(keyword = "") {
    const query = keyword.trim().toLowerCase();
    const items = findKnowledgeSites(query);
    renderSourceCards($("#sourceDialogIndex"), items);
    $("#clearSourceDialogSearch").hidden = !query;
    $("#sourceDialogFeedback").textContent = query ? `找到 ${items.length} 处匹配资料` : `显示全部 ${items.length} 处区县资料`;
  }

  let openingLoaderController = null;
  async function init() {
    openingLoaderController = window.NiyunOpeningLoader.create({ $ });
    openingLoaderController.start();
    const [stats, mapConfig, sites, relics, courseItems] = await Promise.all([ApiService.getStats(), ApiService.getMapConfig(), ApiService.getSites(), ApiService.getRelics(), ApiService.getCourses()]);
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
    await openingLoaderController.yieldToBrowser();
    renderRelics(relics.items);
    await openingLoaderController.yieldToBrowser();
    const courseBrowser = window.NiyunCourseBrowser.create({
      $, $$, escapeHtml, safeResourceUrl, prefersReducedMotion,
      mediaConfig: window.MEDIA_CONFIG
    });
    courseBrowser.renderCourses(courseItems);
    courseBrowser.initCourseScroll();
    await openingLoaderController.yieldToBrowser();
    renderSourceFindings();
    renderSourcePreview();
    window.NiyunScrollStory.create({ $, $$, escapeHtml, prefersReducedMotion }).init();
    aiChatController.renderStatus(await AiService.getStatus());
    openingLoaderController.finish(true);
  }

  const sourceDialog = $("#sourceDialog");
  const sourceDialogPanel = sourceDialog?.querySelector(".source-dialog-panel");
  const sourceDialogSearch = $("#sourceDialogSearch");
  const clearSourceDialogSearch = $("#clearSourceDialogSearch");

  // 搜索、图录和设置弹窗共用的基础进出场动画。
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

  let siteNavigationController = null;
  let sourceArchiveController = null;
  const getSettings = () => ({ ...userSettings });
  const updateSetting = (name, value) => { if (name) userSettings[name] = value; };
  const resetSettings = () => { userSettings = { ...defaultSettings }; };
  const displaySettingsController = window.NiyunDisplaySettings.create({
    $, getSettings, updateSetting, resetSettings, defaults: defaultSettings,
    ranges: motionSettingRanges, openingKey: openingAnimationStorageKey,
    reducedMotion: systemPrefersReducedMotion, applySettings: () => applyDisplaySettings(), showToast,
    dispatchReset: () => {
      window.dispatchEvent(new CustomEvent("media-settings-reset"));
      window.dispatchEvent(new CustomEvent("ai-pet-settings-reset"));
    }
  });
  displaySettingsController.init();

  siteNavigationController = window.NiyunSiteNavigation.create({
    $, $$, prefersReducedMotion, interfaceConfig
  });
  siteNavigationController.init();

  sourceArchiveController = window.NiyunSourceArchive.create({
    $, sourceDialog, sourceDialogPanel, sourceDialogSearch, clearSourceDialogSearch,
    renderSourceDialogIndex, cacheSourceSupplementHeights, animateSourceSupplementDetails,
    getRelicArchiveLink: (relicId) => relicArchiveLinks[relicId] || {},
    prefersReducedMotion, openModalAnimation, closeModalAnimation, showToast,
    getVisibleSites: () => visibleSites,
    navigateToMapIndex: (siteId) => siteNavigationController.navigateToMapIndex(siteId),
    setMenuOpen: (open) => siteNavigationController.setMenuOpen(open)
  });
  sourceArchiveController.init();

  const mapBrowserController = window.NiyunMapBrowser.create({
    $, $$, apiService: ApiService, getVisibleSites: () => visibleSites,
    renderSites, updateSitePanel,
    openCurrentSiteArchive: (siteId) => sourceArchiveController.openSite(siteId)
  });
  mapBrowserController.init();

  // ==================== 08. 通用点击提示和藏品详情 ====================
  function revealRelicCard(relicId) {
    const target = $(`[data-relic-card="${CSS.escape(String(relicId))}"]`);
    if (!target) return;
    revealTarget(target);
    window.history.pushState(null, "", "#collection");
  }

  $$("[data-artifact-relic-id]").forEach((artifact) => artifact.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    revealRelicCard(artifact.dataset.artifactRelicId);
  }));

  document.addEventListener("click", async (event) => {
    const artifact = event.target.closest("[data-artifact-relic-id]");
    if (artifact) {
      revealRelicCard(artifact.dataset.artifactRelicId);
      return;
    }
    const notice = event.target.closest("[data-notice]"); if (notice) showToast(notice.dataset.notice);
    const detail = event.target.closest("[data-relic-id]"); if (detail) { event.preventDefault(); await sourceArchiveController.openRelic(detail.dataset.relicId); }
  });

  // 搜索和图鉴定位共用同一套滚动、描边与焦点反馈。
  function revealTarget(target) {
    if (!target) return;
    const reduceMotion = prefersReducedMotion();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    target.classList.remove("search-target");
    window.requestAnimationFrame(() => target.classList.add("search-target"));
    window.setTimeout(() => target.focus({ preventScroll: true }), reduceMotion ? 0 : visualEffects.searchFocusDelay);
    window.setTimeout(() => target.classList.remove("search-target"), visualEffects.searchHighlightLifetime);
  }

  const searchDialogController = window.NiyunSearchDialog.create({
    $, escapeHtml, prefersReducedMotion, renderSourceDialogIndex,
    sourceDialog, sourceDialogPanel, openModalAnimation, closeModalAnimation,
    findKnowledgeSites, revealTarget, showToast, apiService: ApiService
  });
  searchDialogController.init();

  const aiChatController = window.NiyunAiChat.create({
    $, $$, escapeHtml, renderMarkdown, showToast, aiService: AiService,
    sessionStorageKey: aiSessionStorageKey
  });
  aiChatController.init();

  window.NiyunPageEffects.create({
    $, $$, prefersReducedMotion, getSettings, visualEffects, motionSettingRanges
  }).init();
  init().catch(() => { openingLoaderController?.finish(false); showToast("部分页面资料加载失败，请稍后重试"); });
}());
