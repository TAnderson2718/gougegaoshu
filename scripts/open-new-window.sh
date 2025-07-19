#!/bin/bash

# 强制在新窗口中打开浏览器
# 使用方法: ./scripts/open-new-window.sh <URL>

URL="$1"

if [ -z "$URL" ]; then
    echo "❌ 错误: 请提供要打开的URL"
    echo "使用方法: $0 <URL>"
    exit 1
fi

echo "🌐 在新窗口中打开: $URL"

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "🍎 检测到 macOS，使用 Chrome 新窗口..."
    open -n -a "Google Chrome" --args --new-window "$URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "🐧 检测到 Linux，使用 Chrome 新窗口..."
    google-chrome --new-window "$URL" &
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    echo "🪟 检测到 Windows，使用 Chrome 新窗口..."
    start chrome --new-window "$URL"
else
    echo "❓ 未知操作系统，尝试默认浏览器..."
    xdg-open "$URL"
fi

echo "✅ 浏览器已启动"
