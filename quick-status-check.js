#!/usr/bin/env node

const taskId = process.argv[2];
if (!taskId) {
  console.error('Usage: node quick-status-check.js <task_id>');
  process.exit(1);
}

async function checkStatus() {
  const response = await fetch(`https://9v5cw2q3-3000.asse.devtunnels.ms/api/enhance/status?taskId=${taskId}`, {
    headers: {
      // Add auth headers if needed
    }
  });
  
  const data = await response.json();
  console.log('API Response:', JSON.stringify(data, null, 2));
}

checkStatus().catch(console.error);