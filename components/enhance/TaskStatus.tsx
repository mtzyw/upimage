'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// 移除 Progress 组件依赖
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTranslations } from 'next-intl';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Download, 
  Eye, 
  RefreshCw,
  Loader2,
  ExternalLink,
  Copy,
  Share
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

interface TaskStatusProps {
  taskId: string;
  onTaskComplete?: (result: any) => void;
  onRetry?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface TaskInfo {
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
  downloadUrl?: string;
}

export function TaskStatus({
  taskId,
  onTaskComplete,
  onRetry,
  autoRefresh = true,
  refreshInterval = 2000
}: TaskStatusProps) {
  const t = useTranslations('Enhance');
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTaskStatus = async () => {
    try {
      const response = await fetch(`/api/enhance/status?taskId=${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('获取任务状态失败');
      }

      const result = await response.json();
      
      if (result.success) {
        setTaskInfo(result.data);
        setError(null);
        
        // 如果任务完成，触发回调
        if (result.data.status === 'completed' && onTaskComplete) {
          onTaskComplete(result.data);
        }
      } else {
        throw new Error(result.error || '获取任务状态失败');
      }
    } catch (err) {
      console.error('Error fetching task status:', err);
      setError(err instanceof Error ? err.message : '获取任务状态失败');
    } finally {
      setLoading(false);
    }
  };

  // 清除轮询定时器
  const clearPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 开始轮询
  const startPolling = () => {
    if (!autoRefresh) return;
    
    clearPolling(); // 先清除现有的定时器
    
    intervalRef.current = setInterval(() => {
      fetchTaskStatus();
    }, refreshInterval);
  };

  // 初始加载
  useEffect(() => {
    fetchTaskStatus();
  }, [taskId]);

  // 管理轮询状态
  useEffect(() => {
    if (taskInfo?.status === 'processing') {
      // 任务处理中，开始轮询
      startPolling();
    } else if (taskInfo?.status === 'completed' || taskInfo?.status === 'failed') {
      // 任务完成或失败，停止轮询
      clearPolling();
      console.log(`轮询已停止，任务状态: ${taskInfo.status}`);
    }

    // 清理函数
    return () => clearPolling();
  }, [taskInfo?.status, autoRefresh, refreshInterval]);

  const handleDownload = (url: string) => {
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
      
      toast.success('开始下载图片');
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

  const handleOpenInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  const handleManualRefresh = () => {
    setLoading(true);
    fetchTaskStatus();
  };

  if (loading && !taskInfo) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>加载任务状态...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !taskInfo) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <p className="font-medium text-destructive">加载失败</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleManualRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!taskInfo) {
    return null;
  }

  const getStatusIcon = () => {
    switch (taskInfo.status) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (taskInfo.status) {
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-destructive';
      default:
        return 'bg-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          处理状态
          <Badge variant="outline" className="ml-auto">
            任务 ID: {taskId.substring(0, 8)}...
          </Badge>
        </CardTitle>
        <CardDescription>
          {taskInfo.message}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 进度条（仅处理中显示） */}
        {taskInfo.status === 'processing' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>处理进度</span>
              {taskInfo.progress !== undefined && (
                <span>{taskInfo.progress}%</span>
              )}
            </div>
            {/* 简单的进度条替代 */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${taskInfo.progress || 0}%` }}
              />
            </div>
            {taskInfo.estimatedTimeRemaining && (
              <p className="text-xs text-muted-foreground text-center">
                {taskInfo.estimatedTimeRemaining}
              </p>
            )}
          </div>
        )}

        {/* 任务信息 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">放大倍数：</span>
            <span className="font-medium">{taskInfo.scaleFactor}</span>
          </div>
          <div>
            <span className="text-muted-foreground">消耗积分：</span>
            <span className="font-medium">{taskInfo.creditsConsumed}</span>
          </div>
          <div>
            <span className="text-muted-foreground">开始时间：</span>
            <span className="font-medium">
              {new Date(taskInfo.createdAt).toLocaleString()}
            </span>
          </div>
          {taskInfo.completedAt && (
            <div>
              <span className="text-muted-foreground">完成时间：</span>
              <span className="font-medium">
                {new Date(taskInfo.completedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* 图片预览区域 */}
        {(taskInfo.originalUrl || taskInfo.cdnUrl) && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium">图片预览</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 原图 */}
                {taskInfo.originalUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">原图</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenInNewTab(taskInfo.originalUrl!)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="relative aspect-square border rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={taskInfo.originalUrl}
                        alt="Original image"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* 增强后的图片 */}
                {taskInfo.cdnUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">增强后</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyUrl(taskInfo.cdnUrl!)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenInNewTab(taskInfo.cdnUrl!)}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="relative aspect-square border rounded-lg overflow-hidden bg-muted">
                      <Image
                        src={taskInfo.cdnUrl}
                        alt="Enhanced image"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 错误信息 */}
        {taskInfo.status === 'failed' && taskInfo.error && (
          <>
            <Separator />
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">处理失败</p>
                  <p className="text-sm text-destructive/80 mt-1">{taskInfo.error}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 flex-wrap">
          {taskInfo.status === 'processing' && (
            <Button 
              onClick={handleManualRefresh} 
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新状态
            </Button>
          )}

          {taskInfo.status === 'completed' && taskInfo.cdnUrl && (
            <>
              <Button onClick={() => handleDownload(taskInfo.cdnUrl!)}>
                <Download className="h-4 w-4 mr-2" />
                下载图片
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleOpenInNewTab(taskInfo.cdnUrl!)}
              >
                <Eye className="h-4 w-4 mr-2" />
                查看原图
              </Button>
            </>
          )}

          {taskInfo.status === 'failed' && onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              重新处理
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}