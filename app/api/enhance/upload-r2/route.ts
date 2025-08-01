import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2 } from '@/lib/r2';
import { generateR2Key } from '@/lib/cloudflare/r2';

/**
 * 独立的R2上传接口 - 用于优化流程
 * 只负责将图片上传到R2，不处理Freepik API调用
 */
export async function POST(req: NextRequest) {
  try {
    console.log('📤 [R2 UPLOAD] ===== 开始R2上传 =====');

    // 1. 用户认证
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ [R2 UPLOAD] 用户未认证');
      return apiResponse.unauthorized('用户未认证');
    }

    console.log(`✅ [R2 UPLOAD] 用户认证成功: ${user.id}`);

    // 2. 解析FormData
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      console.log('❌ [R2 UPLOAD] 未提供图片文件');
      return apiResponse.badRequest('请提供图片文件');
    }

    // 3. 验证图片文件
    if (!imageFile.type.startsWith('image/')) {
      return apiResponse.badRequest('请上传有效的图片文件');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return apiResponse.badRequest('图片文件大小不能超过10MB');
    }

    console.log(`📝 [R2 UPLOAD] 图片信息:`, {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type
    });

    // 4. 生成R2 key并上传
    const r2Key = generateR2Key({
      fileName: imageFile.name,
      path: `enhance/${user.id}`,
      prefix: Date.now().toString()
    });

    console.log(`☁️ [R2 UPLOAD] 开始上传到R2: ${r2Key}`);

    const startTime = Date.now();
    const uploadResult = await uploadToR2(imageFile, r2Key);
    const uploadTime = Date.now() - startTime;

    console.log(`✅ [R2 UPLOAD] 上传完成，耗时: ${uploadTime}ms`);
    console.log(`✅ [R2 UPLOAD] 上传结果:`, uploadResult);

    // 5. 返回上传结果
    const response = {
      success: true,
      r2Key: uploadResult.key,
      r2Url: uploadResult.url,
      fileInfo: {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type
      },
      uploadTime: `${uploadTime}ms`
    };

    console.log(`🎉 [R2 UPLOAD] R2上传成功完成`);
    return apiResponse.success(response);

  } catch (error) {
    console.error('❌ [R2 UPLOAD] R2上传失败:', error);
    return apiResponse.serverError(
      error instanceof Error ? error.message : 'R2上传失败，请重试'
    );
  }
}