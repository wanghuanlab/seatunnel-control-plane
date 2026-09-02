# EDP Visualization

SeaTunnel Zeta **REST API V2** 的产品化 Web 控制台，覆盖集群概览、作业管理、Pending 诊断、日志、系统监控、Checkpoint、作业提交/停止等全部 API 能力。

基于官方文档：[RESTful API V2](https://seatunnel.apache.org/zh-CN/docs/2.3.13/engines/zeta/rest-api-v2)

## 架构

```
Browser (React SPA :5174)
    ↓ /api/seatunnel/*
Proxy Server (:8800)
    ↓
SeaTunnel Zeta REST API (:8080)
```

## 功能页面与 API 覆盖

| 页面 | API | 交互能力 |
|------|-----|----------|
| 集群概览 | `GET /overview` | Tag 过滤、10s 自动刷新 |
| 作业管理 | `GET /running-jobs`, `GET /finished-jobs/:state` | 多选批量 `POST /stop-jobs`、单作业停止、自动刷新 |
| 作业详情 | `GET /job-info/:jobId` | DAG 拓扑可视化、运行指标、Checkpoint 概览/历史 |
| Pending 队列 | `GET /pending-jobs` | Worker 快照、Pending 诊断、10s 自动刷新 |
| 提交作业 | `POST /submit-job`, `POST /submit-jobs`, `POST /submit-job/upload` | 单/批量 JSON 提交、HOCON/SQL 文本、配置文件上传 |
| 日志中心 | `GET /logs`, `GET /logs/:jobId`, `GET /logs/:logName` | Job ID 过滤、在线查看日志内容 |
| 系统监控 | `GET /system-monitoring-information`, `GET /metrics`, `GET /openmetrics` | Metrics / OpenMetrics 切换、自动刷新 |
| 工具箱 | `POST /update-tags`, `POST /encrypt-config`, `POST /stop-jobs`, `POST /submit-jobs` | 节点 Tags、配置加密、批量停止/提交 |

## 快速开始

```bash
cd edp-visualization
cp .env.example .env
npm run setup
scripts/start.sh
```

- Web UI: http://127.0.0.1:5174
- API 代理: http://127.0.0.1:8800/api/seatunnel/overview

确保本地 SeaTunnel Engine 已启动且 REST API 可访问（默认 `http://127.0.0.1:8080`）。

## 生产部署

```bash
npm run build
NODE_ENV=production npm start
```

生产模式下代理服务会在 `8800` 端口同时提供静态页面与 API 反向代理。

## 配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `EDP_VIZ_PORT` | 8800 | 代理服务端口 |
| `SEATUNNEL_API_BASE` | http://127.0.0.1:8080 | SeaTunnel REST API 地址 |

## 项目结构

```
edp-visualization/
├── server/index.mjs          # 代理 :8800 → SeaTunnel :8080
├── web/                      # React + TypeScript + Vite
│   └── src/
│       ├── api/client.ts     # REST API V2 客户端
│       ├── pages/            # 8 个功能页面
│       ├── components/       # Layout, JobTable, DagGraph, StatusBadge
│       └── hooks/usePolling.ts
└── scripts/start.sh
```
