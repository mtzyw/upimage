"use client";

import { BG1 } from "@/components/shared/BGs";
import { Button } from "@/components/ui/button";
import ImagePreviewModal from "@/components/quitarfondo/ImagePreviewModal";
import { Loader2, ChevronLeft, ChevronRight, Clock, Download, Maximize2, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import { useTranslations } from 'next-intl';
import { toast } from "sonner";
import React from "react";

// 历史记录项类型定义
interface HistoryItem {
  id?: string;
  taskId?: string;
  status: string;
  prompt?: string;
  cdnUrl?: string;
  createdAt: string;
  aspectRatio?: string;
  scaleFactor?: string;
  [key: string]: any; // 允许其他属性
}

// AI示例轮播组件
function AIExampleCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const t = useTranslations('AIImageGenerator.demo');

  const examples = [
    {
      id: 1,
      title: t('examples.landscape.title'),
      description: t('examples.landscape.description'),
      image: "https://cdn.imgenhancer.ai/image.png",
      prompt: t('examples.landscape.prompt')
    },
    {
      id: 2,
      title: t('examples.portrait.title'),
      description: t('examples.portrait.description'),
      image: "https://cdn.imgenhancer.ai/image2.png", 
      prompt: t('examples.portrait.prompt')
    },
    {
      id: 3,
      title: t('examples.abstract.title'),
      description: t('examples.abstract.description'),
      image: "https://cdn.imgenhancer.ai/image4.png",
      prompt: t('examples.abstract.prompt')
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % examples.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [examples.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + examples.length) % examples.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % examples.length);
  };

  const currentExample = examples[currentIndex];

  return (
    <div className="rounded-xl overflow-hidden bg-gray-800/50 backdrop-blur-sm border border-gray-600 shadow-lg mt-15">
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">{t('title')}</h3>

        <div className="relative mb-6">
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-700">
            <img
              src={currentExample.image}
              alt={currentExample.title}
              className="w-full h-full object-cover transition-all duration-500"
            />

            <button
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 backdrop-blur-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 backdrop-blur-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex justify-center mt-6 space-x-2">
          {examples.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex
                ? 'bg-purple-500 w-6'
                : 'bg-gray-500 hover:bg-gray-400'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// 最近任务展示组件 - 连接实际API
function RecentTasksHistory({ refreshTrigger, onSetPendingTasks }: { 
  refreshTrigger: number; 
  onSetPendingTasks: (operations: PendingTasksOperations) => void;
}) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<HistoryItem[]>([]); // 添加本地待处理任务状态
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const ITEMS_PER_PAGE = 5;
  const [pollingIntervals, setPollingIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [realTaskIds, setRealTaskIds] = useState<Map<string, NodeJS.Timeout>>(new Map()); // 存储真实任务ID和定时器
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
  const { user } = useAuth();
  const t = useTranslations('AIImageGenerator.history');
  const tStatus = useTranslations('AIImageGenerator.status');

  // 获取历史记录
  const fetchHistory = async (offset = 0, isLoadMore = false) => {
    if (!user) {
      if (!isLoadMore) {
        setHistoryItems([]);
        setLoading(false);
      }
      return;
    }

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }
      
      const response = await fetch(`/api/text-to-image/history?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          if (!isLoadMore) {
            setHistoryItems([]);
          }
          return;
        }
        throw new Error(t('fetchError'));
      }

      const result = await response.json();
      if (result.success && result.data) {
        const newItems = result.data.items || [];
        
        if (isLoadMore) {
          // 追加新数据，去重处理
          setHistoryItems(prev => {
            const existingIds = new Set(prev.map((item: HistoryItem) => item.id || item.taskId));
            const uniqueNewItems = newItems.filter((item: HistoryItem) => !existingIds.has(item.id || item.taskId));
            return [...prev, ...uniqueNewItems];
          });
        } else {
          // 替换数据
          setHistoryItems(newItems);
        }
        
        setHasMore(newItems.length === ITEMS_PER_PAGE);
        setCurrentOffset(offset + ITEMS_PER_PAGE);
        
        // 为处理中的任务启动轮询
        newItems.forEach((item: any) => {
          if (item.status === 'processing' && !pollingIntervals.has(item.taskId)) {
            startHistoryTaskPolling(item.taskId);
          }
        });
      } else {
        if (!isLoadMore) setHistoryItems([]);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      if (!isLoadMore) {
        setError(err instanceof Error ? err.message : t('fetchError'));
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
  }, [hasMore, loadingMore, loading, currentOffset]);

  // 开始轮询特定任务的状态（首页式）
  const startTaskPolling = (realTaskId: string, tempTaskId: string) => {
    console.log('🎯 开始轮询真实任务状态:', realTaskId, '临时ID:', tempTaskId);
    
    // 每3秒静默查询一次特定任务状态
    const refreshInterval = setInterval(async () => {
      console.log('🔍 静默查询任务状态...', realTaskId);
      
      try {
        const response = await fetch(`/api/text-to-image/status?taskId=${realTaskId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const task = result.data;
            console.log('📊 任务状态查询结果:', task.status);
            
            if (task.status === 'completed' || task.status === 'failed') {
              console.log('✅ 任务已完成，停止查询并更新任务');
              
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
                id: task.taskId,
                timestamp: new Date(task.createdAt).toLocaleString('zh-CN')
              };
              
              console.log('🔄 更新 pendingTasks 中的任务数据，realTaskId:', realTaskId);
              setPendingTasks(prev => 
                prev.map(item => {
                  // 匹配真实任务ID，因为在startPollingForTask中已经更新了taskId
                  if (item.taskId === realTaskId) {
                    console.log('✅ 找到匹配任务，更新为完成状态:', completedTask);
                    return completedTask;
                  }
                  return item;
                })
              );
            }
          }
        } else {
          console.log('❌ 任务状态查询失败:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('💥 查询任务状态失败:', error);
      }
    }, 3000);
    
    // 60秒后停止查询（防止无限轮询）
    const timeoutId = setTimeout(() => {
      clearInterval(refreshInterval);
      console.log('⏰ 静默查询超时，停止轮询 - 任务可能失败或webhook延迟');
      
      // 超时时设置任务为失败状态
      setPendingTasks(prev => 
        prev.map(task => 
          task.taskId === realTaskId 
            ? { ...task, status: 'failed', statusMessage: t('timeout') }
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

  // 启动单个任务的状态轮询（历史记录用）
  const startHistoryTaskPolling = (taskId: string) => {
    if (pollingIntervals.has(taskId)) {
      return; // 已经在轮询中
    }

    console.log(`🔄 开始轮询任务状态: ${taskId}`);
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/text-to-image/status?taskId=${taskId}`);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data) {
            const task = result.data;
            console.log(`📊 任务 ${taskId} 状态: ${task.status}`);
            
            // 更新列表中的任务状态
            setHistoryItems(prev => 
              prev.map(item => 
                item.taskId === taskId 
                  ? { ...item, ...task, id: task.taskId }
                  : item
              )
            );
            
            // 如果任务完成或失败，停止轮询
            if (task.status === 'completed' || task.status === 'failed') {
              console.log(`✅ Task ${taskId} ${task.status === 'completed' ? 'completed' : 'failed'}, stopping polling`);
              clearInterval(interval);
              setPollingIntervals(prev => {
                const newMap = new Map(prev);
                newMap.delete(taskId);
                return newMap;
              });
            }
          }
        }
      } catch (error) {
        console.error(`轮询任务 ${taskId} 状态失败:`, error);
      }
    }, 3000); // 每3秒查询一次

    setPollingIntervals(prev => {
      const newMap = new Map(prev);
      newMap.set(taskId, interval);
      return newMap;
    });

    // 60秒后停止轮询（防止无限轮询）
    setTimeout(() => {
      clearInterval(interval);
      setPollingIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(taskId);
        return newMap;
      });
    }, 60000);
  };

  // 暴露函数给子组件调用
  const addPendingTask = (task: any) => {
    console.log('📌 添加待处理任务:', task);
    setPendingTasks(prev => [...prev, task]);
  };

  const removePendingTask = (tempTaskId: string) => {
    console.log('❌ 移除失败任务:', tempTaskId);
    setPendingTasks(prev => prev.filter(item => item.taskId !== tempTaskId));
  };

  const startPollingForTask = (realTaskId: string, tempTaskId: string) => {
    console.log('🎯 开始为任务启动轮询:', realTaskId, '临时ID:', tempTaskId);
    
    // 更新临时任务的真实ID
    setPendingTasks(prev => {
      const updated = prev.map(item => {
        if (item.taskId === tempTaskId) {
          console.log('🔄 更新临时任务ID:', tempTaskId, '→', realTaskId);
          return { ...item, taskId: realTaskId };
        }
        return item;
      });
      console.log('📋 当前待处理任务列表:', updated.map(t => ({ id: t.taskId, status: t.status })));
      return updated;
    });
    
    // 开始轮询真实任务
    startTaskPolling(realTaskId, tempTaskId);
  };

  // 暴露操作函数给子组件
  React.useEffect(() => {
    const operations = {
      addPendingTask,
      removePendingTask, 
      startPollingForTask
    };
    onSetPendingTasks(operations);
  }, []); // 空依赖数组，只在组件挂载时运行一次

  // 组件加载和刷新时获取历史记录
  useEffect(() => {
    setCurrentOffset(0);
    setHasMore(true);
    fetchHistory(0, false);
  }, [user, refreshTrigger]);

  // 清理轮询
  useEffect(() => {
    return () => {
      pollingIntervals.forEach(interval => clearInterval(interval));
      realTaskIds.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, [pollingIntervals, realTaskIds]);

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
    if (item.cdnUrl) {
      setPreviewModal({
        isOpen: true,
        imageUrl: item.cdnUrl,
        originalUrl: item.originalUrl,
        title: `${t('previewTitle')} - ${new Date(item.createdAt).toLocaleString('zh-CN')}`
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
      
      const filename = `flux-dev-${item.taskId || Date.now()}.png`;
      const downloadUrl = `${workerUrl}/download?url=${encodeURIComponent(item.cdnUrl)}&filename=${encodeURIComponent(filename)}&taskId=${item.taskId}`;
      
      // 直接跳转到下载链接，Worker会设置正确的响应头触发下载
      window.open(downloadUrl, '_blank');
      
      toast.success(t('downloadStart'));
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('downloadError'));
    }
  };

  if (!user) {
    return null; // 未登录不显示历史记录
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{t('recentTasks')}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-400 text-sm">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{t('recentTasks')}</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-red-400 text-sm">{error}</p>
          <Button
            onClick={() => {
              setCurrentOffset(0);
              setHasMore(true);
              fetchHistory(0, false);
            }}
            className="mt-2 text-xs"
            variant="outline"
          >
            {t('retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{t('recentTasks')}</h3>
        <Button
          variant="ghost"
          className="text-gray-400 hover:text-gray-300 hover:bg-transparent text-xs"
          onClick={() => {
            setCurrentOffset(0);
            setHasMore(true);
            fetchHistory(0, false);
          }}
        >
          <div className="flex items-center gap-1">
            {t('refresh')}
            <Clock className="w-3 h-3" />
          </div>
        </Button>
      </div>

      <div 
        className="max-h-[650px] overflow-y-auto space-y-3 pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-gray-700/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-600/80"
        onScroll={handleScroll}
      >
        {(() => {
          // 合并待处理任务和历史记录，按创建时间倒序排列
          const displayTasks = [...pendingTasks, ...historyItems]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          if (displayTasks.length === 0) {
            return (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">{t('noRecords')}</p>
              </div>
            );
          }

          return displayTasks.map((item) => (
            <div
              key={item.id || item.taskId}
              className="border border-gray-600/40 rounded-lg bg-gray-800/20 p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">
                  {new Date(item.createdAt).toLocaleString('zh-CN')}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full border ${getStatusBadge(item.status)}`}>
                  {getStatusIcon(item.status)} {item.status === 'completed' ? tStatus('completed') : 
                   item.status === 'processing' ? tStatus('processing') : tStatus('failed')}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div 
                  className={`relative w-24 h-16 rounded-lg overflow-hidden bg-gray-700/50 flex-shrink-0 ${
                    item.status !== 'processing' && item.cdnUrl ? 'cursor-pointer hover:opacity-80' : ''
                  } transition-opacity`}
                  onClick={item.status !== 'processing' && item.cdnUrl ? () => handleImageClick(item) : undefined}
                >
                  {item.status === 'processing' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    </div>
                  ) : item.cdnUrl ? (
                    <img
                      src={item.cdnUrl}
                      alt={t('previewTitle')}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-500 text-xs">{t('noImage')}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {item.prompt}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {item.status === 'completed' && item.cdnUrl && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={() => handleImageClick(item)}
                      className="bg-gray-700/60 hover:bg-gray-600/80 text-white px-4 py-2 text-sm rounded-lg border border-gray-600/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <Maximize2 className="w-4 h-4" />
                        {t('viewLarge')}
                      </div>
                    </Button>
                    <Button 
                      onClick={() => handleDownload(item)}
                      className="bg-gray-700/60 hover:bg-gray-600/80 text-white px-4 py-2 text-sm rounded-lg border border-gray-600/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        {t('download')}
                      </div>
                    </Button>
                  </div>
                </div>
              )}

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
              {t('loading')}
            </div>
          </div>
        )}
        
        {/* 没有更多数据提示 */}
        {!hasMore && historyItems.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="text-gray-500 text-sm">
              {t('noMoreTasks')}
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

// 任务操作类型
interface PendingTasksOperations {
  addPendingTask: (task: any) => void;
  removePendingTask: (tempTaskId: string) => void;
  startPollingForTask: (realTaskId: string, tempTaskId: string) => void;
  [key: string]: any; // 允许其他方法
}

// 图像生成组件
function ImageGenerationUI({ pendingTasksOperations }: { pendingTasksOperations?: PendingTasksOperations }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<'square_1_1' | 'classic_4_3' | 'traditional_3_4' | 'widescreen_16_9' | 'social_story_9_16' | 'standard_3_2' | 'portrait_2_3' | 'horizontal_2_1' | 'vertical_1_2' | 'social_post_4_5'>('square_1_1');
  const [outputCount, setOutputCount] = useState<1 | 2 | 4>(2);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [userBenefits, setUserBenefits] = useState<{subscriptionStatus: string | null} | null>(null);
  const { user } = useAuth();
  const t = useTranslations('AIImageGenerator.form');
  const tErrors = useTranslations('AIImageGenerator.errors');

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

  // 处理宽高比映射显示
  const aspectRatioLabels = {
    'square_1_1': { ratio: '1:1', name: '正方形' },
    'classic_4_3': { ratio: '4:3', name: '经典横向' },
    'traditional_3_4': { ratio: '3:4', name: '传统竖向' },
    'widescreen_16_9': { ratio: '16:9', name: '宽屏横向' },
    'social_story_9_16': { ratio: '9:16', name: '社交竖屏' },
    'standard_3_2': { ratio: '3:2', name: '标准横向' },
    'portrait_2_3': { ratio: '2:3', name: '肖像竖向' },
    'horizontal_2_1': { ratio: '2:1', name: '超宽横向' },
    'vertical_1_2': { ratio: '1:2', name: '超高竖向' },
    'social_post_4_5': { ratio: '4:5', name: '社交方形' }
  };

  const handleStartProcessing = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!prompt.trim()) {
      setError(t('promptRequired'));
      return;
    }

    if (isProcessing) {
      return; // 防止重复点击
    }

    if (!pendingTasksOperations) {
      setError(t('systemInitializing'));
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      console.log('🚀 开始执行 Flux Dev 多任务生成...', {
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
          taskId: tempTaskId,
          status: 'processing' as const,
          createdAt: new Date().toISOString(),
          prompt: prompt.trim(),
          aspectRatio: aspectRatio,
          creditsConsumed: 1, // Flux Dev 1 积分
          taskType: 'text-to-image'
        };

        // 立即添加任务到UI显示
        pendingTasksOperations.addPendingTask(processingTask);
        
        // 保存任务配置供后续API调用
        taskConfigs.push({
          tempTaskId,
          taskIndex: i + 1
        });
      }

      // 第二步：并发发送所有API请求
      const apiPromises = taskConfigs.map(async (config) => {
        try {
          const response = await fetch('/api/text-to-image/start', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: prompt.trim(),
              aspect_ratio: aspectRatio,
              tempTaskId: config.tempTaskId
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Flux Dev 任务 ${config.taskIndex}/${outputCount} 提交成功:`, result);
            
            // 开始轮询真实任务
            if (result.success && result.data?.taskId) {
              pendingTasksOperations.startPollingForTask(result.data.taskId, config.tempTaskId);
              console.log(`🔄 任务 ${config.taskIndex}/${outputCount} 真实ID:`, result.data.taskId);
            }
            return { success: true, config };
          } else {
            const errorData = await response.json();
            console.error(`❌ 任务 ${config.taskIndex}/${outputCount} 失败:`, errorData);
            return { success: false, config, error: errorData };
          }
        } catch (error) {
          console.error(`💥 任务 ${config.taskIndex}/${outputCount} 请求异常:`, error);
          return { success: false, config, error };
        }
      });

      // 等待所有API请求完成
      const results = await Promise.all(apiPromises);
      
      // 处理失败的任务 - 移除失败任务
      results.forEach(result => {
        if (!result.success) {
          pendingTasksOperations.removePendingTask(result.config.tempTaskId);
        }
      });

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0) {
        console.log(`${successCount}/${outputCount} tasks submitted to Freepik queue, waiting for completion...`);
      }
      
      if (failCount > 0) {
        setError(tErrors('tasksSubmitFailed', { count: failCount }));
      }
        
    } catch (error) {
      console.error('💥 处理错误:', error);
      setError(error instanceof Error ? error.message : tErrors('processingFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 提示词 */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white">{t('promptLabel')}</h3>
        <p className="text-gray-400 text-sm">{t('promptDescription')}</p>
        
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('promptPlaceholder')}
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
        <h3 className="text-lg font-bold text-white">{t('aspectRatioLabel')}</h3>
        <p className="text-gray-400 text-sm">{t('aspectRatioDescription')}</p>
        
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {Object.entries(aspectRatioLabels).map(([ratio, info]) => {
            // 动态计算预览框尺寸
            const getPreviewSize = (ratioKey: string) => {
              switch(ratioKey) {
                case 'square_1_1': return 'w-6 h-6';
                case 'classic_4_3': return 'w-8 h-6';
                case 'traditional_3_4': return 'w-6 h-8';
                case 'widescreen_16_9': return 'w-9 h-5';
                case 'social_story_9_16': return 'w-5 h-9';
                case 'standard_3_2': return 'w-8 h-5';
                case 'portrait_2_3': return 'w-6 h-9';
                case 'horizontal_2_1': return 'w-10 h-5';
                case 'vertical_1_2': return 'w-5 h-10';
                case 'social_post_4_5': return 'w-7 h-8';
                default: return 'w-6 h-6';
              }
            };

            return (
              <div
                key={ratio}
                onClick={() => setAspectRatio(ratio as any)}
                className={`border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                  aspectRatio === ratio 
                    ? 'border-white bg-gray-800/40' 
                    : 'border-gray-600 hover:border-gray-500 bg-gray-800/20'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <div className={`bg-gray-600 rounded ${getPreviewSize(ratio)}`} />
                </div>
                <div className="text-center">
                  <div className="text-white text-xs font-medium">{info.ratio}</div>
                  <div className="text-gray-400 text-xs">{info.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 输出数量 */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white">{t('outputCountLabel')}</h3>
        <p className="text-gray-400 text-sm">{t('outputCountDescription')}</p>
        
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
      <Button
        onClick={handleStartProcessing}
        disabled={!prompt.trim() || isProcessing}
        className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-600 text-black disabled:text-gray-400 py-3 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            {t('generating')}
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {t('generateButton', { count: outputCount })}
          </div>
        )}
      </Button>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-950/50 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
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

export default function AIImageGeneratorPage() {
  const { user } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingTasksOperations, setPendingTasksOperations] = useState<PendingTasksOperations | undefined>(undefined);
  const t = useTranslations('AIImageGenerator');

  const handleTaskOperationsReady = (operations: PendingTasksOperations) => {
    console.log('📋 Task operations ready');
    setPendingTasksOperations(operations);
  };

  return (
    <div className="w-full min-h-screen">
      <BG1 />
      <div className="container mx-auto px-4 py-12">
        <div className="text-center space-y-6 mb-12">
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-white">{t('title.main')}</span>
              <br />
              <span className="text-cyan-400">{t('title.sub1')}</span>
              <span className="text-white"> & </span>
              <span className="text-yellow-400">{t('title.sub2')}</span>
              <span className="text-white"> ✨</span>
            </h1>

            <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
              {t('description')}
            </p>
          </div>
        </div>

        {/* 主要内容区域 - 左右分栏布局 */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* 左侧 - 图像生成组件 */}
          <div className="space-y-4">
            <ImageGenerationUI pendingTasksOperations={pendingTasksOperations} />
          </div>

          {/* 右侧 - 根据登录状态显示不同组件 */}
          <div className="space-y-6">
            {user ? (
              // 已登录用户显示最近任务
              <RecentTasksHistory 
                refreshTrigger={refreshTrigger} 
                onSetPendingTasks={handleTaskOperationsReady} 
              />
            ) : (
              // 未登录用户显示AI示例轮播
              <AIExampleCarousel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}