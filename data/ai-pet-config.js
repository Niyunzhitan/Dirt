/* 印小灵常驻宠物资源入口：以后替换图片时只修改这里。 */
window.AI_PET_CONFIG = {
  enabled: true,
  allowDrag: true,
  dynamicGreeting: true,
  // 动态语录循环：显示 5 秒，隐藏 3 秒后切换下一句。
  greetingTiming: {
    visibleMs: 5000,
    hiddenMs: 3000,
    initialDelayMs: 1200
  },
  defaultState: "idle",
  imageAlt: "印小灵猫形宠物",
  states: {
    idle: "./assets/d43aa18c9eef8b2dc2405ee6eb30d357.png",
    hover: "./assets/d43aa18c9eef8b2dc2405ee6eb30d357.png",
    listening: "./assets/d43aa18c9eef8b2dc2405ee6eb30d357.png",
    thinking: "./assets/d43aa18c9eef8b2dc2405ee6eb30d357.png",
    answering: "./assets/d43aa18c9eef8b2dc2405ee6eb30d357.png",
    happy: "./assets/d43aa18c9eef8b2dc2405ee6eb30d357.png",
    error: "./assets/d43aa18c9eef8b2dc2405ee6eb30d357.png"
  }
};
