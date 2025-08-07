'use client'

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle, X, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { generateBrowserFingerprint } from "@/lib/browser-fingerprint";
import { toast } from "sonner";
import { LoginModal } from "@/components/auth/LoginModal";

// 单个任务状态
interface SingleTaskStatus {
  taskId: string;
  scaleFactor: '2x' | '4x' | '8x' | '16x';
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  isCompleted: boolean;
  isFailed: boolean;
}

// 批量任务状态
interface BatchTaskStatus {
  batchId: string;
  tasks: SingleTaskStatus[];
  totalCount: number;
  completedCount: number;
  failedCount: number;
  isAllComplete: boolean;
}

export default function ImageProcessingDemo() {
  const t = useTranslations('Landing.ImageProcessing');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState('standard');
  const [prompt, setPrompt] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  // 匿名试用状态 - 批量版本
  const [browserFingerprint, setBrowserFingerprint] = useState<string | null>(null);
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<BatchTaskStatus | null>(null);
  const [resultImages, setResultImages] = useState<Record<string, string>>({});
  const [modalImage, setModalImage] = useState<{ url: string; scaleFactor: string } | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageSelect(e.target.files[0]);
    }
  };

  // 初始化浏览器指纹
  useEffect(() => {
    const initFingerprint = async () => {
      try {
        const { fingerprint } = await generateBrowserFingerprint();
        setBrowserFingerprint(fingerprint);
        
        // 检查试用资格
        const response = await fetch('/api/anonymous/trial/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ browserFingerprint: fingerprint })
        });
        
        const data = await response.json();
        if (data.success) {
          setTrialEligible(data.data.eligible);
          // 删除弹窗，静默处理
        }
      } catch (error) {
        console.error('初始化浏览器指纹失败:', error);
        setTrialEligible(false);
      }
    };
    
    initFingerprint();
  }, []);

  // 轮询批量任务状态
  useEffect(() => {
    if (!currentBatch || currentBatch.isAllComplete || currentBatch.batchId.startsWith('temp_')) {
      return; // 跳过临时占位符的轮询
    }

    const pollBatchStatus = async () => {
      try {
        const response = await fetch('/api/anonymous/trial/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId: currentBatch.batchId })
        });
        
        const data = await response.json();
        if (data.success) {
          const batchStatus = data.data;
          console.log('🎉 [ANONYMOUS BATCH TRIAL STATUS] 前端收到批量任务状态:', JSON.stringify(batchStatus, null, 2));
          
          setCurrentBatch(batchStatus);

          // 更新完成的任务结果图片
          const newResultImages = { ...resultImages };
          let hasNewResults = false;
          
          batchStatus.tasks.forEach((task: SingleTaskStatus) => {
            if (task.isCompleted && task.result?.cdnUrl && !newResultImages[task.scaleFactor]) {
              newResultImages[task.scaleFactor] = task.result.cdnUrl;
              hasNewResults = true;
              console.log(`✅ [ANONYMOUS BATCH TRIAL STATUS] ${task.scaleFactor} 任务完成:`, task.result.cdnUrl);
            }
          });
          
          if (hasNewResults) {
            setResultImages(newResultImages);
          }

          // 所有任务完成时停止生成状态
          if (batchStatus.isAllComplete) {
            setIsGenerating(false);
            setTrialEligible(false); // 标记试用已使用完毕
            const completedCount = batchStatus.completedCount;
            const failedCount = batchStatus.failedCount;
            
            if (completedCount > 0) {
              toast.success(`批量图片处理完成！成功 ${completedCount} 个${failedCount > 0 ? `，失败 ${failedCount} 个` : ''}`);
            } else {
              toast.error(t('errors.allProcessingFailed', { default: 'All image processing failed, please try again' }));
            }
          }
        }
      } catch (error) {
        console.error('查询批量任务状态失败:', error);
      }
    };

    const interval = setInterval(pollBatchStatus, 3000); // 每3秒轮询一次
    return () => clearInterval(interval);
  }, [currentBatch, resultImages, t]);

  // 复用工作台的下载逻辑
  const handleDownload = (url: string, taskId: string) => {
    try {
      // 使用 Cloudflare Worker 代理下载，避免CORS问题并提升性能
      const workerUrl = process.env.NEXT_PUBLIC_DOWNLOAD_WORKER_URL;
      
      if (!workerUrl) {
        toast.error(t('errors.downloadNotConfigured', { default: 'Download service not configured, please contact administrator' }));
        return;
      }
      
      const filename = `enhanced-${taskId}.jpg`;
      const downloadUrl = `${workerUrl}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}&taskId=${taskId}`;
      
      // 直接跳转到下载链接，Worker会设置正确的响应头触发下载
      window.open(downloadUrl, '_blank');
      
      toast.success(t('errors.downloadStarted', { default: 'Starting download of enhanced image' }));
    } catch (error) {
      console.error('下载失败:', error);
      toast.error(t('errors.downloadFailed', { default: 'Download failed, please try again' }));
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error(t('errors.selectImageFirst', { default: 'Please select an image first' }));
      return;
    }

    if (!browserFingerprint) {
      toast.error(t('errors.fingerprintFailed', { default: 'Browser fingerprint failed, please refresh and try again' }));
      return;
    }

    if (trialEligible === false) {
      // 显示登录弹窗
      setIsLoginModalOpen(true);
      return;
    }

    setIsGenerating(true);
    setResultImages({});
    
    // 立即显示4个加载框
    const placeholderBatch = {
      batchId: `temp_${Date.now()}`,
      tasks: ['2x', '4x', '8x', '16x'].map(scaleFactor => ({
        taskId: `temp_${scaleFactor}_${Date.now()}`,
        scaleFactor: scaleFactor as '2x' | '4x' | '8x' | '16x',
        status: 'processing' as const,
        isCompleted: false,
        isFailed: false
      })),
      totalCount: 4,
      completedCount: 0,
      failedCount: 0,
      isAllComplete: false
    };
    setCurrentBatch(placeholderBatch);
    
    try {
      // 转换图片为 base64
      const base64Image = await fileToBase64(selectedImage);
      
      const response = await fetch('/api/anonymous/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          browserFingerprint,
          image: base64Image,
          // 移除 scaleFactor，后端会创建 2x/4x/8x/16x 所有倍数
          optimizedFor: mode,
          prompt: prompt || undefined,
          creativity: 0,
          hdr: 0,
          resemblance: 0,
          fractality: 0,
          engine: 'automatic'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 用真实数据更新批量任务状态
        const batchData = data.data;
        setCurrentBatch({
          batchId: batchData.batchId,
          tasks: batchData.tasks.map((task: any) => ({
            taskId: task.task_id,
            scaleFactor: task.scale_factor,
            status: 'processing',
            isCompleted: false,
            isFailed: false
          })),
          totalCount: batchData.taskCount,
          completedCount: 0,
          failedCount: 0,
          isAllComplete: false
        });
        
        // 已移除弹窗提示
      } else {
        setIsGenerating(false);
        setCurrentBatch(null); // 清除占位符
        toast.error(data.message || t('errors.trialFailed', { default: 'Batch trial failed, please try again' }));
        
        if (data.message?.includes('已使用过')) {
          setTrialEligible(false);
          setTimeout(() => {
            setIsLoginModalOpen(true);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('开始批量试用失败:', error);
      setIsGenerating(false);
      setCurrentBatch(null); // 清除占位符
      toast.error(t('errors.trialFailed', { default: 'Batch trial failed, please try again' }));
    }
  };

  // 工具函数：文件转 base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 处理图片点击，显示大图弹窗
  const handleImageClick = (url: string, scaleFactor: string) => {
    setModalImage({ url, scaleFactor });
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalImage(null);
  };

  // 键盘事件处理（ESC关闭弹窗）和防止背景滚动
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalImage) {
        handleCloseModal();
      }
    };

    if (modalImage) {
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      // 恢复滚动
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalImage]);

  return (
    <div className="container mx-auto px-6 py-16">
      {/* 试用状态提示 */}
      {trialEligible === false && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span>{t('trialUsedDevice', { default: 'This device has used the free trial' })}</span>
            </div>
            <p className="mt-2 text-gray-300 text-sm">
              {t('pleaseLogin', { default: 'Please' })} <button onClick={() => setIsLoginModalOpen(true)} className="text-pink-400 hover:underline cursor-pointer">{t('loginText', { default: 'login' })}</button> {t('useFullFeatures', { default: 'to use full features' })}
            </p>
          </div>
        </div>
      )}

      {trialEligible === true && !currentBatch && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>{t('canUseTrial', { default: 'Free trial available' })}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* 左侧：上传图片区域 */}
        <div className="space-y-4">
          <h3 className="text-white text-xl font-semibold">
            {t('uploadTitle', { default: '上传图片' })}
          </h3>
          
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 cursor-pointer
              transition-all duration-200 min-h-[300px] flex flex-col items-center justify-center
              ${dragActive 
                ? 'border-pink-400 bg-pink-400/10' 
                : 'border-gray-600 hover:border-gray-500'
              }
              ${preview ? 'bg-gray-800/50' : 'bg-gray-900/50'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {preview ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={preview}
                  alt="Selected image"
                  width={250}
                  height={250}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {t('selected', { default: '已选择' })}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                  {dragActive ? (
                    <Upload className="w-8 h-8 text-pink-400" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-white font-medium text-lg">
                    {dragActive
                      ? t('dropHere', { default: '拖放图片到这里' })
                      : t('uploadPrompt', { default: '上传图片' })
                    }
                  </p>
                  <p className="text-gray-400 text-sm">
                    {t('supportedFormats', { default: '支持 JPEG, PNG, WebP 格式' })}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {t('dragOrClick', { default: '拖拽文件到此处或点击选择' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：模式选择和提示词输入 */}
        <div className="space-y-6">
          <h3 className="text-white text-xl font-semibold">
            {t('settingsTitle', { default: '处理设置' })}
          </h3>
          
          {/* 模式选择 */}
          <div className="space-y-3" style={{ marginTop: '10px' }}>
            <label className="text-yellow-400 font-medium">
              {t('modeLabel', { default: '优化类型' })}
            </label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="bg-gray-800/80 border-gray-600 text-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="standard" className="text-white hover:bg-gray-700">
                  {t('modes.standard', { default: '标准' })}
                </SelectItem>
                <SelectItem value="soft_portraits" className="text-white hover:bg-gray-700">
                  {t('modes.soft_portraits', { default: '柔和人像' })}
                </SelectItem>
                <SelectItem value="hard_portraits" className="text-white hover:bg-gray-700">
                  {t('modes.hard_portraits', { default: '锐化人像' })}
                </SelectItem>
                <SelectItem value="art_n_illustration" className="text-white hover:bg-gray-700">
                  {t('modes.art_n_illustration', { default: '艺术插画' })}
                </SelectItem>
                <SelectItem value="nature_n_landscapes" className="text-white hover:bg-gray-700">
                  {t('modes.nature_n_landscapes', { default: '自然风景' })}
                </SelectItem>
                <SelectItem value="films_n_photography" className="text-white hover:bg-gray-700">
                  {t('modes.films_n_photography', { default: '电影摄影' })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 提示词输入 */}
          <div className="space-y-3" style={{ marginTop: '10px' }}>
            <label className="text-pink-400 font-medium">
              {t('promptLabel', { default: '提示词内容输入框' })}
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('promptPlaceholder', { default: '描述您想要的效果，例如：增强细节，提高清晰度，保持自然色彩...' })}
              className="bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 resize-none min-h-[120px]"
              style={{ height: '108px', marginTop: '4px' }}
              rows={5}
              maxLength={500}
            />
            <div className="text-xs text-gray-400 text-right" style={{ marginTop: '8px' }}>
              {prompt.length}/500
            </div>
          </div>

          {/* 生成按钮 */}
          <div className="pt-4" style={{ marginTop: '0px', paddingTop: '0px' }}>
            <Button
              onClick={handleGenerate}
              disabled={!selectedImage || trialEligible === false || isGenerating}
              className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-4 text-lg font-medium rounded-xl"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('processing', { completed: currentBatch?.completedCount || 0, total: currentBatch?.totalCount || 4, default: 'Processing ({completed}/{total})' })}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  {trialEligible === false ? t('trialCompleted', { default: 'Free Trial Completed' }) : t('freeTrial', { default: 'Free Trial' })}
                </>
              )}
            </Button>
            
          </div>
        </div>
      </div>

      {/* 4格网格结果展示区域 */}
      {(currentBatch || Object.keys(resultImages).length > 0) && (
        <div className="max-w-7xl mx-auto mt-16">
          <div className="text-center mb-8">
            <h3 className="text-white text-2xl font-bold mb-2">{t('processingResults', { default: 'Processing Results' })}</h3>
          </div>
          
          {/* 4x1 网格布局 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {(['2x', '4x', '8x', '16x'] as const).map(scaleFactor => {
              const task = currentBatch?.tasks.find(t => t.scaleFactor === scaleFactor);
              const resultUrl = resultImages[scaleFactor];
              
              return (
                <div key={scaleFactor} className="space-y-4">
                  <h4 className="text-white text-lg font-semibold text-center">
                    {t('scaleEnhancement', { scale: scaleFactor, default: '{scale} Enhancement' })}
                  </h4>
                  
                  <div className="relative bg-gray-800/50 rounded-lg overflow-hidden min-h-[200px] flex items-center justify-center">
                    {resultUrl ? (
                      <div 
                        className="w-full h-full cursor-pointer group"
                        onClick={() => handleImageClick(resultUrl, scaleFactor)}
                      >
                        <Image
                          src={resultUrl}
                          alt={`${scaleFactor} enhanced`}
                          width={300}
                          height={200}
                          className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-200"
                        />
                        {/* 悬停提示 */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                            {t('clickToView', { default: 'Click to view large image' })}
                          </div>
                        </div>
                      </div>
                    ) : task ? (
                      <div className="text-center p-4">
                        {task.status === 'processing' ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-2" />
                            <p className="text-blue-400 text-sm">{t('processingInProgress', { default: 'Processing...' })}</p>
                          </>
                        ) : task.isFailed ? (
                          <>
                            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                            <p className="text-red-400 text-sm">{t('processingFailed', { default: 'Processing failed' })}</p>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">{t('waitingProcess', { default: 'Waiting to process' })}</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-600 text-sm">{t('notStarted', { default: 'Not started' })}</p>
                      </div>
                    )}
                    
                    {/* 状态标签 */}
                    <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {scaleFactor}
                    </div>
                    
                    {/* 完成标记 */}
                    {resultUrl && (
                      <div className="absolute top-2 left-2 bg-green-500/80 text-white px-2 py-1 rounded text-sm">
                        {t('completed', { default: '✓ Completed' })}
                      </div>
                    )}
                  </div>
                  
                  {/* 下载按钮 */}
                  {resultUrl && task && (
                    <div className="text-center">
                      <Button
                        onClick={() => handleDownload(resultUrl, task.taskId)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm w-full"
                      >
                        {t('downloadScale', { scale: scaleFactor, default: 'Download {scale}' })}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          
          {/* 试用完成提示 */}
          {currentBatch?.isAllComplete && (
            <div className="mt-8 text-center p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <h4 className="text-yellow-400 font-semibold mb-2">{t('trialCompletedTitle', { default: 'Free trial completed!' })}</h4>
              <p className="text-gray-300 mb-4">
                {t('trialCompletedDescription', { count: currentBatch.completedCount, default: 'Successfully processed {count} multiplier images. Want more high-quality image enhancement services? Login to unlock all features:' })}
              </p>
              <div className="space-y-2 text-sm text-gray-400 mb-4">
                <p>{t('unlimitedProcessing', { default: '• Unlimited image processing times' })}</p>
                <p>{t('professionalModes', { default: '• Professional portrait, landscape, and art optimization modes' })}</p>
                <p>{t('customPrompts', { default: '• Custom prompts and advanced parameter adjustment' })}</p>
                <p>{t('fasterProcessing', { default: '• Faster processing speed and priority support' })}</p>
              </div>
              <Button
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-2 rounded-lg"
              >
                {t('loginNowButton', { default: 'Login Now for Full Features' })}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 图片弹窗 */}
      {modalImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <Button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
              size="sm"
            >
              <X className="w-5 h-5" />
            </Button>
            
            {/* 倍数标签 */}
            <div className="absolute top-4 left-4 z-10 bg-black/70 text-white px-3 py-1 rounded-lg text-sm font-medium">
              {t('modalScaleLabel', { scale: modalImage.scaleFactor, default: '{scale} Enhancement' })}
            </div>
            
            {/* 大图显示 */}
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={modalImage.url}
                alt={`${modalImage.scaleFactor} enhanced large view`}
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                priority
              />
            </div>
            
            {/* 下载按钮 */}
            <div className="absolute bottom-4 right-4 z-10">
              <Button
                onClick={() => {
                  // 这里需要找到对应的taskId
                  const task = currentBatch?.tasks.find(t => t.scaleFactor === modalImage.scaleFactor);
                  if (task) {
                    handleDownload(modalImage.url, task.taskId);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('modalDownloadButton', { scale: modalImage.scaleFactor, default: 'Download {scale}' })}
              </Button>
            </div>
            
            {/* 底部提示 */}
            <div className="absolute bottom-4 left-4 z-10 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
              {t('modalCloseHint', { default: 'Press ESC or click background to close' })}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}