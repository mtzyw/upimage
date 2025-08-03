"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import LeftSidebar from "./LeftSidebar";
import LeftControlPanel from "./LeftControlPanel";
import ResultDisplayPanel from "./ResultDisplayPanel";

interface UserBenefits {
  credits: number;
  isPro: boolean;
  maxUploadSize: number;
  dailyLimit: number;
  dailyUsed: number;
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

export default function ImageProcessor() {
  const { user } = useAuth();
  
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
  const [activeTab, setActiveTab] = useState('enhance');
  
  // 用户信息
  const [userBenefits, setUserBenefits] = useState<UserBenefits | null>(null);

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
        setTaskStatus(result.data);
        
        // 如果任务完成，停止轮询
        if (result.data.status === 'completed' || result.data.status === 'failed') {
          setIsProcessing(false);
          if (result.data.status === 'completed') {
            toast.success('图像增强完成！');
            fetchUserBenefits(); // 刷新积分信息
          } else {
            toast.error('图像处理失败');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching task status:', error);
    }
  }, [fetchUserBenefits]);

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
      toast.error('请先选择图片');
      return;
    }

    // 检查积分
    const requiredCredits = getRequiredCredits(scaleFactor);
    if (userBenefits.credits < requiredCredits) {
      toast.error('积分不足，请先充值');
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
        toast.success('图像处理已开始');
        
        // 更新用户积分（乐观更新）
        setUserBenefits(prev => prev ? {
          ...prev,
          credits: prev.credits - requiredCredits
        } : null);
      } else {
        toast.error(result.error || '处理失败，请重试');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error starting enhancement:', error);
      toast.error('网络错误，请重试');
      setIsProcessing(false);
    }
  };

  const getRequiredCredits = (scaleFactor: string): number => {
    const creditMap: Record<string, number> = {
      '2x': 1, '4x': 2, '8x': 4, '16x': 8
    };
    return creditMap[scaleFactor] || 1;
  };

  const handleDownload = async (url: string) => {
    try {
      if (!currentTaskId) {
        toast.error('任务ID缺失，无法下载');
        return;
      }
      
      // 使用后端代理API下载图片，避免CORS问题
      const proxyUrl = `/api/enhance/download?url=${encodeURIComponent(url)}&taskId=${currentTaskId}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '下载失败');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `enhanced-${currentTaskId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('图片下载成功');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : '下载失败，请重试');
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('链接已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] sm:h-[calc(100vh-100px)] lg:h-[840px] w-full max-h-screen overflow-hidden bg-gray-900/95">
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
      
      {/* 其他功能的占位符 */}
      {activeTab !== 'enhance' && (
        <div className="w-full sm:w-[350px] lg:w-[400px] xl:w-[450px] h-full bg-gray-800/50 border-r border-gray-700 flex flex-col items-center justify-center">
          <div className="text-gray-400 text-center">
            <div className="text-lg font-medium mb-2">功能开发中</div>
            <div className="text-sm">该功能正在开发中，敬请期待</div>
          </div>
        </div>
      )}
      
      {/* 右侧结果展示区域 */}
      <ResultDisplayPanel
        taskStatus={taskStatus}
        isProcessing={isProcessing}
        onDownload={handleDownload}
        onCopyUrl={handleCopyUrl}
      />
    </div>
  );
}