'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Download, RotateCcw, Trash2, Clock, Loader2 } from 'lucide-react';
import Image from 'next/image';
import ImagePreviewModal from './ImagePreviewModal';

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

interface HistoryResponse {
  items: HistoryItem[];
  count: number;
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  stats: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
    totalCreditsUsed: number;
  };
}

export default function BackgroundRemovalHistory() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // 获取历史记录数据
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/remove-background/history?limit=10');
      
      if (!response.ok) {
        throw new Error('获取历史记录失败');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setHistoryItems(result.data.items || []);
      } else {
        throw new Error(result.message || '获取历史记录失败');
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(err instanceof Error ? err.message : '获取历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (itemId: string) => {
    console.log('重新处理:', itemId);
    // TODO: 实现重新处理逻辑
    // 可以调用去除背景API重新处理图片
  };

  const handleDelete = async (itemId: string) => {
    try {
      const response = await fetch('/api/history/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: itemId }),
      });

      if (response.ok) {
        setHistoryItems(items => items.filter(item => item.id !== itemId));
      } else {
        console.error('删除失败');
      }
    } catch (error) {
      console.error('删除过程中出错:', error);
    }
  };

  const handleDownload = (item: HistoryItem) => {
    if (item.cdnUrl) {
      const link = document.createElement('a');
      link.href = item.cdnUrl;
      link.download = `${item.filename}-removed-bg.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleMaximize = (item: HistoryItem) => {
    if (item.cdnUrl || item.originalUrl) {
      setPreviewModal({
        isOpen: true,
        imageUrl: item.cdnUrl || item.originalUrl || '',
        originalUrl: item.originalUrl,
        title: `去除背景结果 - ${item.timestamp}`
      });
    }
  };

  const handleImageClick = (item: HistoryItem) => {
    if (item.cdnUrl || item.originalUrl) {
      setPreviewModal({
        isOpen: true,
        imageUrl: item.cdnUrl || item.originalUrl || '',
        originalUrl: item.originalUrl,
        title: `去除背景结果 - ${item.timestamp}`
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
          <h3 className="text-lg font-bold text-white">最近任务</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-400 text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">最近任务</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-red-400 text-sm">{error}</p>
          <Button
            onClick={fetchHistory}
            className="mt-2 text-xs"
            variant="outline"
          >
            重试
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
        >
          <div className="flex items-center gap-1">
            查看全部
            <Clock className="w-3 h-3" />
          </div>
        </Button>
      </div>

      {/* History Items - Compact Row Layout */}
      <div className="space-y-3">
        {historyItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">暂无去除背景记录</p>
          </div>
        ) : (
          historyItems.map((item) => (
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
                  className="relative w-24 h-16 rounded-lg overflow-hidden bg-gray-700/50 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleImageClick(item)}
                  title="点击查看大图"
                >
                  {(item.cdnUrl || item.originalUrl) ? (
                    <Image
                      src={item.cdnUrl || item.originalUrl || ''}
                      alt="历史记录图片"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-500 text-xs">无图片</span>
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
                        title="放大查看"
                      >
                        <div className="flex items-center gap-2">
                          <Maximize2 className="w-4 h-4" />
                          放大查看
                        </div>
                      </Button>
                      <Button
                        onClick={() => handleDownload(item)}
                        className="bg-gray-700/60 hover:bg-gray-600/80 text-white px-4 py-2 text-sm rounded-lg border border-gray-600/50 transition-all duration-200"
                        title="下载图片"
                      >
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          下载图片
                        </div>
                      </Button>
                    </>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      {item.status === 'processing' ? '处理中...' : ''}
                    </div>
                  )}
                </div>
                
                {/* 右侧：删除按钮 */}
                <Button
                  onClick={() => handleDelete(item.id)}
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-md"
                  title="删除记录"
                >
                  <Trash2 className="w-4 h-4" />
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
        )}
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