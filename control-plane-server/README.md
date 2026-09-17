# Control Plane Server (Java)

SeaTunnel Control Plane 的 Java 实现，与仓库中的 Node.js `server/` 并行存在，REST 契约保持兼容。

## 技术栈

- JDK 8
- Spring Boot 2.7.18
- Spring Data JPA
- PostgreSQL
- Maven

## 本地数据库（测试环境）

默认连接本机 Docker Postgres：


| 项       | 值                        |
| -------- | ------------------------- |
| Host     | `127.0.0.1`               |
| Port     | `5432`                    |
| Database | `seatunnel_control_plane` |
| User     | `postgres`                |
| Password | `XXXXXX`                  |

初始化 SQL 在 `sql/` 目录：

```bash
# 创建数据库
psql -h 127.0.0.1 -p 5360 -U postgres -f sql/create-database.sql

# 建表、索引和外键
psql -h 127.0.0.1 -p 5360 -U postgres -d seatunnel_control_plane -f sql/init.sql
```

也可以在 Docker 容器内执行同样的脚本。默认管理员 `admin / 123456` 由应用首次启动时写入，不放在 SQL 里。

## 启动

```bash
cd control-plane-server
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-8.jdk/Contents/Home mvn spring-boot:run
```

默认监听 `http://127.0.0.1:8800`，与原来的 Node API 端口一致，前端 Vite 代理无需修改。不要同时启动 Node `server/` 和本服务。

首次启动会自动建表，并创建默认管理员 `admin / 123456`。

## 环境变量


| 变量              | 默认值                    |
| ----------------- | ------------------------- |
| `SCP_PORT`        | `8800`                    |
| `SCP_PG_HOST`     | `127.0.0.1`               |
| `SCP_PG_PORT`     | `5432`                    |
| `SCP_PG_DB`       | `seatunnel_control_plane` |
| `SCP_PG_USER`     | `postgres`                |
| `SCP_PG_PASSWORD` | `XXXXXX`                  |

## 测试

```bash
JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-8.jdk/Contents/Home mvn test
```
