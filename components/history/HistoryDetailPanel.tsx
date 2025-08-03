"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Copy, CheckCircle, XCircle, Clock, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import ImageComparisonSlider from "@/components/workspace/ImageComparisonSlider";

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

interface HistoryDetailPanelProps {
  selectedItem: HistoryItem | null;
}

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-400/50">
          <CheckCircle className="h-3 w-3 mr-1" />
          已完成
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="default" className="bg-red-500/20 text-red-400 border-red-400/50">
          <XCircle className="h-3 w-3 mr-1" />
          失败
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/50">
          <Clock className="h-3 w-3 mr-1" />
          处理中
        </Badge>
      );
    default:
      return null;
  }
};

const OptimizationTypeText = ({ type }: { type: string }) => {
  const typeMap: Record<string, string> = {
    'standard': '标准',
    'soft_portraits': '柔和人像',
    'hard_portraits': '锐化人像',
    'art_n_illustration': '艺术插画',
    'nature_n_landscapes': '自然风景',
    'films_n_photography': '电影摄影',
  };
  return typeMap[type] || type;
};

export default function HistoryDetailPanel({ selectedItem }: HistoryDetailPanelProps) {
  const [showPromptModal, setShowPromptModal] = useState(false);

  const handleDownload = (url: string) => {
    try {
      // 使用 Cloudflare Worker 代理下载，避免CORS问题并提升性能
      const workerUrl = process.env.NEXT_PUBLIC_DOWNLOAD_WORKER_URL;
      
      if (!workerUrl) {
        toast.error('下载服务未配置，请联系管理员');
        return;
      }
      
      const filename = `enhanced-${selectedItem?.id}.jpg`;
      const downloadUrl = `${workerUrl}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}&taskId=${selectedItem?.id}`;
      
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
      console.error('Copy error:', error);
      toast.error('复制失败，请重试');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  const getOriginalImageUrl = (r2Key: string) => {
    // 从 .env.local 获取 R2_PUBLIC_URL 的值
    const r2PublicUrl = 'https://cdn.imgenhancer.ai'; // 根据您的配置
    return `${r2PublicUrl}/${r2Key}`;
  };

  return (
    <div className="flex-1 h-full bg-gray-900/95 border border-gray-700 rounded-lg m-1 sm:mt-2 sm:mr-2 sm:mb-2 sm:ml-2 p-3 sm:p-4 overflow-hidden">
      <div className="h-full flex flex-col min-h-0">
        {!selectedItem ? (
          <div className="flex-1 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="relative mx-auto mb-6 w-32 h-24">
                <div className="w-full h-full bg-gray-700 rounded-lg border-4 border-gray-600 relative">
                  <div className="absolute inset-2 bg-gray-800 rounded-sm flex items-center justify-center">
                    <RotateCcw className="w-8 h-8 text-gray-600" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-gray-600 rounded-b-sm"></div>
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-12 h-2 bg-gray-600 rounded-sm"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">选择历史记录</h3>
              <p className="text-gray-400">从左侧列表选择一个历史记录来查看详情</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* 头部信息 */}
            <div className="flex-shrink-0 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">处理详情</h3>
                  <StatusBadge status={selectedItem.status} />
                </div>
                <Badge variant="outline" className="border-cyan-400/50 text-cyan-400">
                  {selectedItem.scale_factor}
                </Badge>
              </div>

              {/* 处理参数 - 紧凑网格布局 */}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="grid grid-cols-4 gap-x-6 gap-y-1 text-xs">
                  {/* 第一行 - 主要参数 */}
                  <div>
                    <span className="text-gray-400">创建时间</span>
                    <div className="text-white font-medium">{formatDate(selectedItem.created_at)}</div>
                  </div>
                  {selectedItem.completed_at && (
                    <div>
                      <span className="text-gray-400">完成时间</span>
                      <div className="text-white font-medium">{formatDate(selectedItem.completed_at)}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">消耗积分</span>
                    <div className="text-yellow-400 font-medium">{selectedItem.credits_consumed}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">优化类型</span>
                    <div className="text-white font-medium">
                      <OptimizationTypeText type={selectedItem.optimization_type} />
                    </div>
                  </div>
                  
                  {/* 第二行 - 次要参数 */}
                  <div>
                    <span className="text-gray-400">创意度</span>
                    <div className="text-pink-400 font-medium">{selectedItem.creativity}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">HDR强度</span>
                    <div className="text-green-400 font-medium">{selectedItem.hdr}</div>
                  </div>
                  {selectedItem.prompt && (
                    <div className="col-span-2">
                      <span className="text-gray-400">增强提示词</span>
                      <div 
                        className="text-white font-medium truncate cursor-pointer hover:text-cyan-400 transition-colors"
                        title="点击查看完整提示词"
                        onClick={() => setShowPromptModal(true)}
                      >
                        {selectedItem.prompt.length > 30 ? `${selectedItem.prompt.slice(0, 30)}...` : selectedItem.prompt}
                      </div>
                    </div>
                  )}
                </div>

                {/* 错误信息 */}
                {selectedItem.status === 'failed' && selectedItem.error_message && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <span className="text-red-400 text-xs">错误信息</span>
                    <div className="text-red-300 text-xs bg-red-400/10 rounded p-2 mt-1 border border-red-400/30">
                      {selectedItem.error_message}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 图片对比组件 */}
            {selectedItem.status === 'completed' && selectedItem.cdn_url && selectedItem.r2_original_key && (
              <div className="flex-1 min-h-0 flex flex-col justify-between">
                <div className="flex justify-center flex-1 items-center">
                  <div className="w-full max-w-2xl lg:max-w-3xl">
                    <ImageComparisonSlider
                      beforeImage={getOriginalImageUrl(selectedItem.r2_original_key)}
                      afterImage={selectedItem.cdn_url}
                      beforeLabel="Before"
                      afterLabel="After"
                      className="mx-auto"
                      aspectRatio={16 / 10}
                      initialPosition={50}
                    />
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div className="bg-gray-800/50 rounded-xl p-3 mx-auto max-w-2xl lg:max-w-3xl w-full mt-4 flex-shrink-0">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Button 
                      onClick={() => handleDownload(selectedItem.cdn_url!)}
                      className="bg-green-600 hover:bg-green-700 text-white h-10"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      下载图片
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="border-gray-600 text-black hover:bg-gray-700 hover:text-white h-10"
                      onClick={() => window.open(selectedItem.cdn_url!, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      预览
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="border-gray-600 text-black hover:bg-gray-700 hover:text-white h-10"
                      onClick={() => handleCopyUrl(selectedItem.cdn_url!)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      复制链接
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="border-gray-600 text-black hover:bg-gray-700 hover:text-white h-10"
                      onClick={() => {
                        const text = `查看我用 AI 增强的图片：${selectedItem.cdn_url}`;
                        navigator.share ? navigator.share({ text, url: selectedItem.cdn_url }) : handleCopyUrl(text);
                      }}
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      分享
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 处理中状态 */}
            {selectedItem.status === 'processing' && (
              <div className="flex-1 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Clock className="h-16 w-16 text-yellow-400 animate-pulse mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">正在处理中...</h3>
                  <p className="text-gray-400">此任务正在处理中，请稍候查看结果</p>
                </div>
              </div>
            )}

            {/* 失败状态 */}
            {selectedItem.status === 'failed' && (
              <div className="flex-1 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">处理失败</h3>
                  <p className="text-gray-400">此任务处理失败，请查看上方错误信息</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 增强提示词弹窗 */}
      {showPromptModal && selectedItem?.prompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPromptModal(false)}
          />
          
          {/* 弹窗内容 */}
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">增强提示词</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPromptModal(false)}
                className="text-gray-400 hover:text-white h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 弹窗内容 */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedItem.prompt}
                </p>
              </div>
            </div>
            
            {/* 弹窗底部 */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(selectedItem.prompt!);
                  toast.success('提示词已复制到剪贴板');
                }}
                className="border-gray-600 text-black hover:bg-gray-700 hover:text-white"
              >
                <Copy className="h-3 w-3 mr-1" />
                复制
              </Button>
              <Button
                size="sm"
                onClick={() => setShowPromptModal(false)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}