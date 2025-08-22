"use client";

import { CheckCircle, Clock, Shield, Star, Users, Zap } from "lucide-react";

const ProductAdvantages = () => {
  const advantages = [
    {
      icon: CheckCircle,
      title: "行业领先的AI技术",
      description: "采用最新的深度学习算法，处理效果达到专业级标准，让您的图片质量显著提升。"
    },
    {
      icon: Clock,
      title: "极速处理体验",
      description: "云端GPU加速，1-3分钟快速完成处理，告别漫长等待，提升工作效率。"
    },
    {
      icon: Shield,
      title: "数据安全保障",
      description: "图片传输加密保护，处理完成后自动删除，确保您的隐私和数据安全。"
    },
    {
      icon: Star,
      title: "专业级输出质量",
      description: "支持8K超高清输出，细节丰富清晰，满足商业印刷、社交媒体等各种使用场景。"
    },
    {
      icon: Users,
      title: "适用多种场景",
      description: "无论是个人创作、商业设计还是内容制作，都能提供最适合的AI处理方案。"
    },
    {
      icon: Zap,
      title: "一站式AI工具",
      description: "图像增强、背景移除、智能编辑，多种AI功能集成，一个平台解决所有需求。"
    }
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* 标题部分 */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              为什么选择我们的AI图像处理平台？
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              集成前沿AI技术，为个人用户和企业客户提供专业级图像处理服务，让每张图片都达到完美效果
            </p>
          </div>

          {/* 主要内容区域 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* 左侧 - 特点列表 */}
            <div className="space-y-8">
              {advantages.map((advantage, index) => {
                const IconComponent = advantage.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start space-x-4 group"
                  >
                    {/* 图标 */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    
                    {/* 内容 */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-200 transition-colors">
                        {advantage.title}
                      </h3>
                      <p className="text-gray-300 leading-relaxed">
                        {advantage.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 右侧 - 视觉展示 */}
            <div className="space-y-8">
              {/* 数据统计 */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-8 text-center">平台数据</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">99.9%</div>
                    <div className="text-gray-300 text-sm">处理成功率</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-pink-400 mb-2">50万+</div>
                    <div className="text-gray-300 text-sm">处理图片数量</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">2分钟</div>
                    <div className="text-gray-300 text-sm">平均处理时间</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">10万+</div>
                    <div className="text-gray-300 text-sm">活跃用户</div>
                  </div>
                </div>
              </div>

              {/* 特色标签 */}
              <div className="flex flex-wrap gap-3">
                {[
                  "🚀 GPU加速",
                  "🔒 隐私保护", 
                  "🎯 精准识别",
                  "💎 专业级质量",
                  "⚡ 极速处理",
                  "🌟 用户好评"
                ].map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA 按钮 */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-center">
                <h4 className="text-xl font-bold text-white mb-3">
                  立即体验AI图像处理
                </h4>
                <p className="text-purple-100 mb-4 text-sm">
                  新用户免费试用，无需注册即可开始
                </p>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="bg-white text-purple-600 font-bold py-3 px-8 rounded-xl hover:bg-gray-100 transition-colors duration-300 shadow-lg"
                >
                  免费试用
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductAdvantages;