'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

interface ImageUploadZoneProps {
  onImageSelected: (file: File, previewUrl: string) => void;
  selectedImage?: { file: File; previewUrl: string } | null;
  onRemoveImage?: () => void;
  disabled?: boolean;
  maxSizeInMB?: number;
  acceptedFormats?: string[];
}

export function ImageUploadZone({
  onImageSelected,
  selectedImage,
  onRemoveImage,
  disabled = false,
  maxSizeInMB = 10,
  acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
}: ImageUploadZoneProps) {
  const t = useTranslations('Enhance');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    // 检查文件类型
    if (!acceptedFormats.includes(file.type)) {
      return '只支持 JPG、PNG、WebP 格式的图片';
    }

    // 检查文件大小
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return `图片大小不能超过 ${maxSizeInMB}MB`;
    }

    // 检查图片最小尺寸（可选）
    return null;
  }, [acceptedFormats, maxSizeInMB]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null);

    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      setUploadError(error.message);
      return;
    }

    if (acceptedFiles.length === 0) {
      return;
    }

    const file = acceptedFiles[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    // 创建预览 URL
    const previewUrl = URL.createObjectURL(file);
    onImageSelected(file, previewUrl);
  }, [onImageSelected, validateFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: maxSizeInMB * 1024 * 1024,
    disabled
  });

  if (selectedImage) {
    return (
      <Card className="p-4">
        <div className="relative">
          <div className="relative w-full max-w-md mx-auto">
            <Image
              src={selectedImage.previewUrl}
              alt="Selected image"
              width={400}
              height={300}
              className="rounded-lg object-contain w-full h-auto max-h-64"
            />
            {onRemoveImage && !disabled && (
              <Button
                onClick={onRemoveImage}
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground text-center">
            <p className="font-medium">{selectedImage.file.name}</p>
            <p>{(selectedImage.file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted">
            {isDragActive ? (
              <Upload className="h-8 w-8 text-primary" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragActive ? '放开以上传图片' : '拖拽图片到这里'}
            </p>
            <p className="text-sm text-muted-foreground">
              或者 <span className="text-primary font-medium">点击选择文件</span>
            </p>
            <p className="text-xs text-muted-foreground">
              支持 JPG、PNG、WebP 格式，最大 {maxSizeInMB}MB
            </p>
          </div>
          
          {!disabled && (
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              选择图片
            </Button>
          )}
        </div>
      </div>
      
      {uploadError && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">{uploadError}</p>
          </div>
        </div>
      )}
    </Card>
  );
}