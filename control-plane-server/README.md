# Control Plane Server（Java）

SeaTunnel Control Plane 的后端服务：Spring Boot REST API、PostgreSQL 持久化、SeaTunnel HTTP 代理与本地 Cron 调度。

## 技术栈

- JDK 8
- Spring Boot 2.7.18
- Spring Data JPA / Hibernate（`ddl-auto: update`）
- PostgreSQL
- Maven
- Spring Security Crypto（密码哈希）
- Apache HttpClient（上游探测与代理）

## 本地数据库

默认连接（可由环境变量覆盖）：

| 项 | 值 |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `5432`（`SCP_PG_PORT`） |
| Database | `seatunnel_control_plane` |
| User | `postgres` |
| Password | 见 `src/main/resources/application.yml` |

初始化脚本在 `sql/`：

```bash
# 端口按实际 Postgres 修改；部分本机 Docker 映射可能是 5360
psql -h 127.0.0.1 -p 5432 -U postgres -f sql/create-database.sql
psql -h 127.0.0.1 -p 5432 -U postgres -d seatunnel_control_plane -f sql/init.sql
```

表结构包含：`users`、`sessions`、`app_settings`、`tasks`、`task_runs`、`task_schedules`。

默认管理员 **`admin` / `123456`** 由应用首次启动时写入（`BootstrapRunner`），不放在 SQL 里。登录后请立即修改密码。

## 启动

```bash
cd control-plane-server
mvn spring-boot:run
```

指定 JDK 示例：

```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-8.jdk/Contents/Home mvn spring-boot:run
```

默认监听 **`http://127.0.0.1:8800`**。不要与其它占用同一端口的进程同时启动。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SCP_PORT` | `8800` | HTTP 端口 |
| `SCP_PG_HOST` | `127.0.0.1` | Postgres 主机 |
| `SCP_PG_PORT` | `5432` | Postgres 端口 |
| `SCP_PG_DB` | `seatunnel_control_plane` | 库名 |
| `SCP_PG_USER` | `postgres` | 用户名 |
| `SCP_PG_PASSWORD` | （yml 内） | 密码 |

服务绑定地址固定为 `127.0.0.1`（见 `application.yml`），生产环境前请加反向代理。

## 打包运行

```bash
./package.sh
cd package
./start.sh          # Windows: start.bat
```

`package/` 会生成：

- `control-plane-server.jar`
- `application.yml`（从源码复制，可按环境修改）
- `sql/`
- `start.sh` / `start.bat`
- `logs/`

可通过 `JAVA_HOME`、`JAVA_OPTS` 调整运行参数。

## 主要 API

| 组 | 路径 |
| --- | --- |
| 探活 | `GET /` |
| 认证 | `/api/auth/login` · `logout` · `me` · `change-password` |
| 用户 | `/api/users`（管理员） |
| 设置 | `/api/settings/health` · `/api/settings/seatunnel` |
| 任务 | `/api/tasks` · `/{id}` · `/{id}/run` · `/{id}/runs` · `/{id}/schedule` |
| 上游代理 | `/api/seatunnel/**` → 已配置的 SeaTunnel API Base |

会话 Cookie：`scp_session`。

## 测试

```bash
mvn test
# 或
JAVA_HOME=/path/to/jdk8 mvn test
```

## 相关文档

- 仓库总览：[../README.md](../README.md)
- 架构与运维：[../docs/架构与运维.md](../docs/架构与运维.md)
- 前端：[../control-plane-web/README.md](../control-plane-web/README.md)
