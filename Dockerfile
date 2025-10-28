# ========================================
# Stage 1: Build VitePress documentation
# ========================================
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖配置文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN npm ci

# 复制所有文档源文件
COPY . .

# 构建 VitePress 站点
# 输出目录: .vitepress/dist
RUN npm run docs:build

# ========================================
# Stage 2: Nginx server for static files
# ========================================
FROM alpine:3.13

WORKDIR /opt/application

# 安装 Nginx 和健康检查工具
RUN apk add --no-cache nginx curl

# 创建 Nginx 运行时必需的目录
RUN mkdir -p /run/nginx \
    && mkdir -p /var/log/nginx \
    && mkdir -p /var/lib/nginx/tmp \
    && mkdir -p /usr/share/nginx/html \
    && chown -R nginx:nginx /run/nginx /var/log/nginx /var/lib/nginx /usr/share/nginx/html

# 复制 VitePress 构建产物到 Nginx 服务目录
# VitePress 默认输出: .vitepress/dist
COPY --from=builder /app/.vitepress/dist /usr/share/nginx/html

# 复制 VitePress 优化的 Nginx 配置
COPY nginx.conf /etc/nginx/http.d/default.conf

# 复制启动脚本
COPY run.sh /opt/application/
RUN chmod +x /opt/application/run.sh

# 使用 root 用户运行（某些环境需要）
USER root

# 暴露 HTTP 端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# 启动 Nginx
CMD ["/opt/application/run.sh"]
