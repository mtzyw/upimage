"use client";

import { ArrowUpCircle, Scissors, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

const FeaturesCards = () => {
  const t = useTranslations("Landing.NewComponents.FeaturesCards");
  
  const aiTools = [
    {
      icon: Sparkles,
      title: t("tools.aiGeneration.title"),
      description: t("tools.aiGeneration.description"),
      features: [
        t("tools.aiGeneration.features.0"),
        t("tools.aiGeneration.features.1"),
        t("tools.aiGeneration.features.2"),
        t("tools.aiGeneration.features.3")
      ],
      gradient: "from-blue-500 to-purple-600",
      link: "#"
    },
    {
      icon: Scissors,
      title: t("tools.backgroundRemoval.title"),
      description: t("tools.backgroundRemoval.description"),
      features: [
        t("tools.backgroundRemoval.features.0"),
        t("tools.backgroundRemoval.features.1"),
        t("tools.backgroundRemoval.features.2"),
        t("tools.backgroundRemoval.features.3")
      ],
      gradient: "from-green-500 to-teal-600",
      link: "/quitarfondo"
    },
    {
      icon: ArrowUpCircle,
      title: t("tools.imageUpscaling.title"),
      description: t("tools.imageUpscaling.description"),
      features: [
        t("tools.imageUpscaling.features.0"),
        t("tools.imageUpscaling.features.1"),
        t("tools.imageUpscaling.features.2"),
        t("tools.imageUpscaling.features.3")
      ],
      gradient: "from-pink-500 to-red-600",
      link: "/upscaler"
    }
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t("title")}
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {aiTools.map((tool, index) => {
            const IconComponent = tool.icon;
            return (
              <div
                key={index}
                className="group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 transition-all duration-300 hover:bg-white/15 hover:scale-105 hover:shadow-2xl"
              >
                {/* 背景渐变 */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />

                {/* 图标 */}
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${tool.gradient} rounded-xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>

                {/* 内容 */}
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-200 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  {tool.description}
                </p>

                {/* 特性标签 */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {tool.features.map((feature, featureIndex) => (
                    <span
                      key={featureIndex}
                      className="bg-white/10 text-white text-xs px-3 py-1 rounded-full border border-white/20"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* 按钮 */}
                <a
                  href={tool.link}
                  className={`inline-flex items-center justify-center w-full bg-gradient-to-r ${tool.gradient} text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-300 group-hover:scale-105`}
                >
                  {t("useNow")}
                </a>

                {/* 装饰性光晕 */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${tool.gradient} rounded-2xl opacity-0 group-hover:opacity-20 blur transition-all duration-300 -z-10`} />
              </div>
            );
          })}
        </div>

        {/* 底部提示 */}
        <div className="text-center mt-12">
          <p className="text-gray-400 mb-4">
            {t("footerDescription")}
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-8 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg"
          >
            {t("footerButton")}
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesCards;