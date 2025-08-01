#!/bin/bash

# Webhook 日志监控脚本

echo "=== Freepik Webhook 日志监控 ==="
echo "监控以下关键词:"
echo "- FREEPIK WEBHOOK RECEIVED"
echo "- handleTaskCompleted"
echo "- setTaskStatus"
echo "- Error/error"
echo ""
echo "按 Ctrl+C 退出"
echo "================================"
echo ""

# 如果在开发模式下运行，监控控制台输出
if [ "$1" == "dev" ]; then
    echo "监控开发服务器输出..."
    npm run dev 2>&1 | grep -E "(FREEPIK WEBHOOK|handleTaskCompleted|setTaskStatus|[Ee]rror|COMPLETED|completed)" --line-buffered
else
    echo "提示：使用 './monitor-webhook.sh dev' 在开发模式下监控"
    echo ""
    echo "手动触发 webhook 测试："
    echo "node test-webhook-debug.js"
fi