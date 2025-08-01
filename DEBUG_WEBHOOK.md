# Webhook 调试指南

## 问题诊断步骤

### 1. 检查任务状态
使用以下命令检查特定任务的当前状态：

```bash
node check-task-status.js <任务ID>
```

这将显示：
- 数据库中的任务状态
- API Key 使用情况
- Redis 缓存状态（如果配置）
- 任务的完整信息

### 2. 手动测试 Webhook
使用交互式脚本测试 webhook 处理：

```bash
node test-webhook-debug.js
```

脚本会提示你输入：
- 任务 ID
- 图片 URL（可选）
- Webhook URL（如果未设置环境变量）

### 3. 常见问题排查

#### 问题：Webhook 收到 COMPLETED 但状态未更新

可能原因：
1. **任务 ID 不匹配**：Freepik 返回的 task_id 与数据库中的不一致
2. **图片 URL 提取失败**：Freepik 返回的数据格式与预期不同
3. **数据库更新失败**：可能有约束冲突或权限问题

#### 问题：Redis 和数据库状态不一致

解决方案：
- 检查 Redis 连接是否正常
- 确认 Redis 缓存过期时间设置正确
- 使用 `check-task-status.js` 比对两者状态

### 4. 日志分析

在 webhook 处理中已添加详细日志，关注以下关键点：

1. **[getTaskInfo]** - 任务信息获取
2. **[handleTaskCompleted]** - 完成处理流程
3. **图片 URL 提取** - 检查 `generated` 数组处理
4. **数据库更新** - 状态更新是否成功

### 5. Freepik API 响应格式

预期的 COMPLETED 状态响应格式：
```json
{
  "task_id": "xxx-xxx-xxx",
  "status": "COMPLETED",
  "generated": ["https://cdn.freepik.com/enhanced/xxx.jpg"]
}
```

或者：
```json
{
  "task_id": "xxx-xxx-xxx", 
  "status": "COMPLETED",
  "image_url": "https://cdn.freepik.com/enhanced/xxx.jpg"
}
```

### 6. 快速修复清单

- [ ] 确认 webhook URL 公开可访问
- [ ] 检查数据库中任务记录存在
- [ ] 验证 API Key 未被锁定
- [ ] 确认 Freepik 响应格式正确
- [ ] 检查 R2 存储配置正常

### 7. 测试命令示例

```bash
# 检查最近创建的任务
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
supabase.from('image_enhancement_tasks')
  .select('id, status, created_at')
  .order('created_at', { ascending: false })
  .limit(5)
  .then(({ data }) => console.table(data));
"
```