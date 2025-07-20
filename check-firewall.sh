#!/bin/bash

echo "🛡️ 检查防火墙状态..."

# 检查端口是否开放
echo "检查端口开放状态:"

# 检查3000端口
if netstat -tuln | grep -q ":3000 "; then
    echo "✅ 端口3000已监听"
else
    echo "⚠️ 端口3000未监听"
fi

# 检查3001端口  
if netstat -tuln | grep -q ":3001 "; then
    echo "✅ 端口3001已监听"
else
    echo "⚠️ 端口3001未监听"
fi

# 检查80端口
if netstat -tuln | grep -q ":80 "; then
    echo "✅ 端口80已监听"
else
    echo "⚠️ 端口80未监听"
fi

echo ""
echo "当前监听的端口:"
netstat -tuln | grep LISTEN

echo ""
echo "🔧 防火墙配置建议:"
echo "请在腾讯云控制台安全组中添加以下规则:"
echo "- 端口3000 (TCP) - React前端"
echo "- 端口3001 (TCP) - Express后端"
echo ""
echo "当前腾讯云安全组已开放的端口:"
echo "- 22 (SSH)"
echo "- 80 (HTTP)" 
echo "- 443 (HTTPS)"
echo "- 3389 (Windows远程桌面)"
echo ""
echo "需要添加:"
echo "- 3000 (React前端)"
echo "- 3001 (Express后端)"
