# SeaTunnel Control Plane 运维启动手册

> 适用对象：内网环境中的部署与值守运维人员。
>
> 本手册对应 SeaTunnel Control Plane。该系统是 SeaTunnel Zeta Engine 的运维与任务控制台，**不是 SeaTunnel 引擎本体**；控制台通过 SeaTunnel REST API V2 调用已运行的 SeaTunnel 集群。

## 1. 部署形态与边界

生产环境使用单个 Node.js 进程托管控制台 API 和前端静态资源，Nginx/OpenResty 通过 HTTP 向内网提供 IP 访问。

```text
内网浏览器
    │ http://<服务器IP>[:端口]
    ▼
Nginx / OpenResty
    │ http://127.0.0.1:8800
    ▼
SeaTunnel Control Plane（Node.js）
    ├── web/dist：前端页面
    ├── SQLite：用户、会话、任务、调度和系统设置
    └── SeaTunnel REST API V2：集群、作业、日志等
```

注意事项：

- Node 服务只绑定 `127.0.0.1`，不直接开放 `8800` 到内网；由 Nginx/OpenResty 对外提供访问。
- 本系统使用 Cookie 会话。请保证页面和 `/api/*` 由同一个 IP/域名及同一反向代理入口访问。
- 当前是单实例设计：SQLite 不可放在 NFS/NAS 等网络文件系统上；不要同时启动多个 Node 实例，否则定时任务可能重复执行。
- 本手册按 HTTP 内网访问编写。HTTP 不具备传输加密和身份校验能力，访问范围必须限制在受信任内网，并由防火墙/安全组限制来源网段。

## 2. 前置条件

### 2.1 基础软件

目标服务器需要具备：

- Linux（以下命令以 systemd 系统为例）；
- Node.js LTS，建议 20 或更高版本；
- npm；
- Nginx 或 OpenResty；
- `python3`、`make`、`g++`（Debian/Ubuntu 可安装 `build-essential`），用于编译 `better-sqlite3` 原生依赖；
- 已启动且已开启 REST API V2 的 SeaTunnel Zeta 集群。

检查 Node.js 版本：

```bash
node -v
npm -v
```

Debian/Ubuntu 缺少编译环境时：

```bash
apt-get update
apt-get install -y python3 make g++
```

### 2.2 网络与端口

| 用途 | 默认端口 | 建议暴露范围 |
| --- | ---: | --- |
| Nginx HTTP | `80` | 仅允许运维人员所在内网网段访问 |
| 控制台 Node | `8800` | 仅本机 `127.0.0.1`，不开放防火墙 |
| SeaTunnel REST API | 以集群实际配置为准（常见示例为 `8080`） | 控制台服务器到 SeaTunnel 集群的必要访问 |

若服务器的 80 端口被其他站点使用，可让 Nginx 监听一个未占用端口（如 `8088`），访问地址变为 `http://<服务器IP>:8088/`。

## 3. 目录与运行数据

本文示例部署目录为 `/opt/seatunnel-control-plane`。其中以下目录和文件属于运行数据，升级时必须保留：

| 路径 | 用途 | 运维要求 |
| --- | --- | --- |
| `data/seatunnel-control-plane.sqlite` | SQLite 主数据库 | 必须持久化和备份 |
| `data/seatunnel-control-plane.sqlite-wal` | WAL 日志 | 备份时与主库一并处理 |
| `data/seatunnel-control-plane.sqlite-shm` | WAL 共享内存 | 备份时与主库一并处理 |
| `var/` | 开发脚本的日志、PID 等临时运行信息 | 生产 systemd 日志不依赖此目录 |
| `web/dist/` | 前端构建产物 | 每次版本升级后更新 |

初始管理员仅在数据库中不存在 `admin` 用户时创建，默认账号为 `admin` / `123456`。首次登录后必须立刻修改密码。

## 4. 首次部署

### 4.1 准备程序文件

将项目代码同步到服务器。若在构建机上构建，请先在构建机执行：

```bash
cd seatunnel-control-plane
npm run setup
npm run build
test -f web/dist/index.html && echo "build ok"
```

同步时不要把构建机的 `node_modules` 复制到 Linux 服务器；`better-sqlite3` 必须在目标服务器安装。首次同步示例：

```bash
rsync -az --delete \
  --exclude node_modules \
  --exclude web/node_modules \
  --exclude .git \
  --exclude var \
  --exclude data \
  ./ user@<服务器IP>:/opt/seatunnel-control-plane/
```

在服务器创建数据目录并安装生产依赖：

```bash
cd /opt/seatunnel-control-plane
mkdir -p data var
npm ci --omit=dev || npm install --omit=dev
node -e 'import("better-sqlite3").then(() => console.log("sqlite_ok"))'
```

最后一条命令输出 `sqlite_ok` 表示 SQLite 原生模块可以正常加载。

### 4.2 创建 systemd 服务

创建 `/etc/systemd/system/seatunnel-control-plane.service`：

```ini
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
```

> 若 `node` 不在 `/usr/bin/node`，使用 `command -v node` 查到实际路径后替换 `ExecStart` 中的路径。

加载并启动服务：

```bash
systemctl daemon-reload
systemctl enable --now seatunnel-control-plane.service
systemctl status seatunnel-control-plane.service --no-pager
```

本机健康检查：

```bash
curl -I http://127.0.0.1:8800/
```

预期返回 `HTTP/1.1 200`。首次启动会自动创建 SQLite schema 及默认管理员。

### 4.3 配置 Nginx/OpenResty（HTTP + IP 访问）

创建 Nginx 站点配置，例如 `/etc/nginx/conf.d/seatunnel-control-plane.conf`：

```nginx
server {
    listen 80;
    server_name _;

    # 按实际内网网段收敛访问来源；以下仅为示例。
    # allow 10.0.0.0/8;
    # allow 172.16.0.0/12;
    # allow 192.168.0.0/16;
    # deny all;

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
nginx -t && systemctl reload nginx
```

OpenResty 可使用对应服务重载命令，或执行 `nginx -t && nginx -s reload`。

从内网客户端验证：

```bash
curl -I http://<服务器IP>/
```

浏览器访问 `http://<服务器IP>/`，以 `admin` / `123456` 登录后立即修改密码。随后进入 **系统设置 → SeaTunnel 连接**，填写 SeaTunnel API Base（例如 `http://<SeaTunnel服务器IP>:8080`）并保存；系统会访问 `/overview` 验证连通性。

## 5. 日常启停与巡检

### 5.1 systemd 服务管理

```bash
# 查看状态
systemctl status seatunnel-control-plane.service --no-pager

# 启动 / 停止 / 重启
systemctl start seatunnel-control-plane.service
systemctl stop seatunnel-control-plane.service
systemctl restart seatunnel-control-plane.service

# 查看实时日志
journalctl -u seatunnel-control-plane.service -f

# 查看最近 200 行日志
journalctl -u seatunnel-control-plane.service -n 200 --no-pager
```

### 5.2 巡检项

```bash
# 控制台 Node 进程和回环接口
systemctl is-active seatunnel-control-plane.service
curl -I http://127.0.0.1:8800/

# Nginx 配置与状态
nginx -t
systemctl is-active nginx

# 监听端口
ss -lntp | rg ':80|:8800'

# 磁盘空间（SQLite 所在分区尤为重要）
df -h /opt/seatunnel-control-plane/data
```

正常情况下：Node 服务和 Nginx 都为 `active`；本机 `8800` 返回 200；内网 IP 可打开登录页；SeaTunnel 连接健康状态为正常。

## 6. 版本升级

升级前先备份数据库，并确认没有正在执行、不可中断的控制台操作。升级过程不要删除或覆盖 `data/`。

### 6.1 构建机

```bash
cd seatunnel-control-plane
git pull
npm run setup
npm run build
test -f web/dist/index.html && echo "build ok"

rsync -az --delete \
  --exclude node_modules \
  --exclude web/node_modules \
  --exclude .git \
  --exclude var \
  --exclude data \
  --exclude '*.sqlite' \
  --exclude '*.sqlite-*' \
  ./ user@<服务器IP>:/opt/seatunnel-control-plane/
```

### 6.2 目标服务器

```bash
cd /opt/seatunnel-control-plane
npm ci --omit=dev || npm install --omit=dev
systemctl restart seatunnel-control-plane.service
systemctl status seatunnel-control-plane.service --no-pager
curl -I http://127.0.0.1:8800/
```

若升级失败，恢复上一版程序文件后重启服务；数据库仅在已确认升级步骤会改动其结构时才按备份策略回退。

## 7. 备份与恢复

### 7.1 备份原则

- 使用 SQLite WAL 模式时，不要只复制正在写入的 `.sqlite` 文件。
- 推荐通过 SQLite 在线备份生成一致性副本。
- 备份至少覆盖数据库、systemd 服务文件、Nginx 配置和当前发布版本信息。
- 备份文件应放到独立磁盘或符合现有灾备策略的位置。

示例（每日定时任务可基于此命令编排）：

```bash
backup_dir=/backup/seatunnel-control-plane/$(date +%F)
mkdir -p "$backup_dir"
sqlite3 /opt/seatunnel-control-plane/data/seatunnel-control-plane.sqlite ".backup '$backup_dir/seatunnel-control-plane.sqlite'"
cp /etc/systemd/system/seatunnel-control-plane.service "$backup_dir/"
cp /etc/nginx/conf.d/seatunnel-control-plane.conf "$backup_dir/"
```

若服务器没有 `sqlite3` 命令，先安装系统 SQLite 客户端；不要用正在运行时的单文件复制替代在线备份。

### 7.2 恢复数据库

恢复前先停止服务，保留故障现场副本：

```bash
systemctl stop seatunnel-control-plane.service
mv /opt/seatunnel-control-plane/data/seatunnel-control-plane.sqlite \
  /opt/seatunnel-control-plane/data/seatunnel-control-plane.sqlite.failed-$(date +%F-%H%M%S)
cp /backup/seatunnel-control-plane/<备份日期>/seatunnel-control-plane.sqlite \
  /opt/seatunnel-control-plane/data/seatunnel-control-plane.sqlite
systemctl start seatunnel-control-plane.service
systemctl status seatunnel-control-plane.service --no-pager
```

随后登录控制台确认用户、任务、调度和 SeaTunnel 连接设置是否符合预期。

## 8. 常见故障处理

| 现象 | 排查与处理 |
| --- | --- |
| 浏览器无法打开页面 | 确认客户端可达服务器 IP 和 80 端口；检查 `systemctl status nginx`、`nginx -t` 及防火墙/安全组。 |
| Nginx 返回 502 | Node 进程未启动或上游端口不一致。执行 `systemctl status seatunnel-control-plane.service`、`journalctl -u seatunnel-control-plane.service -n 200 --no-pager`，并确认 `curl -I http://127.0.0.1:8800/`。 |
| 页面可打开但无法登录或接口报 404 | Nginx 未正确反向代理到 Node，或错误地只部署了 `web/dist`。确认 `proxy_pass http://127.0.0.1:8800`，并确认 Node 服务运行。 |
| `better-sqlite3` 安装/启动失败 | 在目标 Linux 服务器安装 `python3 make g++` 后删除当前 `node_modules` 并重新执行 `npm ci --omit=dev`。不要从其他操作系统复制 `node_modules`。 |
| SeaTunnel 连接校验失败 | 从控制台服务器执行 `curl http://<SeaTunnel服务器IP>:<端口>/overview`；检查 API Base、路由、防火墙及 SeaTunnel REST API V2 是否已启用。 |
| 服务反复重启 | 使用 `journalctl -u seatunnel-control-plane.service -f` 获取首个报错；重点检查 Node 路径、依赖安装、`web/dist` 是否存在、SQLite 目录写入权限和磁盘空间。 |
| 升级后数据丢失 | 检查同步命令是否错误覆盖了 `data/`。从升级前的 SQLite 备份恢复，并在后续同步中始终排除 `data/` 和 `*.sqlite*`。 |
| 定时任务重复触发 | 通常是有多个控制台 Node 实例。停止多余实例，仅保留一个 systemd 服务；当前版本不支持多实例调度。 |

## 9. 重要安全与使用限制

- 默认账号 `admin` / `123456` 必须在首次登录后修改；禁止将其长期保留。
- 仅管理员可以修改 SeaTunnel 连接和管理本地用户；但当前版本不是细粒度 RBAC，已登录用户仍可进行任务和作业相关操作。请通过网络隔离和账号管理控制访问范围。
- HTTP 仅允许受信任内网使用。建议在 Nginx 的 `server` 块中启用 `allow` / `deny`，并在主机防火墙或安全组中限制 80 端口来源。
- SQLite 包含用户、会话、任务模板、调度与系统设置。数据库及备份文件应按敏感运维数据管理。
- SeaTunnel API Base 是全局配置；当前不支持多集群、多环境或租户隔离。

## 10. 附录：开发模式命令（仅用于排查）

以下脚本会同时启动 Vite 前端和 Node API，端口从 API `8800`、Web `5174` 起自动选择空闲端口，适合开发或临时定位问题，**不能替代生产 systemd 服务**：

```bash
cd /opt/seatunnel-control-plane
sh scripts/start.sh start
sh scripts/start.sh status
sh scripts/start.sh restart
sh scripts/start.sh stop
```

日志位于 `var/server.log` 和 `var/web.log`。开发脚本的 `stop` 会按记录的 PID 和端口停止进程，生产环境请始终优先使用 `systemctl` 管理服务。
