// Re-export everything from cloudflare/r2
export * from './cloudflare/r2';

// Additional helper for File uploads
import { serverUploadFile } from './cloudflare/r2';

export async function uploadToR2(file: File, key: string) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  return serverUploadFile({
    data: buffer,
    contentType: file.type,
    key
  });
}