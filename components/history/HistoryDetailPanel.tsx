"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Copy, CheckCircle, XCircle, Clock, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import Image from "next/image";
import ImageComparisonSlider from "@/components/workspace/ImageComparisonSlider";
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

interface HistoryDetailPanelProps {
  selectedItem: HistoryItem | null;
}

const StatusBadge = ({ status }: { status: string }) => {
  const t = useTranslations("History");
  
  switch (status) {
    case 'completed':
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-400/50">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t("status.completed")}
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="default" className="bg-red-500/20 text-red-400 border-red-400/50">
          <XCircle className="h-3 w-3 mr-1" />
          {t("status.failed")}
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-400/50">
          <Clock className="h-3 w-3 mr-1" />
          {t("status.processing")}
        </Badge>
      );
    default:
      return null;
  }
};

const OptimizationTypeText = ({ type }: { type: string }) => {
  const t = useTranslations("History");
  
  return t(`optimizationTypes.${type}`) || type;
};

export default function HistoryDetailPanel({ selectedItem }: HistoryDetailPanelProps) {
  const [showPromptModal, setShowPromptModal] = useState(false);
  const t = useTranslations("History");

  const handleDownload = (url: string) => {
    try {
      // 使用 Cloudflare Worker 代理下载，避免CORS问题并提升性能
      const workerUrl = process.env.NEXT_PUBLIC_DOWNLOAD_WORKER_URL;
      
      if (!workerUrl) {
        toast.error(t('downloadServiceNotConfigured'));
        return;
      }
      
      const filename = `enhanced-${selectedItem?.id}.jpg`;
      const downloadUrl = `${workerUrl}/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}&taskId=${selectedItem?.id}`;
      
      // 直接跳转到下载链接，Worker会设置正确的响应头触发下载
      window.open(downloadUrl, '_blank');
      
      toast.success(t('downloadStart'));
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : t('downloadError'));
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('linkCopied'));
    } catch (error) {
      console.error('Copy error:', error);
      toast.error(t('copyError'));
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
              <h3 className="text-xl font-semibold text-white mb-2">{t('selectRecord')}</h3>
              <p className="text-gray-400">{t('selectRecordDescription')}</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* 头部信息 */}
            <div className="flex-shrink-0 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">{t('processingDetails')}</h3>
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
                    <span className="text-gray-400">{t('createTime')}</span>
                    <div className="text-white font-medium">{formatDate(selectedItem.created_at)}</div>
                  </div>
                  {selectedItem.completed_at && (
                    <div>
                      <span className="text-gray-400">{t('completeTime')}</span>
                      <div className="text-white font-medium">{formatDate(selectedItem.completed_at)}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">{t('creditsConsumed')}</span>
                    <div className="text-yellow-400 font-medium">{selectedItem.credits_consumed}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('optimizationType')}</span>
                    <div className="text-white font-medium">
                      <OptimizationTypeText type={selectedItem.optimization_type} />
                    </div>
                  </div>
                  
                  {/* 第二行 - 次要参数 */}
                  <div>
                    <span className="text-gray-400">{t('creativity')}</span>
                    <div className="text-pink-400 font-medium">{selectedItem.creativity}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('hdrIntensity')}</span>
                    <div className="text-green-400 font-medium">{selectedItem.hdr}</div>
                  </div>
                  {selectedItem.prompt && (
                    <div className="col-span-2">
                      <span className="text-gray-400">{t('enhancePrompt')}</span>
                      <div 
                        className="text-white font-medium truncate cursor-pointer hover:text-cyan-400 transition-colors"
                        title={t('clickToViewFullPrompt')}
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
                    <span className="text-red-400 text-xs">{t('errorMessage')}</span>
                    <div className="text-red-300 text-xs bg-red-400/10 rounded p-2 mt-1 border border-red-400/30">
                      {selectedItem.error_message}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 图片展示组件 - 根据任务类型选择展示方式 */}
            {selectedItem.status === 'completed' && selectedItem.cdn_url && selectedItem.r2_original_key && (
              <div className="flex-1 min-h-0 flex flex-col justify-between">
                <div className="flex justify-center flex-1 items-center p-4">
                  <div className="w-full max-w-2xl lg:max-w-3xl">
                    {selectedItem.optimization_type === 'remove_background' ? (
                      <div className="relative w-full mx-auto rounded-lg overflow-hidden shadow-2xl" 
                           style={{ aspectRatio: '16/10' }}>
                        {/* 棋盘背景用于显示透明区域 */}
                        <div className="absolute inset-0" 
                             style={{
                               backgroundImage: `repeating-conic-gradient(#ffffff 0% 25%, #f3f4f6 25% 50%)`,
                               backgroundSize: '20px 20px'
                             }}>
                        </div>
                        
                        <Image
                          src={selectedItem.cdn_url}
                          alt={t('removeBackgroundResult')}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
                          priority
                        />
                      </div>
                    ) : (
                      <ImageComparisonSlider
                        beforeImage={getOriginalImageUrl(selectedItem.r2_original_key)}
                        afterImage={selectedItem.cdn_url}
                        beforeLabel={t('beforeImage')}
                        afterLabel={t('afterImage')}
                        className="mx-auto"
                        aspectRatio={16 / 10}
                        initialPosition={50}
                      />
                    )}
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
                      {t('downloadImage')}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="border-gray-600 text-black hover:bg-gray-700 hover:text-white h-10"
                      onClick={() => window.open(selectedItem.cdn_url!, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('preview')}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="border-gray-600 text-black hover:bg-gray-700 hover:text-white h-10"
                      onClick={() => handleCopyUrl(selectedItem.cdn_url!)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {t('copyLink')}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="border-gray-600 text-black hover:bg-gray-700 hover:text-white h-10"
                      onClick={() => {
                        const text = t('shareText', { url: selectedItem.cdn_url || '' });
                        navigator.share ? navigator.share({ text, url: selectedItem.cdn_url }) : handleCopyUrl(text);
                      }}
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      {t('share')}
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
                  <h3 className="text-xl font-semibold text-white mb-2">{t('processing')}</h3>
                  <p className="text-gray-400">{t('processingDescription')}</p>
                </div>
              </div>
            )}

            {/* 失败状态 */}
            {selectedItem.status === 'failed' && (
              <div className="flex-1 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">{t('processingFailed')}</h3>
                  <p className="text-gray-400">{t('processingFailedDescription')}</p>
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
              <h3 className="text-lg font-semibold text-white">{t('enhancePrompt')}</h3>
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
                  toast.success(t('promptCopied'));
                }}
                className="border-gray-600 text-black hover:bg-gray-700 hover:text-white"
              >
                <Copy className="h-3 w-3 mr-1" />
                {t('copy')}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowPromptModal(false)}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {t('close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}