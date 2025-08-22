"use client";

import { Sparkles, ArrowRight, CheckCircle, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

const FinalCTA = () => {
  const t = useTranslations("Landing.NewComponents.FinalCTA");
  const benefits = [
    t("benefits.0"),
    t("benefits.1"),
    t("benefits.2"),
    t("benefits.3")
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* 主要CTA区域 */}
          <div className="relative">
            {/* 背景效果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 rounded-3xl blur-xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-pink-900/30 to-blue-900/30 rounded-3xl" />
            
            {/* 内容区域 */}
            <div className="relative bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-white/20 rounded-3xl p-12 backdrop-blur-sm">
              <div className="text-center">
                {/* 图标 */}
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-8 shadow-2xl">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>

                {/* 标题 */}
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                  {t("title")}
                </h2>

                {/* 描述 */}
                <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                  {t("description")}
                </p>

                {/* 特色标签 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                  {benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                    >
                      <span className="text-white text-sm font-medium">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 按钮组 */}
                <div className="flex justify-center items-center mb-8">
                  <button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="group bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-8 rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-2xl hover:shadow-purple-500/25 hover:scale-105 flex items-center"
                  >
                    <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                    {t("button")}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                </div>

                {/* 底部信息 */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-gray-400 text-sm">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    {t("noCard")}
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    {t("instant")}
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    {t("chinese")}
                  </div>
                </div>
              </div>
            </div>

            {/* 装饰性元素 */}
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-pink-500/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* 底部统计信息 */}
          <div className="mt-16 text-center">
            <p className="text-gray-400 mb-4">
              {t("footerDescription", { count: "150,000+" })}
            </p>
            <div className="flex justify-center items-center space-x-8 text-sm text-gray-500">
              <span>✨ {t("footerStats.imagesProcessed")}</span>
              <span>🌟 {t("footerStats.userRating")}</span>
              <span>⚡ {t("footerStats.successRate")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;