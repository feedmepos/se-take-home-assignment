# 部署与提交指南(Deployment & Submission)

> 服务器:`116.62.13.104`(阿里云 + 宝塔面板)
> 域名:`demo.magicyyds.com`(前端)、`api.demo.magicyyds.com`(后端)

---

## 1. 前端部署(静态站点)

前端是纯静态 SPA,构建后上传到宝塔的「网站(HTML 项目)」即可。

### 1.1 本地构建

```bash
# 生产构建会读取 apps/web/.env.production(VITE_API_BASE=https://api.demo.magicyyds.com)
pnpm install
pnpm -r build
pnpm --filter @feedme/web build      # 产物在 apps/web/dist
```

### 1.2 上传

- 将 `apps/web/dist/` 内容上传到 `/www/wwwroot/demo.magicyyds.com`。

### 1.3 宝塔站点配置

- 在宝塔新建站点 `demo.magicyyds.com`(纯静态 / HTML 项目)。
- **SPA fallback**:站点 → 配置文件,在 `server` 块中加:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```
- 申请并开启 **SSL(HTTPS)**——必须,否则 HTTPS 页面连 `wss://` 才不会被浏览器拦截。

---

## 2. 后端部署(Node 项目 + Nginx 反代)

### 2.1 本地构建

```bash
pnpm --filter @feedme/core build      # server 依赖 core 产物
pnpm --filter @feedme/server build    # 产物在 apps/server/dist
```

> 注意:`@feedme/server` 依赖 `@feedme/core`(workspace 包)。部署时要么上传整个 monorepo 并在服务器 `pnpm install --prod` + `pnpm -r build`,要么打包时把 core 一并带上。推荐直接 clone 仓库到服务器后构建。

### 2.2 服务器上启动(PM2)

宝塔「Node 项目」加载 `apps/server`,或手动 PM2:

```bash
# 服务器上
export PORT=3001
export HOST=127.0.0.1                  # 仅本机监听,由 Nginx 对外
pm2 start apps/server/dist/main.js --name feedme-api
pm2 save
```

环境变量(见 `apps/server/src/infrastructure/config.ts`):

- `PORT`(默认 `3001`)
- `HOST`(默认 `0.0.0.0`;生产建议 `127.0.0.1`)

### 2.3 Nginx 反向代理(关键:WebSocket 升级头)

为 `api.demo.magicyyds.com` 配反代到 `127.0.0.1:3001`,**必须**带 WebSocket 升级头,否则 `/ws` 握手失败:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

- 同样为 `api.demo.magicyyds.com` 申请 **SSL**,对外提供 `https://` + `wss://`。

### 2.4 冒烟验证

```bash
curl https://api.demo.magicyyds.com/api/state
curl -X POST https://api.demo.magicyyds.com/api/orders -H 'content-type: application/json' -d '{"type":"VIP"}'
# 浏览器打开 demo.magicyyds.com,确认看板实时刷新、WS 已连接(开发者工具 Network → WS)
```

---

## 3. CI(result.txt)

CI 不需要服务器。GitHub Actions(`.github/workflows/backend-verify-result.yaml`)会跑:

- `scripts/test.sh` → 安装依赖 + 构建 core + `pnpm -r test`
- `scripts/build.sh` → `pnpm -r build`
- `scripts/run.sh` → 运行 CLI,输出 `scripts/result.txt`

并校验 `result.txt` 非空且含 `HH:MM:SS` 时间戳。

---

## 4. 提交 PR 到 feedmepos(GitHub Flow)

作业要求 Fork 上游仓库并发 PR,确保 `backend-verify-result` 工作流通过。

```bash
# 1. 确认 fork 已作为 origin,上游为 upstream
git remote -v
git remote add upstream https://github.com/feedmepos/se-take-home-assignment.git   # 若尚未添加

# 2. 同步上游 main
git fetch upstream
git checkout main
git merge --ff-only upstream/main

# 3. 在特性分支上提交(已遵循 Conventional Commits)
git checkout -b feat/order-management
# ... 提交(pre-commit 会自动跑 lint/typecheck/test)

# 4. 推到自己的 fork
git push -u origin feat/order-management

# 5. 在 GitHub 上对 feedmepos/se-take-home-assignment 的 main 发起 PR
```

### PR 检查清单

- [ ] `backend-verify-result` workflow 全绿(test / build / run + result.txt 校验)
- [ ] `scripts/result.txt` 已提交且含真实时间戳输出
- [ ] README 含运行/测试/部署说明
- [ ] 前端已部署到公开可访问 URL(`https://demo.magicyyds.com`),并在 PR 描述中给出链接
- [ ] commit 遵循 Conventional Commits,聚焦单一改动
