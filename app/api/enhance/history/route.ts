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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // 最大50条
    const status = searchParams.get('status'); // 可选的状态过滤

    const offset = (page - 1) * limit;

    console.log(`Getting enhancement history for user: ${user.id}, page: ${page}, limit: ${limit}`);

    // 3. 构建查询 - 只查询图片增强任务
    let query = supabaseAdmin
      .from('image_enhancement_tasks')
      .select(`
        id,
        status,
        scale_factor,
        credits_consumed,
        r2_original_key,
        cdn_url,
        error_message,
        created_at,
        completed_at
      `)
      .eq('user_id', user.id)
      .eq('engine', 'automatic') // 只查询图片增强任务
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 添加状态过滤
    if (status && ['processing', 'completed', 'failed'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: tasks, error: queryError } = await query;

    if (queryError) {
      console.error('Error querying enhancement history:', queryError);
      return apiResponse.serverError('获取历史记录失败');
    }

    // 4. 获取总数（用于分页）
    let countQuery = supabaseAdmin
      .from('image_enhancement_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('engine', 'automatic'); // 只统计图片增强任务

    if (status && ['processing', 'completed', 'failed'].includes(status)) {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting enhancement history:', countError);
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

      const getScaleDescription = (scaleFactor: string) => {
        const descriptions: Record<string, string> = {
          '2x': '2倍放大',
          '4x': '4倍放大',
          '8x': '8倍放大',
          '16x': '16倍放大'
        };
        return descriptions[scaleFactor] || scaleFactor;
      };

      return {
        id: task.id,
        status: task.status,
        statusMessage: getStatusMessage(task.status),
        scaleFactor: task.scale_factor,
        scaleDescription: getScaleDescription(task.scale_factor),
        creditsConsumed: task.credits_consumed,
        originalUrl,
        cdnUrl: task.cdn_url,
        errorMessage: task.error_message,
        createdAt: task.created_at,
        completedAt: task.completed_at,
        // 计算处理时间
        processingTime: task.completed_at && task.created_at
          ? Math.round((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000)
          : null
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

    // 7. 分页信息
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit),
      totalItems: count || 0,
      itemsPerPage: limit,
      hasNextPage: page < Math.ceil((count || 0) / limit),
      hasPreviousPage: page > 1
    };

    return apiResponse.success({
      tasks: processedTasks,
      stats,
      pagination,
      filters: {
        appliedStatus: status || null,
        availableStatuses: ['processing', 'completed', 'failed']
      }
    });

  } catch (error) {
    console.error('Error in enhance/history API:', error);
    return apiResponse.serverError('获取增强历史失败');
  }
}