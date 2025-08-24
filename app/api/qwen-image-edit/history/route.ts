import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // 1. 用户认证
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiResponse.unauthorized('用户未认证');
    }

    // 2. 获取查询参数
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // 默认10条，最大50条
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0); // 偏移量，默认0
    const status = searchParams.get('status'); // 可选的状态过滤

    console.log(`Getting qwen-image-edit history for user: ${user.id}, limit: ${limit}, offset: ${offset}`);

    // 3. 构建查询 - 专门查询 qwen_image_edit 任务
    let query = supabaseAdmin
      .from('image_enhancement_tasks')
      .select(`
        id,
        status,
        created_at,
        completed_at,
        r2_original_key,
        cdn_url,
        credits_consumed,
        error_message,
        prompt,
        creativity,
        hdr,
        resemblance
      `)
      .eq('user_id', user.id)
      .eq('engine', 'qwen_image_edit') // 只查询 Qwen 图像编辑任务
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 添加状态过滤
    if (status && ['processing', 'completed', 'failed'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: tasks, error: queryError } = await query;

    if (queryError) {
      console.error('Error querying qwen-image-edit history:', queryError);
      return apiResponse.serverError('获取 Qwen 图像编辑历史记录失败');
    }

    // 4. 获取总数（用于分页）
    let countQuery = supabaseAdmin
      .from('image_enhancement_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('engine', 'qwen_image_edit');

    if (status && ['processing', 'completed', 'failed'].includes(status)) {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting qwen-image-edit history:', countError);
    }

    // 5. 处理结果数据
    const processedTasks = tasks?.map(task => {
      const originalUrl = task.r2_original_key 
        ? `${process.env.R2_PUBLIC_URL}/${task.r2_original_key}`
        : null;

      // 构建任务摘要
      const getStatusMessage = (status: string) => {
        switch (status) {
          case 'processing': return '处理中';
          case 'completed': return '已完成';
          case 'failed': return '处理失败';
          default: return '未知状态';
        }
      };

      // 格式化时间戳
      const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      };

      return {
        id: task.id,
        status: task.status,
        statusMessage: getStatusMessage(task.status),
        creditsConsumed: task.credits_consumed,
        originalUrl,
        cdnUrl: task.cdn_url,
        errorMessage: task.error_message,
        createdAt: task.created_at,
        completedAt: task.completed_at,
        timestamp: formatTimestamp(task.created_at!),
        filename: 'QwenEdit', // 默认文件名，用于识别 Qwen 编辑任务
        // 计算处理时间
        processingTime: task.completed_at && task.created_at
          ? Math.round((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000)
          : null,
        // Qwen 图像编辑特有字段
        editPrompt: task.prompt || '',
        guidanceScale: task.creativity || 4,
        numInferenceSteps: task.hdr || 30,
        numImages: task.resemblance || 1
      };
    }) || [];

    // 6. 统计信息
    const stats = {
      total: count || 0,
      completed: processedTasks.filter(t => t.status === 'completed').length,
      processing: processedTasks.filter(t => t.status === 'processing').length,
      failed: processedTasks.filter(t => t.status === 'failed').length,
      totalCreditsUsed: processedTasks.reduce((sum, t) => sum + t.creditsConsumed, 0)
    };

    return apiResponse.success({
      items: processedTasks,
      count: processedTasks.length,
      offset: offset,
      limit: limit,
      total: count || 0,
      hasMore: processedTasks.length === limit,
      stats,
      filters: {
        appliedStatus: status || null,
        availableStatuses: ['processing', 'completed', 'failed']
      }
    });

  } catch (error) {
    console.error('Error in qwen-image-edit/history API:', error);
    return apiResponse.serverError('获取 Qwen 图像编辑历史记录失败');
  }
}