#!/bin/bash

# 完全干净的 Augment 浏览器启动脚本
# 不使用任何可能被标记为"不受支持"的命令行参数

URL="$1"
SESSION_DIR="/tmp/augment-chrome-session"

if [ -z "$URL" ]; then
    echo "❌ 错误: 请提供要打开的URL"
    echo "使用方法: $0 <URL>"
    exit 1
fi

echo "🌐 Augment 浏览器 (干净模式): $URL"

# 确保会话目录存在
mkdir -p "$SESSION_DIR"

# 检测操作系统并启动浏览器
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - 使用最简单的方式
    echo "🍎 在 macOS 上启动 Chrome (干净模式)..."
    open -a "Google Chrome" --args \
        --user-data-dir="$SESSION_DIR" \
        "$URL"
        
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "🐧 在 Linux 上启动 Chrome (干净模式)..."
    google-chrome \
        --user-data-dir="$SESSION_DIR" \
        "$URL" &
        
else
    # Windows 或其他
    echo "🪟 启动浏览器 (干净模式)..."
    start chrome \
        --user-data-dir="$SESSION_DIR" \
        "$URL"
fi

echo "✅ 浏览器已启动 (无警告模式)"
echo "💡 提示: 使用独立会话，所有页面都会在同一个浏览器实例中打开"
