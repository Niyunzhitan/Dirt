(function () {
  // 云端优先、本地兜底；真实 Key 始终只保存在对应后端。
  // 地址为空时使用同源后端，支持通过 server.js 同时托管网页和 AI API。
  // 直接双击 index.html 时 origin 为 null，不会误发起 file:// 请求。
  const sameOriginBaseUrl = window.location.protocol === "http:" || window.location.protocol === "https:"
    ? window.location.origin
    : "";
  const localServerBaseUrl = window.location.protocol === "file:"
    ? "http://127.0.0.1:3000"
    : "";
  const API_BASE_URLS = [...new Set([
    window.APP_CONFIG?.AI_API_BASE_URL,
    window.APP_CONFIG?.AI_FALLBACK_API_BASE_URL,
    sameOriginBaseUrl,
    localServerBaseUrl
  ].filter(Boolean).map((url) => String(url).replace(/\/$/, "")))];
  let activeBaseUrl = "";

  function notifyStatus(status) {
    window.dispatchEvent(new CustomEvent("ai-status-change", { detail: status }));
  }

  // 浏览器不能直接把 File 对象放进 JSON，所以先转成后端可读取的 Data URL。
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result
      });
      reader.onerror = () => reject(new Error(`无法读取图片：${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  window.AiService = {
    // 页面启动时调用状态接口，用来显示“AI助手已连接/未连接”。
    async getStatus() {
      let latestStatus = null;
      for (const baseUrl of API_BASE_URLS) {
        try {
          const response = await fetch(`${baseUrl}/api/ai/status`);
          const status = response.ok ? await response.json() : null;
          if (status) latestStatus = status;
          // 兼容尚未返回 verified 字段的旧版后端；真正请求失败时，chat() 仍会显示具体错误。
          if (status?.connected && (status.verified === true || status.verified === undefined)) {
            activeBaseUrl = baseUrl;
            notifyStatus(status);
            return status;
          }
        } catch (_) {
          // 当前候选不可用时继续尝试下一后端。
        }
      }
      activeBaseUrl = "";
      const status = latestStatus || { connected: false, configured: false, appId: "" };
      notifyStatus({ ...status, connected: false });
      return status;
    },

    // 把文字、图片和会话编号统一交给后端；后端再决定调用文字模型还是视觉模型。
    async chat({ message, images = [], sessionId = "guest" }) {
      const encodedImages = await Promise.all(images.map(fileToDataUrl));
      const candidates = [...new Set([activeBaseUrl, ...API_BASE_URLS].filter(Boolean))];
      let lastError = API_BASE_URLS.length
        ? "印小灵暂时没接上线，请稍后再试一次"
        : "AI 后端地址未配置（错误码：AI_BACKEND_NOT_CONFIGURED）。请通过 npm start 启动 server.js，或在 js/config.js 配置 AI_API_BASE_URL";
      for (const baseUrl of candidates) {
        try {
          const response = await fetch(`${baseUrl}/api/ai/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, sessionId, images: encodedImages })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            const code = result.errorCode || `HTTP_${response.status}`;
            const upstream = result.upstreamCode ? `，上游码：${result.upstreamCode}` : "";
            const requestId = result.requestId ? `，请求ID：${result.requestId}` : "";
            const advice = response.status === 401 || response.status === 403
              ? "请确认 API Key、应用 ID 和账号权限配置"
              : response.status === 429 ? "请稍后再试" : "请检查服务端日志或稍后重试";
            lastError = `${result.error || `AI 后端返回 HTTP ${response.status}`}（错误码：${code}${upstream}${requestId}）。${advice}`;
            continue;
          }
          activeBaseUrl = baseUrl;
          notifyStatus({ connected: true, configured: true, verified: true });
          return result;
        } catch (error) {
          lastError = `AI 网络请求失败（错误码：AI_NETWORK_ERROR）。${error.message || "请检查网络连接或服务端状态"}`;
        }
      }
      throw new Error(lastError === "fetch failed"
        ? "AI 网络连接失败（错误码：AI_NETWORK_ERROR）。请检查本机代理，或使用已部署的云端后端"
        : lastError);
    }
  };
}());
