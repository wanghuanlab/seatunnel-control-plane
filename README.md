# SeaTunnel Control Plane

面向 **Apache SeaTunnel Zeta Engine** 的可视化管理控制台。项目以 SeaTunnel **REST API V2** 为运行时集成边界，提供集群观测、作业运维、任务模板与本地调度能力；控制台自身使用内置 SQLite 保存元数据，因此单机部署无需额外安装数据库。

> 当前定位：SeaTunnel 的运维与任务控制台。
>
> 长期目标：演进为通用的 SeaTunnel Control Plane，覆盖配置资产、可视化编排、治理与多环境管理。

- SeaTunnel REST API V2 官方文档：[2.3.13](https://seatunnel.apache.org/zh-CN/docs/2.3.13/engines/zeta/rest-api-v2)
- 参考项目：[apache/seatunnel-web](https://github.com/apache/seatunnel-web)

## 架构

```text
Browser (React SPA，默认 :5174)
        ↓  /api/*（Cookie 会话）
Node.js Console API（默认 :8800）
        ├── SeaTunnel REST API V2（可配置目标集群）
        └── SQLite（任务、调度、用户、会话、设置）
```

控制台通过 REST API 与 SeaTunnel 通信，不要求本项目安装 SeaTunnel Java Client 或与 Engine 共用安装目录。SeaTunnel API Base 由管理员在页面中配置，保存前会请求 `/overview` 验证连通性。

## 已实现能力

| 模块 | 能力 |
| --- | --- |
| 总览 | 集群健康、版本、Worker/Slot 资源、运行作业、Pending 摘要、Tag 筛选、自动刷新 |
| 作业管理 | 运行中与历史作业、状态筛选、单个/批量停止、作业详情、DAG、Checkpoint |
| Pending 诊断 | 队列摘要、资源快照、缺 Slot TaskGroup 与失败原因 |
| 任务管理 | HOCON / JSON / SQL 模板 CRUD、手动运行、执行历史、最近 Job 状态同步 |
| 定时调度 | Cron、时区、启停、下一次执行时间、最近触发状态 |
| 提交作业 | JSON/HOCON/SQL 文本、文件上传、单个与批量提交 |
| 日志与监控 | 集群日志、JVM/系统监控、Metrics、OpenMetrics |
| 工具箱 | 节点 Tags、配置加密、批量提交和停止 |
| 控制台管理 | 本地账号登录、会话、管理员/普通用户、SeaTunnel 连接设置、用户管理 |

已接入 REST V2 的主要接口族：`/overview`、`/running-jobs`、`/finished-jobs`、`/job-info`、`/pending-jobs`、`/submit-job`、`/submit-jobs`、`/stop-job`、`/stop-jobs`、`/logs`、`/metrics`、`/openmetrics`、`/encrypt-config`、`/update-tags` 与 Checkpoint 接口。

## 快速开始

前置条件：Node.js（建议 LTS）以及一个已启动且开启 HTTP API 的 SeaTunnel Zeta 集群。

### 使用启动脚本（推荐）

```bash
cd seatunnel-control-plane
sh scripts/start.sh start

# 确认实际监听地址、进程和日志位置
sh scripts/start.sh status
```

首次启动时，脚本会自动安装缺失的根目录和 `web/` 依赖，初始化 SQLite schema 与默认管理员，并从 API `8800`、Web `5174` 起自动选择空闲端口。请始终以 `status` 输出的地址为准。

日常管理统一使用脚本：

```bash
sh scripts/start.sh status    # 查看实际端口、PID 和日志路径
sh scripts/start.sh restart   # 重启 API 与 Web
sh scripts/start.sh stop      # 停止 API 与 Web
```

首次使用：

1. 打开 `status` 输出的 Web 地址。
2. 使用初始化管理员账号登录：`admin` / `123456`。
3. 立即在侧栏修改默认密码。
4. 在 **系统设置 → SeaTunnel 连接** 中填写 API Base，例如 `http://127.0.0.1:8080`，保存时会进行连通性探测。

### npm 等价命令

需要单独启动或排查某个进程时，可使用 npm 命令：

```bash
npm run dev        # 等价于 sh scripts/start.sh start
npm run dev:web    # 仅启动 Vite 前端
npm run dev:server # 仅启动 Node API
npm run status    # 查看端口、PID 与运行状态
npm run restart   # 重启
npm run stop      # 停止
npm run build     # 构建前端静态资源
npm run init-db   # 手动初始化/校验 SQLite schema
```

## 数据与配置

默认数据文件为 `data/seatunnel-control-plane.sqlite`，使用 WAL、外键和 busy timeout。可通过 `SCP_SQLITE_PATH` 指定绝对路径或相对项目目录的自定义位置：

```bash
SCP_SQLITE_PATH=/srv/seatunnel-control-plane/data/seatunnel-control-plane.sqlite npm start
```

SQLite 保存：

- 任务模板、运行记录与调度状态；
- 控制台用户、会话；
- SeaTunnel API Base 与连接探测结果。

它**不保存 SeaTunnel 实际同步的数据**。生产部署必须持久化 SQLite 数据目录；启用 WAL 后应将 `.sqlite`、`-wal`、`-shm` 作为一个整体处理。建议通过一致性备份流程备份，不要直接复制正在写入的单个数据库文件。

## 权限现状

- **管理员**：可配置 SeaTunnel API Base，管理控制台用户。
- **普通用户**：可使用其余业务页面。

这是当前的基础权限模型，并非企业级 RBAC。任务创建/修改/执行、作业停止、Tags 等高风险操作尚未按角色、项目或环境细分授权；对外部署前应先完善最小权限、审计日志、初始密码强制修改与安全策略。

## 正式部署（打包与上线）

开发模式（`scripts/start.sh` / `npm run dev`）会同时启动 **Vite 前端** 与 **Node API**，适合本机调试，**不要**直接当作正式环境入口。

正式环境的正确形态是：

1. 先把前端打成静态资源（输出到 `web/dist/`）；
2. 在服务器上安装后端依赖，并用 **单个 Node 进程** 同时托管 API 与 `web/dist`；
3. 前面用 Nginx / OpenResty / Caddy 做 HTTPS 反向代理。

```text
Browser ──HTTPS──▶ Nginx/OpenResty
                        │
                        ▼
              Node (127.0.0.1:8800)
                ├── /api/*     控制台 API + SeaTunnel 代理
                └── /*         托管 web/dist 静态文件
                └── SQLite     data/*.sqlite
```

> 重要：本项目**不是**纯静态站点。只把 `web/dist` 拷到网站目录而不跑 Node，将无法登录，也无法调用任务、调度、SeaTunnel 代理等接口。

### 打包产物说明

在项目根目录执行：

```bash
# 首次或依赖变更时
npm run setup

# 正式打包（TypeScript 编译 + Vite 构建）
npm run build
```

打包输出目录：

```text
web/dist/
├── index.html
└── assets/
    ├── index-xxxx.js
    └── index-xxxx.css
```

生产进程通过 `NODE_ENV=production` 启动后，会从 `web/dist` 提供前端页面，并从根目录 `dependencies` 加载后端能力（含 `better-sqlite3` 等原生模块）。因此服务器上至少需要：

| 内容 | 是否必须 | 说明 |
| --- | --- | --- |
| `server/` | 必须 | Node API、鉴权、代理、调度 |
| `web/dist/` | 必须 | 前端打包结果 |
| `package.json` / `package-lock.json` | 必须 | 安装后端依赖 |
| `node_modules/` | 必须（在服务器生成） | **不要**从 macOS/Windows 本机直接拷贝；`better-sqlite3` 需在目标 Linux 上编译/安装 |
| `data/` | 必须持久化 | SQLite；升级时保留，勿随意删除 |
| `web/src/`、`web/node_modules/` | 非必须 | 服务器只跑已构建产物时可不部署源码与前端依赖 |
| `scripts/start.sh` | 非必须 | 仅开发模式使用 |

### 推荐部署流程（本机构建 + 服务器运行）

以下以部署目录 `/opt/seatunnel-control-plane`、监听 `127.0.0.1:8800` 为例。

#### 1. 本机构建

```bash
cd seatunnel-control-plane
git pull
npm run setup          # 如依赖已就绪可跳过
npm run build          # 生成 web/dist
```

确认 `web/dist/index.html` 存在后再同步。

#### 2. 同步到服务器

不要同步本机的 `node_modules` / `web/node_modules` / `.git` / 运行时数据：

```bash
rsync -az --delete \
  --exclude node_modules \
  --exclude web/node_modules \
  --exclude .git \
  --exclude var/ \
  --exclude data/ \
  --exclude '*.sqlite' \
  --exclude '*.sqlite-*' \
  ./ user@your-server:/opt/seatunnel-control-plane/
```

首次部署后在服务器创建数据目录：

```bash
ssh user@your-server 'mkdir -p /opt/seatunnel-control-plane/data /opt/seatunnel-control-plane/var'
```

后续升级继续使用上述 `rsync`，并**排除 `data/`**，以免覆盖生产库。

#### 3. 在服务器安装后端依赖

目标机需要：

- Node.js LTS（建议 20+；当前验证过 Node 22）
- 编译工具链（`build-essential` / `python3` / `make` / `g++`），用于安装 `better-sqlite3`

```bash
ssh user@your-server
cd /opt/seatunnel-control-plane
rm -rf node_modules
npm ci --omit=dev || npm install --omit=dev
```

可用下面命令快速确认原生模块可用：

```bash
node -e 'import("better-sqlite3").then(() => console.log("sqlite_ok"))'
```

#### 4. 启动生产进程

**方式 A：systemd（推荐）**

```bash
cat >/etc/systemd/system/seatunnel-control-plane.service <<'EOF'
[Unit]
Description=SeaTunnel Control Plane
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/seatunnel-control-plane
Environment=NODE_ENV=production
Environment=SCP_PORT=8800
Environment=SCP_SQLITE_PATH=/opt/seatunnel-control-plane/data/seatunnel-control-plane.sqlite
ExecStart=/usr/bin/node server/index.mjs
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now seatunnel-control-plane.service
systemctl status seatunnel-control-plane.service --no-pager
```

验证本机回环端口：

```bash
curl -I http://127.0.0.1:8800/
# 期望 HTTP/1.1 200
```

**方式 B：前台 / 临时运行**

```bash
cd /opt/seatunnel-control-plane
NODE_ENV=production \
SCP_PORT=8800 \
SCP_SQLITE_PATH=/opt/seatunnel-control-plane/data/seatunnel-control-plane.sqlite \
npm start
```

**方式 C：其他进程管理器**

也可用 `pm2`、`supervisord` 等托管同一条命令；关键是进程常驻、崩溃自动拉起，并固定工作目录与环境变量。`systemd` 不是唯一选择，但是单机 Linux 上最省事的一种。

#### 5. 配置 HTTPS 反向代理

Node 默认只监听 `127.0.0.1`（见 `server/index.mjs`），因此必须由前置代理对外暴露。OpenResty / Nginx 示例：

```nginx
server {
    listen 80;
    listen 443 ssl;
    http2 on;
    server_name scp.example.com;

    # ssl_certificate /path/to/fullchain.pem;
    # ssl_certificate_key /path/to/privkey.pem;

    if ($scheme = http) {
        return 301 https://$host$request_uri;
    }

    location / {
        proxy_pass http://127.0.0.1:8800;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 50m;
    }
}
```

检查并重载：

```bash
nginx -t && nginx -s reload
# 若使用 1Panel OpenResty 容器，则在对应容器内执行 nginx -t / nginx -s reload
```

公网验证：

```bash
curl -I https://scp.example.com/
curl -s -X POST https://scp.example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"123456"}'
```

### 环境变量

| 变量 | 默认值 | 含义 |
| --- | --- | --- |
| `NODE_ENV` | （空） | 设为 `production` 时托管 `web/dist` |
| `SCP_PORT` | `8800` | API / 静态资源监听端口（仅绑定 `127.0.0.1`） |
| `SCP_WEB_PORT` | `5174` | 仅开发模式：Vite 前端端口 |
| `SCP_SQLITE_PATH` | `data/seatunnel-control-plane.sqlite` | SQLite 文件路径（建议生产使用绝对路径） |

### 首次上线检查清单

1. 打开站点，使用 `admin` / `123456` 登录。
2. **立即修改默认密码**。
3. 在 **系统设置 → SeaTunnel 连接** 填写可达的 API Base（例如 `http://127.0.0.1:8080`），保存时会请求 `/overview` 做连通性检查。
4. 确认 `data/` 已纳入备份策略；WAL 模式下请将 `.sqlite`、`-wal`、`-shm` 一并备份。
5. 确认反向代理已启用 HTTPS，且 `/api/*` 与前端同源，避免 Cookie 会话跨域问题。

### 升级发布

```bash
# 本机
git pull
npm run setup   # 依赖无变化可跳过
npm run build
rsync -az --delete \
  --exclude node_modules \
  --exclude web/node_modules \
  --exclude .git \
  --exclude var/ \
  --exclude data/ \
  ./ user@your-server:/opt/seatunnel-control-plane/

# 服务器
cd /opt/seatunnel-control-plane
npm ci --omit=dev || npm install --omit=dev
systemctl restart seatunnel-control-plane.service
systemctl status seatunnel-control-plane.service --no-pager
curl -I http://127.0.0.1:8800/
```

### 常见问题

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| 页面能打开但无法登录 / 接口 404 | 只部署了 `web/dist`，没有跑 Node，或 Nginx 未反代到 Node | 按上文启动生产进程并配置 `proxy_pass` |
| `better-sqlite3` 安装失败 | 缺少编译工具，或从本机拷贝了错误架构的 `node_modules` | 在服务器安装 `build-essential` 等后重新 `npm install --omit=dev` |
| 升级后数据丢失 | `rsync --delete` 同步了 `data/` | 同步时始终排除 `data/` |
| 端口被占用 | `8800` 已有进程 | 调整 `SCP_PORT`，并同步修改反向代理上游地址 |
| 调度任务重复执行 | 启动了多个 Node 实例 | 保持单实例；多副本前需引入分布式锁/选主 |

### 单实例边界

- SQLite 适合单机或单个 API 进程；不要把数据库文件放在 NFS/NAS 等网络共享文件系统上。
- Cron 调度器随 Node.js 进程运行；多副本部署前必须增加主节点选举或分布式锁，避免重复触发。
- 当前只有一个全局 SeaTunnel API Base；多集群、多环境和租户隔离尚未实现。

## 产品路线

项目会沿以下顺序演进：

1. **产品内核**：项目/环境/集群模型、细粒度 RBAC、审计、密钥管理、可靠部署与备份。
2. **任务资产中心**：版本、变量、凭据引用、配置校验、导入导出、执行记录与回滚。
3. **可视化编排**：基于 Connector 定义的表单化配置与 Source → Transform → Sink 画布，同时保留 HOCON/JSON/SQL 高级编辑。
4. **可靠调度与可观测性**：并发策略、失败重试、告警、趋势指标、日志检索与高可用调度。
5. **生态能力**：数据源目录、虚拟表、外部调度器/CI 集成及 GitOps。

## 项目结构

```text
seatunnel-control-plane/
├── server/
│   ├── index.mjs           # HTTP 服务、鉴权与 SeaTunnel 代理
│   ├── db.mjs              # SQLite 连接与 schema
│   ├── auth.mjs            # 用户与会话
│   ├── settings.mjs        # SeaTunnel API Base 与连通性探测
│   ├── tasks.mjs           # 任务 CRUD、运行与状态同步
│   ├── schedules.mjs       # 调度配置
│   └── scheduler.mjs       # 本地 Cron 调度器
├── web/
│   ├── dist/               # 正式打包输出（npm run build 生成，生产由 Node 托管）
│   └── src/
│       ├── pages/          # 控制台页面
│       ├── components/     # DAG、任务表格、Cron 编辑器等
│       └── api/            # SeaTunnel 与控制台 API 客户端
├── data/                   # SQLite 数据目录（运行时生成，生产需持久化）
├── var/                    # PID、运行时端口与日志（运行时生成）
└── scripts/start.sh        # 开发模式 start / stop / restart / status
```
