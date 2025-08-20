'use client'

import Image from "next/image";
import { useTranslations } from "next-intl";

export default function FeaturesShowcase() {
  const t = useTranslations('QuitarFondo');
  
  const examples = [
    {
      image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop",
      titleKey: 'featuresShowcase.examples.0.title',
      descriptionKey: 'featuresShowcase.examples.0.description',
      isReversed: false
    },
    {
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=face",
      titleKey: 'featuresShowcase.examples.1.title',
      descriptionKey: 'featuresShowcase.examples.1.description',
      isReversed: true
    },
    {
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop",
      titleKey: 'featuresShowcase.examples.2.title',
      descriptionKey: 'featuresShowcase.examples.2.description',
      isReversed: false
    },
    {
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop",
      titleKey: 'featuresShowcase.examples.3.title',
      descriptionKey: 'featuresShowcase.examples.3.description',
      isReversed: true
    }
  ];

  return (
    <div className="py-12 bg-gradient-to-b from-transparent to-black/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            {t('featuresShowcase.title')} <span className="text-pink-400">{t('featuresShowcase.titleColorful')}</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            {t('featuresShowcase.description')}
          </p>
        </div>

        {/* Examples */}
        <div className="space-y-16">
          {examples.map((example, index) => (
            <div key={index} className={`grid lg:grid-cols-2 gap-8 items-center ${example.isReversed ? 'lg:grid-flow-col-dense' : ''}`}>
              {/* Content */}
              <div className={`space-y-4 ${example.isReversed ? 'lg:col-start-2' : ''}`}>
                <h3 className="text-2xl font-bold text-white">{t(example.titleKey)}</h3>
                <p className="text-gray-300 text-base leading-relaxed">
                  {t(example.descriptionKey)}
                </p>
              </div>

              {/* Image Showcase */}
              <div className={`relative ${example.isReversed ? 'lg:col-start-1' : ''}`}>
                <div className="rounded-xl overflow-hidden bg-gray-800 border border-gray-600 shadow-lg">
                  <Image
                    src={example.image}
                    alt={t(example.titleKey)}
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