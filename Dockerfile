# 第一阶段：构建文档
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制所有文档源文件
COPY . .

# 构建 VitePress 文档
RUN npm run docs:build

# 第二阶段：使用 Nginx 服务文档
FROM nginx:1.27-alpine

# 复制构建好的文档到 Nginx
COPY --from=builder /app/.vitepress/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
