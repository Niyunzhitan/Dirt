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
  const image = root.querySelector(".ai-pet-image");
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

  function getPositionKey() {
    return `${positionKey}-${window.matchMedia("(max-width: 47.5rem)").matches ? "mobile" : "desktop"}`;
  }

  const viewportMediaQuery = window.matchMedia("(max-width: 47.5rem)");
  let lastViewportKey = getPositionKey();

  const greetingSets = {
    morning: ["早上好呀！", "今天想认识哪方印？", "我已经准备好啦"],
    afternoon: ["下午好呀！", "有一枚印文想问吗？", "我来陪你一起解封泥"],
    evening: ["晚上好呀！", "今天的封泥故事还没讲完", "印小灵在线等你"],
    night: ["夜深了，轻声问我吧", "想了解一方封泥再休息吗？", "我会陪你查一查"]
  };

  function setState(state, label) {
    root.dataset.state = state;
    stateText.textContent = label || ({
      idle: "点击和我聊聊",
      listening: "我在听",
      thinking: "印小灵思考中",
      answering: "印小灵正在回答",
      happy: "希望能帮到你",
      error: "好像连接遇到了一点问题"
    }[state] || "印小灵");
    image.src = config.states?.[state] || config.states?.idle || "";
    updateGreeting(state);
  }

  function updateGreeting(state = "idle") {
    const hour = new Date().getHours();
    const period = hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : hour < 23 ? "evening" : "night";
    const stateLines = { thinking: "我正在认真想", happy: "找到答案啦", error: "我们再试一次" };
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
    messages.innerHTML = '<div class="ai-pet-message assistant">对话已清空。印小灵还可以继续陪你了解封泥。</div>';
    messages.scrollTop = messages.scrollHeight;
  }

  let closeTimer = null;

  function openPanel() {
    if (closeTimer) window.clearTimeout(closeTimer);
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
      closeTimer = null;
    };
    panel.addEventListener("animationend", finishClosing, { once: true });
    closeTimer = window.setTimeout(() => {
      panel.hidden = true;
      panel.classList.remove("is-closing");
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
    appendMessage(message, "user");
    input.value = "";
    const pending = appendMessage("思考中……", "assistant pending");
    setState("thinking");
    try {
      const result = await window.AiService.chat({ message, sessionId });
      pending.textContent = String(result.reply || "印小灵暂时没有返回内容").replaceAll("于见泥", "印小灵");
      pending.classList.remove("pending");
      setState("happy");
      if (result.sessionId) {
        sessionId = result.sessionId;
        window.sessionStorage.setItem(sessionKey, sessionId);
      }
    } catch (error) {
      pending.textContent = String(error.message || "AI服务暂时不可用").replaceAll("于见泥", "印小灵");
      pending.classList.remove("pending");
      setState("error");
    } finally {
      window.setTimeout(() => setState("idle"), 1800);
    }
  }

  petButton.addEventListener("click", (event) => {
    if (moved) { event.preventDefault(); moved = false; return; }
    panel.hidden ? openPanel() : closePanel();
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
  setState(config.defaultState || "idle");
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
