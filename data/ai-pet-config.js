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
    idle: "./assets/idling.png",
    hover: "./assets/hovering.png",
    listening: "./assets/hovering.png",
    thinking: "./assets/thinking.png",
    answering: "./assets/thinking.png",
    happy: "./assets/idling.png",
    error: "./assets/idling.png"
  }
};
