# 第三方 3D 库

`three.js` 是基于 Three.js 0.160.0（r160）模块源码生成的未压缩按需构建，不是手写业务代码。

- 源码依赖：`package.json` 固定的 `three@0.160.0`，通过 `npm install` 安装。
- 项目源码：https://github.com/mrdoob/three.js/tree/r160
- 许可证：MIT，完整内容见本目录 `LICENSE.three.txt`；请保留源码中的版权声明。
- 用途：为 `js/three-map.js` 和 `js/three-showcase.js` 提供模型、相机、材质和渲染工具。

## 为什么不再用压缩版

原来的 `three.min.js` 变量名缩短，不适合阅读。现在从 `scripts/three-entry.js` 导出实际使用的 30 个接口，由 Vite/Rollup 删除不可达代码，同时保留正常缩进。文件约 898 kB，比完整未压缩版本减少约 32%。渲染器需要的内部材质、着色器等仍会保留，不能按名称继续手工删除。

## 修改与更新

调整网站功能时优先修改 `js/three-map.js`、`js/three-showcase.js` 和 `data/3d-products.js`，不必从头读完这个库，也不要为简化写法而重写库内部算法。

运行 `npm run build:three` 重新生成本文件，或运行包含此步骤的 `npm run build`。新增接口时修改 `scripts/three-entry.js`。源码在构建时使用 ES Modules，输出为普通脚本，通过 `window.THREE` 访问，访客无需联网下载库，也不需要模块服务器。

`index.html` 在两个 3D 业务脚本之前加载本文件；`npm run build` 会将本目录复制进 `dist/js/vendor/`。不要手工编辑构建目录中的副本。
