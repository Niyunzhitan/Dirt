// FC 同域部署保持空字符串即可；不要把 DASHSCOPE_API_KEY 写进前端。
// 本地前后端分开运行时，可暂时将下面三个地址改为 "http://127.0.0.1:3000"。
window.APP_CONFIG = {
  AI_API_BASE_URL: "",
  AI_FALLBACK_API_BASE_URL: "",
  API_BASE_URL: "",
  USE_DATABASE: false, // 普通栏目继续使用本地展示数据
  USE_QUIZ_DATABASE: false,
  // Umami 只需要下面三项公开配置，不需要在这里填写账号、密码或 API Key。
  // Website ID 在 Umami 后台的“网站设置”里复制；留空表示关闭统计，页面不会联系 Umami。
  UMAMI_WEBSITE_ID: "e6968404-1549-48e2-ad4a-f529a957112d",
  // 使用 Umami Cloud 时保持默认地址；自建 Umami 时改成自己服务器上的 script.js 地址。
  UMAMI_SCRIPT_URL: "https://cloud.umami.is/script.js",
  // 可选：只统计这些正式域名。多个域名用英文逗号分隔，可防止测试站访问混入报表。
  UMAMI_DOMAINS: "niyunzhitan.cn,www.niyunzhitan.cn",
};
