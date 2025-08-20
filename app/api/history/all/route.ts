import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';

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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 3. 查询所有类型的历史记录
    const { data: tasks, error: queryError, count } = await supabase
      .from('image_enhancement_tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (queryError) {
      console.error('查询历史记录失败:', queryError);
      return apiResponse.error('查询历史记录失败');
    }

    // 4. 格式化数据
    const formattedTasks = (tasks || []).map(task => ({
      id: task.id,
      status: task.status,
      statusMessage: task.status === 'completed' ? '已完成' : 
                    task.status === 'processing' ? '处理中' : 
                    task.status === 'failed' ? '处理失败' : '未知状态',
      creditsConsumed: task.credits_consumed || 0,
      originalUrl: task.r2_original_key ? `${process.env.R2_PUBLIC_URL}/${task.r2_original_key}` : null,
      cdnUrl: task.cdn_url,
      errorMessage: task.error_message,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      timestamp: new Date(task.created_at).toLocaleString('zh-CN'),
      filename: `task-${task.created_at}`,
      processingTime: task.completed_at && task.created_at ? 
        Math.round((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000) : 
        undefined,
      engine: task.engine || 'unknown'
    }));

    // 5. 计算统计信息
    const { data: allTasks } = await supabase
      .from('image_enhancement_tasks')
      .select('status, credits_consumed')
      .eq('user_id', user.id);

    const stats = (allTasks || []).reduce((acc, task) => {
      acc.total++;
      acc.totalCreditsUsed += task.credits_consumed || 0;
      
      switch (task.status) {
        case 'completed':
          acc.completed++;
          break;
        case 'processing':
          acc.processing++;
          break;
        case 'failed':
          acc.failed++;
          break;
      }
      
      return acc;
    }, {
      total: 0,
      completed: 0,
      processing: 0,
      failed: 0,
      totalCreditsUsed: 0
    });

    // 6. 返回结果
    const result = {
      items: formattedTasks,
      count: formattedTasks.length,
      offset,
      limit,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
      stats
    };

    return apiResponse.success(result);

  } catch (error) {
    console.error('获取历史记录失败:', error);
    return apiResponse.serverError('获取历史记录失败');
  }
}