'use client'

import { Button } from "@/components/ui/button";
import { Upload, Star, Users, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

interface CallToActionProps {
  isLoggedIn: boolean;
  onGetStarted: () => void;
}

export default function CallToAction({ isLoggedIn, onGetStarted }: CallToActionProps) {
  const t = useTranslations('QuitarFondo');
  
  const stats = [
    {
      icon: <Users className="w-6 h-6" />,
      numberKey: 'callToAction.stats.0.number',
      labelKey: 'callToAction.stats.0.label'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      numberKey: 'callToAction.stats.1.number',
      labelKey: 'callToAction.stats.1.label'
    },
    {
      icon: <Star className="w-6 h-6" />,
      numberKey: 'callToAction.stats.2.number',
      labelKey: 'callToAction.stats.2.label'
    }
  ];

  const testimonials = [
    {
      nameKey: 'callToAction.testimonials.0.name',
      roleKey: 'callToAction.testimonials.0.role',
      contentKey: 'callToAction.testimonials.0.content',
      rating: 5
    },
    {
      nameKey: 'callToAction.testimonials.1.name',
      roleKey: 'callToAction.testimonials.1.role',
      contentKey: 'callToAction.testimonials.1.content',
      rating: 5
    },
    {
      nameKey: 'callToAction.testimonials.2.name',
      roleKey: 'callToAction.testimonials.2.role',
      contentKey: 'callToAction.testimonials.2.content',
      rating: 5
    }
  ];

  return (
    <div className="py-12 bg-gradient-to-t from-purple-900/20 to-transparent">
      <div className="container mx-auto px-4">
        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white">
                {stat.icon}
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">{t(stat.numberKey)}</div>
                <div className="text-gray-400 text-sm">{t(stat.labelKey)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            {t('callToAction.testimonialsTitle')}<span className="text-pink-400">{t('callToAction.testimonialsColorful')}</span>
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
                {/* Stars */}
                <div className="flex space-x-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                {/* Content */}
                <p className="text-gray-300 italic">&ldquo;{t(testimonial.contentKey)}&rdquo;</p>
                
                {/* Author */}
                <div className="space-y-1">
                  <div className="text-white font-semibold">{t(testimonial.nameKey)}</div>
                  <div className="text-gray-400 text-sm">{t(testimonial.roleKey)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main CTA */}
        <div className="text-center space-y-6 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-8">
          <div className="space-y-3">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              {t('callToAction.mainCta.title')}<span className="text-cyan-400">{t('callToAction.mainCta.titleColorful')}</span>{t('callToAction.mainCta.titleEnd')}
            </h2>
            <p className="text-gray-300 text-lg max-w-xl mx-auto">
              {t('callToAction.mainCta.description')}
            </p>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={onGetStarted}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <Upload className="w-6 h-6" />
                {isLoggedIn ? t('callToAction.mainCta.buttonLoggedIn') : t('callToAction.mainCta.buttonGuest')}
              </div>
            </Button>
          </div>

          <div className="text-gray-400 text-sm">
            {t('callToAction.bottomFeatures')}
          </div>
        </div>

        {/* Bottom Features */}
        <div className="mt-12 grid md:grid-cols-4 gap-4 text-center">
          <div className="space-y-2">
            <div className="text-cyan-400 font-semibold">{t('callToAction.features.0.title')}</div>
            <div className="text-gray-400 text-sm">{t('callToAction.features.0.description')}</div>
          </div>
          <div className="space-y-2">
            <div className="text-pink-400 font-semibold">{t('callToAction.features.1.title')}</div>
            <div className="text-gray-400 text-sm">{t('callToAction.features.1.description')}</div>
          </div>
          <div className="space-y-2">
            <div className="text-yellow-400 font-semibold">{t('callToAction.features.2.title')}</div>
            <div className="text-gray-400 text-sm">{t('callToAction.features.2.description')}</div>
          </div>
          <div className="space-y-2">
            <div className="text-green-400 font-semibold">{t('callToAction.features.3.title')}</div>
            <div className="text-gray-400 text-sm">{t('callToAction.features.3.description')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}