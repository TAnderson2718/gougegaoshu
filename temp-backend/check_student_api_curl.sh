#!/bin/bash

echo "🔍 检查学生端API返回的任务数据"
echo ""

# 学生登录获取token
echo "🔐 学生登录..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"studentId":"ST001","password":"Hello888"}')

echo "登录响应: $LOGIN_RESPONSE"

# 提取token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取token"
  exit 1
fi

echo "✅ 学生登录成功，token: ${TOKEN:0:20}..."
echo ""

# 获取7月1-10日的任务数据
echo "📊 获取学生端7月1-10日任务数据..."
TASKS_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/tasks?startDate=2025-07-01&endDate=2025-07-10" \
  -H "Authorization: Bearer $TOKEN")

echo "任务数据响应:"
echo "$TASKS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TASKS_RESPONSE"
