'use client'

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Maximize2, Loader2, Clock } from "lucide-react";
import ImagePreviewModal from "../quitarfondo/ImagePreviewModal";
import { useTranslations } from "next-intl";

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
  engine: string;
}

interface HistoryGridProps {
  items: HistoryItem[];
  onRefresh: () => void;
}

export default function HistoryGrid({ items, onRefresh }: HistoryGridProps) {
  const t = useTranslations('Landing.MyHistory');
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState<Set<string>>(new Set());
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

  const getEngineLabel = (engine: string) => {
    switch (engine) {
      case 'remove_background':
        return t('tools.removeBackground');
      case 'upscaler':
        return t('tools.upscaler');
      default:
        return 'AI处理';
    }
  };

  const getEngineIcon = (engine: string) => {
    switch (engine) {
      case 'remove_background':
        return '🎨';
      case 'upscaler':
        return '✨';
      default:
        return '🔧';
    }
  };

  // 删除处理
  const handleDeleteClick = (itemId: string) => {
    if (confirmingDelete.has(itemId)) {
      performDelete(itemId);
    } else {
      setConfirmingDelete(prev => new Set(prev).add(itemId));
      
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
    if (deletingItems.has(itemId)) return;

    try {
      setConfirmingDelete(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });

      setDeletingItems(prev => new Set(prev).add(itemId));

      const response = await fetch('/api/history/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: itemId }),
      });

      if (response.ok) {
        onRefresh();
      } else {
        console.error(t('errors.deleteFailed'));
      }
    } catch (error) {
      console.error(t('errors.deleteError'), error);
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // 下载处理
  const handleDownload = (item: HistoryItem) => {
    if (item.cdnUrl) {
      const link = document.createElement('a');
      link.href = item.cdnUrl;
      link.download = `${item.filename}-${getEngineLabel(item.engine)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 预览处理
  const handlePreview = (item: HistoryItem) => {
    if (item.cdnUrl || item.originalUrl) {
      setPreviewModal({
        isOpen: true,
        imageUrl: item.cdnUrl || item.originalUrl || '',
        originalUrl: item.originalUrl,
        title: `${getEngineLabel(item.engine)} - ${item.timestamp}`
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

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="group bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 rounded-xl overflow-hidden hover:border-gray-500/50 transition-all duration-200 hover:shadow-xl"
          >
            {/* 图片区域 */}
            <div className="relative aspect-square bg-gray-700/50 overflow-hidden">
              {item.status === 'processing' ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
                </div>
              ) : (item.cdnUrl || item.originalUrl) ? (
                <>
                  <Image
                    src={item.cdnUrl || item.originalUrl || ''}
                    alt={item.filename}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  {/* 悬浮操作按钮 */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5">
                    {item.status === 'completed' && (
                      <>
                        <Button
                          onClick={() => handlePreview(item)}
                          className="bg-white/20 hover:bg-white/30 text-white p-1.5 rounded backdrop-blur-sm"
                          title={t('actions.preview')}
                        >
                          <Maximize2 className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={() => handleDownload(item)}
                          className="bg-white/20 hover:bg-white/30 text-white p-1.5 rounded backdrop-blur-sm"
                          title={t('actions.download')}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-500">{t('messages.noImage')}</span>
                </div>
              )}
              
              {/* 状态标签 */}
              <div className="absolute top-2 left-2">
                <span className={`text-xs px-1.5 py-0.5 rounded border ${getStatusBadge(item.status)} backdrop-blur-sm`}>
                  {getStatusIcon(item.status)}
                </span>
              </div>

              {/* 工具类型标签 */}
              <div className="absolute top-2 right-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-900/80 text-gray-300 border border-gray-600/50 backdrop-blur-sm">
                  {getEngineIcon(item.engine)}
                </span>
              </div>
            </div>

            {/* 信息区域 */}
            <div className="p-3 space-y-2">
              {/* 工具类型和积分 */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{getEngineLabel(item.engine)}</span>
                <span className="text-xs text-yellow-400 font-medium">{item.creditsConsumed}{t('messages.credits')}</span>
              </div>

              {/* 时间 */}
              <div className="text-xs text-gray-500 truncate">
                {new Date(item.createdAt).toLocaleDateString('zh-CN')}
              </div>

              {/* 错误信息 */}
              {item.status === 'failed' && item.errorMessage && (
                <div className="p-1.5 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                  {t('status.failed')}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center justify-between pt-1">
                {item.status === 'completed' && item.cdnUrl ? (
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => handlePreview(item)}
                      className="bg-gray-700/60 hover:bg-gray-600/80 text-white px-2 py-1 text-xs rounded"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => handleDownload(item)}
                      className="bg-blue-600/60 hover:bg-blue-500/80 text-white px-2 py-1 text-xs rounded"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs">
                    {item.status === 'processing' ? t('status.processing') : ''}
                  </div>
                )}

                {/* 删除按钮 */}
                <Button
                  onClick={() => handleDeleteClick(item.id)}
                  disabled={deletingItems.has(item.id)}
                  className={`px-1.5 py-1 rounded transition-all duration-200 text-xs ${
                    deletingItems.has(item.id)
                      ? 'text-gray-500 cursor-not-allowed opacity-50'
                      : confirmingDelete.has(item.id)
                      ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10'
                      : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                  }`}
                  title={
                    deletingItems.has(item.id) 
                      ? t('actions.deleting')
                      : confirmingDelete.has(item.id)
                      ? t('actions.confirmDelete')
                      : t('actions.delete')
                  }
                >
                  {deletingItems.has(item.id) ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : confirmingDelete.has(item.id) ? (
                    <span className="text-xs">{t('actions.confirm')}</span>
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 图片预览弹窗 */}
      <ImagePreviewModal
        isOpen={previewModal.isOpen}
        onClose={closePreviewModal}
        imageUrl={previewModal.imageUrl}
        originalUrl={previewModal.originalUrl}
        title={previewModal.title}
        onDownload={() => {
          const item = items.find(item =>
            item.cdnUrl === previewModal.imageUrl || item.originalUrl === previewModal.imageUrl
          );
          if (item) {
            handleDownload(item);
          }
        }}
      />
    </>
  );
}