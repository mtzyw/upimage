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
    const tool = searchParams.get('tool'); // 新增工具类型筛选

    // 3. 查询历史记录（支持按工具类型筛选）
    let query = supabase
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
        engine,
        prompt,
        creativity,
        hdr,
        resemblance,
        scale_factor
      `, { count: 'exact' })
      .eq('user_id', user.id);

    // 根据工具类型筛选
    if (tool === 'remove_background') {
      query = query.eq('engine', 'remove_background');
    } else if (tool === 'image-edit') {
      query = query.eq('engine', 'qwen_image_edit');
    } else if (tool === 'upscaler') {
      query = query.eq('engine', 'automatic');
    } else if (tool === 'text-to-image') {
      query = query.eq('engine', 'flux-dev');
    }
    // 如果没有指定tool或tool不匹配，查询所有类型

    const { data: tasks, error: queryError, count } = await query
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
      timestamp: task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : '',
      filename: `task-${task.created_at}`,
      processingTime: task.completed_at && task.created_at ? 
        Math.round((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000) : 
        undefined,
      engine: task.engine || 'unknown',
      
      // Qwen 图像编辑特有字段
      ...(task.engine === 'qwen_image_edit' && {
        editPrompt: task.prompt,
        guidanceScale: task.creativity,
        numInferenceSteps: task.hdr,
        numImages: task.resemblance
      })
    }));

    // 5. 计算统计信息 - 应用相同的工具筛选条件
    let statsQuery = supabase
      .from('image_enhancement_tasks')
      .select('status, credits_consumed')
      .eq('user_id', user.id);

    // 为统计查询应用相同的工具类型筛选
    if (tool === 'remove_background') {
      statsQuery = statsQuery.eq('engine', 'remove_background');
    } else if (tool === 'image-edit') {
      statsQuery = statsQuery.eq('engine', 'qwen_image_edit');
    } else if (tool === 'upscaler') {
      statsQuery = statsQuery.eq('engine', 'automatic');
    } else if (tool === 'text-to-image') {
      statsQuery = statsQuery.eq('engine', 'flux-dev');
    }

    const { data: allTasks } = await statsQuery;

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