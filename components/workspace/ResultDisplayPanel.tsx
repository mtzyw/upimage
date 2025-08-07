"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Copy, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import ImageComparisonSlider from "./ImageComparisonSlider";

interface TaskStatus {
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  createdAt: string;
  scaleFactor: string;
  creditsConsumed: number;
  cdnUrl?: string;
  originalUrl?: string;
  completedAt?: string;
  error?: string;
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
  const t = useTranslations("Enhance");
  return (
    <div className="flex-1 h-full bg-gray-900/95 border border-gray-700 rounded-lg m-1 sm:mt-2 sm:mr-2 sm:mb-2 sm:ml-2 p-3 sm:p-4">
      <div className="h-full flex flex-col">
        {!taskStatus && !isProcessing ? (
          <div className="flex-1 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="relative mx-auto mb-6 w-32 h-24">
                <div className="w-full h-full bg-gray-700 rounded-lg border-4 border-gray-600 relative">
                  <div className="absolute inset-2 bg-gray-800 rounded-sm flex items-center justify-center">
                    <div className="w-4 h-4 bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-gray-600 rounded-b-sm"></div>
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-12 h-2 bg-gray-600 rounded-sm"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{t('status.waiting')}</h3>
              <p className="text-gray-400">{t('messages.selectImageAndStart')}</p>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="flex-1 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-16 w-16 text-cyan-400 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{t('status.processing')}...</h3>
              <p className="text-gray-400">{t('messages.aiProcessing')}</p>
            </div>
          </div>
        ) : taskStatus && taskStatus.status === 'completed' ? (
          <div className="h-full flex flex-col">
            {taskStatus.cdnUrl && taskStatus.originalUrl && (
              <>
                <div className="text-center mb-3 flex-shrink-0">
                  <h4 className="text-lg font-semibold text-white mb-1">
                    {t('status.enhancedImage')} ({taskStatus.scaleFactor})
                  </h4>
                  <p className="text-gray-400 text-xs">
                    {t('messages.dragToCompare')}
                  </p>
                </div>

                <div className="flex-1 min-h-0 flex flex-col justify-between">
                  <div className="flex justify-center flex-1 items-center">
                    <div className="w-full max-w-2xl lg:max-w-3xl">
                      <ImageComparisonSlider
                        beforeImage={taskStatus.originalUrl}
                        afterImage={taskStatus.cdnUrl}
                        beforeLabel="Before"
                        afterLabel="After"
                        className="mx-auto"
                        aspectRatio={16 / 10}
                        initialPosition={50}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded-xl p-3 space-y-2 mx-auto max-w-2xl lg:max-w-3xl w-full mt-4 flex-shrink-0">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <Button 
                        onClick={() => onDownload(taskStatus.cdnUrl!)}
                        className="bg-green-600 hover:bg-green-700 text-white h-10"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t('status.downloadImage')}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="border-gray-600 text-black hover:bg-gray-700 hover:text-white h-10"
                        onClick={() => window.open(taskStatus.cdnUrl!, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('status.viewOriginal')}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="border-gray-600 text-black hover:bg-gray-700 hover:text-white h-10"
                        onClick={() => onCopyUrl(taskStatus.cdnUrl!)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {t('status.copyLink')}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="border-gray-600 text-black hover:bg-gray-700 hover:text-white h-10"
                        onClick={() => {
                          const text = `${t('messages.shareText')}：${taskStatus.cdnUrl}`;
                          navigator.share ? navigator.share({ text, url: taskStatus.cdnUrl }) : onCopyUrl(text);
                        }}
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        {t('messages.share')}
                      </Button>
                    </div>
                    
                    <div className="border-t border-gray-700 pt-3">
                      <h5 className="text-sm font-medium text-gray-300 mb-2">{t('messages.taskDetails')}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex justify-between md:flex-col md:items-start">
                          <span className="text-gray-400">{t('status.status')}</span>
                          <span className="text-green-400 font-semibold flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {t('status.completed')}
                          </span>
                        </div>
                        <div className="flex justify-between md:flex-col md:items-start">
                          <span className="text-gray-400">{t('settings.scaleFactor')}</span>
                          <span className="text-cyan-400 font-semibold">{taskStatus.scaleFactor}</span>
                        </div>
                        <div className="flex justify-between md:flex-col md:items-start">
                          <span className="text-gray-400">{t('credits.consumed')}</span>
                          <span className="text-cyan-400 font-semibold">{taskStatus.creditsConsumed}</span>
                        </div>
                        <div className="flex justify-between md:flex-col md:items-start">
                          <span className="text-gray-400">{t('messages.completedAt')}</span>
                          <span className="text-gray-300">{taskStatus.completedAt ? new Date(taskStatus.completedAt).toLocaleString() : new Date(taskStatus.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : taskStatus && taskStatus.status === 'failed' ? (
          <div className="flex-1 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{t('status.failed')}</h3>
              <p className="text-red-300 max-w-md">{taskStatus.error || t('messages.processingFailed')}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}