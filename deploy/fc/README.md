# FC 运行包装层

这个目录只放阿里云函数计算运行时需要的入口：

```text
deploy/fc/
├─ package.json
├─ package-lock.json
├─ server.js
├─ server/
└─ dist/
```

`package.json` 和锁文件只包含服务端运行依赖。`server.js`、`server/` 和 `dist/` 都由打包脚本从项目源码同步，不要在这里直接改。

在项目根目录运行：

```powershell
npm run package:fc
```

最终上传文件是 `releases/niyun-zhitan-fc.zip`。脚本只打包上面列出的运行入口，本目录的 README、本地 `node_modules/` 和其他辅助文件不会进入压缩包。
