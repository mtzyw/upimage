"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface ImageComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspectRatio?: number;
  initialPosition?: number;
}

export default function ImageComparisonSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Before",
  afterLabel = "After",
  className = "",
  aspectRatio = 16 / 9,
  initialPosition = 50,
}: ImageComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const updateSliderPosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateSliderPosition(e.clientX);
  }, [updateSliderPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    updateSliderPosition(e.clientX);
  }, [isDragging, updateSliderPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    updateSliderPosition(touch.clientX);
  }, [updateSliderPosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateSliderPosition(touch.clientX);
  }, [isDragging, updateSliderPosition]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl bg-gray-800 border-2 border-cyan-400/50 shadow-lg shadow-cyan-400/10"
        style={{
          aspectRatio: aspectRatio,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* After Image (底层，完整显示) */}
        <div className="absolute inset-0">
          <Image
            src={afterImage}
            alt={afterLabel}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            onLoad={handleImageLoad}
            priority
          />
          {/* After 标签 */}
          <div className="absolute top-4 right-4 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md">
            <span className="text-gray-800 text-sm font-semibold">{afterLabel}</span>
          </div>
        </div>

        {/* Before Image (顶层，通过遮罩控制显示区域) */}
        <div
          className="absolute inset-0 transition-all duration-75 ease-out"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          }}
        >
          <Image
            src={beforeImage}
            alt={beforeLabel}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          {/* Before 标签 */}
          <div className="absolute top-4 left-4 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md">
            <span className="text-gray-800 text-sm font-semibold">{beforeLabel}</span>
          </div>
        </div>

        {/* 分割线和控制点 */}
        {isLoaded && (
          <div
            ref={sliderRef}
            className="absolute top-0 h-full w-px bg-white shadow-lg transition-all duration-75 ease-out z-10"
            style={{
              left: `${sliderPosition}%`,
              transform: 'translateX(-50%)',
            }}
          >

            {/* 简洁控制点 - 半透明箭头 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform duration-200">
              <svg
                className="w-8 h-6 text-white/80 hover:text-white drop-shadow-lg"
                viewBox="-8 -3 16 6"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                vectorEffect="non-scaling-stroke"
              >
                <path d="M -5 -2 L -7 0 L -5 2 M 5 -2 L 7 0 L 5 2" />
              </svg>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="flex items-center space-x-2 text-gray-400">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">加载中...</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}