# SeaTunnel Control Plane

面向 [Apache SeaTunnel](https://seatunnel.apache.org/) **Zeta Engine REST API V2** 的可视化控制台：集群总览、作业与 Pending 诊断、任务模板与 Cron 调度、作业提交、日志与系统监控、本地账号与连接配置。

本仓库已用 **Java（Spring Boot）+ Angular** 重写前后端，替代原先的 Node.js / React 实现。控制面将请求代理到可配置的 SeaTunnel API Base，自身元数据保存在 **PostgreSQL**，不依赖 SeaTunnel Java Client。

| 模块 | 技术 | 说明 |
| --- | --- | --- |
| [`control-plane-server`](./control-plane-server) | JDK 8 · Spring Boot 2.7 · JPA · PostgreSQL | REST API（默认 `127.0.0.1:8800`） |
| [`control-plane-web`](./control-plane-web) | Angular 12 · ng-zorro-antd · ngx-translate | 控制台 SPA（开发默认 `127.0.0.1:5174`） |

许可证：Apache License 2.0（见 [`LICENSE`](./LICENSE)）。

---

## 功能概览

- **工作台**：集群信号、定时 / 运行中 / Pending 流程视图、资源余量
- **任务**：配置模板 CRUD、一键提交、执行历史分页、Cron 调度（含时区）
- **作业**：运行中 / 已完成列表、详情、停止；Pending 队列诊断
- **运维**：作业提交、日志、系统监控、配置加密等工具
- **系统设置**（管理员）：SeaTunnel API Base、用户管理（内置 `admin` 仅允许重置密码）

---

## 仓库结构

```text
seatunnel-control-plane/
├── control-plane-server/     # Java API
│   ├── pom.xml
│   ├── package.sh            # 打 fat jar 到 package/
│   ├── sql/                  # Postgres 建库 / 建表脚本
│   └── src/main/
├── control-plane-web/        # Angular 前端
│   ├── package.json
│   ├── proxy.conf.js         # 开发态 /api 代理
│   └── src/app/
├── docs/                     # 补充文档
└── LICENSE
```

---

## 环境要求

| 依赖 | 说明 |
| --- | --- |
| JDK 8+ | 后端编译与运行（文档示例可用 Zulu 8） |
| Maven 3.6+ | `mvn spring-boot:run` / `package` |
| PostgreSQL | 库名默认 `seatunnel_control_plane` |
| Node.js ≥ 16 + npm | 前端开发与构建 |
| SeaTunnel Zeta | 已开启 REST API V2，供控制台连接 |

---

## 快速开始

### 1. 准备数据库

```bash
cd control-plane-server

# 端口按你的 Postgres 实际监听修改（源码默认 5432；部分环境可能是 5360）
export PGPORT=5432

psql -h 127.0.0.1 -p "$PGPORT" -U postgres -f sql/create-database.sql
psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d seatunnel_control_plane -f sql/init.sql
```

也可跳过 `init.sql`：JPA `ddl-auto: update` 会在首次启动时自动建表。默认管理员由应用启动时写入，不在 SQL 中。

### 2. 启动后端

```bash
cd control-plane-server
mvn spring-boot:run
# 若需指定 JDK：
# JAVA_HOME=/path/to/jdk8 mvn spring-boot:run
```

默认：`http://127.0.0.1:8800/`

### 3. 启动前端

```bash
cd control-plane-web
npm install
npm start
```

默认：`http://127.0.0.1:5174/`（`/api` 经 `proxy.conf.js` 代理到 `:8800`）。

### 4. 首次登录

1. 打开前端地址，使用 **`admin` / `123456`** 登录。
2. 立即修改默认密码。
3. 以管理员进入 **系统设置 → SeaTunnel 连接**，填写 API Base（例如 `http://127.0.0.1:8080`）并保存（会探测 `{base}/overview`）。

---

## 配置说明

后端关键环境变量（见 `control-plane-server/src/main/resources/application.yml`）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SCP_PORT` | `8800` | API 端口（绑定 `127.0.0.1`） |
| `SCP_PG_HOST` | `127.0.0.1` | Postgres 主机 |
| `SCP_PG_PORT` | `5432` | Postgres 端口 |
| `SCP_PG_DB` | `seatunnel_control_plane` | 库名 |
| `SCP_PG_USER` | `postgres` | 用户名 |
| `SCP_PG_PASSWORD` | （见 yml） | 密码 |

前端开发常用：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SCP_WEB_PORT` | `5174` | `ng serve` 端口 |
| `SCP_PORT` | `8800` | 代理目标 API 端口 |

会话 Cookie：`scp_session`（HttpOnly，约 7 天）。

---

## 主要页面与 API

### 前端路由

| 路径 | 说明 |
| --- | --- |
| `/login` | 登录 |
| `/` | 工作台 |
| `/tasks`、`/tasks/new`、`/tasks/:id`、`/tasks/:id/edit` | 任务 |
| `/jobs`、`/jobs/:jobId` | 作业 |
| `/pending` | Pending 队列 |
| `/submit`、`/logs`、`/system`、`/tools` | 运维 |
| `/settings` | 系统设置（管理员） |

### 自有 REST（节选）

| 组 | 路径 |
| --- | --- |
| 认证 | `POST /api/auth/login` · `logout` · `change-password` · `GET /api/auth/me` |
| 用户 | `GET/POST /api/users` · `PUT /api/users/{id}`（管理员） |
| 设置 | `GET /api/settings/health` · `GET/PUT /api/settings/seatunnel` |
| 任务 | `/api/tasks` · `/{id}` · `/{id}/run` · `/{id}/runs` · `/{id}/schedule` |

SeaTunnel 上游能力经 **`/api/seatunnel/**`** 代理（overview、running-jobs、submit-job、logs、metrics 等）。

更细的契约与模块说明见 [`docs/架构与运维.md`](./docs/架构与运维.md)。

---

## 生产部署（摘要）

1. **后端打包**

   ```bash
   cd control-plane-server
   ./package.sh
   cd package && ./start.sh    # Windows: start.bat
   ```

2. **前端构建**

   ```bash
   cd control-plane-web
   npm ci
   npm run build
   # 产物：dist/control-plane-web/
   ```

3. **反向代理**：静态托管 Angular `dist`，将 `/api` 反代到 `127.0.0.1:8800`。Java 进程**不**内置托管前端静态资源。

4. 持久化 PostgreSQL；保持控制面 **单实例**（进程内 Cron 调度，多副本会重复触发）。

完整步骤与注意事项见 [`docs/架构与运维.md`](./docs/架构与运维.md)。

---

## 相关文档

| 文档 | 内容 |
| --- | --- |
| [control-plane-server/README.md](./control-plane-server/README.md) | 后端启动、数据库、环境变量、测试 |
| [control-plane-web/README.md](./control-plane-web/README.md) | 前端开发、代理、构建 |
| [docs/架构与运维.md](./docs/架构与运维.md) | 架构、API、部署与排障 |

---

## 边界与说明

- 控制面保存任务模板、调度、会话与设置，**不保存** SeaTunnel 实际同步的业务数据。
- 当前为单一全局 SeaTunnel API Base；多集群 / 多租户尚未实现。
- 旧版 Node.js + SQLite + React/Vite 栈已移除，请勿再按旧 `server/`、`web/`、`scripts/start.sh` 文档操作。
