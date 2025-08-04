'use client'

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { generateBrowserFingerprint } from "@/lib/browser-fingerprint";
import { toast } from "sonner";

interface TaskStatus {
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  isCompleted: boolean;
  isFailed: boolean;
}

export default function ImageProcessingDemo() {
  const t = useTranslations('Landing.ImageProcessing');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState('standard');
  const [prompt, setPrompt] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  // 匿名试用状态
  const [browserFingerprint, setBrowserFingerprint] = useState<string | null>(null);
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskStatus | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

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

  // 轮询任务状态
  useEffect(() => {
    if (!currentTask || currentTask.isCompleted || currentTask.isFailed) {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch('/api/anonymous/trial/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: currentTask.taskId })
        });
        
        const data = await response.json();
        if (data.success) {
          const taskStatus = data.data;
          console.log('🎉 [ANONYMOUS TRIAL STATUS] 前端收到任务状态:', JSON.stringify(taskStatus, null, 2));
          console.log('🎉 [ANONYMOUS TRIAL STATUS] taskStatus.result?.cdnUrl:', taskStatus.result?.cdnUrl);
          
          // 先处理完成状态，再更新任务状态（避免竞态条件）
          if (taskStatus.isCompleted && taskStatus.result?.cdnUrl) {
            console.log('🎉 [ANONYMOUS TRIAL STATUS] 任务完成，设置结果图片:', taskStatus.result.cdnUrl);
            setResultImage(taskStatus.result.cdnUrl);
            setIsGenerating(false);
            setCurrentTask(taskStatus);
            toast.success('图片处理完成！');
          } else if (taskStatus.isFailed) {
            console.log('❌ [ANONYMOUS TRIAL STATUS] 任务失败');
            setIsGenerating(false);
            setCurrentTask(taskStatus);
            toast.error('图片处理失败，请重试');
          } else {
            // 只有处理中状态才更新任务状态
            setCurrentTask(taskStatus);
          }
        }
      } catch (error) {
        console.error('查询任务状态失败:', error);
      }
    };

    const interval = setInterval(pollStatus, 3000); // 每3秒轮询一次
    return () => clearInterval(interval);
  }, [currentTask]);

  // 复用工作台的下载逻辑
  const handleDownload = (url: string, taskId: string) => {
    try {
      // 使用 Cloudflare Worker 代理下载，避免CORS问题并提升性能
      const workerUrl = process.env.NEXT_PUBLIC_DOWNLOAD_WORKER_URL;
      
      if (!workerUrl) {
        toast.error('下载服务未配置，请联系管理员');
        return;
      }
      
      const filename = `enhanced-${taskId}.jpg`;
      const downloadUrl = `${workerUrl}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}&taskId=${taskId}`;
      
      // 直接跳转到下载链接，Worker会设置正确的响应头触发下载
      window.open(downloadUrl, '_blank');
      
      toast.success('开始下载增强图片');
    } catch (error) {
      console.error('下载失败:', error);
      toast.error('下载失败，请重试');
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error('请先选择图片');
      return;
    }

    if (!browserFingerprint) {
      toast.error('浏览器指纹获取失败，请刷新页面重试');
      return;
    }

    if (trialEligible === false) {
      // 静默跳转到登录页面，不显示弹窗
      window.location.href = '/login';
      return;
    }

    setIsGenerating(true);
    setResultImage(null);
    
    try {
      // 转换图片为 base64
      const base64Image = await fileToBase64(selectedImage);
      
      const response = await fetch('/api/anonymous/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          browserFingerprint,
          image: base64Image,
          scaleFactor: '4x', // 固定为4x放大
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
        setCurrentTask({
          taskId: data.data.taskId,
          status: 'processing',
          isCompleted: false,
          isFailed: false
        });
        toast.success(data.data.message || '免费试用已开始！');
      } else {
        setIsGenerating(false);
        toast.error(data.message || '开始试用失败');
        
        if (data.message?.includes('已使用过')) {
          setTrialEligible(false);
          // 可以跳转到登录页面
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      }
    } catch (error) {
      console.error('开始试用失败:', error);
      setIsGenerating(false);
      toast.error('开始试用失败，请重试');
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

  return (
    <div className="container mx-auto px-6 py-16">
      {/* 试用状态提示 */}
      {trialEligible === false && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span>该设备已使用过免费试用</span>
            </div>
            <p className="mt-2 text-gray-300 text-sm">
              请 <a href="/login" className="text-pink-400 hover:underline">登录</a> 使用完整功能
            </p>
          </div>
        </div>
      )}

      {trialEligible === true && !currentTask && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>可以使用免费试用</span>
            </div>
            <p className="mt-2 text-gray-300 text-sm">
              上传图片开始您的免费4x图片增强体验
            </p>
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
                  处理中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  {trialEligible === false ? '已用完试用' : '免费试用 4x 增强'}
                </>
              )}
            </Button>
            
            {/* 处理状态显示 */}
            {isGenerating && currentTask && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-medium">正在处理您的图片...</span>
                </div>
                <p className="text-gray-300 text-sm">
                  任务ID: {currentTask.taskId}
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  预计需要 1-2 分钟，请耐心等待
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 结果展示区域 */}
      {resultImage && (
        <div className="max-w-6xl mx-auto mt-16">
          <div className="text-center mb-8">
            <h3 className="text-white text-2xl font-bold mb-2">处理结果</h3>
            <p className="text-gray-400">您的图片已成功增强至 4x 分辨率</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* 原图 */}
            <div className="space-y-4">
              <h4 className="text-white text-lg font-semibold text-center">原图</h4>
              <div className="relative bg-gray-800/50 rounded-lg overflow-hidden">
                {preview && (
                  <Image
                    src={preview}
                    alt="Original image"
                    width={400}
                    height={300}
                    className="w-full h-auto object-contain"
                  />
                )}
                <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  原图
                </div>
              </div>
            </div>

            {/* 增强后的图 */}
            <div className="space-y-4">
              <h4 className="text-white text-lg font-semibold text-center">4x 增强结果</h4>
              <div className="relative bg-gray-800/50 rounded-lg overflow-hidden">
                <Image
                  src={resultImage}
                  alt="Enhanced image"
                  width={400}
                  height={300}
                  className="w-full h-auto object-contain"
                />
                <div className="absolute top-2 right-2 bg-pink-500/80 text-white px-2 py-1 rounded text-sm">
                  4x 增强
                </div>
              </div>
              
              {/* 下载按钮 */}
              <div className="text-center">
                <Button
                  onClick={() => {
                    if (resultImage && currentTask?.taskId) {
                      handleDownload(resultImage, currentTask.taskId);
                    } else {
                      toast.error('下载失败，任务信息缺失');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                >
                  下载增强图片
                </Button>
              </div>
            </div>
          </div>
          
          {/* 试用完成提示 */}
          <div className="mt-8 text-center p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <h4 className="text-yellow-400 font-semibold mb-2">免费试用已完成！</h4>
            <p className="text-gray-300 mb-4">
              想要更多高质量图片增强服务吗？登录解锁所有功能：
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <p>• 2x, 4x, 8x, 16x 多种放大倍数</p>
              <p>• 专业的人像、风景、艺术优化模式</p>
              <p>• 自定义提示词和高级参数调节</p>
              <p>• 无限制的图片处理次数</p>
            </div>
            <Button
              onClick={() => window.location.href = '/login'}
              className="mt-4 bg-pink-500 hover:bg-pink-600 text-white px-8 py-2 rounded-lg"
            >
              立即登录体验完整功能
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}