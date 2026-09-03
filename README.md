# EDP Visualization

SeaTunnel Zeta **REST API V2** 的产品化 Web 控制台，覆盖集群概览、**任务管理**、作业管理、Pending 诊断、日志、系统监控、Checkpoint、作业提交/停止等能力。

基于官方文档：[RESTful API V2](https://seatunnel.apache.org/zh-CN/docs/2.3.13/engines/zeta/rest-api-v2)

## 架构

```
Browser (React SPA :5174)
    ↓ /api/seatunnel/*  /api/tasks/*
Proxy Server (:8800)
    ↓                           ↓
SeaTunnel REST API (:8080)   PostgreSQL (任务模板)
```

## 功能页面

| 页面 | 说明 |
|------|------|
| 集群概览 | SeaTunnel `/overview`、Tag 过滤 |
| **任务管理** | 作业模板 CRUD、一键运行提交、执行状态跟踪（PostgreSQL） |
| 作业管理 | 运行/已完成作业、批量停止 |
| 作业详情 | 指标、DAG、Checkpoint |
| Pending 队列 | Slot 竞争诊断 |
| 提交作业 | JSON/HOCON/SQL 单/批量提交 |
| 日志中心 | 日志浏览 |
| 系统监控 | JVM 指标（中文） |
| 工具箱 | Tags、加密、批量操作 |

## 快速开始

```bash
cd edp-visualization
cp .env.example .env
npm run setup
npm run init-db    # 创建 edp_visualization 库与表
scripts/start.sh
```

- Web UI: http://127.0.0.1:5174
- SeaTunnel 代理: http://127.0.0.1:8800/api/seatunnel/overview
- 任务 API: http://127.0.0.1:8800/api/tasks

确保本地 SeaTunnel Engine 已启动（默认 `http://127.0.0.1:8080`），PostgreSQL Docker 在 `localhost:5360` 可访问。

## 任务管理

任务是对 SeaTunnel 作业配置的**模板化维护**：

- 保存 HOCON / JSON / SQL 配置
- 点击「运行」调用 `POST /submit-job` 提交到集群
- 记录创建时间、最后执行时间、最近 Job ID、执行状态
- 列表自动同步 SeaTunnel `job-info` 更新运行中任务状态

初始化数据库（仅需一次）：

```bash
npm run init-db
```

## 生产部署

```bash
npm run build
NODE_ENV=production npm start
```

## 配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `EDP_VIZ_PORT` | 8800 | 代理服务端口 |
| `SEATUNNEL_API_BASE` | http://127.0.0.1:8080 | SeaTunnel REST API |
| `EDP_DB_HOST` | localhost | 任务库主机 |
| `EDP_DB_PORT` | 5360 | 任务库端口 |
| `EDP_DB_NAME` | edp_visualization | 任务库名 |
| `EDP_DB_USER` | postgres | 数据库用户 |
| `EDP_DB_PASSWORD` | — | 数据库密码 |

## 项目结构

```
edp-visualization/
├── server/
│   ├── index.mjs           # HTTP 服务：静态资源 + 代理 + 任务 API
│   ├── db.mjs              # PostgreSQL 连接与 schema
│   ├── tasks.mjs           # 任务 CRUD / 运行 / 状态同步
│   └── seatunnel.mjs       # 服务端提交作业
├── web/src/pages/TasksPage.tsx
├── scripts/init-db.mjs
└── scripts/start.sh
```
