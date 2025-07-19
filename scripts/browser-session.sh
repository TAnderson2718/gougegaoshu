#!/bin/bash

# Augment 浏览器会话管理命令
# 使用方法:
#   ./scripts/browser-session.sh start <URL>    # 启动或打开URL
#   ./scripts/browser-session.sh cleanup       # 清理会话
#   ./scripts/browser-session.sh status        # 查看状态

ACTION="$1"
URL="$2"

case "$ACTION" in
    "start")
        if [ -z "$URL" ]; then
            echo "❌ 错误: 请提供URL"
            echo "使用方法: $0 start <URL>"
            exit 1
        fi
        echo "🚀 启动 Augment 浏览器会话..."
        node scripts/augment-browser.js "$URL"
        ;;
    
    "cleanup")
        echo "🧹 清理 Augment 浏览器会话..."
        node scripts/augment-browser.js "" cleanup
        ;;
    
    "status")
        echo "📊 检查 Augment 浏览器会话状态..."
        PID_FILE="/tmp/augment-chrome.pid"
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if ps -p "$PID" > /dev/null 2>&1; then
                echo "✅ Augment 浏览器会话正在运行 (PID: $PID)"
            else
                echo "❌ PID 文件存在但进程未运行"
            fi
        else
            echo "❌ 没有活跃的 Augment 浏览器会话"
        fi
        ;;
    
    "test")
        echo "🧪 测试 Augment 浏览器管理..."
        echo "1. 启动管理员界面..."
        node scripts/augment-browser.js "http://localhost:3000/admin"
        sleep 2
        echo "2. 打开学生界面..."
        node scripts/augment-browser.js "http://localhost:3000/"
        ;;
    
    *)
        echo "Augment 浏览器会话管理"
        echo ""
        echo "使用方法:"
        echo "  $0 start <URL>     启动会话并打开URL"
        echo "  $0 cleanup         清理会话"
        echo "  $0 status          查看会话状态"
        echo "  $0 test            测试功能"
        echo ""
        echo "示例:"
        echo "  $0 start http://localhost:3000/admin"
        echo "  $0 cleanup"
        ;;
esac
