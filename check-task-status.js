#!/usr/bin/env node

// 检查任务状态的调试脚本
const { createClient } = require('@supabase/supabase-js');

async function checkTaskStatus() {
  const taskId = process.argv[2];
  
  if (!taskId) {
    console.error('用法: node check-task-status.js <task_id>');
    process.exit(1);
  }

  // 加载环境变量
  require('dotenv').config({ path: '.env.local' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log(`\n检查任务 ID: ${taskId}\n`);

  try {
    // 1. 从数据库获取任务信息
    const { data: task, error } = await supabase
      .from('image_enhancement_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      console.error('数据库查询错误:', error);
      return;
    }

    if (!task) {
      console.log('❌ 任务不存在于数据库中');
      return;
    }

    console.log('📋 任务信息:');
    console.log('- 状态:', task.status);
    console.log('- 用户 ID:', task.user_id);
    console.log('- 创建时间:', task.created_at);
    console.log('- 完成时间:', task.completed_at || '未完成');
    console.log('- 原图 R2 Key:', task.r2_original_key);
    console.log('- 优化图 R2 Key:', task.r2_optimized_key || '无');
    console.log('- CDN URL:', task.cdn_url || '无');
    console.log('- 错误信息:', task.error_message || '无');
    console.log('- API Key ID:', task.api_key_id);
    console.log('- 消耗积分:', task.credits_consumed);

    // 2. 检查 API Key 状态
    if (task.api_key_id) {
      const { data: apiKey, error: keyError } = await supabase
        .from('freepik_api_keys')
        .select('*')
        .eq('id', task.api_key_id)
        .single();

      if (!keyError && apiKey) {
        console.log('\n🔑 API Key 信息:');
        console.log('- 名称:', apiKey.name);
        console.log('- 今日已用:', apiKey.used_today);
        console.log('- 每日限制:', apiKey.daily_limit);
        console.log('- 是否激活:', apiKey.is_active);
      }
    }

    // 3. 检查 Redis 状态（如果配置了）
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const Redis = require('@upstash/redis').Redis;
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      });

      console.log('\n📦 Redis 缓存状态:');
      
      try {
        const [status, cdnUrl, error, userId, apiKeyId, r2Key] = await Promise.all([
          redis.get(`task:${taskId}:status`),
          redis.get(`task:${taskId}:cdn_url`),
          redis.get(`task:${taskId}:error`),
          redis.get(`task:${taskId}:user_id`),
          redis.get(`task:${taskId}:api_key_id`),
          redis.get(`task:${taskId}:r2_key`)
        ]);

        console.log('- 缓存状态:', status || '无');
        console.log('- 缓存 CDN URL:', cdnUrl || '无');
        console.log('- 缓存错误:', error || '无');
        console.log('- 缓存用户 ID:', userId || '无');
        console.log('- 缓存 API Key ID:', apiKeyId || '无');
        console.log('- 缓存 R2 Key:', r2Key || '无');
      } catch (redisError) {
        console.log('- Redis 查询失败:', redisError.message);
      }
    }

    // 4. 生成测试 webhook 命令
    console.log('\n🔧 测试 webhook 命令:');
    console.log(`node test-webhook-debug.js`);
    console.log(`任务 ID: ${taskId}`);
    
    if (task.status === 'processing') {
      console.log('\n⚠️  任务仍在处理中，可能需要等待 Freepik 完成处理');
    }

  } catch (error) {
    console.error('错误:', error);
  }
}

checkTaskStatus();