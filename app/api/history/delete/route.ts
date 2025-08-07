import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 请求参数验证
const deleteRequestSchema = z.object({
  taskId: z.string().min(1, '任务ID不能为空')
});

export async function DELETE(req: NextRequest) {
  console.log('🗑️ [HISTORY DELETE] 收到删除请求');
  
  try {
    // 1. 用户认证
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ [HISTORY DELETE] 用户认证失败');
      return apiResponse.unauthorized('用户未认证');
    }

    console.log(`✅ [HISTORY DELETE] 用户认证成功: ${user.id}`);

    // 2. 解析请求参数
    const body = await req.json();
    const validationResult = deleteRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten().fieldErrors;
      console.log('❌ [HISTORY DELETE] 参数验证失败:', errors);
      return apiResponse.badRequest(`参数验证失败: ${JSON.stringify(errors)}`);
    }

    const { taskId } = validationResult.data;
    console.log(`🎯 [HISTORY DELETE] 删除任务ID: ${taskId}`);

    // 3. 检查任务是否存在且属于当前用户
    const { data: task, error: fetchError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !task) {
      console.log('❌ [HISTORY DELETE] 任务不存在或无权限:', fetchError);
      return apiResponse.notFound('任务不存在或无权限访问');
    }

    console.log('✅ [HISTORY DELETE] 找到任务记录');

    // 4. 删除云存储文件（如果存在）
    if (task.r2_original_key || (task as any).r2_optimized_key) {
      try {
        const { deleteFile } = await import('@/lib/cloudflare/r2');
        
        const deletePromises = [];
        if (task.r2_original_key) {
          deletePromises.push(deleteFile(task.r2_original_key));
          console.log(`🗂️ [HISTORY DELETE] 删除原始图片: ${task.r2_original_key}`);
        }
        if ((task as any).r2_optimized_key) {
          deletePromises.push(deleteFile((task as any).r2_optimized_key));
          console.log(`🗂️ [HISTORY DELETE] 删除增强图片: ${(task as any).r2_optimized_key}`);
        }
        
        await Promise.all(deletePromises);
        console.log('✅ [HISTORY DELETE] 云存储文件删除完成');
      } catch (error) {
        console.error('⚠️ [HISTORY DELETE] 删除云存储文件失败，但继续删除数据库记录:', error);
      }
    }

    // 5. 删除数据库记录
    const { error: deleteError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ [HISTORY DELETE] 删除数据库记录失败:', deleteError);
      return apiResponse.error('删除失败，请重试');
    }

    console.log('✅ [HISTORY DELETE] 数据库记录删除完成');

    // 6. 清理相关的Redis缓存（如果存在）
    try {
      const { redis } = await import('@/lib/upstash');
      if (redis) {
        const keys = [
          `task:${taskId}:user_id`,
          `task:${taskId}:api_key_id`,
          `task:${taskId}:status`
        ];
        await Promise.all(keys.map(key => redis.del(key)));
        console.log('✅ [HISTORY DELETE] Redis缓存清理完成');
      }
    } catch (error) {
      console.log('⚠️ [HISTORY DELETE] Redis缓存清理失败，忽略:', error);
    }

    console.log('🎉 [HISTORY DELETE] 删除操作完成');

    return apiResponse.success({
      message: '历史记录删除成功',
      deletedTaskId: taskId
    });

  } catch (error) {
    console.error('💥 [HISTORY DELETE] 删除过程中发生异常:', error);
    return apiResponse.serverError('删除失败，服务器内部错误');
  }
}