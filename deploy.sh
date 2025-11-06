#!/bin/bash
#
# Copyright 2025 coze-plus Authors  
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#


# Coze Plus 文档站点 Docker 部署脚本
# 用法: ./deploy.sh [build|start|stop|restart|logs|clean]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境变量文件
check_env() {
    if [ ! -f ".env" ]; then
        log_info "创建 .env 文件..."
        cp .env.example .env 2>/dev/null || echo "DOCS_PORT=8080" > .env
    fi
}

# 构建镜像
build() {
    log_info "构建文档站点镜像..."
    docker-compose build --no-cache
    log_info "✓ 镜像构建完成"
}

# 启动服务
start() {
    log_info "启动文档站点..."
    check_env
    docker-compose up -d

    sleep 3

    PORT=$(grep DOCS_PORT .env 2>/dev/null | cut -d'=' -f2 || echo "8080")
    log_info "========================================="
    log_info "文档站点已启动！"
    log_info "========================================="
    log_info "访问地址: http://localhost:${PORT}"
    log_info "========================================="
}

# 停止服务
stop() {
    log_info "停止文档站点..."
    docker-compose down
    log_info "✓ 服务已停止"
}

# 重启服务
restart() {
    log_info "重启文档站点..."
    docker-compose restart
    log_info "✓ 服务已重启"
}

# 查看日志
logs() {
    docker-compose logs -f --tail=100
}

# 清理
clean() {
    log_warn "警告: 此操作将删除容器和镜像"
    read -p "确认清理？(yes/no): " -r
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "清理中..."
        docker-compose down --rmi all -v
        log_info "✓ 清理完成"
    else
        log_info "取消清理"
    fi
}

# 重新构建并启动
rebuild() {
    log_info "重新构建并启动..."
    stop
    build
    start
}

# 主函数
main() {
    case "${1:-start}" in
        build)
            build
            ;;
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        logs)
            logs
            ;;
        clean)
            clean
            ;;
        rebuild)
            rebuild
            ;;
        *)
            log_error "未知命令: $1"
            echo ""
            echo "用法: $0 {build|start|stop|restart|logs|clean|rebuild}"
            echo ""
            echo "命令说明:"
            echo "  build    - 构建 Docker 镜像"
            echo "  start    - 启动文档站点"
            echo "  stop     - 停止文档站点"
            echo "  restart  - 重启文档站点"
            echo "  logs     - 查看日志"
            echo "  clean    - 清理容器和镜像"
            echo "  rebuild  - 重新构建并启动"
            exit 1
            ;;
    esac
}

main "$@"
