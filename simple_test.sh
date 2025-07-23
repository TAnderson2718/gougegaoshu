#!/bin/bash
echo "🧪 简单网络测试"
echo "=================="

echo "1. 本地测试:"
curl -s -m 5 http://localhost:3001/health && echo "✅ 本地后端正常" || echo "❌ 本地后端失败"
curl -s -m 5 -I http://localhost/ && echo "✅ 本地前端正常" || echo "❌ 本地前端失败"

echo ""
echo "2. 远程测试:"
curl -s -m 10 http://114.92.153.131:3001/health && echo "✅ 远程后端正常" || echo "❌ 远程后端失败"
curl -s -m 10 -I http://114.92.153.131/ && echo "✅ 远程前端正常" || echo "❌ 远程前端失败"

echo ""
echo "3. API测试:"
curl -s -m 10 -X POST http://114.92.153.131:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "ST001", "password": "Hello888"}' && echo "✅ API正常" || echo "❌ API失败"
