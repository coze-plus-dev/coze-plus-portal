# 第一阶段：构建文档
FROM node:22-alpine AS builder

# 指定构建过程中的工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制所有文档源文件
COPY . .

# 构建 VitePress 文档
RUN npm run docs:build

# 第二阶段：使用 Alpine 基础镜像服务文档
FROM alpine:3.13

WORKDIR /opt/application

# 安装 Nginx
RUN apk add --no-cache nginx

# 复制构建好的文档到 Nginx
COPY --from=builder /app/.vitepress/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制启动脚本
COPY run.sh /opt/application/

USER root

# 设置启动脚本执行权限
RUN chmod -R 777 /opt/application/run.sh

# 暴露端口
EXPOSE 80

# 使用启动脚本启动服务
CMD /opt/application/run.sh
