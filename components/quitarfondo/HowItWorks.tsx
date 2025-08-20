'use client'

import { Upload, Zap, Download, ArrowRight } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: <Upload className="w-8 h-8" />,
      title: "上传图片",
      description: "拖拽放置或选择任何JPG、PNG或WEBP格式的图片",
      color: "from-pink-500 to-purple-600"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "AI自动处理",
      description: "我们的先进AI在几秒内分析并移除背景",
      color: "from-cyan-500 to-blue-600"
    },
    {
      icon: <Download className="w-8 h-8" />,
      title: "下载结果",
      description: "获取高质量的透明背景图片",
      color: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <div className="py-12 bg-gradient-to-b from-black/20 to-transparent">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            如何<span className="text-yellow-400">使用</span>？
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            仅三个简单步骤，即可获得专业结果
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 md:gap-3 relative">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Card */}
                <div className="text-center space-y-4 p-6 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-colors duration-200 relative z-10 h-full flex flex-col">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white`}>
                    {step.icon}
                  </div>

                  {/* Content */}
                  <div className="space-y-2 flex-grow flex flex-col justify-center">
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                    <p className="text-gray-400 text-base leading-relaxed">{step.description}</p>
                  </div>
                </div>

                {/* Arrow (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-20">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-gray-800/50 border border-gray-700 rounded-lg p-4 max-w-xl">
            <h4 className="text-lg font-semibold text-white mb-2">
              💡 <span className="text-cyan-400">获得更佳效果的小贴士</span>
            </h4>
            <div className="text-gray-300 space-y-2">
              <p>✓ 使用光线良好、对比度高的图片</p>
              <p>✓ 避免背景与主体颜色过于相似</p>
              <p>✓ 高分辨率图片能产生更好的效果</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}