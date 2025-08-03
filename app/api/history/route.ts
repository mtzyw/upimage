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

    console.log(`Getting history for user: ${user.id}, limit: ${limit}, offset: ${offset}`);

    // 3. 查询历史记录
    const { data: tasks, error: queryError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select(`
        id,
        status,
        created_at,
        completed_at,
        scale_factor,
        credits_consumed,
        optimized_for,
        creativity,
        hdr,
        prompt,
        r2_original_key,
        cdn_url,
        error_message
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1); // 使用范围查询实现分页

    if (queryError) {
      console.error('Error querying history:', queryError);
      return apiResponse.serverError('获取历史记录失败');
    }

    // 4. 处理结果数据
    const processedTasks = tasks?.map(task => ({
      id: task.id,
      status: task.status,
      created_at: task.created_at,
      completed_at: task.completed_at,
      scale_factor: task.scale_factor,
      credits_consumed: task.credits_consumed,
      optimization_type: task.optimized_for,
      creativity: task.creativity,
      hdr: task.hdr,
      prompt: task.prompt,
      r2_original_key: task.r2_original_key,
      cdn_url: task.cdn_url,
      error_message: task.error_message,
    })) || [];

    // 5. 查询总数（仅在第一页时查询，优化性能）
    let totalCount = null;
    if (offset === 0) {
      const { count, error: countError } = await supabaseAdmin
        .from('image_enhancement_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (!countError) {
        totalCount = count || 0;
      }
    }

    return apiResponse.success({
      items: processedTasks,
      count: processedTasks.length,
      offset: offset,
      limit: limit,
      total: totalCount,
      hasMore: processedTasks.length === limit // 如果返回的数量等于请求的数量，可能还有更多
    });

  } catch (error) {
    console.error('Error in history API:', error);
    return apiResponse.serverError('获取历史记录失败');
  }
}