# Webhook 调试增强总结

## 已完成的改进

### 1. 增强的日志记录
- **Webhook 入口**：记录所有请求头、原始请求体、时间戳
- **Payload 处理**：详细记录解析后的数据结构
- **图片 URL 提取**：记录 `generated` 数组的处理过程
- **数据库更新**：记录更新前后的数据状态

### 2. 调试工具
创建了三个调试工具：

#### `check-task-status.js`
检查任务的完整状态：
```bash
node check-task-status.js <任务ID>
```

#### `test-webhook-debug.js`
手动触发 webhook 测试：
```bash
node test-webhook-debug.js
```

#### `monitor-webhook.sh`
实时监控 webhook 日志：
```bash
./monitor-webhook.sh dev
```

### 3. 代码改进

#### Webhook 处理器增强
- 支持 `COMPLETED` 状态（除了 `DONE`）
- 改进图片 URL 提取逻辑，支持多种响应格式
- 增加详细的错误处理和日志

#### 数据库更新增强
- 返回更新后的记录以便验证
- 记录更新失败的详细信息

## 下一步调试步骤

1. **运行开发服务器并监控日志**：
   ```bash
   ./monitor-webhook.sh dev
   ```

2. **触发新的图片增强任务**，观察日志中的：
   - API 调用是否成功
   - 任务 ID 是否正确创建
   - Webhook URL 是否正确

3. **当收到 webhook 时**，检查日志中的：
   - `===== FREEPIK WEBHOOK RECEIVED =====`
   - Payload 内容和格式
   - 图片 URL 提取过程
   - 数据库更新结果

4. **使用调试工具验证**：
   ```bash
   # 检查任务状态
   node check-task-status.js <任务ID>
   
   # 如果状态未更新，手动测试 webhook
   node test-webhook-debug.js
   ```

## 可能的问题和解决方案

### 1. Freepik 响应格式不一致
- 已增强图片 URL 提取逻辑
- 支持 `image_url` 和 `generated` 数组
- 记录原始 payload 以便分析

### 2. 数据库更新失败
- 检查是否有列名错误
- 验证 RLS 策略是否允许更新
- 查看详细的错误日志

### 3. Redis 缓存问题
- 确认 Redis 连接正常
- 检查缓存键是否正确
- 验证过期时间设置

### 4. 任务 ID 不匹配
- 确保 Freepik 返回的 task_id 与数据库中一致
- 检查任务创建时的日志

## 监控命令汇总

```bash
# 查看最近的任务
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
supabase.from('image_enhancement_tasks')
  .select('id, status, created_at, completed_at')
  .order('created_at', { ascending: false })
  .limit(5)
  .then(({ data }) => console.table(data));
"

# 查看处理中的任务
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
supabase.from('image_enhancement_tasks')
  .select('id, status, created_at')
  .eq('status', 'processing')
  .then(({ data }) => console.table(data));
"
```

通过这些增强的日志和工具，应该能够准确定位 webhook 处理失败的原因。