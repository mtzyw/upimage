'use client'

import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Wand2, Download, Loader2, ImageIcon, X, Clock, Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { useState, useCallback, useEffect, useMemo } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import AIExampleCarousel from "@/components/home/AIExampleCarousel";
import { BG1 } from "@/components/shared/BGs";
import ImagePreviewModal from "@/components/quitarfondo/ImagePreviewModal";

interface TaskResult {
  taskId: string;
  status: string;
  originalUrl?: string;
  cdnUrl?: string;
  editPrompt?: string;
  errorMessage?: string;
}

// 临时的历史记录组件
function QwenImageEditHistory({ pendingTasks, onSelectImage }: { pendingTasks?: any[]; onSelectImage: (imageUrl: string, editPrompt: string) => void }) {
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations();
  const tHistory = useTranslations("Landing.History");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const ITEMS_PER_PAGE = 5;
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    originalUrl?: string;
    title: string;
  }>({
    isOpen: false,
    imageUrl: '',
    originalUrl: '',
    title: ''
  });

  // 获取历史记录
  const fetchHistory = async (offset = 0, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }
      
      const response = await fetch(`/api/qwen-image-edit/history?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          // 用户未认证，设置空数组，不显示错误
          if (!isLoadMore) {
            setHistoryItems([]);
          }
          return;
        }
        throw new Error('获取历史记录失败');
      }

      const result = await response.json();
      if (result.success && result.data) {
        const newItems = result.data.items || [];
        
        if (isLoadMore) {
          // 追加新数据，去重处理
          setHistoryItems(prev => {
            const existingIds = new Set(prev.map((item: any) => item.id));
            const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id));
            return [...prev, ...uniqueNewItems];
          });
        } else {
          // 替换数据
          setHistoryItems(newItems);
        }
        
        setHasMore(newItems.length === ITEMS_PER_PAGE);
        setCurrentOffset(offset + ITEMS_PER_PAGE);
      } else {
        if (!isLoadMore) setHistoryItems([]);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      if (!isLoadMore) {
        setError(err instanceof Error ? err.message : '获取历史记录失败');
        setHistoryItems([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 加载更多数据
  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    
    console.log('Loading more data, current offset:', currentOffset);
    await fetchHistory(currentOffset, true);
  };

  // 滚动事件处理
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // 当滚动到距离底部50px以内时加载更多
    if (scrollHeight - scrollTop - clientHeight < 50 && hasMore && !loadingMore && !loading) {
      loadMore();
    }
  }, [hasMore, loadingMore, loading, loadMore]);

  // 组件加载时获取历史记录
  React.useEffect(() => {
    setCurrentOffset(0);
    setHasMore(true);
    fetchHistory(0, false);
    
    // 监听刷新事件
    const handleRefresh = () => {
      setCurrentOffset(0);
      setHasMore(true);
      fetchHistory(0, false);
    };
    
    window.addEventListener('refreshQwenHistory', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshQwenHistory', handleRefresh);
    };
  }, []);

  // 注意：轮询逻辑已移动到父组件 Hero 中

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'processing':
        return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'failed':
        return 'bg-red-600/20 text-red-400 border-red-600/30';
      default:
        return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'processing':
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case 'failed':
        return '✗';
      default:
        return '?';
    }
  };

  const handleImageClick = (item: any) => {
    const imageUrl = item.cdnUrl || item.originalUrl;
    
    if (imageUrl) {
      setPreviewModal({
        isOpen: true,
        imageUrl,
        originalUrl: item.originalUrl,
        title: `AI 图像编辑 - ${new Date(item.createdAt || item.timestamp).toLocaleString('zh-CN')}`
      });
    }
  };

  const handleDownload = (item: any) => {
    try {
      if (!item.cdnUrl) {
        toast.error(t('noImage'));
        return;
      }

      // 使用 Cloudflare Worker 代理下载，避免CORS问题并提升性能
      const workerUrl = process.env.NEXT_PUBLIC_DOWNLOAD_WORKER_URL;
      
      if (!workerUrl) {
        toast.error(t('downloadServiceNotConfigured'));
        return;
      }
      
      const filename = `qwen-image-edit-${item.taskId || Date.now()}.png`;
      const downloadUrl = `${workerUrl}/download?url=${encodeURIComponent(item.cdnUrl)}&filename=${encodeURIComponent(filename)}&taskId=${item.taskId}`;
      
      // 直接跳转到下载链接，Worker会设置正确的响应头触发下载
      window.open(downloadUrl, '_blank');
      
      toast.success(t('downloadStart'));
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('downloadError'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{tHistory('recentTasks')}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-400 text-sm">{tHistory('loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{tHistory('recentTasks')}</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-red-400 text-sm">{error}</p>
          <Button
            onClick={() => fetchHistory()}
            className="mt-2 text-xs"
            variant="outline"
          >
            {tHistory('retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{tHistory('recentTasks')}</h3>
        <Button
          variant="ghost"
          className="text-gray-400 hover:text-gray-300 hover:bg-transparent text-xs"
          onClick={() => window.location.href = '/zh/myhistory?tool=image-edit'}
        >
          <div className="flex items-center gap-1">
            查看全部
            <Clock className="w-3 h-3" />
          </div>
        </Button>
      </div>

      {/* History Items - Compact Row Layout with scroll */}
      <div 
        className="h-[calc(100vh-400px)] min-h-[500px] max-h-[700px] overflow-y-auto space-y-3 pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-gray-700/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-600/80"
        onScroll={handleScroll}
      >
        {(() => {
          // 如果有本地处理中的任务，显示它和历史记录
          // 显示所有待处理任务和历史记录，按创建时间倒序排列（最新的在顶部）
          const displayTasks = [...(pendingTasks || []), ...historyItems]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          if (displayTasks.length === 0) {
            return (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">{tHistory('noRecords')}</p>
              </div>
            );
          }

          return displayTasks.map((item) => (
            <div
              key={item.id}
              className="border border-gray-600/40 rounded-lg bg-gray-800/20 p-4 backdrop-blur-sm"
            >
              {/* Top Row: Timestamp and Status */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">
                  {new Date(item.createdAt || item.timestamp).toLocaleString('zh-CN')}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full border ${getStatusBadge(item.status)}`}>
                  {getStatusIcon(item.status)} {item.status === 'completed' ? tHistory('completed') : 
                   item.status === 'processing' ? tHistory('processing') : tHistory('failed')}
                </span>
              </div>

              {/* Main Row: Image + Content + Actions */}
              <div className="flex items-center gap-4">
                {/* Large Image Preview - 可点击 */}
                <div
                  className={`relative w-24 h-16 rounded-lg overflow-hidden bg-gray-700/50 flex-shrink-0 ${
                    item.status === 'processing' ? 'cursor-default' : 'cursor-pointer hover:opacity-80'
                  } transition-opacity`}
                  onClick={item.status === 'processing' ? undefined : () => handleImageClick(item)}
                  title={item.status === 'processing' ? '处理中...' : '点击查看大图'}
                >
                  {item.status === 'processing' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    </div>
                  ) : (item.cdnUrl || item.originalUrl) ? (
                    <img
                      src={item.cdnUrl || item.originalUrl}
                      alt="AI 处理结果"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-500 text-xs">{tHistory('noImage')}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {item.editPrompt || ''}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {tHistory('editPrompt')}
                  </p>
                </div>
              </div>

              {/* Bottom Row: Actions */}
              {item.status === 'completed' && item.cdnUrl && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleImageClick(item)}
                      className="bg-gray-700/60 hover:bg-gray-600/80 text-white px-4 py-2 text-sm rounded-lg border border-gray-600/50 transition-all duration-200"
                      title="{tHistory('viewLarge')}"
                    >
                      <div className="flex items-center gap-2">
                        <Maximize2 className="w-4 h-4" />
                        {tHistory('viewLarge')}
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleDownload(item)}
                      className="bg-gray-700/60 hover:bg-gray-600/80 text-white px-4 py-2 text-sm rounded-lg border border-gray-600/50 transition-all duration-200"
                      title="{tHistory('downloadImage')}"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        {tHistory('downloadImage')}
                      </div>
                    </Button>
                  </div>

                  <Button
                    onClick={() => {
                      if (item.originalUrl) {
                        onSelectImage(item.originalUrl, item.editPrompt || "");
                      }
                    }}
                    variant="ghost"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-sm"
                    title="{tHistory('reEdit')}"
                  >
                    {tHistory('reEdit')}
                  </Button>
                </div>
              )}

              {/* Error message for failed tasks */}
              {item.status === 'failed' && item.errorMessage && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-red-400 text-xs">{item.errorMessage}</p>
                </div>
              )}
            </div>
          ));
        })()}
        
        {/* 加载更多指示器 */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              {tHistory('loadingMore')}
            </div>
          </div>
        )}
        
        {/* 没有更多数据提示 */}
        {!hasMore && historyItems.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="text-gray-500 text-sm">
              {tHistory('noMoreTasks')}
            </div>
          </div>
        )}
      </div>

      {/* 图片预览弹窗 */}
      <ImagePreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        imageUrl={previewModal.imageUrl}
        originalUrl={previewModal.originalUrl}
        title={previewModal.title}
        onDownload={() => {
          const item = [...(pendingTasks || []), ...historyItems]
            .find(item => 
              item.cdnUrl === previewModal.imageUrl || item.originalUrl === previewModal.imageUrl
            );
          if (item) {
            handleDownload(item);
          }
        }}
      />
    </div>
  );
}

export default function AIImageToImagePage() {
  const t = useTranslations("Landing.Hero");
  const tPageTitle = useTranslations("Landing.AIImageToImage");
  const tHistory = useTranslations("Landing.History");
  const { user } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:2' | '2:3'>('1:1');
  const [outputCount, setOutputCount] = useState<1 | 2 | 4>(2);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]); // 支持多个并发任务
  const [realTaskIds, setRealTaskIds] = useState<Map<string, NodeJS.Timeout>>(new Map()); // 存储真实任务ID和对应的定时器
  const [userBenefits, setUserBenefits] = useState<{subscriptionStatus: string | null} | null>(null);
  const router = useRouter();

  // 获取用户权益信息
  useEffect(() => {
    if (user) {
      fetch('/api/user/benefits')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUserBenefits(data.data);
          }
        })
        .catch(error => {
          console.error('获取用户权益失败:', error);
        });
    } else {
      setUserBenefits(null);
    }
  }, [user]);

  // 检查是否可以使用数字4
  const canUseCount4 = useMemo(() => {
    if (!user) return false;
    if (!userBenefits) return false;
    return userBenefits.subscriptionStatus === 'active' || 
           userBenefits.subscriptionStatus === 'trialing';
  }, [user, userBenefits]);

  // 检查图片尺寸是否满足要求
  const checkImageDimensions = (file: File): Promise<{ valid: boolean; width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const { width, height } = img;
        URL.revokeObjectURL(url);
        
        const valid = width >= 256 && height >= 256;
        resolve({ valid, width, height });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, width: 0, height: 0 });
      };
      
      img.src = url;
    });
  };

  // 开始轮询特定任务的状态
  const startTaskPolling = (realTaskId: string, tempTaskId: string) => {
    console.log('开始轮询真实任务状态:', realTaskId, '临时ID:', tempTaskId, '当前时间:', new Date().toLocaleString());
    
    // 每3秒静默查询一次特定任务状态
    const refreshInterval = setInterval(async () => {
      console.log('静默查询任务状态...', realTaskId, '查询时间:', new Date().toLocaleString());
      
      try {
        const response = await fetch(`/api/qwen-image-edit/status/${realTaskId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const task = result.data;
            console.log('任务状态查询结果:', task.status);
            
            if (task.status === 'completed' || task.status === 'failed') {
              console.log('任务已完成，停止查询并更新任务, 完成时间:', new Date().toLocaleString());
              
              // 清除定时器
              clearInterval(refreshInterval);
              const timeoutId = realTaskIds.get(realTaskId);
              if (timeoutId) {
                clearTimeout(timeoutId);
                setRealTaskIds(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(realTaskId);
                  return newMap;
                });
              }
              
              // 用真实数据替换临时任务
              const completedTask = {
                ...task,
                tempTaskId: tempTaskId,
                timestamp: new Date(task.createdAt).toLocaleString('zh-CN'),
                filename: `qwen-image-edit-${task.taskId}`
              };
              
              console.log('准备发送 replacePendingTask 事件:', completedTask);
              window.dispatchEvent(new CustomEvent('replacePendingTask', { detail: completedTask }));
            }
          }
        } else {
          console.log('任务状态查询失败:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('查询任务状态失败:', error);
      }
    }, 3000);
    
    // 60秒后停止查询（防止无限轮询）
    const timeoutId = setTimeout(() => {
      clearInterval(refreshInterval);
      console.log('静默查询超时，停止轮询 - 任务可能失败或webhook延迟');
      
      // 超时时设置任务为失败状态
      setPendingTasks(prev => 
        prev.map(task => 
          task.id === tempTaskId 
            ? { ...task, status: 'failed', statusMessage: '处理超时' }
            : task
        )
      );
      
      // 从realTaskIds中移除
      setRealTaskIds(prev => {
        const newMap = new Map(prev);
        newMap.delete(realTaskId);
        return newMap;
      });
    }, 60000);
    
    // 保存定时器到Map中
    setRealTaskIds(prev => {
      const newMap = new Map(prev);
      newMap.set(realTaskId, timeoutId);
      return newMap;
    });
  };

  // 监听替换临时任务的事件
  React.useEffect(() => {
    const handleReplacePendingTask = (event: any) => {
      const completedTask = event.detail;
      console.log('🎉 接收到替换临时任务事件，就地更新任务数据:', completedTask);
      console.log('🛑 停止静默查询，任务已完成，时间:', new Date().toLocaleString());
      
      // 在 pendingTasks 数组中找到对应的临时任务并就地更新为真实完成数据
      setPendingTasks(prev => 
        prev.map(task => {
          if (task.id === completedTask.tempTaskId) {
            return {
              id: completedTask.taskId,
              status: completedTask.status,
              statusMessage: completedTask.statusMessage,
              creditsConsumed: completedTask.creditsConsumed,
              originalUrl: completedTask.originalUrl,
              cdnUrl: completedTask.cdnUrl,
              errorMessage: completedTask.errorMessage,
              createdAt: completedTask.createdAt,
              completedAt: completedTask.completedAt,
              timestamp: completedTask.timestamp,
              filename: completedTask.filename,
              processingTime: completedTask.processingTime,
              editPrompt: completedTask.editPrompt
            };
          }
          return task;
        })
      );
      
      console.log('✅ 任务数据在数组中就地更新完成，无需刷新历史记录');
    };
    
    window.addEventListener('replacePendingTask', handleReplacePendingTask);
    return () => {
      window.removeEventListener('replacePendingTask', handleReplacePendingTask);
    };
  }, []);


  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // 检查图片尺寸
      const { valid, width, height } = await checkImageDimensions(file);
      
      if (!valid) {
        setError(`图片尺寸过小。当前尺寸：${width}x${height} 像素，要求最小尺寸：256x256 像素。请上传更大尺寸的图片。`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        // 重置错误状态
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10485760, // 10MB
    multiple: false
  });

  const handleStartProcessing = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    
    if (!uploadedImage) {
      setError('请先上传图片');
      return;
    }

    // 额外的安全检查：确保图片格式正确
    if (!uploadedImage.startsWith('data:image/')) {
      setError('上传的文件格式不正确，请上传有效的图片文件');
      return;
    }

    if (isProcessing) {
      return; // 防止重复点击
    }

    try {
      setIsProcessing(true);
      setError(null);
      console.log('开始执行 Qwen 图像编辑...', {
        image: uploadedImage?.substring(0, 50) + '...',
        prompt: prompt.trim(),
        aspectRatio,
        outputCount
      });
      
      // 第一步：立即创建所有临时任务显示给用户
      const taskConfigs = [];
      for (let i = 0; i < outputCount; i++) {
        const tempTaskId = `temp_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
        const processingTask = {
          id: tempTaskId,
          status: 'processing' as const,
          statusMessage: tHistory('processing'),
          creditsConsumed: 2,
          originalUrl: uploadedImage,
          cdnUrl: undefined,
          errorMessage: undefined,
          createdAt: new Date().toISOString(),
          completedAt: undefined,
          timestamp: new Date().toLocaleString('zh-CN'),
          filename: `qwen-image-edit-${Date.now()}-${i+1}`,
          processingTime: undefined,
          editPrompt: prompt.trim()
        };

        // 立即添加任务到UI显示
        setPendingTasks(prev => [...prev, processingTask]);
        
        // 保存任务配置供后续API调用
        taskConfigs.push({
          tempTaskId,
          taskIndex: i + 1
        });
      }

      // 第二步：并发发送所有API请求
      const apiPromises = taskConfigs.map(async (config) => {
        try {
          const response = await fetch('/api/qwen-image-edit/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: uploadedImage,
              prompt: prompt.trim(),
              num_images: 1, // 每次只生成一张
              guidance_scale: 4,
              num_inference_steps: 30,
              aspectRatio: aspectRatio,
              tempTaskId: config.tempTaskId
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`Qwen 图像编辑任务 ${config.taskIndex}/${outputCount} 提交成功:`, result);
            
            // 添加真实任务ID，开始轮询
            if (result.data?.taskId) {
              const realTaskId = result.data.taskId;
              startTaskPolling(realTaskId, config.tempTaskId);
              console.log(`任务 ${config.taskIndex}/${outputCount} 真实ID:`, realTaskId);
            }
            return { success: true, config };
          } else {
            const errorData = await response.json();
            console.error(`任务 ${config.taskIndex}/${outputCount} 失败:`, errorData);
            return { success: false, config, error: errorData };
          }
        } catch (error) {
          console.error(`任务 ${config.taskIndex}/${outputCount} 请求异常:`, error);
          return { success: false, config, error };
        }
      });

      // 等待所有API请求完成
      const results = await Promise.all(apiPromises);
      
      // 处理失败的任务 - 从UI中移除
      results.forEach(result => {
        if (!result.success) {
          setPendingTasks(prev => prev.filter(task => task.id !== result.config.tempTaskId));
        }
      });

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0) {
        console.log(`${successCount}/${outputCount} 个任务已提交到 fal.ai 队列，等待 webhook 完成...`);
      }
      
      if (failCount > 0) {
        // 检查是否是并发限制错误
        const concurrencyError = results.find(r => !r.success && 
          r.error?.message?.includes('当前任务队列已满'));
        
        if (concurrencyError) {
          setError('任务队列已满，请等待之前的任务完成后再试');
        } else {
          setError(`${failCount} 个任务提交失败`);
        }
      }
        
    } catch (error) {
      console.error('处理错误:', error);
      setError(error instanceof Error ? error.message : '处理失败');
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="w-full min-h-screen">
      <BG1 />
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center space-y-6 mb-12">
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-white">{tPageTitle("title.part1")}</span>
              <br />
              <span className="text-cyan-400">{tPageTitle("title.part2")}</span>
              <span className="text-white"> & </span>
              <span className="text-yellow-400">{tPageTitle("title.part3")}</span>
              <span className="text-white"> ✨</span>
            </h1>

            <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
              {tPageTitle("description")}
            </p>
          </div>
        </div>

        {/* Upload Area with Side-by-Side Layout */}
        <div className="grid lg:grid-cols-2 gap-8 lg:items-start">
          {/* Left Side - Upload Area */}
          <div className="space-y-4 lg:h-full flex flex-col">
            {/* 图片上传 */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Image Upload</h3>
              <p className="text-gray-400 text-sm">Upload an image to use as a reference, maximum 5 images allowed.</p>
              
              <div className="w-full">
                {uploadedImage ? (
                  <div className="relative">
                    <div className="relative border-2 border-dashed border-gray-500/40 rounded-lg bg-gray-800/30 p-3 h-[150px] flex items-center justify-center">
                      <img
                        src={uploadedImage}
                        alt="已上传的图片"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                    
                    {/* 清除按钮 */}
                    <Button
                      onClick={() => {
                        setUploadedImage(null);
                        setError(null);
                      }}
                      className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full"
                      size="sm"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`
                      relative border-2 border-dashed rounded-lg text-center transition-all duration-200 h-[150px] flex flex-col items-center justify-center p-4 cursor-pointer
                      ${isDragActive 
                        ? 'border-blue-400 bg-blue-400/5' 
                        : 'border-gray-500/40 hover:border-gray-400/60 bg-gray-800/20'
                      }
                    `}
                  >
                    <input {...getInputProps()} />
                    
                    <div className="space-y-3">
                      <div className="w-8 h-8 mx-auto">
                        <Upload className="w-full h-full text-gray-400" />
                      </div>
                      
                      <Button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-md text-sm">
                        Upload Image
                      </Button>
                      
                      <p className="text-gray-400 text-xs">
                        We accept .jpeg, .jpg, .png, .webp formats up to 24MB.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 迅速的 */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Prompt</h3>
              <p className="text-gray-400 text-sm">Describe what you want to change in the image</p>
              
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Example: Change the background to a blue sky."
                  className="w-full h-20 px-3 py-2 bg-gray-800/60 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-sm"
                  maxLength={1000}
                />
                <div className="absolute bottom-2 right-2 text-gray-500 text-xs">
                  {prompt.length}/1000
                </div>
              </div>
            </div>

            {/* 长宽比 */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Aspect Ratio</h3>
              <p className="text-gray-400 text-sm">Choose the aspect ratio you want to use</p>
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { ratio: '1:1' as const, label: '1:1' },
                  { ratio: '3:2' as const, label: '3:2' },
                  { ratio: '2:3' as const, label: '2:3' }
                ].map((item) => (
                  <div
                    key={item.ratio}
                    onClick={() => setAspectRatio(item.ratio)}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                      aspectRatio === item.ratio 
                        ? 'border-white bg-gray-800/40' 
                        : 'border-gray-600 hover:border-gray-500 bg-gray-800/20'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <div className={`bg-gray-600 rounded ${
                        item.ratio === '1:1' ? 'w-6 h-6' :
                        item.ratio === '3:2' ? 'w-8 h-5' :
                        'w-5 h-8'
                      }`} />
                    </div>
                    <div className="text-center text-white text-sm font-medium">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 输出数量 */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-white">Number of Outputs</h3>
              <p className="text-gray-400 text-sm">Choose the number of outputs you want to generate</p>
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { num: 1 as const },
                  { num: 2 as const },
                  { num: 4 as const }
                ].map((item) => (
                  <div
                    key={item.num}
                    onClick={() => {
                      if (item.num === 4 && !canUseCount4) {
                        return; // 无权限直接返回
                      }
                      setOutputCount(item.num);
                    }}
                    className={`border-2 rounded-lg p-3 transition-all duration-200 text-center ${
                      outputCount === item.num 
                        ? 'border-white bg-gray-800/40' 
                        : item.num === 4 && !canUseCount4
                          ? 'border-gray-600 bg-gray-800/10 opacity-50 cursor-not-allowed'
                          : 'border-gray-600 hover:border-gray-500 bg-gray-800/20 cursor-pointer'
                    }`}
                  >
                    <div className="text-lg font-bold text-white">
                      {item.num}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 生成按钮 */}
            <div className="lg:flex-1 lg:flex lg:flex-col lg:justify-end">
              <Button
                onClick={handleStartProcessing}
                disabled={!uploadedImage || !prompt.trim() || isProcessing}
                className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-600 text-black disabled:text-gray-400 py-3 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed mt-auto"
              >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  Generate Images {outputCount} 🔥
                </div>
              )}
              </Button>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-950/50 border border-red-700 rounded-lg mt-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Side - History or Demo */}
          <div className="space-y-6 mt-28 lg:mt-0 h-full">
            {user ? (
              // 已登录用户显示历史记录
              <QwenImageEditHistory 
                pendingTasks={pendingTasks}
                onSelectImage={(imageUrl, editPrompt) => {
                  setUploadedImage(imageUrl);
                  setPrompt(editPrompt || "");
                }}
              />
            ) : (
              // 未登录用户显示示例轮播
              <AIExampleCarousel />
            )}
          </div>
        </div>
      </div>


      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}