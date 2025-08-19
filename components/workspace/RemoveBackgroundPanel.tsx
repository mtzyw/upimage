"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Scissors, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import ImageUploader from "@/components/upload/ImageUploader";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface RemoveBackgroundPanelProps {
  uploadedImage: string | null;
  onFileSelected: (file: File) => void;
  onResult?: (result: { originalUrl: string; cdnUrl: string; taskId: string }) => void;
}

export default function RemoveBackgroundPanel({ 
  uploadedImage,
  onFileSelected,
  onResult 
}: RemoveBackgroundPanelProps) {
  const { user } = useAuth();
  const t = useTranslations("RemoveBackground");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // 处理文件选择
  const handleFileSelected = (file: File) => {
    setUploadedFile(file);
    onFileSelected(file);
  };

  const handleProcess = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!uploadedFile) {
      toast.error(t('upload.selectImage'));
      return;
    }
    
    setIsProcessing(true);

    try {
      // 将文件转换为 base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFile);
      });

      // 调用去除背景API
      const response = await fetch('/api/remove-background/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(t('messages.backgroundRemovalSuccess'));
        
        // 调用回调函数传递结果
        if (onResult) {
          onResult({
            originalUrl: result.data.originalUrl,
            cdnUrl: result.data.cdnUrl,
            taskId: result.data.taskId
          });
        }
      } else {
        toast.error(result.error || t('messages.backgroundRemovalFailed'));
      }
    } catch (error) {
      console.error('Error removing background:', error);
      toast.error(t('messages.networkError'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full sm:w-[350px] lg:w-[400px] xl:w-[450px] h-full bg-gray-900/95 border-r border-gray-700 flex flex-col overflow-hidden">
      {/* 标题区域 */}
      <div className="p-4 sm:p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Scissors className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{t('title')}</h2>
            <p className="text-sm text-gray-400">{t('description')}</p>
          </div>
        </div>
      </div>

      {/* 滚动内容区域 */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-gray-700/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-600/80">
        <div className="p-4 sm:p-6 space-y-6">
          {/* 图片上传区域 */}
          <div>
            <ImageUploader
              onFileSelected={handleFileSelected}
              maxSizeMB={10}
              acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
            />
          </div>

          {/* 功能说明 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">{t('features.title')}</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-gray-300 font-medium">{t('features.aiRecognition.title')}</p>
                  <p className="text-xs text-gray-500">{t('features.aiRecognition.description')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-gray-300 font-medium">{t('features.highQuality.title')}</p>
                  <p className="text-xs text-gray-500">{t('features.highQuality.description')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-gray-300 font-medium">{t('features.oneClick.title')}</p>
                  <p className="text-xs text-gray-500">{t('features.oneClick.description')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="p-4 sm:p-6 space-y-3">
        <Button
          onClick={handleProcess}
          disabled={isProcessing || !uploadedFile}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 text-sm font-medium rounded-lg"
        >
          {isProcessing ? (
            <div className="flex items-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              {t('upload.processing')}
            </div>
          ) : (
            <div className="flex items-center">
              <Scissors className="mr-2 h-4 w-4" />
              {t('button.startProcessing')}
            </div>
          )}
        </Button>

        {!uploadedFile && (
          <p className="text-gray-400 text-xs text-center">
            {t('upload.selectImage')}
          </p>
        )}
      </div>

      {/* 登录模态框 */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}