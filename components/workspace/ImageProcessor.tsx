"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import LeftSidebar from "./LeftSidebar";
import LeftControlPanel from "./LeftControlPanel";
import RemoveBackgroundPanel from "./RemoveBackgroundPanel";
import ResultDisplayPanel from "./ResultDisplayPanel";
import RemoveBackgroundResultPanel from "./RemoveBackgroundResultPanel";

interface UserBenefits {
  totalAvailableCredits: number;
  subscriptionCreditsBalance: number;
  oneTimeCreditsBalance: number;
}

interface TaskStatus {
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  createdAt: string;
  scaleFactor: string;
  creditsConsumed: number;
  originalUrl?: string;
  cdnUrl?: string;
  completedAt?: string;
  error?: string;
  progress?: number;
  estimatedTimeRemaining?: string;
}

interface ImageProcessorProps {
  defaultTab?: string;
}

export default function ImageProcessor({ defaultTab }: ImageProcessorProps) {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("Enhance");
  
  // 上传和基本状态
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageKey, setUploadedImageKey] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  
  // 参数设置
  const [scaleFactor, setScaleFactor] = useState<'2x' | '4x' | '8x' | '16x'>('4x');
  const [optimizedFor, setOptimizedFor] = useState('standard');
  const [creativity, setCreativity] = useState([0]);
  const [hdr, setHdr] = useState([0]);
  const [prompt, setPrompt] = useState('');
  
  // 导航状态
  const [activeTab, setActiveTab] = useState(defaultTab || 'enhance');
  
  // 用户信息
  const [userBenefits, setUserBenefits] = useState<UserBenefits | null>(null);
  
  // 去除背景结果状态
  const [removeBackgroundResult, setRemoveBackgroundResult] = useState<{
    originalUrl: string;
    cdnUrl: string;
    taskId: string;
  } | null>(null);


  // 获取用户权益信息
  const fetchUserBenefits = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/benefits');
      const result = await response.json();
      
      if (result.success) {
        setUserBenefits(result.data);
      }
    } catch (error) {
      console.error('Error fetching user benefits:', error);
    }
  }, [user]);

  // 获取任务状态
  const fetchTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/enhance/status?taskId=${taskId}`);
      const result = await response.json();
      
      if (result.success) {
        // 重要：只有当查询的taskId与当前任务ID一致时才更新状态
        // 这样可以防止旧轮询的结果覆盖新任务的状态
        if (taskId === currentTaskId) {
          setTaskStatus(result.data);
          
          // 如果任务完成，停止轮询
          if (result.data.status === 'completed' || result.data.status === 'failed') {
            setIsProcessing(false);
            if (result.data.status === 'completed') {
              fetchUserBenefits(); // 刷新本地积分信息
              router.refresh(); // 触发服务端重新渲染，更新导航栏积分
              
            } else {
              toast.error(t('messages.processingFailed'));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching task status:', error);
    }
  }, [fetchUserBenefits, currentTaskId]);

  // 轮询任务状态 - 优化为2秒间隔
  useEffect(() => {
    if (currentTaskId && isProcessing) {
      const interval = setInterval(() => {
        fetchTaskStatus(currentTaskId);
      }, 2000); // 改为2秒

      return () => clearInterval(interval);
    }
  }, [currentTaskId, isProcessing, fetchTaskStatus]);

  useEffect(() => {
    if (user) {
      fetchUserBenefits();
    }
  }, [user, fetchUserBenefits]);

  const handleUploadSuccess = (url: string, key: string) => {
    setUploadedImage(url);
    setUploadedImageKey(key);
    setTaskStatus(null);
    setCurrentTaskId(null);
  };

  // 文件上传回调（需要获取实际文件对象）
  const handleFileSelected = (file: File) => {
    setUploadedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setUploadedImage(previewUrl);
    setTaskStatus(null);
    setCurrentTaskId(null);
  };

  const handleProcess = async () => {
    if (!uploadedFile || !user || !userBenefits) {
      toast.error(t('messages.selectImageFirst'));
      return;
    }

    // 检查积分
    const requiredCredits = getRequiredCredits(scaleFactor);
    if (userBenefits.totalAvailableCredits < requiredCredits) {
      toast.error(t('credits.insufficient'));
      return;
    }

    setIsProcessing(true);
    setTaskStatus(null); // 清空旧的任务结果
    setCurrentTaskId(null); // 立即清空旧的任务ID，防止旧轮询干扰

    try {
      // 将文件转换为 base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFile);
      });

      // 发送 JSON 数据
      const response = await fetch('/api/enhance/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
          scaleFactor,
          optimizedFor,
          engine: 'automatic',
          creativity: creativity[0],
          hdr: hdr[0],
          resemblance: 0,
          fractality: 0,
          prompt: prompt || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentTaskId(result.data.taskId);
        
        // 更新用户积分（乐观更新）
        setUserBenefits(prev => prev ? {
          ...prev,
          totalAvailableCredits: prev.totalAvailableCredits - requiredCredits
        } : null);
      } else {
        toast.error(result.error || t('messages.processingFailed'));
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error starting enhancement:', error);
      toast.error(t('messages.networkError'));
      setIsProcessing(false);
    }
  };

  const getRequiredCredits = (scaleFactor: string): number => {
    const creditMap: Record<string, number> = {
      '2x': 1, '4x': 2, '8x': 4, '16x': 8
    };
    return creditMap[scaleFactor] || 1;
  };

  const handleDownload = (url: string) => {
    try {
      if (!currentTaskId) {
        toast.error(t('messages.taskIdMissing'));
        return;
      }
      
      // 使用 Cloudflare Worker 代理下载，避免CORS问题并提升性能
      const workerUrl = process.env.NEXT_PUBLIC_DOWNLOAD_WORKER_URL;
      
      if (!workerUrl) {
        toast.error(t('messages.downloadServiceNotConfigured'));
        return;
      }
      
      const filename = `enhanced-${currentTaskId}.jpg`;
      const downloadUrl = `${workerUrl}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}&taskId=${currentTaskId}`;
      
      // 直接跳转到下载链接，Worker会设置正确的响应头触发下载
      window.open(downloadUrl, '_blank');
      
      toast.success(t('messages.downloadSuccess'));
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : t('messages.downloadFailed'));
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('messages.copySuccess'));
    } catch (error) {
      toast.error(t('messages.copyFailed'));
    }
  };

  // 处理去除背景结果
  const handleRemoveBackgroundResult = (result: { originalUrl: string; cdnUrl: string; taskId: string }) => {
    setRemoveBackgroundResult(result);
    // 创建一个TaskStatus对象来兼容现有的ResultDisplayPanel
    const fakeTaskStatus: TaskStatus = {
      taskId: result.taskId,
      status: 'completed',
      message: '背景去除完成',
      createdAt: new Date().toISOString(),
      scaleFactor: '1x',
      creditsConsumed: 2,
      originalUrl: result.originalUrl,
      cdnUrl: result.cdnUrl,
      completedAt: new Date().toISOString()
    };
    setTaskStatus(fakeTaskStatus);
    setCurrentTaskId(result.taskId);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-900/95">
      {/* 最左侧导航栏 */}
      <LeftSidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* 中间控制面板 */}
      {activeTab === 'enhance' && (
        <LeftControlPanel
          userBenefits={userBenefits}
          uploadedImage={uploadedImage}
          scaleFactor={scaleFactor}
          optimizedFor={optimizedFor}
          creativity={creativity}
          hdr={hdr}
          prompt={prompt}
          isProcessing={isProcessing}
          onFileSelected={handleFileSelected}
          onScaleFactorChange={setScaleFactor}
          onOptimizedForChange={setOptimizedFor}
          onCreativityChange={setCreativity}
          onHdrChange={setHdr}
          onPromptChange={setPrompt}
          onProcess={handleProcess}
          getRequiredCredits={getRequiredCredits}
        />
      )}
      
      {/* 去除背景控制面板 */}
      {activeTab === 'removeBackground' && (
        <RemoveBackgroundPanel
          uploadedImage={uploadedImage}
          onFileSelected={handleFileSelected}
          onResult={handleRemoveBackgroundResult}
        />
      )}
      
      {/* 其他功能的占位符 */}
      {activeTab !== 'enhance' && activeTab !== 'removeBackground' && (
        <div className="w-full sm:w-[350px] lg:w-[400px] xl:w-[450px] h-full bg-gray-800/50 border-r border-gray-700 flex flex-col items-center justify-center">
          <div className="text-gray-400 text-center">
            <div className="text-lg font-medium mb-2">{t('messages.developing')}</div>
            <div className="text-sm">{t('messages.comingSoon')}</div>
          </div>
        </div>
      )}
      
      {/* 右侧结果展示区域 */}
      {activeTab === 'removeBackground' ? (
        <RemoveBackgroundResultPanel
          taskStatus={taskStatus}
          isProcessing={isProcessing}
          onDownload={handleDownload}
          onCopyUrl={handleCopyUrl}
        />
      ) : (
        <ResultDisplayPanel
          taskStatus={taskStatus}
          isProcessing={isProcessing}
          onDownload={handleDownload}
          onCopyUrl={handleCopyUrl}
        />
      )}
    </div>
  );
}