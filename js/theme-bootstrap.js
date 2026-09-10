(function () {
  "use strict";

  // 这段脚本必须在主题样式表之前同步执行，确保浏览器第一次绘制就是保存的主题。
  const schedule = Object.freeze({ lightStartHour: 6, lightEndHour: 18 });
  const storageKeys = ["niyun-display-settings", "nimeng-display-settings", "niyun-settings"];
  const supportedModes = new Set(["light", "dark", "auto"]);
  const root = document.documentElement;

  window.NIYUN_THEME_SCHEDULE = schedule;

  try {
    const savedValue = storageKeys.map((key) => localStorage.getItem(key)).find(Boolean) || "{}";
    const savedSettings = JSON.parse(savedValue);
    const themeMode = supportedModes.has(savedSettings.themeMode) ? savedSettings.themeMode : "auto";
    const currentHour = new Date().getHours();
    const usesLightThemeNow = currentHour >= schedule.lightStartHour && currentHour < schedule.lightEndHour;
    const theme = themeMode === "dark" || (themeMode === "auto" && !usesLightThemeNow) ? "dark" : "light";

    root.dataset.theme = theme;
    root.dataset.themeMode = themeMode;
    root.style.colorScheme = theme;
    if (localStorage.getItem("niyun-opening-animation-enabled") === "false") {
      root.classList.add("skip-opening-loader");
    }
  } catch (_) {
    const currentHour = new Date().getHours();
    const theme = currentHour >= schedule.lightStartHour && currentHour < schedule.lightEndHour ? "light" : "dark";
    root.dataset.theme = theme;
    root.dataset.themeMode = "auto";
    root.style.colorScheme = theme;
  }
})();
