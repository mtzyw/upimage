import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 请求参数验证 - 支持批量查询
const statusRequestSchema = z.object({
  batchId: z.string().min(1, '批量任务ID不能为空')
});

/**
 * 查询匿名用户批量任务状态
 * POST /api/anonymous/trial/status
 */
export async function POST(req: NextRequest) {
  console.log('📊 [ANONYMOUS BATCH TRIAL STATUS] ===== 查询批量任务状态 =====');
  
  try {
    // 1. 解析请求参数
    const body = await req.json();
    console.log('📝 [ANONYMOUS BATCH TRIAL STATUS] 请求参数:', { 
      batchId: body.batchId
    });

    // 2. 验证参数
    const validationResult = statusRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [ANONYMOUS BATCH TRIAL STATUS] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const { batchId } = validationResult.data;
    console.log('✅ [ANONYMOUS BATCH TRIAL STATUS] 参数验证成功:', { batchId });

    // 3. 调用数据库函数查询批量任务状态
    console.log('🔍 [ANONYMOUS BATCH TRIAL STATUS] 调用数据库函数查询批量任务状态...');
    const { data: statusResult, error: statusError } = await supabaseAdmin
      .rpc('get_batch_tasks_status', {
        p_batch_id: batchId
      });

    if (statusError) {
      console.error('❌ [ANONYMOUS BATCH TRIAL STATUS] 数据库查询失败:', statusError);
      return apiResponse.error('查询批量任务状态失败，请重试');
    }

    console.log('✅ [ANONYMOUS BATCH TRIAL STATUS] 批量任务状态查询结果:', statusResult);

    if (!statusResult.found) {
      console.log('❌ [ANONYMOUS BATCH TRIAL STATUS] 批量任务不存在');
      return apiResponse.notFound('批量任务不存在或已过期');
    }

    // 4. 格式化返回数据
    const tasks = statusResult.tasks.map((task: any) => ({
      taskId: task.task_id,
      scaleFactor: task.scale_factor,
      status: task.status,
      result: task.result_data,
      createdAt: task.created_at,
      isCompleted: task.status === 'completed',
      isFailed: task.status === 'failed'
    }));

    const response = {
      batchId: statusResult.batch_id,
      tasks,
      totalCount: statusResult.total_count,
      completedCount: statusResult.completed_count,
      failedCount: statusResult.failed_count,
      isAllComplete: statusResult.completed_count + statusResult.failed_count >= statusResult.total_count
    };

    console.log('🎉 [ANONYMOUS BATCH TRIAL STATUS] 返回结果:', response);
    console.log('🎉 [ANONYMOUS BATCH TRIAL STATUS] ===== 批量任务状态查询完成 =====');

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [ANONYMOUS BATCH TRIAL STATUS] ===== 查询过程中发生异常 =====');
    console.error('💥 [ANONYMOUS BATCH TRIAL STATUS] 错误详情:', error);
    console.error('💥 [ANONYMOUS BATCH TRIAL STATUS] 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    
    return apiResponse.serverError('批量任务状态查询服务内部错误');
  }
}