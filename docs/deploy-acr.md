# ACR 自动部署流程

本项目推荐使用阿里云 ACR 保存应用镜像，GitHub Actions 负责构建并推送镜像，服务器只负责拉取新镜像、重启应用和执行 Prisma 迁移。

## 1. 阿里云 ACR 准备

1. 开通容器镜像服务 ACR。
2. 创建命名空间，例如 `jiupan`。
3. 创建镜像仓库，例如 `blog-nuxt`。
4. 记录公网访问地址，例如：

```text
registry.cn-hangzhou.aliyuncs.com/jiupan/blog-nuxt
```

如果你的服务器和 ACR 在同一区域，也可以在服务器上使用内网地址，GitHub Actions 仍然使用公网地址推送。

## 2. GitHub Secrets

进入 GitHub 仓库：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

添加这些 secrets：

```text
ACR_REGISTRY=registry.cn-hangzhou.aliyuncs.com
ACR_NAMESPACE=你的命名空间
ACR_USERNAME=你的 ACR 登录用户名
ACR_PASSWORD=你的 ACR 登录密码
SERVER_HOST=服务器公网 IP
SERVER_USER=root
SERVER_SSH_KEY=服务器 SSH 私钥
SERVER_PORT=22
```

`SERVER_SSH_KEY` 使用私钥内容，不是 `.pub` 公钥内容。

## 3. 服务器目录

服务器上准备部署目录：

```bash
mkdir -p /opt/blog-nuxt
cd /opt/blog-nuxt
```

上传或复制这些文件到服务器：

```text
docker-compose.server.yml
deploy.sh
.env
```

`.env` 可以参考仓库里的 `.env.server.example`。

## 4. 服务器 .env 示例

```env
APP_IMAGE=registry.cn-hangzhou.aliyuncs.com/你的命名空间/blog-nuxt:latest

POSTGRES_DB=nuxt_blog
POSTGRES_USER=blog
POSTGRES_PASSWORD=请换成强密码

DATABASE_URL=postgresql://blog:请换成强密码@postgres:5432/nuxt_blog?schema=public
NUXT_SESSION_PASSWORD=请换成至少32位随机字符串
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请换成强密码
SITE_URL=https://blog.ittx.cn
SITE_NAME=Jiupan Blog
```

`POSTGRES_PASSWORD` 和 `DATABASE_URL` 里的密码必须一致。

## 5. 服务器首次登录 ACR

```bash
docker login registry.cn-hangzhou.aliyuncs.com
```

如果 `APP_IMAGE` 使用的是其他地域，把 registry 地址换成你的实际地址。

## 6. 首次部署

第一次部署前，先把数据库容器启动起来：

```bash
cd /opt/blog-nuxt
docker compose -f docker-compose.server.yml up -d postgres
```

然后在 GitHub Actions 手动运行 `Deploy` 工作流，或直接推送到 `main` 分支。

部署完成后检查：

```bash
docker compose -f docker-compose.server.yml ps
docker compose -f docker-compose.server.yml logs app --tail=80
```

## 7. 后续部署

以后只需要：

```bash
git push origin main
```

GitHub Actions 会自动构建镜像、推送 ACR，并通过 SSH 执行服务器上的 `deploy.sh`。

## 8. 重要注意

生产环境使用：

```bash
npx --package prisma@6 prisma migrate deploy
```

不要使用：

```bash
prisma db push
```

更新应用时不要执行 `docker compose down -v`，它会删除数据库和上传文件数据卷。
