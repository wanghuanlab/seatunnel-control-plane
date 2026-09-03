# EDP Visualization

SeaTunnel Zeta **REST API V2** 的产品化 Web 控制台，覆盖**总览**、**任务管理**、作业管理、Pending 诊断、日志、系统监控、Checkpoint、作业提交/停止、**登录鉴权与系统设置**等能力。

基于官方文档：[RESTful API V2](https://seatunnel.apache.org/zh-CN/docs/2.3.13/engines/zeta/rest-api-v2)

## 架构

```
Browser (React SPA，默认 :5174，占用则自动 +1)
    ↓ /api/* (Cookie session)
Proxy Server（默认 :8800，占用则自动 +1）
    ↓                           ↓
SeaTunnel REST API           SQLite (任务 / 调度 / 用户 / 设置)
```

## 功能页面

| 页面 | 说明 |
|------|------|
| 登录 | 全站登录；默认管理员 `admin` / `123456` |
| **总览** | 集群健康、节点/Worker 资源、运行中作业与 Pending 摘要 |
| **任务管理** | 作业模板 CRUD、一键运行提交、执行状态跟踪、定时调度（SQLite） |
| 作业管理 | 运行/已完成作业、批量停止 |
| 作业详情 | 指标、DAG、Checkpoint |
| Pending 队列 | Slot 竞争诊断 |
| 提交作业 | JSON/HOCON/SQL 单/批量提交 |
| 日志中心 | 日志浏览 |
| 系统监控 | JVM 指标（中文） |
| 工具箱 | Tags、加密、批量操作 |
| **系统设置** | SeaTunnel API Base、用户管理（仅管理员） |

## 快速开始

```bash
cd edp-visualization
npm run setup
npm run init-db    # 可选：建表并种子 admin（启动时也会自动执行）
scripts/start.sh start
# 或: npm run dev
```

常用命令：

```bash
scripts/start.sh status    # 查看端口 / PID / 是否在跑
scripts/start.sh restart   # 重启
scripts/start.sh stop      # 停止
# 等价 npm: npm run status | restart | stop
```

1. 按 `status` 输出的 Web 地址打开页面，使用 `admin` / `123456` 登录  
2. 进入 **系统设置 → SeaTunnel 连接**，填写并保存 `http://127.0.0.1:8080`（保存前会探测 `/overview`）  
3. 建议立即在侧栏「修改密码」更换默认密码  

任务数据默认写在 `data/edp-visualization.sqlite`。日志在 `var/server.log`、`var/web.log`。

## 权限

- **管理员**：可访问系统设置（API Base、用户 CRUD/重置密码）
- **普通用户**：可使用其余全部业务页面；不可进系统设置

## 任务管理

任务是对 SeaTunnel 作业配置的**模板化维护**：

- 保存 HOCON / JSON / SQL 配置
- 点击「运行」调用 `POST /submit-job` 提交到集群
- 记录创建时间、最后执行时间、最近 Job ID、执行状态
- 列表自动同步 SeaTunnel `job-info` 更新运行中任务状态

## 生产部署

```bash
npm run build
NODE_ENV=production npm start
```

生产模式下 API 端口默认从 `8800` 起，若被占用会自动递增。

## 端口与数据

| 项 | 默认 | 说明 |
|------|------|------|
| Web | 5174 | 占用则自动 +1 |
| API | 8800 | 占用则自动 +1 |
| SQLite | `data/edp-visualization.sqlite` | 可用环境变量 `EDP_SQLITE_PATH` 覆盖 |

SeaTunnel API Base 仅通过 Web「系统设置」写入 SQLite，**不再使用 `.env` 文件**。

## 项目结构

```
edp-visualization/
├── server/
│   ├── index.mjs           # HTTP 服务：鉴权 + 代理 + API
│   ├── db.mjs              # SQLite 连接与 schema
│   ├── auth.mjs / api-auth.mjs
│   ├── settings.mjs        # SeaTunnel API Base
│   ├── tasks.mjs           # 任务 CRUD / 运行 / 状态同步
│   └── seatunnel.mjs       # 服务端提交作业
├── web/src/pages/
├── scripts/start.sh        # start / stop / restart / status
├── scripts/init-db.mjs
└── var/                    # 运行时 pid / 日志 / runtime.json
```
