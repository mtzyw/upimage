/**
 * Cloudflare Worker 图片下载代理
 * 部署到 Cloudflare Workers，用于中转图片下载
 * 
 * 使用方式：
 * https://your-worker.your-subdomain.workers.dev/download?url=图片链接&filename=文件名
 */

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const url = new URL(request.url);

      // 只处理 /download 路径
      if (!url.pathname.startsWith('/download')) {
        return new Response('Not Found', { status: 404 });
      }

      const imageUrl = url.searchParams.get('url');
      const filename = url.searchParams.get('filename') || 'download.jpg';
      const taskId = url.searchParams.get('taskId'); // 可选，用于日志追踪

      // 验证必需参数
      if (!imageUrl) {
        return new Response(
          JSON.stringify({
            success: false,
            error: '缺少图片链接参数 (url)'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // 验证图片URL是否为有效的URL
      let targetUrl;
      try {
        targetUrl = new URL(imageUrl);
      } catch (e) {
        return new Response(
          JSON.stringify({
            success: false,
            error: '无效的图片链接格式'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // 安全检查：只允许特定域名（可根据需要调整）
      const allowedDomains = [
        'cdn.imgenhancer.ai', // 您的实际 R2 CDN 域名
        // 可以添加其他允许的域名
      ];

      if (!allowedDomains.some(domain => targetUrl.hostname.includes(domain))) {
        return new Response(
          JSON.stringify({
            success: false,
            error: '不允许的图片域名'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`下载请求: ${imageUrl} -> ${filename}${taskId ? ` (任务ID: ${taskId})` : ''}`);

      // 请求原始图片
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'NextyDev-DownloadWorker/1.0',
          'Accept': 'image/*',
        },
        // 使用 Cloudflare 的缓存
        cf: {
          cacheEverything: true,
          cacheTtl: 3600, // 缓存1小时
        },
      });

      if (!imageResponse.ok) {
        console.error(`图片请求失败: ${imageResponse.status} ${imageResponse.statusText}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: `图片请求失败: ${imageResponse.status}`
          }),
          {
            status: imageResponse.status,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // 获取原始内容类型
      const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg';
      const contentLength = imageResponse.headers.get('Content-Length');

      // 验证是否为图片文件
      if (!contentType.startsWith('image/')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: '目标文件不是图片格式'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // 构建响应头，强制下载
      const responseHeaders = {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000', // 缓存1年
      };

      // 如果有内容长度，添加到响应头
      if (contentLength) {
        responseHeaders['Content-Length'] = contentLength;
      }

      console.log(`下载成功: ${filename} (${contentLength || '未知大小'})`);

      // 返回图片数据流，直接传输不缓存到内存
      return new Response(imageResponse.body, {
        status: 200,
        headers: responseHeaders,
      });

    } catch (error) {
      console.error('Worker 下载错误:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || '下载失败，请重试'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
  },
};