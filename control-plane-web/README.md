# Control Plane Web（Angular）

SeaTunnel Control Plane 控制台前端：Angular 12 + ng-zorro-antd，开发态通过代理访问 Java API。

## 技术栈

- Angular 12.2 / Angular CLI 12.2
- ng-zorro-antd 12
- @ngx-translate（中英）
- TypeScript ~4.3
- Node.js ≥ 16

## 开发启动

```bash
cd control-plane-web
npm install
npm start
```

默认地址：`http://127.0.0.1:5174/`。

`npm start` 实际执行 `scripts/serve.js`，等价于：

```text
ng serve --proxy-config proxy.conf.js --port 5174 --host 127.0.0.1
```

并自动附加 `NODE_OPTIONS=--openssl-legacy-provider`（兼容较新 OpenSSL）。

请先启动 [`control-plane-server`](../control-plane-server)（默认 `127.0.0.1:8800`）。

## 代理与端口

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `SCP_WEB_PORT` | `5174` | 前端开发端口 |
| `SCP_PORT` | `8800` | `proxy.conf.js` 将 `/api` 转到该端口 |

生产构建产物不内置 API Base；需由 Nginx（等）把 `/api` 反代到后端。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm start` | 开发服务器 |
| `npm run build` | 生产构建 → `dist/control-plane-web/` |
| `npm run build-dev` | development 配置构建 |

## 主要路由

| 路径 | 页面 |
| --- | --- |
| `/login` | 登录 |
| `/` | 工作台 |
| `/tasks`… | 任务列表 / 新建 / 详情 / 编辑 |
| `/jobs`… | 作业列表 / 详情 |
| `/pending` | Pending 队列 |
| `/submit` | 提交作业 |
| `/logs` | 日志 |
| `/system` | 系统监控 |
| `/tools` | 工具箱 |
| `/settings` | 系统设置（管理员） |

登录后页面位于 `AppShellComponent` 下，并由 `AuthGuard` 保护。

## 源码结构（简）

```text
src/app/
├── api/           # auth / tasks / seatunnel HTTP 客户端
├── core/          # AuthGuard 等
├── pages/         # 各业务页面
├── shared/        # 壳布局、Cron、表格、状态等
└── app-routing.module.ts
```

## 相关文档

- 仓库总览：[../README.md](../README.md)
- 后端：[../control-plane-server/README.md](../control-plane-server/README.md)
- 架构与运维：[../docs/架构与运维.md](../docs/架构与运维.md)
