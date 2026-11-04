# ACR 自动部署运行手册

本文档记录本项目已经跑通的自动部署流程，后续发布、排查 GitHub Actions、排查服务器容器时按这里操作。

## 总览

部署链路：

```text
本地 git push
  -> GitHub Actions
  -> Docker build
  -> push image 到阿里云 ACR
  -> scp docker-compose.server.yml 和 deploy.sh 到服务器
  -> ssh 登录服务器
  -> docker compose pull app
  -> docker compose up -d postgres twikoo
  -> prisma migrate deploy
  -> docker compose up -d app
```

分工：

```text
本地电脑：提交代码和 git push
GitHub：运行 Actions，构建镜像，推送 ACR，SSH 到服务器
阿里云 ACR：保存 Docker 镜像
ECS 服务器：运行 PostgreSQL、Twikoo、Nuxt app 和持久化数据卷
```

## 当前镜像信息

公网 registry：

```text
crpi-sf5kyimeo2wu1tfv.cn-shanghai.personal.cr.aliyuncs.com
```

命名空间：

```text
jiupan
```

镜像仓库：

```text
blog-nuxt
```

完整镜像名：

```text
crpi-sf5kyimeo2wu1tfv.cn-shanghai.personal.cr.aliyuncs.com/jiupan/blog-nuxt:latest
```

如果 ECS 和 ACR 在同一 VPC，也可以让服务器使用内网地址拉镜像：

```text
crpi-sf5kyimeo2wu1tfv-vpc.cn-shanghai.personal.cr.aliyuncs.com/jiupan/blog-nuxt:latest
```

但 GitHub Actions 不能用内网地址推送，Actions 仍应使用公网 registry。

## 相关文件

仓库内：

```text
.github/workflows/deploy.yml
docker-compose.server.yml
deploy.sh
.env.server.example
docs/deploy-acr.md
```

服务器内：

```text
/opt/blog-nuxt/.env
/opt/blog-nuxt/docker-compose.server.yml
/opt/blog-nuxt/deploy.sh
```

服务器 `.env` 不进 Git，不要提交。

## GitHub Secrets

位置：

```text
GitHub 仓库 -> Settings -> Secrets and variables -> Actions -> Repository secrets
```

需要添加：

```text
ACR_REGISTRY=crpi-sf5kyimeo2wu1tfv.cn-shanghai.personal.cr.aliyuncs.com
ACR_NAMESPACE=jiupan
ACR_USERNAME=阿里云 ACR 登录用户名
ACR_PASSWORD=阿里云 ACR 登录密码
SERVER_HOST=服务器公网 IP
SERVER_USER=root
SERVER_SSH_KEY=服务器 SSH 私钥全文
SERVER_PORT=22
```

注意：

```text
ACR_REGISTRY 不要带 https://
ACR_REGISTRY 不要带 /jiupan/blog-nuxt
SERVER_SSH_KEY 填私钥，不是 .pub 公钥
Secrets 要加到 Repository secrets，不是 Variables
```

`SERVER_SSH_KEY` 应类似：

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

## 服务器 .env

位置：

```bash
cd /opt/blog-nuxt
nano .env
```

示例：

```env
APP_IMAGE=crpi-sf5kyimeo2wu1tfv.cn-shanghai.personal.cr.aliyuncs.com/jiupan/blog-nuxt:latest

POSTGRES_DB=nuxt_blog
POSTGRES_USER=blog
POSTGRES_PASSWORD=请换成数据库强密码

DATABASE_URL="postgresql://blog:请换成数据库强密码@postgres:5432/nuxt_blog?schema=public"
NUXT_SESSION_PASSWORD="请换成至少32位随机字符串"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="请换成后台强密码"
SITE_URL="https://blog.ittx.cn"
SITE_NAME="Jiupan Blog"
NUXT_PUBLIC_TWIKOO_ENV_ID="https://blog.ittx.cn/twikoo"
NUXT_PUBLIC_TWIKOO_REGION=
TWIKOO_THROTTLE=1000
```

关键规则：

```text
POSTGRES_PASSWORD 和 DATABASE_URL 里的密码必须一致
DATABASE_URL 必须使用 @postgres:5432，不能使用 @localhost:5432
SITE_NAME 有空格时必须加引号
生产环境 SITE_URL 使用正式域名，不要使用 localhost
UPLOAD_DIR 不需要写在服务器 .env，compose 已固定为 /app/uploads
NUXT_PUBLIC_TWIKOO_ENV_ID 必须是浏览器可访问的 HTTPS 地址，不能写 localhost
```

需要启用 AI 时，在服务器 `.env` 中加入 README「AI 与知识库」章节的 `AI_*` 配置。`app` 在运行时读取这些变量，非空值覆盖对应的后台设置。修改后使用 `docker compose -f docker-compose.server.yml up -d --no-deps --force-recreate app` 重新创建应用容器。

Twikoo 容器只监听服务器的 `127.0.0.1:8080`。Nginx 的 HTTPS `server` 块需要将 `/twikoo` 反向代理到该端口：

```nginx
location = /twikoo {
    proxy_pass http://127.0.0.1:8080/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

错误示例：

```env
DATABASE_URL="postgresql://blog:blog_password@localhost:5432/nuxt_blog?schema=public"
SITE_NAME=Jiupan Blog
```

正确示例：

```env
DATABASE_URL="postgresql://blog:blog_password@postgres:5432/nuxt_blog?schema=public"
SITE_NAME="Jiupan Blog"
```

## 服务器首次准备

在 ECS 上执行：

```bash
mkdir -p /opt/blog-nuxt
cd /opt/blog-nuxt
```

创建 `/opt/blog-nuxt/.env`。

登录 ACR：

```bash
docker login --username=你的ACR用户名 crpi-sf5kyimeo2wu1tfv.cn-shanghai.personal.cr.aliyuncs.com
```

如果服务器使用内网 registry，则登录内网地址：

```bash
docker login --username=你的ACR用户名 crpi-sf5kyimeo2wu1tfv-vpc.cn-shanghai.personal.cr.aliyuncs.com
```

SSH key 准备：

```bash
ssh-keygen -t ed25519 -C "github-actions-blog-deploy" -f ~/.ssh/blog_deploy
```

把公钥内容加入服务器：

```bash
cat ~/.ssh/blog_deploy.pub
```

追加到服务器用户的 authorized_keys：

```bash
/root/.ssh/authorized_keys
```

把私钥内容填入 GitHub Secret：

```bash
cat ~/.ssh/blog_deploy
```

对应：

```text
SERVER_SSH_KEY
```

服务器 SSH 权限：

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## 日常发布

本地电脑项目目录：

```bash
git status
git add 需要提交的文件
git commit -m "提交说明"
git push origin main
```

推送后查看：

```text
GitHub 仓库 -> Actions -> Deploy
```

如果需要手动触发：

```text
Actions -> Deploy -> Run workflow
```

如果失败后已经修好配置：

```text
Actions -> 失败的 run -> Re-run failed jobs
```

## Actions 步骤说明

`Checkout`：

```text
拉取仓库代码。
```

`Set up Docker Buildx`：

```text
准备 Docker 构建环境。
```

`Login to Aliyun ACR`：

```text
使用 ACR_REGISTRY、ACR_USERNAME、ACR_PASSWORD 登录阿里云 ACR。
```

`Build and push image`：

```text
执行 Dockerfile，构建镜像并推送到 ACR。
```

构建和推送步骤最多运行 15 分钟；超过上限会失败，不继续执行服务器部署。整个部署任务最多运行 40 分钟，给构建推送、文件同步及现有的 20 分钟 SSH 执行上限留出余量。服务器内应用健康检查单独限制为 120 秒。这些配置仅对使用新工作流的后续运行生效。

`Sync deploy files`：

```text
把 docker-compose.server.yml 和 deploy.sh 复制到 /opt/blog-nuxt。
```

`Deploy on server`：

```text
SSH 到服务器，执行 /opt/blog-nuxt/deploy.sh。
```

## deploy.sh 做什么

部署脚本会：

```text
1. 进入 /opt/blog-nuxt
2. 检查 .env 是否存在
3. 读取 .env
4. 检查必要变量是否为空
5. 阻止 DATABASE_URL 指向 localhost 或 127.0.0.1
6. docker compose pull app
7. 为当前可用的上一版应用镜像保留本地 rollback 标签
8. docker compose up -d postgres twikoo
9. pg_isready 检查数据库
10. 使用临时 app 容器执行 prisma migrate deploy
11. docker compose up -d --no-deps --wait --wait-timeout 120 app
12. 健康检查通过后，清理带博客项目标签的悬空镜像
13. docker compose ps
```

生产环境迁移只用：

```bash
prisma migrate deploy
```

不要用：

```bash
prisma db push
```

## 常见错误

### IMAGE 变成 //blog-nuxt:latest

日志：

```text
env:
  IMAGE: //blog-nuxt:latest
Error: Username and password required
```

原因：

```text
GitHub Secrets 没配置，或名字填错。
```

检查：

```text
ACR_REGISTRY
ACR_NAMESPACE
ACR_USERNAME
ACR_PASSWORD
```

### npm ci lockfile 不同步

日志：

```text
npm ci can only install packages when your package.json and package-lock.json are in sync
Invalid: lock file's commander@11.1.0 does not satisfy commander@13.1.0
```

原因：

```text
package-lock.json 和 package.json 不匹配。
```

本地修复（使用与 Docker 中一致的 npm 10.9.2）：

```bash
npx --yes npm@10.9.2 install --package-lock-only --ignore-scripts
npx --yes npm@10.9.2 ci --ignore-scripts --dry-run
git add package-lock.json
git commit -m "fix package lock"
git push origin main
```

本机 npm 11 的校验通过，不代表 Docker 中 npm 10 的校验也会通过。更新依赖后应使用上面的 npm 10 命令检查，避免缺少可选 peer 依赖记录而导致构建失败。

### SSH unable to authenticate

日志：

```text
ssh: unable to authenticate, attempted methods [none publickey], no supported methods remain
```

原因：

```text
GitHub Secret SERVER_SSH_KEY 不是正确私钥，或服务器 authorized_keys 没有对应公钥。
```

检查：

```text
SERVER_HOST
SERVER_USER
SERVER_PORT
SERVER_SSH_KEY
```

本地验证：

```bash
ssh -i ~/.ssh/blog_deploy root@服务器公网IP
```

### POSTGRES 变量为空

日志：

```text
The "POSTGRES_PASSWORD" variable is not set. Defaulting to a blank string.
The "POSTGRES_DB" variable is not set. Defaulting to a blank string.
The "POSTGRES_USER" variable is not set. Defaulting to a blank string.
```

原因：

```text
服务器 /opt/blog-nuxt/.env 缺 POSTGRES_DB、POSTGRES_USER、POSTGRES_PASSWORD。
```

修复：

```env
POSTGRES_DB=nuxt_blog
POSTGRES_USER=blog
POSTGRES_PASSWORD=数据库密码
```

### Prisma P1001 localhost

日志：

```text
P1001: Can't reach database server at `localhost:5432`
```

原因：

```text
Docker 容器里的 localhost 指向 app 容器自己，不是 postgres 容器。
```

修复：

```env
DATABASE_URL="postgresql://blog:数据库密码@postgres:5432/nuxt_blog?schema=public"
```

### .env 中 Blog command not found

日志：

```text
./.env: line 12: Blog: command not found
```

原因：

```text
SITE_NAME=Jiupan Blog 没有加引号。
```

修复：

```env
SITE_NAME="Jiupan Blog"
```

### 服务器缺 /opt/blog-nuxt

日志可能出现在 scp 或 ssh 阶段。

修复：

```bash
mkdir -p /opt/blog-nuxt
```

## 服务器常用命令

### 健康检查与旧镜像清理

应用的 `/api/health` 接口会执行一次数据库查询：成功返回 `200` 和 `{"status":"ok"}`，失败返回 `503`，不输出连接信息，也不缓存结果。容器通过 Node 自带的 `fetch` 探测，无需安装 curl。

部署使用 Compose 的 `--wait`，最多等待 120 秒。启动或健康检查失败时，脚本返回失败并跳过镜像清理。服务器的 Docker Compose 需要支持 `--wait` 和 `--wait-timeout`。

每次切换版本前，为当前运行正常的应用镜像保留同仓库的 `:rollback` 本地标签。重复部署同一镜像、或者当前容器已经不健康时，不覆盖已有回滚标签。

清理使用：

```bash
docker image prune -f --filter 'label=cn.ittx.blog.project=blog-nuxt'
```

该标签由 Dockerfile 写入新构建的博客镜像。清理仅针对这些镜像中的悬空镜像，不清理其他项目、容器、数据卷或带 `rollback` 标签的上一版。清理失败仅输出警告，不改变已通过健康检查的部署结果。

首次启用时，历史上没有该项目标签的旧镜像不会自动清理，需要另行核对；此后新版本的旧镜像会纳入定向清理。

### 使用上一版镜像

以当前仓库地址为例，在 `/opt/blog-nuxt` 下手动切换应用：

```bash
APP_IMAGE=crpi-sf5kyimeo2wu1tfv.cn-shanghai.personal.cr.aliyuncs.com/jiupan/blog-nuxt:rollback \
  docker compose -f docker-compose.server.yml up -d --no-deps --wait --wait-timeout 120 app
```

健康探针仅在 `/api/health` 返回 `404` 时改为验证 `/api/settings` 的业务响应，兼容尚未提供健康接口的旧版本；新接口返回 `503` 时不会降级放行。

以上命令只切换应用镜像，不回退数据库迁移。回滚前需确认旧应用兼容当前数据库结构。不要直接用 `deploy.sh` 执行回滚，因为它会按 `.env` 拉取部署目标并运行迁移。

### 日常运维

进入部署目录：

```bash
cd /opt/blog-nuxt
```

查看容器：

```bash
docker compose -f docker-compose.server.yml ps
```

查看 app 日志：

```bash
docker compose -f docker-compose.server.yml logs app --tail=80
docker compose -f docker-compose.server.yml logs -f app
```

查看 postgres 日志：

```bash
docker compose -f docker-compose.server.yml logs postgres --tail=80
```

查看 Twikoo 日志：

```bash
docker compose -f docker-compose.server.yml logs twikoo --tail=80
docker compose -f docker-compose.server.yml logs -f twikoo
```

重启 app：

```bash
docker compose -f docker-compose.server.yml restart app
```

手动执行部署：

```bash
cd /opt/blog-nuxt
./deploy.sh
```

手动执行迁移：

```bash
docker compose -f docker-compose.server.yml run --rm --no-deps app prisma migrate deploy
```

数据库备份：

```bash
docker compose -f docker-compose.server.yml exec -T postgres pg_dump -U blog -d nuxt_blog > backup-$(date +%Y%m%d-%H%M%S).sql
```

危险命令：

```bash
docker compose -f docker-compose.server.yml down -v
```

`down -v` 会删除数据库和上传文件数据卷，不要在生产环境随手执行。

## 数据卷

生产数据卷：

```text
postgres-data
twikoo-data
uploads
knowledge-files
```

含义：

```text
postgres-data：PostgreSQL 数据
twikoo-data：Twikoo 评论和配置数据
uploads：后台上传的图片等文件
knowledge-files：知识库上传文件
```

更新镜像不会删除数据卷。

## 安全注意

不要把这些内容发到公开渠道或提交进 Git：

```text
ACR_PASSWORD
SERVER_SSH_KEY
POSTGRES_PASSWORD
NUXT_SESSION_PASSWORD
ADMIN_PASSWORD
```

如果密码曾经泄露，处理顺序：

```text
1. 修改服务器 /opt/blog-nuxt/.env
2. 修改 GitHub Secrets 中对应值
3. 重跑 GitHub Actions 或重启 app
4. 确认旧密码不可用
```

后台密码改完后：

```bash
docker compose -f docker-compose.server.yml up -d app
```

如果后台用户密码已经写入数据库，可能还需要通过 seed、后台功能或数据库更新用户密码，具体按当前认证逻辑处理。

## 本地 Git 注意

只提交相关文件，避免把临时目录、node_modules、服务器密码提交进去。

查看状态：

```bash
git status --short
```

查看未推送提交：

```bash
git log --oneline origin/main..HEAD
```

推送：

```bash
git push origin main
```

如果 HTTPS 推送提示没有用户名，可以使用本机已配置的 GitHub 凭证，或改用 SSH remote。
