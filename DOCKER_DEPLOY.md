# Coze Plus 文档站点 Docker 部署指南

本指南说明如何使用 Docker 独立部署 Coze Plus 文档站点。

## 快速开始

### 1. 环境要求

- Docker 20.10+
- Docker Compose 2.0+

### 2. 部署步骤

#### 方式一：使用部署脚本（推荐）

```bash
# 构建并启动
./deploy.sh start

# 查看日志
./deploy.sh logs

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 重新构建
./deploy.sh rebuild

# 清理所有
./deploy.sh clean
```

#### 方式二：使用 Docker Compose

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 方式三：直接使用 Docker

```bash
# 构建镜像
docker build -t coze-plus-docs .

# 运行容器
docker run -d \
  --name coze-plus-docs \
  -p 8080:80 \
  --restart unless-stopped \
  coze-plus-docs

# 查看日志
docker logs -f coze-plus-docs

# 停止容器
docker stop coze-plus-docs
docker rm coze-plus-docs
```

### 3. 访问文档

部署完成后，访问：http://localhost:8080

## 配置说明

### 端口配置

默认端口为 8080，可通过环境变量修改：

```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env 文件
DOCS_PORT=8080  # 修改为你需要的端口
```

### Nginx 配置

如需自定义 Nginx 配置，编辑 `nginx.conf` 文件：

- Gzip 压缩配置
- 缓存策略
- 安全头部
- URL 重写规则

## 构建说明

### 构建过程

1. **第一阶段（Builder）**：
   - 使用 Node.js 20 LTS Alpine 镜像
   - 安装 npm 依赖
   - 运行 `vitepress build` 构建文档
   - 输出到 `.vitepress/dist` 目录

2. **第二阶段（Production）**：
   - 使用 Nginx Alpine 镜像
   - 复制构建产物到 Nginx 目录
   - 配置 Nginx 服务静态文件

### 镜像大小优化

- 使用多阶段构建
- 使用 Alpine 基础镜像
- `.dockerignore` 排除不必要文件
- 最终镜像大小约 50MB

## 生产部署建议

### 1. 使用反向代理

推荐在生产环境使用 Nginx 或 Traefik 作为反向代理：

```nginx
# Nginx 反向代理配置示例
server {
    listen 80;
    server_name docs.cozeplus.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 配置 HTTPS

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
apt-get install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d docs.cozeplus.com
```

### 3. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  docs:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M
```

### 4. 日志管理

配置日志轮转：

```yaml
services:
  docs:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 更新部署

### 自动化更新流程

```bash
#!/bin/bash
# update-docs.sh

cd /path/to/docs
git pull
./deploy.sh rebuild
```

### CI/CD 集成

#### GitHub Actions 示例

```yaml
name: Deploy Docs

on:
  push:
    branches: [ main ]
    paths:
      - 'docs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and push Docker image
        run: |
          cd docs
          docker build -t registry.example.com/coze-plus-docs:latest .
          docker push registry.example.com/coze-plus-docs:latest

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/coze-plus-docs
            docker-compose pull
            docker-compose up -d
```

## 故障排查

### 常见问题

#### 1. 构建失败

```bash
# 清理缓存重新构建
docker-compose build --no-cache
```

#### 2. 端口被占用

```bash
# 检查端口占用
lsof -i :8080

# 修改 .env 文件中的端口
DOCS_PORT=8081
```

#### 3. 查看容器日志

```bash
# 实时查看日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail=100
```

#### 4. 进入容器调试

```bash
# 进入容器 shell
docker-compose exec docs sh

# 检查 Nginx 配置
docker-compose exec docs nginx -t
```

## 监控与维护

### 健康检查

容器已配置健康检查，可通过以下命令查看状态：

```bash
docker-compose ps
```

### 性能监控

使用 Docker stats 监控资源使用：

```bash
docker stats coze-plus-docs
```

### 备份

定期备份构建产物：

```bash
# 导出镜像
docker save coze-plus-docs:latest | gzip > coze-plus-docs-backup.tar.gz

# 恢复镜像
docker load < coze-plus-docs-backup.tar.gz
```

## 文件说明

- `Dockerfile` - Docker 镜像构建文件
- `docker-compose.yml` - Docker Compose 编排文件
- `nginx.conf` - Nginx 配置文件
- `.dockerignore` - Docker 构建忽略文件
- `.env.example` - 环境变量示例文件
- `deploy.sh` - 部署脚本
- `DOCKER_DEPLOY.md` - 本文档

## 技术支持

- 项目主页: https://github.com/coze-plus-dev/coze-plus
- 问题反馈: https://github.com/coze-plus-dev/coze-plus/issues
- 文档站点: http://docs.cozeplus.com

## 许可证

Apache-2.0 License
