#!/bin/bash

# 简化版 Augment 浏览器管理
# 使用 Chrome 的 --user-data-dir 来创建独立会话

URL="$1"
SESSION_DIR="/tmp/augment-chrome-session"

if [ -z "$URL" ]; then
    echo "❌ 错误: 请提供要打开的URL"
    echo "使用方法: $0 <URL>"
    exit 1
fi

echo "🌐 Augment 浏览器: $URL"

# 检测操作系统并启动浏览器
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "🍎 在 macOS 上启动 Chrome..."
    open -a "Google Chrome" --args \
        --user-data-dir="$SESSION_DIR" \
        --window-position=200,100 \
        --window-size=1400,900 \
        --no-first-run \
        --no-default-browser-check \
        "$URL"

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "🐧 在 Linux 上启动 Chrome..."
    google-chrome \
        --user-data-dir="$SESSION_DIR" \
        --window-position=200,100 \
        --window-size=1400,900 \
        --no-first-run \
        --no-default-browser-check \
        "$URL" &

else
    # Windows 或其他
    echo "🪟 启动浏览器..."
    start chrome \
        --user-data-dir="$SESSION_DIR" \
        --no-first-run \
        --no-default-browser-check \
        "$URL"
fi

echo "✅ 浏览器已启动"
echo "💡 提示: 所有通过此脚本打开的页面都会在同一个浏览器会话中"
