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
  try {
    // 1. 解析和验证参数
    const body = await req.json();
    const validationResult = statusRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [STATUS] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const { batchId } = validationResult.data;
    const batchIdShort = batchId.slice(-4);

    // 2. 查询批量任务状态
    const { data: statusResult, error: statusError } = await supabaseAdmin
      .rpc('get_batch_tasks_status', {
        p_batch_id: batchId
      });

    // 类型断言：RPC 函数返回 JSONB 对象
    const result = statusResult as { 
      found?: boolean; 
      batch_id?: string; 
      total_count?: number; 
      completed_count?: number; 
      failed_count?: number;
      tasks?: any[];
    } | null;

    if (statusError) {
      console.error(`❌ [STATUS-${batchIdShort}] 数据库查询失败:`, statusError);
      return apiResponse.error('查询批量任务状态失败，请重试');
    }

    if (!result?.found) {
      console.log(`❌ [STATUS-${batchIdShort}] 批量任务不存在`);
      return apiResponse.notFound('批量任务不存在或已过期');
    }

    // 3. 格式化返回数据
    const tasks = result?.tasks?.map((task: any) => ({
      taskId: task.task_id,
      scaleFactor: task.scale_factor,
      status: task.status,
      result: task.result_data,
      createdAt: task.created_at,
      isCompleted: task.status === 'completed',
      isFailed: task.status === 'failed'
    }));

    const response = {
      batchId: result?.batch_id,
      tasks: tasks || [],
      totalCount: result?.total_count || 0,
      completedCount: result?.completed_count || 0,
      failedCount: result?.failed_count || 0,
      isAllComplete: (result?.completed_count || 0) + (result?.failed_count || 0) >= (result?.total_count || 0)
    };

    // 只在任务状态变化时输出日志
    const newCompleted = (tasks || []).filter(t => t.isCompleted).length;
    if (newCompleted > 0) {
      console.log(`📊 [STATUS-${batchIdShort}] ${newCompleted}/${result?.total_count || 0} completed`);
    }

    return apiResponse.success(response);

  } catch (error) {
    console.error('💥 [STATUS] 查询异常:', error);
    return apiResponse.serverError('批量任务状态查询服务内部错误');
  }
}