import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const taskId = searchParams.get('taskId');

    if (!url) {
      return NextResponse.json(
        { success: false, error: '缺少图片链接参数' },
        { status: 400 }
      );
    }

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID参数' },
        { status: 400 }
      );
    }

    // 验证用户权限
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    // 验证任务归属权
    const { data: taskData, error: taskError } = await supabase
      .from('image_enhancement_tasks')
      .select('user_id, status, cdn_url')
      .eq('id', taskId)
      .single();

    if (taskError || !taskData) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    if (taskData.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: '无权访问此任务' },
        { status: 403 }
      );
    }

    if (taskData.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: '任务尚未完成' },
        { status: 400 }
      );
    }

    // 验证 URL 是否匹配
    if (url !== taskData.cdn_url) {
      return NextResponse.json(
        { success: false, error: '无效的下载链接' },
        { status: 400 }
      );
    }

    // 代理下载图片
    const imageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NextyApp/1.0)',
      },
    });

    if (!imageResponse.ok) {
      throw new Error(`HTTP error! status: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    // 从 URL 中提取文件名或生成一个
    const filename = `enhanced-${taskId}.jpg`;

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Download proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '下载失败，请重试' 
      },
      { status: 500 }
    );
  }
}