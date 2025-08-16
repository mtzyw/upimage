import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable, PassThrough } from "node:stream";

// 专门用于 Node.js runtime 的流式上传
export const createR2StreamClient = () => new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  // 增加超时时间以应对网络问题
  requestHandler: {
    requestTimeout: 60000, // 60秒超时
    httpsAgent: {
      timeout: 30000, // 30秒连接超时
    }
  } as any,
  // 启用重试
  maxAttempts: 3,
});

export interface StreamUploadOptions {
  stream: ReadableStream | Response;
  contentType: string;
  contentLength?: number;
  path?: string;
  key: string;
}

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * 真正的零内存流式上传到R2 - 使用 @aws-sdk/lib-storage
 * ⚠️ 只能在 Node.js runtime 中使用！
 * @param options 流式上传选项
 * @returns 上传结果
 */
export const serverStreamUploadFile = async ({
  stream,
  contentType,
  contentLength,
  path = '',
  key,
}: StreamUploadOptions): Promise<UploadResult> => {
  if (!process.env.R2_BUCKET_NAME || !process.env.R2_PUBLIC_URL) {
    throw new Error('R2 configuration is missing');
  }

  const s3Client = createR2StreamClient();
  
  // 构建最终的key
  const finalKey = path
    ? path.endsWith('/') ? `${path}${key}` : `${path}/${key}`
    : key;

  try {
    console.log(`🚀 Starting TRUE stream upload to R2: ${finalKey}`);
    
    // 核心：将 Web ReadableStream 转换为 Node.js Readable
    let nodeStream: Readable;
    let computedContentLength: number | undefined;

    if (stream instanceof Response) {
      // 关键：不要调用 .arrayBuffer()！直接转换流
      const webStream = stream.body;
      if (!webStream) {
        throw new Error('Response body is null');
      }
      
      // 使用 Readable.fromWeb 转换 Web Stream 为 Node Readable
      nodeStream = Readable.fromWeb(webStream as any);
      
      // 从 headers 获取 Content-Length（不读取流内容）
      const responseContentLength = stream.headers.get('content-length');
      computedContentLength = responseContentLength ? parseInt(responseContentLength, 10) : contentLength;
      
      const fileSizeInfo = computedContentLength ? `${Math.round(computedContentLength / 1024)}KB` : 'unknown';
      console.log(`📊 Web Stream → Node Readable: ${fileSizeInfo}, ContentType: ${contentType}`);
    } else {
      // 假设已经是 Node.js Readable 或可直接使用
      nodeStream = stream as any;
      computedContentLength = contentLength;
    }

    const startTime = Date.now();
    
    // 关键决策：小文件用 PutObject，大文件用 Upload 分片
    const fileSize = computedContentLength || 0;
    const minMultipartSize = 6 * 1024 * 1024; // 6MB 安全阈值
    
    if (fileSize > 0 && fileSize < minMultipartSize) {
      // 小文件：使用 PutObjectCommand 流式上传
      console.log(`📁 小文件 (${Math.round(fileSize / 1024)}KB < 6MB): 使用 PutObject 流式上传`);
      
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: finalKey,
        Body: nodeStream, // 直接传递 Node.js Readable
        ContentType: contentType,
        ContentLength: computedContentLength,
      });

      await s3Client.send(command);
      
      const uploadTime = Date.now() - startTime;
      const url = `${process.env.R2_PUBLIC_URL}/${key}`;
      
      console.log(`✅ 🎯 小文件流式上传成功! 耗时: ${uploadTime}ms, URL: ${url}`);
      console.log(`💫 流式上传: Node Readable → R2 (零内存占用, 零磁盘I/O)`);
      
      return { url, key };
    } else {
      // 大文件：使用 Upload 分片上传
      console.log(`📦 大文件 (${Math.round(fileSize / 1024)}KB ≥ 6MB): 使用 Upload 分片上传`);
      
      // 使用 PassThrough 确保流的正确传递
      const passThrough = new PassThrough();
      
      const uploader = new Upload({
        client: s3Client,
        params: {
          Bucket: process.env.R2_BUCKET_NAME,
          Key: finalKey,
          Body: passThrough, // 传递 PassThrough 流
          ContentType: contentType,
          ...(computedContentLength && { ContentLength: computedContentLength }),
        },
        queueSize: 4, // 并发分片数
        partSize: 6 * 1024 * 1024, // 固定 6MB 分片，满足 R2 要求
        leavePartsOnError: false,
      });

      // 添加上传进度监听
      uploader.on('httpUploadProgress', (progress) => {
        const loaded = progress.loaded || 0;
        const total = progress.total || 0;
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        console.log(`📈 分片上传进度: ${percent}% (${Math.round(loaded / 1024)}KB / ${Math.round(total / 1024)}KB)`);
      });

      // 添加流错误监听
      nodeStream.on('error', (error) => {
        console.error(`❌ Node Stream 错误:`, error);
        passThrough.destroy(error);
      });
      
      passThrough.on('error', (error) => {
        console.error(`❌ PassThrough Stream 错误:`, error);
      });

      // 关键：管道连接，数据直接从源流到 R2
      nodeStream.pipe(passThrough);
      
      console.log(`💫 数据流管道: WebStream → NodeReadable → PassThrough → R2 (零内存复制)`);
      console.log(`⏱️ 开始等待分片上传完成...`);
      
      // 等待上传完成
      const result = await uploader.done();
      console.log(`🎉 分片上传器报告完成!`, result);
      
      const uploadTime = Date.now() - startTime;
      const url = `${process.env.R2_PUBLIC_URL}/${key}`;
      
      console.log(`✅ 🎯 大文件分片流式上传成功! 耗时: ${uploadTime}ms, URL: ${url}`);
      console.log(`🚀 分片上传优势: 零内存占用, 零磁盘I/O, 支持大文件, 数据直接流向R2`);
      
      return { url, key };
    }
  } catch (error) {
    console.error('❌ Stream upload failed:', error);
    
    // 提供更详细的错误信息
    if (error instanceof Error) {
      throw new Error(`Stream upload to R2 failed: ${error.message}`);
    }
    throw new Error('Stream upload to R2 failed: Unknown error');
  }
};