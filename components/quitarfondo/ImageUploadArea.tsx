'use client'

import { useState, useCallback } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface ImageUploadAreaProps {
  onImageUpload: (image: string) => void;
  uploadedImage: string | null;
}

export default function ImageUploadArea({ onImageUpload, uploadedImage }: ImageUploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);

  const triggerFileInput = () => {
    const input = document.getElementById('file-upload-new') as HTMLInputElement;
    input?.click();
  };

  const clearImage = () => {
    onImageUpload('');
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onImageUpload(result);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [onImageUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onImageUpload(result);
      };
      reader.readAsDataURL(file);
    }
  };


  return (
    <div className="w-full max-w-md mx-auto">
      {uploadedImage ? (
        // 显示已上传的图片 - 圆角矩形，类似参考图
        <div className="relative">
          <div className="relative border border-gray-300/20 rounded-3xl bg-gray-800/50 overflow-hidden aspect-[4/3]">
            <Image
              src={uploadedImage}
              alt="上传的图片"
              fill
              className="object-cover"
            />
          </div>
          
          {/* 清除按钮 */}
          <Button
            onClick={clearImage}
            className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-all duration-200 shadow-lg border-2 border-black/20"
            size="sm"
          >
            <X className="w-4 h-4" />
          </Button>
          
          {/* Replace Image 按钮 */}
          <div className="mt-4 flex justify-center">
            <Button
              onClick={triggerFileInput}
              className="bg-gray-800/80 hover:bg-gray-700 text-white px-4 py-2 text-sm rounded-xl border border-gray-600 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Replace Image
              </div>
            </Button>
          </div>
        </div>
      ) : (
        // 显示上传界面 - 大面积拖拽区域
        <div
          className={`
            relative border-2 border-dashed rounded-3xl text-center transition-all duration-200 min-h-[400px] flex flex-col items-center justify-center p-8
            ${isDragging 
              ? 'border-blue-400 bg-blue-400/5' 
              : 'border-gray-500/40 hover:border-gray-400/60 bg-transparent'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload-new"
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />
          
          <div className="space-y-8">
            {/* 大图标 */}
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-700/40 flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-300" />
            </div>
            
            {/* 标题和描述 */}
            <div className="space-y-3">
              <h3 className="text-2xl font-medium text-white">
                Choose Image
              </h3>
              <p className="text-gray-400 text-base max-w-sm mx-auto leading-relaxed">
                We accept .jpeg, .jpg, .png, .webp formats up to 24MB.
              </p>
            </div>
          </div>
          
          {/* 点击区域提示 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 cursor-pointer" onClick={triggerFileInput}>
            <div className="text-gray-400 text-sm">Click to upload or drag and drop</div>
          </div>
        </div>
      )}
    </div>
  );
}