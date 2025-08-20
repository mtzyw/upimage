'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import Image from 'next/image';

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
  title = "预览",
  onDownload 
}: ImagePreviewModalProps) {
  const [currentView, setCurrentView] = useState<'processed' | 'original'>('processed');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const currentImageUrl = currentView === 'processed' ? imageUrl : (originalUrl || imageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative w-full h-full max-w-6xl max-h-screen p-4">
        {/* 顶部工具栏 */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          {/* 左侧标题 */}
          <div className="flex items-center gap-4">
            <h2 className="text-white text-lg font-semibold">{title}</h2>
            {originalUrl && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setCurrentView('processed')}
                  className={`text-xs px-3 py-1 ${
                    currentView === 'processed' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  处理后
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentView('original')}
                  className={`text-xs px-3 py-1 ${
                    currentView === 'original' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  原图
                </Button>
              </div>
            )}
          </div>

          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button
                size="sm"
                onClick={onDownload}
                className="bg-gray-800/80 hover:bg-gray-700 text-white p-2"
                title="下载"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={onClose}
              className="bg-gray-800/80 hover:bg-gray-700 text-white p-2"
              title="关闭"
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
              title="缩小"
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
              title="放大"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-gray-600 mx-1" />
            
            <Button
              size="sm"
              onClick={handleRotate}
              className="bg-gray-700 hover:bg-gray-600 text-white p-2"
              title="旋转"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              onClick={handleReset}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 text-xs"
              title="重置"
            >
              重置
            </Button>
          </div>
        </div>

        {/* 图片显示区域 */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
          <div 
            className="relative transition-transform duration-200 ease-in-out"
            style={{ 
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              maxWidth: '90%',
              maxHeight: '90%'
            }}
          >
            <Image
              src={currentImageUrl}
              alt="预览图片"
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '80vw',
                maxHeight: '80vh'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}