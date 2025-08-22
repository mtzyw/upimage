"use client";

import { Star, Users, Zap, ThumbsUp, Shield, Trophy } from "lucide-react";

const UserStats = () => {
  const stats = [
    {
      icon: Users,
      number: "150,000+",
      label: "活跃用户",
      description: "来自全球的创作者信赖我们",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: Zap,
      number: "2,000,000+", 
      label: "图片已处理",
      description: "累计处理图片数量持续增长",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: Star,
      number: "4.9/5",
      label: "用户评分",
      description: "基于真实用户反馈评价",
      color: "from-yellow-500 to-orange-600"
    },
    {
      icon: ThumbsUp,
      number: "98.5%",
      label: "满意度",
      description: "用户对处理结果表示满意",
      color: "from-green-500 to-teal-600"
    }
  ];

  const highlights = [
    {
      icon: Shield,
      title: "安全可靠",
      description: "企业级安全保障，隐私数据严格保护"
    },
    {
      icon: Trophy,
      title: "行业领先",
      description: "AI图像处理技术获得多项技术创新奖"
    },
    {
      icon: Zap,
      title: "高效便捷",
      description: "平均2分钟完成处理，提升工作效率"
    }
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* 标题部分 */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              深受用户信赖的AI平台
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              数十万用户的选择，数百万次成功处理，见证AI图像技术的无限可能
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
              <h3 className="text-2xl font-bold text-white mb-4">用户评价</h3>
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
                基于 <strong className="text-white">15,000+</strong> 真实用户评价
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
                  <span className="text-white text-sm whitespace-nowrap">{item.stars}星</span>
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