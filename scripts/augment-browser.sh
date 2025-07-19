#!/bin/bash

# Augment 智能浏览器管理脚本
# 首次调用：创建新的专用浏览器窗口
# 后续调用：在专用窗口中打开新标签页

URL="$1"
SESSION_DIR="/tmp/augment-chrome-session"
PID_FILE="/tmp/augment-chrome.pid"

if [ -z "$URL" ]; then
    echo "❌ 错误: 请提供要打开的URL"
    echo "使用方法: $0 <URL>"
    exit 1
fi

echo "🌐 Augment 浏览器管理: $URL"

# 检查是否已有 Augment 专用浏览器窗口运行
check_augment_browser() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "✅ 发现现有 Augment 浏览器会话 (PID: $pid)"
            return 0
        else
            echo "🧹 清理过期的 PID 文件"
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# 在现有窗口中打开新标签页
open_new_tab() {
    echo "📑 在现有 Augment 窗口中打开新标签页..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - 使用 AppleScript 在现有窗口中打开新标签
        osascript -e "
        tell application \"Google Chrome\"
            set found to false
            repeat with w in windows
                repeat with t in tabs of w
                    if URL of t contains \"augment-session\" or title of t contains \"Augment\" then
                        set found to true
                        tell w to make new tab with properties {URL:\"$URL\"}
                        set active tab index of w to (count of tabs of w)
                        activate
                        exit repeat
                    end if
                end repeat
                if found then exit repeat
            end repeat
            if not found then
                make new window with properties {URL:\"$URL\"}
            end if
        end tell"
    else
        # Linux/Windows - 使用 Chrome 远程调试接口
        google-chrome --user-data-dir="$SESSION_DIR" "$URL" 2>/dev/null &
    fi
}

# 创建新的专用浏览器窗口
create_new_session() {
    echo "🆕 创建新的 Augment 专用浏览器窗口..."
    
    # 清理旧的会话数据
    rm -rf "$SESSION_DIR"
    mkdir -p "$SESSION_DIR"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open -n -a "Google Chrome" --args \
            --new-window \
            --user-data-dir="$SESSION_DIR" \
            --window-position=200,100 \
            --window-size=1400,900 \
            --disable-web-security \
            --disable-features=VizDisplayCompositor \
            "$URL" &
        
        local chrome_pid=$!
        echo $chrome_pid > "$PID_FILE"
        echo "✅ Augment 浏览器会话已启动 (PID: $chrome_pid)"
        
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        google-chrome \
            --new-window \
            --user-data-dir="$SESSION_DIR" \
            --window-position=200,100 \
            --window-size=1400,900 \
            "$URL" &
        
        local chrome_pid=$!
        echo $chrome_pid > "$PID_FILE"
        echo "✅ Augment 浏览器会话已启动 (PID: $chrome_pid)"
        
    else
        # Windows/其他
        echo "🪟 启动浏览器..."
        start chrome \
            --new-window \
            --user-data-dir="$SESSION_DIR" \
            "$URL"
    fi
}

# 主逻辑
if check_augment_browser; then
    open_new_tab
else
    create_new_session
fi

echo "🎯 浏览器操作完成"
