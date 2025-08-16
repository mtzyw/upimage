import { serverUploadFile, serverStreamUploadFile } from '@/lib/cloudflare/r2';
import { redis } from '@/lib/upstash';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
// 删除了未使用的 Readable 导入
import fs from 'fs';
import path from 'path';
// 删除了未使用的 pipeline 导入

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface TaskStatus {
  status: 'processing' | 'completed' | 'failed';
  cdnUrl?: string;
  originalUrl?: string;
  errorMessage?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface FreepikTaskResponse {
  task_id: string;
  status: string;
  image_url?: string;
  error?: string;
}

/**
 * 从 R2 CDN 下载图片并转换为 base64
 * @param cdnUrl R2 CDN 图片地址
 * @returns base64 图片数据
 */
export async function convertR2ImageToBase64(cdnUrl: string): Promise<string> {
  try {
    console.log('Downloading image from R2:', cdnUrl);
    
    const response = await fetch(cdnUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'NextyDev-ImageEnhancer/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    console.log(`Image downloaded and converted to base64, size: ${buffer.length} bytes`);
    return base64Image;
  } catch (error) {
    console.error('Error converting R2 image to base64:', error);
    throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 流式上传优化后的图片到 R2（零内存占用的真正流式实现）
 * @param imageResponse Fetch Response 对象
 * @param userId 用户ID
 * @param taskId 任务ID
 * @param originalExtension 原图扩展名
 * @param fallbackToLocal 是否在流式上传失败时降级到本地文件方案
 * @returns 上传结果
 */
export async function uploadOptimizedImageStreamToR2(
  imageResponse: Response,
  userId: string, 
  taskId: string,
  originalExtension: string = 'png',
  fallbackToLocal: boolean = true
): Promise<{ key: string; url: string; uploadMethod: 'stream' | 'local' }> {
  const key = `users/${userId}/image-enhancements/optimized-${taskId}.${originalExtension}`;
  const taskIdShort = taskId.slice(0, 8);
  
  try {
    console.log(`🚀 [STREAM-${taskIdShort}] 尝试流式上传到 R2: ${key}`);
    
    // 克隆 Response 以防需要降级处理
    const clonedResponse = fallbackToLocal ? imageResponse.clone() : imageResponse;
    
    // 获取文件大小信息用于日志
    const contentLength = clonedResponse.headers.get('content-length');
    const fileSizeInfo = contentLength ? `${Math.round(parseInt(contentLength) / 1024)}KB` : '未知大小';
    
    console.log(`📊 [STREAM-${taskIdShort}] 文件信息: ${fileSizeInfo}, ContentType: image/${originalExtension}`);
    
    // 尝试流式上传
    const result = await serverStreamUploadFile({
      stream: clonedResponse,
      contentType: `image/${originalExtension}`,
      key: key
    });
    
    console.log(`✅ [STREAM-${taskIdShort}] 🎯 零内存流式上传成功! URL: ${result.url}`);
    return { ...result, uploadMethod: 'stream' };
  } catch (streamError) {
    console.warn(`⚠️ [STREAM-${taskIdShort}] 流式上传失败:`, streamError);
    
    if (fallbackToLocal) {
      console.log(`🔄 [STREAM-${taskIdShort}] 降级到本地文件上传方案...`);
      const localResult = await uploadOptimizedImageLocalToR2(imageResponse, userId, taskId, originalExtension);
      return { ...localResult, uploadMethod: 'local' };
    } else {
      throw new Error(`Stream upload failed: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`);
    }
  }
}

/**
 * 本地文件上传优化后的图片到 R2（先下载到本地文件，然后上传）
 * 最稳定的方案，避免内存占用和流式连接问题
 * @param imageResponse Fetch Response 对象
 * @param userId 用户ID
 * @param taskId 任务ID
 * @param originalExtension 原图扩展名
 * @returns 上传结果
 */
export async function uploadOptimizedImageLocalToR2(
  imageResponse: Response,
  userId: string, 
  taskId: string,
  originalExtension: string = 'png'
): Promise<{ key: string; url: string }> {
  let tempFilePath: string | null = null;
  const taskIdShort = taskId.slice(0, 8);
  
  try {
    const key = `users/${userId}/image-enhancements/optimized-${taskId}.${originalExtension}`;
    
    console.log(`💾 [LOCAL-${taskIdShort}] 开始本地文件上传到 R2: ${key}`);
    
    // 第一步：创建临时文件路径
    const tempDir = '/tmp';
    const tempFileName = `freepik-${taskId}-${Date.now()}.${originalExtension}`;
    tempFilePath = path.join(tempDir, tempFileName);
    
    console.log(`📁 [LOCAL-${taskIdShort}] 临时文件路径: ${tempFilePath}`);
    
    // 第二步：下载图片到本地临时文件 (内存占用操作)
    const startTime = Date.now();
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const downloadTime = Date.now() - startTime;
    
    console.log(`🔽 [LOCAL-${taskIdShort}] 图片加载到内存: ${Math.round(buffer.length / 1024)}KB, 耗时: ${downloadTime}ms`);
    
    fs.writeFileSync(tempFilePath, buffer);
    
    // 获取文件大小
    const stats = fs.statSync(tempFilePath);
    console.log(`💿 [LOCAL-${taskIdShort}] 图片写入磁盘: ${Math.round(stats.size / 1024)}KB`);
    
    // 第三步：从本地文件读取并上传到R2 (再次内存占用)
    const fileBuffer = fs.readFileSync(tempFilePath);
    console.log(`📤 [LOCAL-${taskIdShort}] 从磁盘重新读取: ${Math.round(fileBuffer.length / 1024)}KB`);
    
    const uploadStartTime = Date.now();
    const result = await serverUploadFile({
      data: fileBuffer,
      contentType: `image/${originalExtension}`,
      key: key
    });
    const uploadTime = Date.now() - uploadStartTime;
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ [LOCAL-${taskIdShort}] 📁 本地文件上传完成! 总耗时: ${totalTime}ms (下载: ${downloadTime}ms, 上传: ${uploadTime}ms)`);
    console.log(`🔄 [LOCAL-${taskIdShort}] 内存使用: ${Math.round(buffer.length / 1024)}KB x2 (内存复制), 磁盘I/O: 写入+读取`);
    return result;
  } catch (error) {
    console.error(`❌ [LOCAL-${taskIdShort}] 本地文件上传失败:`, error);
    throw new Error(`Failed to local file upload optimized image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // 清理临时文件
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🗑️ [LOCAL-${taskIdShort}] 临时文件已清理: ${path.basename(tempFilePath)}`);
      } catch (cleanupError) {
        console.warn(`[LOCAL-${taskIdShort}] 临时文件清理失败:`, cleanupError);
      }
    }
  }
}

/**
 * 设置任务状态到 Redis 和数据库
 * @param taskId 任务ID
 * @param status 任务状态
 * @param additionalData 额外数据
 */
export async function setTaskStatus(
  taskId: string, 
  status: 'processing' | 'completed' | 'failed', 
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    // 更新 Redis 缓存（1小时过期）
    if (redis) {
      await redis.set(`task:${taskId}:status`, status, { ex: 3600 });
      
      if (additionalData?.cdnUrl) {
        await redis.set(`task:${taskId}:cdn_url`, additionalData.cdnUrl, { ex: 86400 }); // 24小时
      }
      
      if (additionalData?.errorMessage) {
        await redis.set(`task:${taskId}:error`, additionalData.errorMessage, { ex: 86400 });
      }

      console.log(`Task status updated in Redis: ${taskId} -> ${status}`);
    }

    // 更新数据库
    const updateData: any = {
      status
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      updateData.error_message = null; // 清除之前的错误消息
      if (additionalData?.cdnUrl) {
        updateData.cdn_url = additionalData.cdnUrl;
      }
      if (additionalData?.r2OptimizedKey) {
        updateData.r2_optimized_key = additionalData.r2OptimizedKey;
      }
    }

    if (status === 'failed' && additionalData?.errorMessage) {
      updateData.error_message = additionalData.errorMessage;
    }

    console.log(`[setTaskStatus] Preparing database update for ${taskId}:`, updateData);

    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('[setTaskStatus] Error updating task status in database:', updateError);
      console.error('[setTaskStatus] Update data was:', updateData);
      throw updateError;
    }

    console.log(`[setTaskStatus] Task status updated in database: ${taskId} -> ${status}`);
    console.log(`[setTaskStatus] Updated task record:`, updatedTask);
    
    // 清除任务信息缓存，下次查询时会重新加载最新数据
    if (redis) {
      await redis.del(`task_cache:${taskId}`);
      console.log(`[setTaskStatus] Task cache cleared: ${taskId}`);
    }
  } catch (error) {
    console.error('Error setting task status:', error);
    throw error;
  }
}

/**
 * 获取任务状态
 * @param taskId 任务ID
 * @returns 任务状态信息
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatus | null> {
  try {
    // 先尝试从 Redis 获取（快速）
    if (redis) {
      const [status, cdnUrl, errorMessage] = await Promise.all([
        redis.get(`task:${taskId}:status`),
        redis.get(`task:${taskId}:cdn_url`),
        redis.get(`task:${taskId}:error`)
      ]);

      if (status) {
        console.log(`Task status retrieved from Redis: ${taskId} -> ${status}`);
        return {
          status: status as any,
          cdnUrl: (typeof cdnUrl === 'string' && cdnUrl) ? cdnUrl : undefined,
          errorMessage: (typeof errorMessage === 'string' && errorMessage) ? errorMessage : undefined
        };
      }
    }

    // 从数据库获取完整信息
    const { data: taskData, error } = await supabaseAdmin
      .from('image_enhancement_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !taskData) {
      console.log(`Task not found: ${taskId}`);
      return null;
    }

    // 构建原图 URL
    const originalUrl = taskData.r2_original_key 
      ? `${process.env.R2_PUBLIC_URL}/${taskData.r2_original_key}`
      : undefined;

    const result: TaskStatus = {
      status: taskData.status as any,
      cdnUrl: taskData.cdn_url || undefined,
      originalUrl,
      errorMessage: taskData.error_message || undefined,
      createdAt: taskData.created_at || undefined,
      completedAt: taskData.completed_at || undefined
    };

    console.log(`Task status retrieved from database: ${taskId} -> ${taskData.status}`);
    return result;
  } catch (error) {
    console.error('Error getting task status:', error);
    return null;
  }
}

/**
 * 从图片 URL 提取文件扩展名
 * @param imageUrl 图片 URL
 * @returns 文件扩展名
 */
export function getImageExtension(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    const extension = pathname.split('.').pop()?.toLowerCase();
    
    // 支持的图片格式
    const supportedFormats = ['jpg', 'jpeg', 'png', 'webp'];
    return supportedFormats.includes(extension || '') ? extension! : 'jpg';
  } catch (error) {
    console.warn('Could not extract extension from URL, defaulting to jpg:', imageUrl);
    return 'jpg';
  }
}

/**
 * 验证图片文件格式
 * @param contentType Content-Type 头
 * @param fileName 文件名
 * @returns 是否为支持的图片格式
 */
export function isValidImageFormat(contentType?: string, fileName?: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ];

  if (contentType && supportedTypes.includes(contentType.toLowerCase())) {
    return true;
  }

  if (fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp'].includes(extension || '');
  }

  return false;
}

/**
 * 计算图片处理的预估时间（秒）
 * @param scaleFactor 放大倍数
 * @returns 预估处理时间（秒）
 */
export function getEstimatedProcessingTime(scaleFactor: string): number {
  const timeMap: Record<string, number> = {
    '2x': 45,   // 30-60秒
    '4x': 90,   // 1-2分钟
    '8x': 210,  // 2-5分钟  
    '16x': 450  // 5-10分钟
  };
  
  return timeMap[scaleFactor] || 90;
}

/**
 * 生成任务的唯一标识符
 * @param userId 用户ID
 * @param r2Key R2 文件key
 * @returns 唯一标识符
 */
export function generateTaskIdentifier(userId: string, r2Key: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${userId.substring(0, 8)}-${timestamp}-${randomStr}`;
}