"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Copy, Loader2, CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";

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

interface ResultDisplayPanelProps {
  taskStatus: TaskStatus | null;
  isProcessing: boolean;
  onDownload: (url: string) => void;
  onCopyUrl: (url: string) => void;
}

export default function ResultDisplayPanel({
  taskStatus,
  isProcessing,
  onDownload,
  onCopyUrl,
}: ResultDisplayPanelProps) {
  return (
    <div className="flex-1 h-full bg-gray-900/95 border border-gray-700 rounded-lg m-1 sm:mt-2 sm:mr-2 sm:mb-2 sm:ml-2 p-4 sm:p-8" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="h-full flex flex-col">
        <div className={`flex-1 rounded-lg ${taskStatus?.status === 'completed' ? 'flex flex-col' : 'flex items-center justify-center'}`}>
          {!taskStatus && !isProcessing ? (
            <div className="text-center">
              {/* 复古电视机图标 */}
              <div className="relative mx-auto mb-6 w-32 h-24">
                <div className="w-full h-full bg-gray-700 rounded-lg border-4 border-gray-600 relative">
                  {/* 屏幕 */}
                  <div className="absolute inset-2 bg-gray-800 rounded-sm flex items-center justify-center">
                    <div className="w-4 h-4 bg-gray-600 rounded-full"></div>
                  </div>
                  {/* 右侧控制旋钮 */}
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-600 rounded-full border-2 border-gray-500"></div>
                  <div className="absolute -right-2 top-1/2 translate-y-2 w-3 h-3 bg-gray-600 rounded-full border border-gray-500"></div>
                  {/* 底部支架 */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-gray-600 rounded-full"></div>
                </div>
              </div>
              
              <h3 className="text-xl font-medium text-white mb-2">啊哦！看来您还没有创建任何内容。</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                上传图片并点击&ldquo;开始增强&rdquo;来生成结果
              </p>
            </div>
          ) : isProcessing || (taskStatus && taskStatus.status === 'processing') ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 className="h-12 w-12 text-cyan-400 mb-4 animate-spin" />
              <h3 className="text-xl font-semibold text-white mb-2">AI正在处理中...</h3>
              <p className="text-gray-400">正在连接 Freepik AI 服务并增强您的图像</p>
              <div className="mt-4 w-64">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-pink-500 to-cyan-500 h-2 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : taskStatus && taskStatus.status === 'completed' ? (
            <div className="h-full overflow-y-auto space-y-6">
              {/* 任务状态信息 */}
              <div className="bg-gray-700/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <span className="text-white font-medium text-lg">已完成</span>
                  </div>
                  <Badge variant="outline" className="text-sm text-white px-3 py-1">
                    {taskStatus.scaleFactor}
                  </Badge>
                </div>
              </div>

              {/* 上下两部分布局 */}
              {taskStatus.cdnUrl && (
                <>
                  {/* 上部分：图片对比展示 */}
                  <div className="flex-1 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[400px]">
                      {/* 原图 */}
                      {taskStatus.originalUrl && (
                        <div className="flex flex-col h-full">
                          <div className="text-center mb-4 flex-shrink-0">
                            <h4 className="text-lg font-medium text-gray-300">原图</h4>
                            <p className="text-sm text-gray-400">Original image</p>
                          </div>
                          <div className="flex-1 relative border-2 border-cyan-400 rounded-xl overflow-hidden bg-gray-800 shadow-lg">
                            <Image
                              src={taskStatus.originalUrl}
                              alt="Original image"
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
                              className="object-contain"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* 增强后 */}
                      <div className="flex flex-col h-full">
                        <div className="text-center mb-4 flex-shrink-0">
                          <h4 className="text-lg font-medium text-cyan-400">增强后 ({taskStatus.scaleFactor})</h4>
                          <p className="text-sm text-cyan-300">Enhanced image</p>
                        </div>
                        <div className="flex-1 relative border-2 border-cyan-400/50 rounded-xl overflow-hidden bg-gray-800 shadow-lg shadow-cyan-400/10">
                          <Image
                            src={taskStatus.cdnUrl}
                            alt="Enhanced image"
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 下部分：操作区域 */}
                  <div className="mt-4 bg-gray-800/50 rounded-xl p-4 space-y-3 flex-shrink-0">
                    {/* 主要操作按钮 */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <Button 
                        onClick={() => onDownload(taskStatus.cdnUrl!)}
                        className="bg-green-600 hover:bg-green-700 text-white h-10"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        下载图片
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 h-10"
                        onClick={() => window.open(taskStatus.cdnUrl!, '_blank')}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        预览
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 h-10"
                        onClick={() => onCopyUrl(taskStatus.cdnUrl!)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        复制链接
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 h-10"
                        onClick={() => {
                          // 分享功能，可以后续实现
                          if (navigator.share) {
                            navigator.share({
                              title: '我的AI增强图片',
                              url: taskStatus.cdnUrl!
                            });
                          } else {
                            onCopyUrl(taskStatus.cdnUrl!);
                          }
                        }}
                      >
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        分享
                      </Button>
                    </div>
                    
                    {/* 任务详情 */}
                    <div className="border-t border-gray-700 pt-3">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">任务详情</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex justify-between md:flex-col md:items-start">
                          <span className="text-gray-400">任务ID</span>
                          <span className="font-mono text-gray-300">{taskStatus.taskId.substring(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between md:flex-col md:items-start">
                          <span className="text-gray-400">消耗积分</span>
                          <span className="text-cyan-400 font-semibold">{taskStatus.creditsConsumed}</span>
                        </div>
                        <div className="flex justify-between md:flex-col md:items-start">
                          <span className="text-gray-400">创建时间</span>
                          <span className="text-gray-300">{new Date(taskStatus.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : taskStatus && taskStatus.status === 'failed' ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <XCircle className="h-16 w-16 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">处理失败</h3>
              <p className="text-red-300 max-w-md">{taskStatus.error || '图像处理过程中出现错误，请稍后重试'}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}