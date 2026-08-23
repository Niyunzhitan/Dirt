/*
 * ================================================================
 * 常用媒体替换入口：以后换视频、课程封面、Three.js 贴图，只改本文件。
 * ================================================================
 * 安全规则：
 * 1. 推荐使用 ./assets/ 下的本地相对路径，最简单也最安全。
 * 2. 外部资源必须使用 https://，并把域名加入 allowedExternalHosts。
 * 3. 本文件会公开给浏览器，绝对不能填写密码、Token、Cookie 或 API Key。
 */
window.MEDIA_CONFIG = {
  /*
   * ==================== 音乐快速配置区 ====================
   * 修改音乐时优先调整这里，不需要改 js/media-coordinator.js。
   * defaultTrackId 必须对应 tracks 中的 id；defaultVolume 使用 0～1，0.06 表示 6%。
   * tracks.volumeScale 是单曲音量系数：1 为正常，0.6 为总音量的一半。
   */
  backgroundMusic: {
    title: "泥云智探背景音乐",
    defaultTrackId: "lane", // 默认曲目：古巷
    defaultVolume: 0.06, // 默认音量：3%
    defaultEnabled: false, // 默认关闭，用户可通过导航栏或设置开启
    defaultCarouselEnabled: false, // 默认关闭轮播，开启后按 tracks 顺序播放全部歌曲
    tracks: [
      { id: "lane", label: "lane", volumeScale: 1, url: "./assets/media/music/lane.mp3" },
      { id: "amazingGrace", label: "amazingGrace", volumeScale: 1, url: "./assets/media/music/amazingGrace.mp3" },
      { id: "eternal", label: "eternal", volumeScale: 0.6, url: "./assets/media/music/eternal.mp3" }
    ]
  },

  brandLogo: "",
  // 【位置 1：外部媒体域名白名单】本地 ./assets/ 路径不需要填写。
  allowedExternalHosts: [
    // "video.example.com",
    // "cdn.example.com"
  ],

  // 【位置 1：课程视频和封面】课程 id 必须与 mock 数据或数据库中的 id 相同。
  courses: {
    "COURSE-01": {
      videoUrl: "",
      posterUrl: ""
    },
    "COURSE-02": {
      videoUrl: "",
      posterUrl: ""
    },
    "COURSE-03": {
      videoUrl: "",
      posterUrl: ""
    }
  },

  // 【位置 2：Three.js 贴图】保留文件名时只覆盖 assets 中的同名文件即可。
  textures: {
    pokerSpadeKFront: "./assets/textures/poker/front/spade-k.webp",
    pokerDiamondJFront: "./assets/textures/poker/front/diamond-j.webp",
    pokerDefaultBack: "./assets/textures/poker/back/default.webp",
    mahjongWan1Front: "./assets/textures/mahjong/front/wan-1.webp",
    mahjongEastFront: "./assets/textures/mahjong/front/east.webp",
    mahjongDefaultBack: "./assets/textures/mahjong/back/default.webp",
    mahjongDefaultSide: "./assets/textures/mahjong/side/default.webp"
  }
};

// 所有媒体模块共用这一道地址校验，避免 javascript:、HTTP 明文或未授权外站资源。
window.MediaSecurity = {
  resolve(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    try {
      const url = new URL(source, window.location.href);
      if (url.origin === window.location.origin && ["http:", "https:", "file:"].includes(url.protocol)) return url.href;
      const allowedHosts = new Set(window.MEDIA_CONFIG.allowedExternalHosts || []);
      return url.protocol === "https:" && allowedHosts.has(url.hostname) ? url.href : "";
    } catch (_) {
      return "";
    }
  }
};
