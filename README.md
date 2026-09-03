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

```bash
cd seatunnel-control-plane
npm run setup
npm run init-db
npm run dev
```

启动脚本会从 API `8800`、Web `5174` 开始寻找可用端口。通过下面命令确认实际地址：

```bash
npm run status
# 或：scripts/start.sh status
```

首次使用：

1. 打开 `status` 输出的 Web 地址。
2. 使用初始化管理员账号登录：`admin` / `123456`。
3. 立即在侧栏修改默认密码。
4. 在 **系统设置 → SeaTunnel 连接** 中填写 API Base，例如 `http://127.0.0.1:8080`，保存时会进行连通性探测。

常用命令：

```bash
npm run dev       # 启动 API 和 Web 开发服务
npm run status    # 查看端口、PID 与运行状态
npm run restart   # 重启
npm run stop      # 停止
npm run build     # 构建前端静态资源
npm run init-db   # 初始化 SQLite schema 和默认管理员
```

## 数据与配置

默认数据文件为 `data/seatunnel-control-plane.sqlite`，使用 WAL、外键和 busy timeout。可通过 `EDP_SQLITE_PATH` 指定绝对路径或相对项目目录的自定义位置：

```bash
EDP_SQLITE_PATH=/srv/seatunnel-control-plane/data/seatunnel-control-plane.sqlite npm start
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

## 生产运行

```bash
npm run build
NODE_ENV=production npm start
```

开发模式由 Vite 提供前端服务，适合本机测试。正式交付建议将构建后的静态资源与 API 置于受 HTTPS 保护的反向代理之后，并持久化 SQLite 数据目录。

当前单实例模式的边界：

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
├── web/src/
│   ├── pages/              # 控制台页面
│   ├── components/         # DAG、任务表格、Cron 编辑器等
│   └── api/                # SeaTunnel 与控制台 API 客户端
├── data/                   # SQLite 数据目录（运行时生成）
├── var/                    # PID、运行时端口与日志（运行时生成）
└── scripts/start.sh        # start / stop / restart / status
```
