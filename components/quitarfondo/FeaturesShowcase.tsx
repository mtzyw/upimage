'use client'

import Image from "next/image";

export default function FeaturesShowcase() {
  const examples = [
    {
      image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop",
      title: "电商产品照片",
      description: "为在线商店、目录和营销材料创建干净的产品图片，使用透明背景完美展示。",
      isReversed: false
    },
    {
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=face",
      title: "人像摄影",
      description: "去除人像照片中令人分心的背景，创建专业的头像和个人资料图片。",
      isReversed: true
    },
    {
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop",
      title: "社交媒体内容",
      description: "通过移除背景并添加自定义设计或颜色，创建引人注目的社交媒体帖子。",
      isReversed: false
    },
    {
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop",
      title: "营销材料",
      description: "通过移除不需要的背景，为手册、演示文稿和广告提供灵活的图片。",
      isReversed: true
    }
  ];

  return (
    <div className="py-12 bg-gradient-to-b from-transparent to-black/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            惊人 <span className="text-pink-400">效果</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            查看我们的AI技术如何为不同场景提供完美的背景移除效果
          </p>
        </div>

        {/* Examples */}
        <div className="space-y-16">
          {examples.map((example, index) => (
            <div key={index} className={`grid lg:grid-cols-2 gap-8 items-center ${example.isReversed ? 'lg:grid-flow-col-dense' : ''}`}>
              {/* Content */}
              <div className={`space-y-4 ${example.isReversed ? 'lg:col-start-2' : ''}`}>
                <h3 className="text-2xl font-bold text-white">{example.title}</h3>
                <p className="text-gray-300 text-base leading-relaxed">
                  {example.description}
                </p>
              </div>

              {/* Image Showcase */}
              <div className={`relative ${example.isReversed ? 'lg:col-start-1' : ''}`}>
                <div className="rounded-xl overflow-hidden bg-gray-800 border border-gray-600 shadow-lg">
                  <Image
                    src={example.image}
                    alt={example.title}
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}