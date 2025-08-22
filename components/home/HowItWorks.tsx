"use client";

import { Upload, Settings, Sparkles, Download } from "lucide-react";
import { useTranslations } from "next-intl";

const HowItWorks = () => {
  const t = useTranslations("Landing.NewComponents.HowItWorks");
  const steps = [
    {
      number: "01",
      icon: Upload,
      title: t("steps.upload.title"),
      description: t("steps.upload.description"),
      color: "from-blue-500 to-cyan-600"
    },
    {
      number: "02", 
      icon: Settings,
      title: t("steps.describe.title"),
      description: t("steps.describe.description"),
      color: "from-purple-500 to-pink-600"
    },
    {
      number: "03",
      icon: Sparkles,
      title: t("steps.adjust.title"),
      description: t("steps.adjust.description"),
      color: "from-green-500 to-teal-600"
    },
    {
      number: "04",
      icon: Download,
      title: t("steps.generate.title"),
      description: t("steps.generate.description"),
      color: "from-orange-500 to-red-600"
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

          {/* 步骤网格 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div
                  key={index}
                  className="relative group"
                >
                  {/* 连接线 (除了最后一个) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-white/30 to-transparent z-0" />
                  )}
                  
                  {/* 步骤卡片 */}
                  <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center transition-all duration-300 hover:bg-white/15 hover:scale-105 group z-10 h-80 flex flex-col justify-between">
                    {/* 顶部区域 */}
                    <div className="flex flex-col items-center mb-6">
                      {/* 步骤数字 */}
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full text-white font-bold text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        {step.number}
                      </div>
                    </div>

                    {/* 内容区域 */}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-200 transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-base leading-relaxed text-gray-300">
                        {step.description}
                      </p>
                    </div>

                    {/* 装饰性光晕 */}
                    <div className={`absolute -inset-1 bg-gradient-to-r ${step.color} rounded-2xl opacity-0 group-hover:opacity-20 blur transition-all duration-300 -z-10`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部CTA */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-white mb-4">
                {t("ctaTitle")}
              </h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                {t("ctaDescription")}
              </p>
              <div className="flex justify-center">
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-8 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-2xl"
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

export default HowItWorks;