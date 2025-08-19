"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Image as ImageIcon, RefreshCw, XCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface HistoryItem {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  scale_factor: string;
  credits_consumed: number;
  optimization_type: string;
  creativity: number;
  hdr: number;
  prompt?: string;
  r2_original_key?: string;
  cdn_url?: string;
  error_message?: string;
}

interface HistoryListPanelProps {
  historyItems: HistoryItem[];
  selectedItem: HistoryItem | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  totalCount: number | null;
  onItemSelect: (item: HistoryItem) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onDeleteItem: (itemId: string) => Promise<void>;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400" />;
    case 'processing':
      return <Clock className="h-4 w-4 text-yellow-400" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const StatusText = ({ status }: { status: string }) => {
  const t = useTranslations("History");
  
  switch (status) {
    case 'completed':
      return <span className="text-green-400">{t('status.completed')}</span>;
    case 'failed':
      return <span className="text-red-400">{t('status.failed')}</span>;
    case 'processing':
      return <span className="text-yellow-400">{t('status.processing')}</span>;
    default:
      return <span className="text-gray-400">{t('status.processing')}</span>;
  }
};

const OptimizationTypeText = ({ type }: { type: string }) => {
  const t = useTranslations("History");
  
  return t(`optimizationTypes.${type}`) || type;
};

export default function HistoryListPanel({
  historyItems,
  selectedItem,
  isLoading,
  isLoadingMore,
  hasMore,
  totalCount,
  onItemSelect,
  onRefresh,
  onLoadMore,
  onDeleteItem,
}: HistoryListPanelProps) {
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const t = useTranslations("History");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOriginalImageUrl = (r2Key: string) => {
    // 从 R2 Key 构建原图链接
    const r2PublicUrl = 'https://cdn.imgenhancer.ai';
    return `${r2PublicUrl}/${r2Key}`;
  };

  // 处理删除确认
  const handleDeleteClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); // 防止触发项目选择
    setConfirmDeleteId(itemId);
  };

  // 执行删除
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    
    setDeletingItemId(confirmDeleteId);
    try {
      await onDeleteItem(confirmDeleteId);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeletingItemId(null);
      setConfirmDeleteId(null);
    }
  };

  // 取消删除
  const handleDeleteCancel = () => {
    setConfirmDeleteId(null);
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 滚动到底部时自动加载更多
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMore || !hasMore) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // 距离底部100px时开始加载

    // 更严格的边界检查
    if (scrollHeight <= clientHeight) {
      return; // 内容高度不足一屏，无需加载更多
    }

    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceToBottom < threshold) {
      console.log('Reached bottom, loading more...', {
        scrollTop,
        scrollHeight,
        clientHeight,
        distanceToBottom,
        isLoadingMore,
        hasMore
      });
      onLoadMore();
    }
  }, [isLoadingMore, hasMore, onLoadMore]);

  // 防抖的滚动处理
  const debouncedHandleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      handleScroll();
    }, 150); // 150ms防抖
  }, [handleScroll]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', debouncedHandleScroll);
    return () => {
      container.removeEventListener('scroll', debouncedHandleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [debouncedHandleScroll]);

  return (
    <div className="w-full sm:w-[350px] lg:w-[400px] xl:w-[450px] h-full bg-gray-900/95 border-r border-gray-700 flex flex-col overflow-hidden">
      {/* 头部区域 */}
      <div className="p-4 sm:p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-white">{t('title')}</h1>
            {totalCount !== null && (
              <p className="text-xs text-gray-400 mt-1">
                {t('total', { count: totalCount })}
              </p>
            )}
          </div>
          <Button
            onClick={onRefresh}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-gray-500 text-xs">
          {t('description')}
        </p>
      </div>

      {/* 历史记录列表 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-gray-700/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-600/80"
      >
        {isLoading ? (
          <div className="p-6 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">{t('processing')}</p>
          </div>
        ) : historyItems.length === 0 ? (
          <div className="p-6 text-center">
            <ImageIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-1">{t('noRecords')}</p>
            <p className="text-gray-500 text-xs">{t('noRecordsDescription')}</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {historyItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemSelect(item)}
                className={`
                  p-4 rounded-lg border transition-all cursor-pointer
                  ${selectedItem?.id === item.id
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-gray-700 hover:border-gray-600 bg-gray-800/30 hover:bg-gray-800/50'
                  }
                `}
              >
                <div className="flex gap-3">
                  {/* 左侧缩略图 */}
                  <div className="flex-shrink-0">
                    {item.r2_original_key ? (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-800 border border-gray-600">
                        <img
                          src={getOriginalImageUrl(item.r2_original_key)}
                          alt={t('beforeImage')}
                          className="w-full h-full object-cover transition-opacity duration-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            const fallback = parent?.querySelector('.fallback-icon');
                            const loading = parent?.querySelector('.loading-indicator');
                            if (fallback) fallback.classList.remove('hidden');
                            if (loading) loading.classList.add('hidden');
                          }}
                          onLoad={(e) => {
                            e.currentTarget.style.opacity = '1';
                            const parent = e.currentTarget.parentElement;
                            const loading = parent?.querySelector('.loading-indicator');
                            if (loading) loading.classList.add('hidden');
                          }}
                          style={{ opacity: '0' }}
                        />
                        <div className="fallback-icon absolute inset-0 flex items-center justify-center text-gray-500 hidden">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                        {/* 加载状态指示器 */}
                        <div className="loading-indicator absolute inset-0 flex items-center justify-center text-gray-500">
                          <div className="w-4 h-4 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin"></div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-800 border border-gray-600 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* 右侧信息区域 */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    {/* 顶部：状态、时间和删除按钮 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={item.status} />
                        <StatusText status={item.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(item.created_at)}
                        </span>
                        <Button
                          onClick={(e) => handleDeleteClick(e, item.id)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-500 hover:text-red-400 hover:bg-red-400/10"
                          disabled={deletingItemId === item.id}
                        >
                          {deletingItemId === item.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* 中部：主要参数 - 紧凑布局 */}
                    <div className={`grid gap-1 text-xs my-1 ${item.prompt ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <div>
                        <span className="text-gray-400">{t('scaleFactor')}:</span>
                        <span className="text-cyan-400 font-medium">{item.scale_factor}</span>
                      </div>
                      {item.prompt && (
                        <div className="text-right">
                          <span className="text-gray-400">{t('enhancePrompt')}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">{t('optimizationType')}:</span>
                        <span className="text-white">
                          <OptimizationTypeText type={item.optimization_type} />
                        </span>
                      </div>
                      {item.prompt && (
                        <div className="text-right">
                          <span className="text-white text-xs truncate" title={item.prompt}>
                            {item.prompt.length > 15 ? `${item.prompt.slice(0, 15)}...` : item.prompt}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">{t('creditsConsumed')}:</span>
                        <span className="text-yellow-400">{item.credits_consumed}</span>
                      </div>
                    </div>

                    {/* 错误信息 */}
                    {item.status === 'failed' && item.error_message && (
                      <div className="text-xs text-red-400 bg-red-400/10 rounded p-1 mt-1">
                        {item.error_message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* 加载更多指示器 */}
            {isLoadingMore && (
              <div className="p-4 text-center border-t border-gray-700/50">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                  <span className="text-sm text-gray-400">{t('loadMore')}...</span>
                </div>
              </div>
            )}

            {/* 已加载全部提示 */}
            {!hasMore && historyItems.length > 0 && (
              <div className="p-4 text-center border-t border-gray-700/50">
                <p className="text-xs text-gray-500">{t('allRecordsShown')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{t('deleteConfirm')}</h3>
                <p className="text-gray-400 text-sm">{t('deleteWarning')}</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-6">
              {t('deleteConfirmMessage')}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleDeleteCancel}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                variant="destructive"
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={!!deletingItemId}
              >
                {deletingItemId ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {t('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}