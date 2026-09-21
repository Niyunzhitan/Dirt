(function setupAnalytics() {
  const config = window.APP_CONFIG || {};
  const websiteId = String(config.UMAMI_WEBSITE_ID || "").trim();

  // 没填 Website ID 就视为未启用；直接双击 HTML 预览时也不统计，避免把本地调试算成访客。
  if (!websiteId || window.location.protocol === "file:") return;

  const scriptUrl = String(config.UMAMI_SCRIPT_URL || "https://cloud.umami.is/script.js").trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(scriptUrl, window.location.href);
  } catch {
    // 地址写错时安静退出，不让统计配置影响网站的其他功能。
    return;
  }

  // 统计数据可能包含访问路径等信息，因此只允许通过加密的 HTTPS 连接发送。
  if (parsedUrl.protocol !== "https:") return;

  // 这里等价于 Umami 后台给出的那段嵌入代码，只是改成按配置决定是否加载。
  const script = document.createElement("script");
  script.defer = true;
  script.src = parsedUrl.href;
  script.dataset.websiteId = websiteId;
  // 访客在浏览器中开启“请勿跟踪”后，Umami 会尊重该选择，不记录这次访问。
  script.dataset.doNotTrack = "true";

  const domains = String(config.UMAMI_DOMAINS || "").trim();
  if (domains) script.dataset.domains = domains;

  // 放入 head 后浏览器才会下载统计脚本；defer 保证它不会挡住页面内容加载。
  document.head.appendChild(script);
}());
