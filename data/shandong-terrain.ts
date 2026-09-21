/*
 * 山东 3D 地貌配置
 * 当前使用山东省 DEM 30 米数据生成的轻量高度图；原始 148MB GeoTIFF 不放进网站。
 * 公开发布前请保留页面上的来源说明；原始仓库的 MIT LICENSE 与 README 使用限制存在冲突，
 * 商业或正式公网使用前仍需确认数据提供方的最终授权。
 */
window.SHANDONG_TERRAIN = {
  dataMode: "real-dem-preview",
  heightDataUrl: "./assets/terrain/shandong-heightmap.png",
  maskDataUrl: "./assets/terrain/shandong-mask.png",
  bounds: { west: 114.8102646639, east: 122.706, north: 38.3997238086, south: 34.3786 },
  attribution: "山东省 DEM 30 米 · 轻量高度图 · 非测绘测量工具",
  terrain: {
    baseDepth: 0.34,
    // 放大真实 DEM 的相对高差，让正上方视角仍能看出山地起伏。
    reliefScale: 0.9,
    heightExaggeration: 1.35,
    // 仅保留 DEM 的显示参数，不再叠加旧的程序化山峰。
  }
};
