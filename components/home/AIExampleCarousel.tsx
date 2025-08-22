"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const AIExampleCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 示例数据，后期可以替换为真实图片
  const examples = [
    {
      id: 1,
      title: "风格转换",
      description: "将普通照片转换为艺术风格",
      image: "https://cdn.imgenhancer.ai/image.png",
      prompt: "转换为水彩画风格"
    },
    {
      id: 2,
      title: "图像增强",
      description: "提升图片清晰度和细节",
      image: "https://cdn.imgenhancer.ai/image2.png",
      prompt: "增强图像细节和清晰度"
    },
    {
      id: 3,
      title: "背景移除",
      description: "智能识别并移除背景",
      image: "https://cdn.imgenhancer.ai/image4.png",
      prompt: "移除背景，保留主体"
    }
  ];

  // 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % examples.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [examples.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + examples.length) % examples.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % examples.length);
  };

  const currentExample = examples[currentIndex];

  return (
    <div className="rounded-xl overflow-hidden bg-gray-800/50 backdrop-blur-sm border border-gray-600 shadow-lg mt-12">
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">AI 处理示例</h3>

        {/* 主要展示区域 */}
        <div className="relative mb-6">
          {/* 主图片 */}
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-700">
            <img
              src={currentExample.image}
              alt={currentExample.title}
              className="w-full h-full object-cover transition-all duration-500"
            />

            {/* 左右切换按钮 */}
            <button
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 backdrop-blur-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-300 backdrop-blur-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

          </div>
        </div>


        {/* 处理指令 */}
        <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
          <div className="flex items-center mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span className="text-gray-400 text-sm">处理指令</span>
          </div>
          <p className="text-white text-sm">
            "{currentExample.prompt}"
          </p>
        </div>

        {/* 页面指示器 */}
        <div className="flex justify-center mt-4 space-x-2">
          {examples.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex
                ? 'bg-purple-500 w-6'
                : 'bg-gray-500 hover:bg-gray-400'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIExampleCarousel;