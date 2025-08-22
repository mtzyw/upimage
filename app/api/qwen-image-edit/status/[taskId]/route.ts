import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // 1. 用户认证
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiResponse.unauthorized('用户未认证');
    }

    // 2. 获取任务ID
    const { taskId } = await params;
    if (!taskId) {
      return apiResponse.badRequest('缺少任务ID');
    }

    console.log(`📊 [QWEN_STATUS] 查询任务状态: ${taskId}, 用户: ${user.id}`);

    // 3. 查询任务状态
    const { data: task, error: queryError } = await supabase
      .from('image_enhancement_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id) // 确保用户只能查询自己的任务
      .eq('engine', 'qwen_image_edit') // 确保是 Qwen 任务
      .single();

    if (queryError || !task) {
      console.error(`❌ [QWEN_STATUS] 任务查询失败:`, queryError);
      return apiResponse.notFound('任务不存在');
    }

    // 4. 格式化响应
    const response = {
      taskId: task.id,
      status: task.status,
      statusMessage: 
        task.status === 'completed' ? '已完成' : 
        task.status === 'processing' ? '处理中' : 
        task.status === 'failed' ? '处理失败' : '未知状态',
      originalUrl: task.r2_original_key ? `${process.env.R2_PUBLIC_URL}/${task.r2_original_key}` : null,
      cdnUrl: task.cdn_url,
      errorMessage: task.error_message,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      creditsConsumed: task.credits_consumed || 0,
      
      // Qwen 特有字段
      editPrompt: task.prompt,
      guidanceScale: task.creativity,
      numInferenceSteps: task.hdr,
      numImages: task.resemblance,
      
      // 计算处理时间
      processingTime: task.completed_at && task.created_at ? 
        Math.round((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000) : 
        undefined
    };

    console.log(`✅ [QWEN_STATUS] 任务状态查询成功: ${task.status}`);
    return apiResponse.success(response);

  } catch (error) {
    console.error('❌ [QWEN_STATUS] 状态查询失败:', error);
    return apiResponse.serverError('状态查询失败');
  }
}