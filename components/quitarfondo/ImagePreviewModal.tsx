'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  originalUrl?: string;
  title?: string;
  onDownload?: () => void;
}

export default function ImagePreviewModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  originalUrl, 
  title = "Preview",
  onDownload 
}: ImagePreviewModalProps) {
  const t = useTranslations('QuitarFondo');
  const [zoom, setZoom] = useState(1);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}>
      {/* 背景遮罩 */}
      <div 
        className="absolute bg-black/80 backdrop-blur-sm"
        style={{ top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative w-[90vw] h-[90vh] max-w-4xl max-h-[800px] bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden">
        {/* 顶部工具栏 */}
        <div className="absolute top-4 right-4 z-10">
          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button
                size="sm"
                onClick={onDownload}
                className="bg-gray-800/80 hover:bg-gray-700 text-white p-2"
                title={t('previewModal.download')}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={onClose}
              className="bg-gray-800/80 hover:bg-gray-700 text-white p-2"
              title={t('previewModal.close')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 底部工具栏 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm rounded-lg p-2">
            <Button
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.25}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2"
              title={t('previewModal.zoomOut')}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            <span className="text-white text-sm px-2 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <Button
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2"
              title={t('previewModal.zoomIn')}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 图片显示区域 */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden p-4 pt-16 pb-16">
          <div 
            className="relative transition-transform duration-200 ease-in-out"
            style={{ 
              transform: `scale(${zoom})`,
            }}
          >
            <Image
              src={imageUrl}
              alt={t('previewModal.previewImage')}
              width={600}
              height={400}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '70vw',
                maxHeight: '60vh'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}