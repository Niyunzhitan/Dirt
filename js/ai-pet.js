(function () {
  const config = window.AI_PET_CONFIG || {};
  const root = document.querySelector("#aiPet");
  if (!root || config.enabled === false || !window.AiService) return;

  const storageKey = "niyun-ai-pet-enabled";
  const sessionKey = "niyun-yinxiaoling-ai-pet-session";
  const positionKey = "niyun-ai-pet-relative-position";
  const petButton = root.querySelector("[data-pet-toggle]");
  const panel = root.querySelector(".ai-pet-panel");
  const form = root.querySelector(".ai-pet-form");
  const input = root.querySelector(".ai-pet-input");
  const messages = root.querySelector(".ai-pet-messages");
  const stage = root.querySelector(".ai-pet-stage");
  const layers = stage ? Array.from(stage.querySelectorAll(".ai-pet-layer")) : [];
  let currentLayerIndex = 0;
  const image = layers[0] || root.querySelector(".ai-pet-image");
  const closeButton = root.querySelector("[data-pet-close]");
  const clearButton = root.querySelector("[data-pet-clear]");
  const greeting = root.querySelector(".ai-pet-greeting");
  const stateText = root.querySelector(".ai-pet-state");
  const greetingStorageKey = "niyun-ai-pet-dynamic-greeting";
  let sessionId = window.sessionStorage.getItem(sessionKey) || "";
  let moved = false;
  let hasCustomPosition = false;
  let customPositionRatio = { x: 1, y: 1 };
  let dragOffset = { x: 0, y: 0 };
  let pointerStart = { x: 0, y: 0 };
  let greetingTimer = null;
  let dynamicGreetingEnabled = false;
  let greetingIndex = 0;
  let imageContentBounds = { left: 0, top: 0, right: 1, bottom: 1 };
  let currentState = config.defaultState || "idle";
  let stateBeforeHover = currentState;
  let conversationInProgress = false;
  let pointerInside = false;
  let returnToIdleTimer = null;
  let conversationRevision = 0;

  function getPositionKey() {
    return `${positionKey}-${window.matchMedia("(max-width: 47.5rem)").matches ? "mobile" : "desktop"}`;
  }

  const viewportMediaQuery = window.matchMedia("(max-width: 47.5rem)");
  let lastViewportKey = getPositionKey();

  const greetingSets = {
    morning: ["早呀，今天也要元气满满！", "小爪子已经准备好啦", "要一起看看古人的小秘密吗？"],
    afternoon: ["下午好呀，来歇一小会儿吧", "好奇的事就交给我吧", "要不要拆开一段封泥故事？"],
    evening: ["晚上好呀，今天过得怎么样？", "我还留着一盏小灯等你", "来听一小段齐鲁往事吧"],
    night: ["夜深啦，说话轻轻的", "再查一个小问题就休息吧", "困困也没关系，我还醒着呢"]
  };

  function preloadPetStates() {
    const states = config.states || {};
    Object.values(states).forEach((src) => {
      if (!src) return;
      const img = new Image();
      img.src = src;
    });
  }
  preloadPetStates();

  function switchTexture(nextSrc) {
    if (!nextSrc) return;
    if (layers.length < 2) {
      if (image) image.src = nextSrc;
      return;
    }

    const currentLayer = layers[currentLayerIndex];
    const nextLayerIndex = (currentLayerIndex + 1) % layers.length;
    const nextLayer = layers[nextLayerIndex];

    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (currentLayer.getAttribute("data-applied-src") === nextSrc) {
      return;
    }

    nextLayer.setAttribute("data-applied-src", nextSrc);
    nextLayer.src = nextSrc;

    if (isReducedMotion) {
      layers.forEach((l, idx) => {
        if (idx === nextLayerIndex) {
          l.classList.add("is-active");
          l.classList.remove("is-fading-out");
        } else {
          l.classList.remove("is-active");
          l.classList.remove("is-fading-out");
        }
      });
      currentLayerIndex = nextLayerIndex;
      return;
    }

    // 触发平滑交叉淡入淡出（Cross-fade）
    requestAnimationFrame(() => {
      nextLayer.classList.remove("is-fading-out");
      nextLayer.classList.add("is-active");

      currentLayer.classList.remove("is-active");
      currentLayer.classList.add("is-fading-out");

      currentLayerIndex = nextLayerIndex;
    });
  }

  function setState(state, label) {
    currentState = state;
    root.dataset.state = state;
    stateText.textContent = label || ({
      idle: "来找我玩呀",
      hover: "来找我玩呀",
      listening: "小耳朵竖起来啦",
      thinking: "让我抱着线索想一想",
      answering: "答案马上端上来",
      happy: "嘿嘿，帮上忙啦",
      error: "小脑袋好像打了个结"
    }[state] || "来找我玩呀");
    const targetSrc = config.states?.[state] || config.states?.idle || "./assets/branding/idling.png";
    switchTexture(targetSrc);
    updateGreeting(state);
  }

  layers.forEach((layer) => {
    layer.addEventListener("error", () => {
      const fallback = config.states?.idle || "./assets/branding/idling.png";
      if (layer.src.endsWith(fallback)) return;
      layer.src = fallback;
    });
  });

  function updateGreeting(state = "idle") {
    const hour = new Date().getHours();
    const period = hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : hour < 23 ? "evening" : "night";
    const stateLines = { thinking: "正在翻翻小册子", happy: "找到线索啦", error: "呀，线索绕成一团了" };
    if (stateLines[state]) { greeting.textContent = stateLines[state]; return; }
    const options = greetingSets[period];
    greeting.textContent = options[greetingIndex % options.length];
    greetingIndex += 1;
  }

  function stopGreetingCycle() {
    if (greetingTimer) window.clearTimeout(greetingTimer);
    greetingTimer = null;
    root.classList.remove("has-greeting");
  }

  function startGreetingCycle(delay = 0) {
    stopGreetingCycle();
    if (!dynamicGreetingEnabled) return;
    const timing = config.greetingTiming || {};
    const visibleMs = Math.max(1000, Number(timing.visibleMs) || 5000);
    const hiddenMs = Math.max(500, Number(timing.hiddenMs) || 3000);
    const initialDelayMs = Math.max(0, Number(timing.initialDelayMs) || 0);
    const showNextGreeting = () => {
      if (!dynamicGreetingEnabled) return;
      updateGreeting(root.dataset.state || "idle");
      root.classList.add("has-greeting");
      greetingTimer = window.setTimeout(() => {
        root.classList.remove("has-greeting");
        greetingTimer = window.setTimeout(showNextGreeting, hiddenMs);
      }, visibleMs);
    };
    greetingTimer = window.setTimeout(showNextGreeting, delay || initialDelayMs);
  }

  function clearMessages() {
    conversationRevision += 1;
    conversationInProgress = false;
    window.clearTimeout(returnToIdleTimer);
    returnToIdleTimer = null;
    sessionId = "";
    window.sessionStorage.removeItem(sessionKey);
    stateBeforeHover = "idle";
    setState("idle");
    messages.innerHTML = '<div class="ai-pet-message assistant">小黑板擦干净啦！我们重新聊封泥吧~</div>';
    messages.scrollTop = messages.scrollHeight;
    input.value = "";
    input.focus();
  }

  let closeTimer = null;

  function openPanel() {
    if (closeTimer) window.clearTimeout(closeTimer);
    stopGreetingCycle();
    root.classList.add("is-panel-open");
    panel.hidden = false;
    panel.classList.remove("is-closing");
    panel.classList.add("is-opening");
    const finishOpening = (event) => {
      if (event.animationName !== "ai-pet-panel-in") return;
      panel.classList.remove("is-opening");
    };
    panel.addEventListener("animationend", finishOpening, { once: true });
    window.setTimeout(() => panel.classList.remove("is-opening"), 900);
    petButton.setAttribute("aria-expanded", "true");
    input.focus();
  }

  function closePanel() {
    if (panel.hidden || panel.classList.contains("is-closing")) return;
    panel.classList.remove("is-opening");
    panel.classList.add("is-closing");
    petButton.setAttribute("aria-expanded", "false");
    const finishClosing = (event) => {
      if (event.animationName !== "ai-pet-panel-out") return;
      panel.hidden = true;
      panel.classList.remove("is-closing");
      root.classList.remove("is-panel-open");
      startGreetingCycle();
      closeTimer = null;
    };
    panel.addEventListener("animationend", finishClosing, { once: true });
    closeTimer = window.setTimeout(() => {
      panel.hidden = true;
      panel.classList.remove("is-closing");
      root.classList.remove("is-panel-open");
      startGreetingCycle();
      closeTimer = null;
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400);
  }

  function appendMessage(text, role) {
    const message = document.createElement("div");
    message.className = `ai-pet-message ${role}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  async function send(text) {
    const message = text.trim();
    if (!message) return;
    const requestRevision = ++conversationRevision;
    conversationInProgress = true;
    window.clearTimeout(returnToIdleTimer);
    appendMessage(message, "user");
    input.value = "";
    const pending = appendMessage("让我翻翻小册子呀……", "assistant pending");
    setState("thinking");
    try {
      const result = await window.AiService.chat({ message, sessionId });
      if (requestRevision !== conversationRevision) return;
      pending.textContent = String(result.reply || "咦，答案刚刚躲起来了，再问我一次好吗？").replaceAll("于见泥", "印小灵");
      pending.classList.remove("pending");
      setState("happy");
      if (result.sessionId) {
        sessionId = result.sessionId;
        window.sessionStorage.setItem(sessionKey, sessionId);
      }
    } catch (error) {
      if (requestRevision !== conversationRevision) return;
      pending.textContent = `呜，线索暂时没接上：${String(error.message || "请稍后再试一次").replaceAll("于见泥", "印小灵")}`;
      pending.classList.remove("pending");
      setState("error");
    } finally {
      if (requestRevision !== conversationRevision) return;
      conversationInProgress = false;
      if (pointerInside && !panel.hidden) {
        stateBeforeHover = "idle";
        setState("hover");
      } else {
        returnToIdleTimer = window.setTimeout(() => setState("idle"), 1800);
      }
    }
  }

  petButton.addEventListener("click", (event) => {
    if (moved) { event.preventDefault(); moved = false; return; }
    panel.hidden ? openPanel() : closePanel();
  });
  petButton.addEventListener("pointerenter", () => {
    pointerInside = true;
    window.clearTimeout(returnToIdleTimer);
    if (!conversationInProgress && currentState !== "hover") {
      stateBeforeHover = currentState;
      setState("hover");
    }
  });
  petButton.addEventListener("pointerleave", () => {
    pointerInside = false;
    if (currentState === "hover") setState(stateBeforeHover || "idle");
  });
  closeButton.addEventListener("click", closePanel);
  clearButton.addEventListener("click", clearMessages);
  form.addEventListener("submit", (event) => { event.preventDefault(); send(input.value); });
  root.querySelectorAll("[data-pet-prompt]").forEach((button) => button.addEventListener("click", () => send(button.dataset.petPrompt)));

  if (config.allowDrag !== false) {
    const edgeSnapDistance = 32;
    petButton.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      moved = false;
      const rect = root.getBoundingClientRect();
      dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      pointerStart = { x: event.clientX, y: event.clientY };
      petButton.setPointerCapture(event.pointerId);
    });
    petButton.addEventListener("pointermove", (event) => {
      if (!petButton.hasPointerCapture(event.pointerId)) return;
      event.preventDefault();
      const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
      if (distance < 6) return;
      moved = true;
      const bounds = getDragBounds();
      const proposedLeft = event.clientX - dragOffset.x;
      const proposedTop = event.clientY - dragOffset.y;
      const left = event.clientX <= edgeSnapDistance
        ? bounds.minLeft
        : event.clientX >= window.innerWidth - edgeSnapDistance
          ? bounds.maxLeft
          : Math.max(bounds.minLeft, Math.min(bounds.maxLeft, proposedLeft));
      const top = event.clientY <= edgeSnapDistance
        ? bounds.minTop
        : event.clientY >= window.innerHeight - edgeSnapDistance
          ? bounds.maxTop
          : Math.max(bounds.minTop, Math.min(bounds.maxTop, proposedTop));
      hasCustomPosition = true;
      customPositionRatio = {
        x: bounds.maxLeft > bounds.minLeft ? (left - bounds.minLeft) / (bounds.maxLeft - bounds.minLeft) : 1,
        y: bounds.maxTop > bounds.minTop ? (top - bounds.minTop) / (bounds.maxTop - bounds.minTop) : 1
      };
      window.localStorage.setItem(getPositionKey(), JSON.stringify(customPositionRatio));
      root.style.left = `${left}px`;
      root.style.top = `${top}px`;
      root.style.right = "auto";
      root.style.bottom = "auto";
    });
    petButton.addEventListener("dragstart", (event) => event.preventDefault());
  }

  function resetToDefaultPosition() {
    hasCustomPosition = false;
    customPositionRatio = { x: 1, y: 1 };
    root.style.left = "";
    root.style.top = "";
    root.style.right = "";
    root.style.bottom = "";
  }

  function adaptCustomPosition() {
    if (!hasCustomPosition) {
      resetToDefaultPosition();
      return;
    }
    const bounds = getDragBounds();
    root.style.right = "auto";
    root.style.bottom = "auto";
    root.style.left = `${Math.round(bounds.minLeft + customPositionRatio.x * (bounds.maxLeft - bounds.minLeft))}px`;
    root.style.top = `${Math.round(bounds.minTop + customPositionRatio.y * (bounds.maxTop - bounds.minTop))}px`;
  }

  // 根容器覆盖完整图片盒子，允许图片盒子的四边贴到视口边缘。
  function getDragBounds() {
    const imageWidth = root.offsetWidth;
    const imageHeight = root.offsetHeight;
    return {
      minLeft: -imageContentBounds.left * imageWidth,
      maxLeft: window.innerWidth - imageContentBounds.right * imageWidth,
      minTop: -imageContentBounds.top * imageHeight,
      maxTop: window.innerHeight - imageContentBounds.bottom * imageHeight
    };
  }

  window.addEventListener("resize", adaptCustomPosition, { passive: true });
  window.visualViewport?.addEventListener("resize", adaptCustomPosition, { passive: true });
  viewportMediaQuery.addEventListener?.("change", () => {
    const nextViewportKey = getPositionKey();
    if (nextViewportKey === lastViewportKey) return;
    lastViewportKey = nextViewportKey;
    try {
      const savedPosition = JSON.parse(window.localStorage.getItem(nextViewportKey) || "null");
      hasCustomPosition = Boolean(savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y));
      if (hasCustomPosition) {
        customPositionRatio = {
          x: Math.min(1, Math.max(0, savedPosition.x)),
          y: Math.min(1, Math.max(0, savedPosition.y))
        };
      }
    } catch (_) {
      hasCustomPosition = false;
    }
    if (hasCustomPosition) adaptCustomPosition();
    else resetToDefaultPosition();
  });
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => adaptCustomPosition()).observe(petButton);
  }

  const enabled = window.localStorage.getItem(storageKey) !== "false";
  dynamicGreetingEnabled = window.localStorage.getItem(greetingStorageKey) !== "false" && config.dynamicGreeting !== false;
  const enabledInput = document.querySelector("#aiPetEnabled");
  const dynamicGreetingInput = document.querySelector("#aiPetDynamicGreeting");
  if (enabledInput) enabledInput.checked = enabled;
  if (dynamicGreetingInput) dynamicGreetingInput.checked = dynamicGreetingEnabled;
  root.hidden = !enabled;
  try {
    const positionKeyForViewport = getPositionKey();
    const savedPosition = JSON.parse(window.localStorage.getItem(positionKeyForViewport) || "null");
    if (savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)) {
      customPositionRatio = {
        x: Math.min(1, Math.max(0, savedPosition.x)),
        y: Math.min(1, Math.max(0, savedPosition.y))
      };
      hasCustomPosition = true;
      requestAnimationFrame(() => {
        adaptCustomPosition();
        requestAnimationFrame(adaptCustomPosition);
      });
    }
  } catch (_) {
    hasCustomPosition = false;
  }
  image.alt = config.imageAlt || "印小灵封泥宠物";
  function measureImageContentBounds() {
    if (!image.naturalWidth || !image.naturalHeight) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          if (pixels[(y * canvas.width + x) * 4 + 3] <= 8) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
      if (maxX >= minX && maxY >= minY) {
        imageContentBounds = {
          left: minX / canvas.width,
          top: minY / canvas.height,
          right: (maxX + 1) / canvas.width,
          bottom: (maxY + 1) / canvas.height
        };
      }
    } catch (_) {
      imageContentBounds = { left: 0, top: 0, right: 1, bottom: 1 };
    }
    adaptCustomPosition();
  }
  image.addEventListener("load", measureImageContentBounds, { once: true });
  setState(currentState);
  startGreetingCycle();
  dynamicGreetingInput?.addEventListener("change", (event) => {
    const isEnabled = event.target.checked;
    dynamicGreetingEnabled = isEnabled;
    window.localStorage.setItem(greetingStorageKey, String(isEnabled));
    if (isEnabled) startGreetingCycle();
    else stopGreetingCycle();
  });
  enabledInput?.addEventListener("change", (event) => {
    const isEnabled = event.target.checked;
    window.localStorage.setItem(storageKey, String(isEnabled));
    root.hidden = !isEnabled;
    if (isEnabled) startGreetingCycle();
    else stopGreetingCycle();
  });

  window.addEventListener("ai-pet-settings-reset", () => {
    window.localStorage.setItem(storageKey, "true");
    window.localStorage.setItem(greetingStorageKey, "true");
    if (enabledInput) enabledInput.checked = true;
    if (dynamicGreetingInput) dynamicGreetingInput.checked = true;
    root.hidden = false;
    dynamicGreetingEnabled = true;
    startGreetingCycle();
  });
}());
