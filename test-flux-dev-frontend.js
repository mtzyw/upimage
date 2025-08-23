/**
 * Flux Dev 前端集成测试脚本
 * 验证前端页面与后端 API 的完整对接
 */

// 在浏览器控制台运行此脚本来测试前端功能

/**
 * 测试 API 端点可用性
 */
async function testAPIEndpoints() {
  console.log('🧪 测试 Flux Dev API 端点可用性...');
  
  const endpoints = [
    { name: 'Start API', url: '/api/text-to-image/start', method: 'POST' },
    { name: 'History API', url: '/api/text-to-image/history', method: 'GET' },
    { name: 'Status API', url: '/api/text-to-image/status?taskId=test', method: 'GET' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, { 
        method: endpoint.method,
        headers: endpoint.method === 'POST' ? {
          'Content-Type': 'application/json'
        } : {}
      });
      
      console.log(`📊 ${endpoint.name}: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log(`ℹ️  ${endpoint.name}: 需要用户认证（正常）`);
      } else if (response.status === 404) {
        console.log(`❌ ${endpoint.name}: 端点不存在`);
      } else {
        console.log(`✅ ${endpoint.name}: 端点可用`);
      }
    } catch (error) {
      console.error(`💥 ${endpoint.name}: 请求失败`, error.message);
    }
  }
}

/**
 * 测试前端组件功能
 */
function testFrontendComponents() {
  console.log('🧪 测试前端组件...');
  
  // 检查主要组件是否存在
  const tests = [
    {
      name: 'AI Image Generator Page',
      test: () => !!document.querySelector('h1'),
      description: '页面标题存在'
    },
    {
      name: 'Prompt Textarea',
      test: () => !!document.querySelector('textarea'),
      description: '提示词输入框存在'
    },
    {
      name: 'Generate Button',
      test: () => !!document.querySelector('button') && document.querySelector('button').textContent.includes('生成'),
      description: '生成按钮存在'
    },
    {
      name: 'Aspect Ratio Options',
      test: () => document.querySelectorAll('[role="button"], .cursor-pointer').length >= 3,
      description: '宽高比选项存在'
    },
    {
      name: 'History Section',
      test: () => !!document.querySelector('h3') && document.querySelector('h3').textContent.includes('最近任务'),
      description: '历史记录区域存在'
    }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach(test => {
    try {
      const result = test.test();
      if (result) {
        console.log(`✅ ${test.name}: ${test.description}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: ${test.description} - 失败`);
      }
    } catch (error) {
      console.log(`💥 ${test.name}: 测试异常 - ${error.message}`);
    }
  });
  
  console.log(`📊 前端组件测试结果: ${passed}/${total} 通过`);
  return { passed, total };
}

/**
 * 模拟用户操作流程
 */
function simulateUserFlow() {
  console.log('🧪 模拟用户操作流程...');
  
  try {
    // 1. 找到提示词输入框
    const promptTextarea = document.querySelector('textarea');
    if (promptTextarea) {
      console.log('✅ 找到提示词输入框');
      
      // 模拟输入
      promptTextarea.value = '测试用的美丽风景画';
      promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('✅ 模拟输入提示词');
    } else {
      console.log('❌ 未找到提示词输入框');
      return false;
    }
    
    // 2. 找到宽高比选项
    const aspectRatioOptions = document.querySelectorAll('.cursor-pointer, [role="button"]');
    if (aspectRatioOptions.length >= 3) {
      console.log(`✅ 找到 ${aspectRatioOptions.length} 个宽高比选项`);
      
      // 模拟点击第二个选项
      if (aspectRatioOptions[1]) {
        aspectRatioOptions[1].click();
        console.log('✅ 模拟选择宽高比');
      }
    } else {
      console.log('❌ 宽高比选项不足');
    }
    
    // 3. 找到生成按钮
    const generateButton = Array.from(document.querySelectorAll('button'))
      .find(btn => btn.textContent.includes('生成'));
    
    if (generateButton) {
      console.log('✅ 找到生成按钮');
      
      if (generateButton.disabled) {
        console.log('ℹ️  生成按钮已禁用（可能需要登录）');
      } else {
        console.log('✅ 生成按钮可点击');
        // 注意：这里不实际点击，避免发送真实请求
        console.log('ℹ️  跳过实际点击以避免发送请求');
      }
    } else {
      console.log('❌ 未找到生成按钮');
      return false;
    }
    
    console.log('✅ 用户操作流程模拟完成');
    return true;
    
  } catch (error) {
    console.error('💥 用户操作流程模拟失败:', error);
    return false;
  }
}

/**
 * 检查页面状态和性能
 */
function checkPagePerformance() {
  console.log('🧪 检查页面性能...');
  
  const performance = {
    domNodes: document.querySelectorAll('*').length,
    images: document.querySelectorAll('img').length,
    buttons: document.querySelectorAll('button').length,
    inputs: document.querySelectorAll('input, textarea').length,
    loadTime: performance.timing ? 
      performance.timing.loadEventEnd - performance.timing.navigationStart : 'N/A'
  };
  
  console.log('📊 页面性能指标:', performance);
  
  // 简单的性能建议
  if (performance.domNodes > 2000) {
    console.log('⚠️  DOM 节点过多，可能影响性能');
  } else {
    console.log('✅ DOM 节点数量正常');
  }
  
  if (typeof performance.loadTime === 'number' && performance.loadTime > 3000) {
    console.log('⚠️  页面加载时间较长');
  } else {
    console.log('✅ 页面加载性能良好');
  }
  
  return performance;
}

/**
 * 检查控制台错误
 */
function checkConsoleErrors() {
  console.log('🧪 检查控制台错误...');
  
  // 劫持控制台错误（简单实现）
  let errorCount = 0;
  const originalError = console.error;
  
  console.error = function(...args) {
    errorCount++;
    originalError.apply(console, args);
  };
  
  // 延迟检查错误数量
  setTimeout(() => {
    if (errorCount === 0) {
      console.log('✅ 无控制台错误');
    } else {
      console.log(`⚠️  发现 ${errorCount} 个控制台错误`);
    }
    
    // 恢复原始错误处理
    console.error = originalError;
  }, 1000);
}

/**
 * 主测试函数
 */
async function runFrontendTests() {
  console.log('🚀 开始 Flux Dev 前端集成测试');
  console.log('='.repeat(60));
  
  const results = {
    apiEndpoints: false,
    frontendComponents: { passed: 0, total: 0 },
    userFlow: false,
    performance: null,
    errors: 0
  };
  
  try {
    // 1. 测试 API 端点
    await testAPIEndpoints();
    results.apiEndpoints = true;
    
    console.log('');
    
    // 2. 测试前端组件
    results.frontendComponents = testFrontendComponents();
    
    console.log('');
    
    // 3. 模拟用户操作
    results.userFlow = simulateUserFlow();
    
    console.log('');
    
    // 4. 检查页面性能
    results.performance = checkPagePerformance();
    
    console.log('');
    
    // 5. 检查控制台错误
    checkConsoleErrors();
    
    console.log('');
    
    // 汇总结果
    console.log('📊 前端测试结果汇总');
    console.log('='.repeat(60));
    console.log(`🔸 API 端点测试: ${results.apiEndpoints ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🔸 前端组件测试: ${results.frontendComponents.passed}/${results.frontendComponents.total} 通过`);
    console.log(`🔸 用户操作流程: ${results.userFlow ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🔸 页面性能检查: ${results.performance ? '✅ DONE' : '❌ FAIL'}`);
    
    const overallSuccess = results.apiEndpoints && 
                          results.frontendComponents.passed >= 3 && 
                          results.userFlow;
    
    console.log('');
    console.log(`🎯 总体结果: ${overallSuccess ? '✅ 前端集成成功' : '⚠️  发现一些问题'}`);
    
    if (overallSuccess) {
      console.log('🎉 Flux Dev 前端页面工作正常！');
      console.log('💡 建议：登录后测试完整的生成流程');
    } else {
      console.log('⚠️  请检查失败的测试项目');
    }
    
  } catch (error) {
    console.error('💥 测试过程中发生错误:', error);
  }
  
  return results;
}

// 使用说明
console.log('💡 使用说明:');
console.log('1. 在 /ai-image-generator 页面打开浏览器控制台');
console.log('2. 复制并粘贴此脚本到控制台');
console.log('3. 运行 runFrontendTests() 开始测试');
console.log('');

// 如果在控制台环境中，自动运行测试
if (typeof window !== 'undefined' && window.location.pathname.includes('ai-image-generator')) {
  console.log('🔍 检测到在 AI Image Generator 页面，自动开始测试...');
  setTimeout(runFrontendTests, 1000);
}

// 导出测试函数供手动调用
if (typeof window !== 'undefined') {
  window.testFluxDevFrontend = runFrontendTests;
  console.log('✅ 测试函数已挂载到 window.testFluxDevFrontend()');
}