"use client";

import { Star, Users, Zap, ThumbsUp, Shield, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

const UserStats = () => {
  const t = useTranslations("Landing.NewComponents.UserStats");
  const stats = [
    {
      icon: Users,
      number: "150,000+",
      label: t("stats.activeUsers.label"),
      description: t("stats.activeUsers.description"),
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: Zap,
      number: "2,000,000+", 
      label: t("stats.imagesProcessed.label"),
      description: t("stats.imagesProcessed.description"),
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: Star,
      number: "4.9/5",
      label: t("stats.userRating.label"),
      description: t("stats.userRating.description"),
      color: "from-yellow-500 to-orange-600"
    },
    {
      icon: ThumbsUp,
      number: "98.5%",
      label: t("stats.satisfaction.label"),
      description: t("stats.satisfaction.description"),
      color: "from-green-500 to-teal-600"
    }
  ];

  const highlights = [
    {
      icon: Shield,
      title: t("highlights.security.title"),
      description: t("highlights.security.description")
    },
    {
      icon: Trophy,
      title: t("highlights.leading.title"),
      description: t("highlights.leading.description")
    },
    {
      icon: Zap,
      title: t("highlights.efficient.title"),
      description: t("highlights.efficient.description")
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

          {/* 数据统计 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center group hover:bg-white/15 transition-all duration-300 hover:scale-105"
                >
                  {/* 图标 */}
                  <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  
                  {/* 数字 */}
                  <div className="text-3xl font-bold text-white mb-2 group-hover:text-purple-200 transition-colors">
                    {stat.number}
                  </div>
                  
                  {/* 标签 */}
                  <div className="text-lg font-semibold text-gray-200 mb-2">
                    {stat.label}
                  </div>
                  
                  {/* 描述 */}
                  <div className="text-sm text-gray-400">
                    {stat.description}
                  </div>

                  {/* 装饰性光晕 */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${stat.color} rounded-2xl opacity-0 group-hover:opacity-20 blur transition-all duration-300 -z-10`} />
                </div>
              );
            })}
          </div>

          {/* 星级评价展示 */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-8 mb-16 backdrop-blur-sm">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">{t("ratingTitle")}</h3>
              <div className="flex items-center justify-center mb-4">
                <div className="flex text-yellow-400 mr-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-8 h-8 fill-current" />
                  ))}
                </div>
                <span className="text-3xl font-bold text-white">4.9</span>
                <span className="text-gray-300 ml-2">/ 5</span>
              </div>
              <p className="text-gray-300">
                {t("ratingDescription", { count: "15,000+" })}
              </p>
            </div>

            {/* 评价分布 */}
            <div className="grid md:grid-cols-5 gap-4 mb-8">
              {[
                { stars: 5, percentage: 89 },
                { stars: 4, percentage: 8 },
                { stars: 3, percentage: 2 },
                { stars: 2, percentage: 1 },
                { stars: 1, percentage: 0 }
              ].map((item) => (
                <div key={item.stars} className="flex items-center space-x-2">
                  <span className="text-white text-sm whitespace-nowrap">{item.stars}{t("stars")}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-gray-300 text-sm">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 核心亮点 */}
          <div className="grid md:grid-cols-3 gap-8">
            {highlights.map((highlight, index) => {
              const IconComponent = highlight.icon;
              return (
                <div
                  key={index}
                  className="text-center group"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3 group-hover:text-purple-200 transition-colors">
                    {highlight.title}
                  </h4>
                  <p className="text-gray-300 leading-relaxed">
                    {highlight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default UserStats;