import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 请求参数验证
const statusRequestSchema = z.object({
  taskId: z.string().min(1, '任务ID不能为空')
});

/**
 * 查询匿名用户任务状态
 * POST /api/anonymous/trial/status
 */
export async function POST(req: NextRequest) {
  console.log('📊 [ANONYMOUS TRIAL STATUS] ===== 查询任务状态 =====');
  
  try {
    // 1. 解析请求参数
    const body = await req.json();
    console.log('📝 [ANONYMOUS TRIAL STATUS] 请求参数:', { 
      taskId: body.taskId
    });

    // 2. 验证参数
    const validationResult = statusRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [ANONYMOUS TRIAL STATUS] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const { taskId } = validationResult.data;
    console.log('✅ [ANONYMOUS TRIAL STATUS] 参数验证成功:', { taskId });

    // 3. 调用数据库函数查询任务状态
    console.log('🔍 [ANONYMOUS TRIAL STATUS] 调用数据库函数查询任务状态...');
    const { data: statusResult, error: statusError } = await supabaseAdmin
      .rpc('get_anonymous_task_status', {
        p_freepik_task_id: taskId
      });

    if (statusError) {
      console.error('❌ [ANONYMOUS TRIAL STATUS] 数据库查询失败:', statusError);
      return apiResponse.error('查询任务状态失败，请重试');
    }

    console.log('✅ [ANONYMOUS TRIAL STATUS] 任务状态查询结果:', statusResult);
    console.log('🔍 [ANONYMOUS TRIAL STATUS] result_data详情:', JSON.stringify(statusResult.result_data, null, 2));

    if (!statusResult.found) {
      console.log('❌ [ANONYMOUS TRIAL STATUS] 任务不存在');
      return apiResponse.notFound('任务不存在或已过期');
    }

    // 4. 格式化返回数据
    const response = {
      taskId: statusResult.task_id,
      status: statusResult.status,
      result: statusResult.result_data,
      createdAt: statusResult.created_at,
      isCompleted: statusResult.status === 'completed',
      isFailed: statusResult.status === 'failed'
    };

    console.log('🎉 [ANONYMOUS TRIAL STATUS] 返回结果:', response);
    console.log('🎉 [ANONYMOUS TRIAL STATUS] ===== 任务状态查询完成 =====');

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [ANONYMOUS TRIAL STATUS] ===== 查询过程中发生异常 =====');
    console.error('💥 [ANONYMOUS TRIAL STATUS] 错误详情:', error);
    console.error('💥 [ANONYMOUS TRIAL STATUS] 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    
    return apiResponse.serverError('任务状态查询服务内部错误');
  }
}