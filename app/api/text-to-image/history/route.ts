import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

// 强制使用 Node.js runtime
export const runtime = 'nodejs';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 [FLUX DEV HISTORY] ===== 获取文本生成图片历史记录 =====');

    // 1. 用户认证
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ [FLUX DEV HISTORY] 用户未认证');
      return apiResponse.unauthorized('用户未认证');
    }

    console.log(`✅ [FLUX DEV HISTORY] 用户认证成功: ${user.id}`);

    // 2. 解析查询参数
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // 最大100条
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const status = searchParams.get('status'); // 可选的状态过滤

    console.log('📋 [FLUX DEV HISTORY] 查询参数:', { limit, offset, status });

    // 3. 构建查询条件
    let query = supabaseAdmin
      .from('image_enhancement_tasks')
      .select('id, status, created_at, completed_at, error_message, cdn_url, prompt, scale_factor, creativity, credits_consumed')
      .eq('user_id', user.id)
      .eq('engine', 'flux-dev') // 只查询 Flux Dev 任务
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 4. 添加状态过滤（如果提供）
    if (status && ['processing', 'completed', 'failed'].includes(status)) {
      query = query.eq('status', status);
      console.log(`🔍 [FLUX DEV HISTORY] 按状态过滤: ${status}`);
    }

    // 5. 执行查询
    const { data: tasks, error: queryError } = await query;

    if (queryError) {
      console.error('❌ [FLUX DEV HISTORY] 数据库查询失败:', queryError);
      return apiResponse.serverError('获取历史记录失败');
    }

    console.log(`✅ [FLUX DEV HISTORY] 查询成功，返回 ${tasks?.length || 0} 条记录`);

    // 6. 转换数据格式，映射回前端期望的字段名
    const formattedTasks = (tasks || []).map(task => ({
      id: task.id,
      taskId: task.id,
      status: task.status,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      prompt: task.prompt,
      aspectRatio: task.scale_factor, // 复用字段，存储的是 aspect_ratio
      seed: task.creativity || undefined, // 复用字段，存储的是 seed
      cdnUrl: task.cdn_url,
      errorMessage: task.error_message,
      creditsConsumed: task.credits_consumed,
      // 添加任务类型标识
      taskType: 'text-to-image',
      // 格式化时间显示
      timestamp: task.created_at,
      filename: `flux-dev-${task.id}`,
      // 处理时间计算
      processingTime: task.completed_at && task.created_at 
        ? Math.round((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000)
        : undefined
    }));

    // 7. 查询总数（用于分页）
    let totalCount = 0;
    if (offset === 0) { // 只在第一页查询总数，减少数据库压力
      let countQuery = supabaseAdmin
        .from('image_enhancement_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('engine', 'flux-dev');

      if (status && ['processing', 'completed', 'failed'].includes(status)) {
        countQuery = countQuery.eq('status', status);
      }

      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.warn('⚠️ [FLUX DEV HISTORY] 获取总数失败:', countError);
      } else {
        totalCount = count || 0;
      }
    }

    // 8. 构建响应
    const response = {
      success: true,
      data: {
        items: formattedTasks,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: formattedTasks.length === limit
        },
        filters: {
          status: status || 'all'
        }
      }
    };

    console.log('📊 [FLUX DEV HISTORY] 响应统计:', {
      itemsCount: formattedTasks.length,
      hasMore: response.data.pagination.hasMore,
      totalCount
    });

    console.log('🎉 [FLUX DEV HISTORY] ===== 历史记录获取完成 =====');

    return apiResponse.success(response.data);

  } catch (error) {
    console.error('💥 [FLUX DEV HISTORY] ===== 处理过程中发生异常 =====');
    console.error('💥 [FLUX DEV HISTORY] 错误详情:', error);
    return apiResponse.serverError('获取历史记录失败');
  }
}

// POST 方法用于批量操作（可选）
export async function POST(req: NextRequest) {
  try {
    // 1. 用户认证
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiResponse.unauthorized('用户未认证');
    }

    // 2. 解析请求体
    const body = await req.json();
    const { action, taskIds } = body;

    if (!action || !Array.isArray(taskIds)) {
      return apiResponse.badRequest('缺少必需参数: action, taskIds');
    }

    console.log(`🔧 [FLUX DEV HISTORY] 批量操作: ${action}, 任务数: ${taskIds.length}`);

    switch (action) {
      case 'delete':
        // 批量删除任务（只删除用户自己的且是 flux-dev 类型的）
        const { data: deletedTasks, error: deleteError } = await supabaseAdmin
          .from('image_enhancement_tasks')
          .delete()
          .eq('user_id', user.id)
          .eq('engine', 'flux-dev')
          .in('id', taskIds)
          .select('id');

        if (deleteError) {
          console.error('❌ [FLUX DEV HISTORY] 批量删除失败:', deleteError);
          return apiResponse.serverError('删除任务失败');
        }

        console.log(`✅ [FLUX DEV HISTORY] 成功删除 ${deletedTasks?.length || 0} 个任务`);

        return apiResponse.success({
          deletedCount: deletedTasks?.length || 0,
          deletedTaskIds: deletedTasks?.map(t => t.id) || []
        });

      case 'retry':
        // 批量重试失败的任务（这里只是示例，实际可能需要重新创建任务）
        return apiResponse.badRequest('重试功能暂未实现，请重新创建任务');

      default:
        return apiResponse.badRequest(`不支持的操作: ${action}`);
    }

  } catch (error) {
    console.error('Error in text-to-image/history POST:', error);
    return apiResponse.serverError('批量操作失败');
  }
}