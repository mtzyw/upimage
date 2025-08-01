#!/usr/bin/env node

// 测试 webhook 处理流程的调试脚本
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testWebhook() {
  console.log('=== Freepik Webhook 调试工具 ===\n');

  const taskId = await new Promise((resolve) => {
    rl.question('请输入任务 ID (task_id): ', resolve);
  });

  const imageUrl = await new Promise((resolve) => {
    rl.question('请输入增强后的图片 URL (可选，直接回车跳过): ', (answer) => {
      resolve(answer || null);
    });
  });

  const webhookUrl = process.env.NEXT_PUBLIC_SITE_URL 
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/freepik`
    : await new Promise((resolve) => {
        rl.question('请输入 webhook URL: ', resolve);
      });

  // 构建测试 payload
  const payload = {
    task_id: taskId,
    status: 'COMPLETED',
    generated: imageUrl ? [imageUrl] : ['https://example.com/enhanced-image.jpg']
  };

  console.log('\n准备发送的 webhook payload:');
  console.log(JSON.stringify(payload, null, 2));

  const confirm = await new Promise((resolve) => {
    rl.question('\n确认发送? (y/n): ', (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });

  if (!confirm) {
    console.log('已取消');
    rl.close();
    return;
  }

  try {
    console.log(`\n正在发送 webhook 到: ${webhookUrl}`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Freepik-Webhook-Debug/1.0'
      },
      body: JSON.stringify(payload)
    });

    console.log(`\n响应状态: ${response.status} ${response.statusText}`);
    
    const responseData = await response.json();
    console.log('响应数据:');
    console.log(JSON.stringify(responseData, null, 2));

    // 等待一下让处理完成
    console.log('\n等待 3 秒后检查任务状态...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查任务状态
    const statusUrl = webhookUrl.replace('/webhook/freepik', `/enhance/status?taskId=${taskId}`);
    console.log(`\n检查任务状态: ${statusUrl}`);
    
    const statusResponse = await fetch(statusUrl);
    const statusData = await statusResponse.json();
    
    console.log('任务状态:');
    console.log(JSON.stringify(statusData, null, 2));

  } catch (error) {
    console.error('\n错误:', error.message);
  }

  rl.close();
}

// 检查是否在 Next.js 项目目录中
const fs = require('fs');
if (!fs.existsSync('./package.json')) {
  console.error('请在 Next.js 项目根目录运行此脚本');
  process.exit(1);
}

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

testWebhook().catch(console.error);