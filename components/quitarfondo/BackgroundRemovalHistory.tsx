'use client'

import { Button } from '@/components/ui/button';
import { Clock, Download, Loader2, Maximize2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImagePreviewModal from './ImagePreviewModal';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface HistoryItem {
  id: string;
  status: 'completed' | 'processing' | 'failed';
  statusMessage: string;
  creditsConsumed: number;
  originalUrl?: string;
  cdnUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  timestamp: string;
  filename: string;
  processingTime?: number;
}

interface BackgroundRemovalHistoryProps {
  historyItems: HistoryItem[]; // 直接传递历史数据
  pendingTask?: HistoryItem | null; // 待处理的临时任务
  loading?: boolean; // 加载状态
  error?: string | null; // 错误状态
  onRefresh?: () => void; // 刷新回调
  onDeleteSuccess?: (deletedTaskId: string) => void; // 删除成功回调
}

export default function BackgroundRemovalHistory({ historyItems, pendingTask, loading = false, error = null, onRefresh, onDeleteSuccess }: BackgroundRemovalHistoryProps) {
  const t = useTranslations('QuitarFondo');
  const tHistory = useTranslations('History');
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState<Set<string>>(new Set());
  const [localTasks, setLocalTasks] = useState<HistoryItem[]>([]); // Local temporary tasks
  const router = useRouter();
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

  // 管理临时处理中的任务
  useEffect(() => {
    if (pendingTask) {
      setLocalTasks([pendingTask]); // 只显示当前的处理中任务
    } else {
      setLocalTasks([]); // 清空本地任务
    }
  }, [pendingTask]);

  const handleRegenerate = async (itemId: string) => {
    console.log('Regenerating:', itemId);
    // TODO: 实现重新处理逻辑
    // 可以调用去除背景API重新处理图片
  };

  const handleDeleteClick = (itemId: string) => {
    if (confirmingDelete.has(itemId)) {
      // 第二次点击，执行真正的删除
      performDelete(itemId);
    } else {
      // 第一次点击，进入确认状态
      setConfirmingDelete(prev => new Set(prev).add(itemId));
      
      // 3秒后自动取消确认状态
      setTimeout(() => {
        setConfirmingDelete(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 3000);
    }
  };

  const performDelete = async (itemId: string) => {
    // 检查是否正在删除
    if (deletingItems.has(itemId)) {
      return;
    }

    try {
      // 清除确认状态
      setConfirmingDelete(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });

      // 添加到删除中的列表
      setDeletingItems(prev => new Set(prev).add(itemId));

      const response = await fetch('/api/history/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: itemId }),
      });

      if (response.ok) {
        // 优先使用本地状态更新，避免重新获取整个列表
        if (onDeleteSuccess) {
          onDeleteSuccess(itemId);
        } else if (onRefresh) {
          // 降级处理：如果没有本地更新函数，则重新获取列表
          onRefresh();
        }
      } else {
        console.error(t('history.errors.deleteFailed'));
      }
    } catch (error) {
      console.error(t('history.errors.deleteError'), error);
    } finally {
      // 从删除中的列表移除
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleDownload = (item: HistoryItem) => {
    try {
      if (!item.cdnUrl) {
        toast.error('无图片可下载');
        return;
      }

      // 使用 Cloudflare Worker 代理下载，避免CORS问题并提升性能
      const workerUrl = process.env.NEXT_PUBLIC_DOWNLOAD_WORKER_URL;
      
      if (!workerUrl) {
        toast.error(tHistory('downloadServiceNotConfigured'));
        return;
      }
      
      const filename = `${item.filename || 'background-removed'}-removed-bg.png`;
      const downloadUrl = `${workerUrl}/download?url=${encodeURIComponent(item.cdnUrl)}&filename=${encodeURIComponent(filename)}&taskId=${item.id}`;
      
      // 直接跳转到下载链接，Worker会设置正确的响应头触发下载
      window.open(downloadUrl, '_blank');
      
      toast.success(tHistory('downloadStart'));
    } catch (error) {
      console.error('Download error:', error);
      toast.error(tHistory('downloadError'));
    }
  };

  const handleMaximize = (item: HistoryItem) => {
    if (item.cdnUrl || item.originalUrl) {
      setPreviewModal({
        isOpen: true,
        imageUrl: item.cdnUrl || item.originalUrl || '',
        originalUrl: item.originalUrl,
        title: `${t('history.previewModal.title')} - ${item.timestamp}`
      });
    }
  };

  const handleImageClick = (item: HistoryItem) => {
    if (item.cdnUrl || item.originalUrl) {
      setPreviewModal({
        isOpen: true,
        imageUrl: item.cdnUrl || item.originalUrl || '',
        originalUrl: item.originalUrl,
        title: `${t('history.previewModal.title')} - ${item.timestamp}`
      });
    }
  };

  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      imageUrl: '',
      originalUrl: '',
      title: ''
    });
  };

  // 获取状态标签样式
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{t('history.title')}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-400 text-sm">{t('history.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{t('history.title')}</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-red-400 text-sm">{error}</p>
          <Button
            onClick={onRefresh}
            className="mt-2 text-xs"
            variant="outline"
          >
            {t('history.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">最近任务</h3>
        <Button
          variant="ghost"
          className="text-gray-400 hover:text-gray-300 hover:bg-transparent text-xs"
          onClick={() => router.push('/zh/myhistory?tool=remove_background')}
        >
          <div className="flex items-center gap-1">
            {t('history.viewAll')}
            <Clock className="w-3 h-3" />
          </div>
        </Button>
      </div>

      {/* History Items - Compact Row Layout with scroll */}
      <div className="max-h-[450px] overflow-y-auto space-y-3 pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-gray-700/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-600/80">
        {(() => {
          // 如果有本地处理中的任务，显示它和历史记录
          // 如果没有本地任务，只显示历史记录
          const displayTasks = localTasks.length > 0 ? [...localTasks, ...historyItems] : historyItems;
          
          if (displayTasks.length === 0) {
            return (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">{t('history.empty')}</p>
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
                <span className="text-gray-400 text-sm">{item.timestamp}</span>
                <span className={`text-xs px-3 py-1 rounded-full border ${getStatusBadge(item.status)}`}>
                  {getStatusIcon(item.status)} {item.statusMessage}
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
                  title={item.status === 'processing' ? t('history.tooltips.processing') : t('history.previewModal.clickToView')}
                >
                  {item.status === 'processing' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    </div>
                  ) : (item.cdnUrl || item.originalUrl) ? (
                    <Image
                      src={item.cdnUrl || item.originalUrl || ''}
                      alt={t('history.previewModal.title')}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-500 text-xs">{t('history.errors.noImage')}</span>
                    </div>
                  )}
                </div>

                {/* Actions - 右侧空白，按钮移到底部 */}
                <div className="flex items-center gap-3 ml-auto">
                  {/* 这里留空，按钮移动到底部 */}
                </div>
              </div>

              {/* Bottom Row: Main Actions */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
                {/* 左侧：放大和下载按钮 - 只在完成状态下显示 */}
                <div className="flex items-center gap-3">
                  {item.status === 'completed' && item.cdnUrl ? (
                    <>
                      <Button
                        onClick={() => handleMaximize(item)}
                        className="bg-gray-700/60 hover:bg-gray-600/80 text-white px-4 py-2 text-sm rounded-lg border border-gray-600/50 transition-all duration-200"
                        title={t('history.actions.maximize')}
                      >
                        <div className="flex items-center gap-2">
                          <Maximize2 className="w-4 h-4" />
                          {t('history.actions.maximize')}
                        </div>
                      </Button>
                      <Button
                        onClick={() => handleDownload(item)}
                        className="bg-gray-700/60 hover:bg-gray-600/80 text-white px-4 py-2 text-sm rounded-lg border border-gray-600/50 transition-all duration-200"
                        title={t('history.actions.download')}
                      >
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          {t('history.actions.download')}
                        </div>
                      </Button>
                    </>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      {item.status === 'processing' ? t('history.status.processing') : ''}
                    </div>
                  )}
                </div>

                {/* 右侧：删除按钮 */}
                <Button
                  onClick={() => handleDeleteClick(item.id)}
                  disabled={deletingItems.has(item.id)}
                  variant="ghost"
                  className={`px-3 py-2 rounded-md transition-all duration-200 text-xs ${
                    deletingItems.has(item.id)
                      ? 'text-gray-500 cursor-not-allowed opacity-50'
                      : confirmingDelete.has(item.id)
                      ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 border border-orange-500/30'
                      : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                  }`}
                  title={
                    deletingItems.has(item.id) 
                      ? t('history.tooltips.deleting')
                      : confirmingDelete.has(item.id)
                      ? t('history.tooltips.confirmDelete')
                      : t('history.actions.delete')
                  }
                >
                  <div className="flex items-center gap-1.5">
                    {deletingItems.has(item.id) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : confirmingDelete.has(item.id) ? (
                      <>
                        <Trash2 className="w-3 h-3" />
                        <span>{t('history.actions.confirmDelete')}</span>
                      </>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </div>
                </Button>
              </div>

              {/* Error message for failed tasks */}
              {item.status === 'failed' && item.errorMessage && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-red-400 text-xs">{item.errorMessage}</p>
                </div>
              )}
            </div>
          ))
        })()}
      </div>

      {/* 图片预览弹窗 */}
      <ImagePreviewModal
        isOpen={previewModal.isOpen}
        onClose={closePreviewModal}
        imageUrl={previewModal.imageUrl}
        originalUrl={previewModal.originalUrl}
        title={previewModal.title}
        onDownload={() => {
          const item = historyItems.find(item =>
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