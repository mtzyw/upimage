'use client'

import { Upload, Zap, Download, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HowItWorks() {
  const t = useTranslations('QuitarFondo');
  
  const steps = [
    {
      icon: <Upload className="w-8 h-8" />,
      titleKey: 'howItWorks.steps.0.title',
      descriptionKey: 'howItWorks.steps.0.description',
      color: "from-pink-500 to-purple-600"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      titleKey: 'howItWorks.steps.1.title',
      descriptionKey: 'howItWorks.steps.1.description',
      color: "from-cyan-500 to-blue-600"
    },
    {
      icon: <Download className="w-8 h-8" />,
      titleKey: 'howItWorks.steps.2.title',
      descriptionKey: 'howItWorks.steps.2.description',
      color: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <div className="py-12 bg-gradient-to-b from-black/20 to-transparent">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            {t('howItWorks.title')}<span className="text-yellow-400">{t('howItWorks.titleColorful')}</span>{t('howItWorks.titleQuestion')}
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            {t('howItWorks.description')}
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
                    <h3 className="text-xl font-semibold text-white">{t(step.titleKey)}</h3>
                    <p className="text-gray-400 text-base leading-relaxed">{t(step.descriptionKey)}</p>
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
              {t('howItWorks.tips.title')}
            </h4>
            <div className="text-gray-300 space-y-2">
              <p>{t('howItWorks.tips.items.0')}</p>
              <p>{t('howItWorks.tips.items.1')}</p>
              <p>{t('howItWorks.tips.items.2')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}