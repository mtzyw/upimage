"use client";

import { CheckCircle, Clock, Shield, Star, Users, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

const ProductAdvantages = () => {
  const t = useTranslations("Landing.NewComponents.ProductAdvantages");
  const advantages = [
    {
      icon: CheckCircle,
      title: t("advantages.aiTechnology.title"),
      description: t("advantages.aiTechnology.description")
    },
    {
      icon: Clock,
      title: t("advantages.fastProcessing.title"),
      description: t("advantages.fastProcessing.description")
    },
    {
      icon: Shield,
      title: t("advantages.dataSecurity.title"),
      description: t("advantages.dataSecurity.description")
    },
    {
      icon: Star,
      title: t("advantages.professionalQuality.title"),
      description: t("advantages.professionalQuality.description")
    },
    {
      icon: Users,
      title: t("advantages.multipleScenarios.title"),
      description: t("advantages.multipleScenarios.description")
    },
    {
      icon: Zap,
      title: t("advantages.oneStopTool.title"),
      description: t("advantages.oneStopTool.description")
    }
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* 标题部分 */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("title")}
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {t("description")}
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
                <h3 className="text-2xl font-bold text-white mb-8 text-center">{t("statsTitle")}</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400 mb-2">99.9%</div>
                    <div className="text-gray-300 text-sm">{t("successRate")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-pink-400 mb-2">50万+</div>
                    <div className="text-gray-300 text-sm">{t("processed")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">2分钟</div>
                    <div className="text-gray-300 text-sm">{t("avgTime")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">10万+</div>
                    <div className="text-gray-300 text-sm">{t("users")}</div>
                  </div>
                </div>
              </div>

              {/* 特色标签 */}
              <div className="flex flex-wrap gap-3">
                {[
                  t("tags.0"),
                  t("tags.1"), 
                  t("tags.2"),
                  t("tags.3"),
                  t("tags.4"),
                  t("tags.5")
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
                  {t("ctaTitle")}
                </h4>
                <p className="text-purple-100 mb-4 text-sm">
                  {t("ctaDescription")}
                </p>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="bg-white text-purple-600 font-bold py-3 px-8 rounded-xl hover:bg-gray-100 transition-colors duration-300 shadow-lg"
                >
                  {t("ctaButton")}
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