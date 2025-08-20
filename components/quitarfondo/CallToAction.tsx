'use client'

import { Button } from "@/components/ui/button";
import { Upload, Star, Users, Zap } from "lucide-react";

export default function CallToAction() {
  const stats = [
    {
      icon: <Users className="w-6 h-6" />,
      number: "100K+",
      label: "满意用户"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      number: "1M+",
      label: "已处理图片"
    },
    {
      icon: <Star className="w-6 h-6" />,
      number: "4.9/5",
      label: "平均评分"
    }
  ];

  const testimonials = [
    {
      name: "王丽华",
      role: "平面设计师",
      content: "令人惊叹的精度和速度。现在我可以在几分钟内创作出专业内容。",
      rating: 5
    },
    {
      name: "李明",
      role: "电商运营经理", 
      content: "非常适合产品摄影。效果完美，操作简单。",
      rating: 5
    },
    {
      name: "张小美",
      role: "内容创作者",
      content: "创作社交媒体内容的最佳工具。始终保证专业效果。",
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
                <div className="text-3xl font-bold text-white">{stat.number}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            用户<span className="text-pink-400">评价</span>
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
                <p className="text-gray-300 italic">"{testimonial.content}"</p>
                
                {/* Author */}
                <div className="space-y-1">
                  <div className="text-white font-semibold">{testimonial.name}</div>
                  <div className="text-gray-400 text-sm">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main CTA */}
        <div className="text-center space-y-6 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl p-8">
          <div className="space-y-3">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              准备好创造<span className="text-cyan-400">奇迹</span>了吗？
            </h2>
            <p className="text-gray-300 text-lg max-w-xl mx-auto">
              加入数千名信赖我们AI抠图技术的专业人士。
              立即免费开始体验。
            </p>
          </div>

          <div className="flex justify-center">
            <Button 
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <Upload className="w-6 h-6" />
                免费开始
              </div>
            </Button>
          </div>

          <div className="text-gray-400 text-sm">
            ✓ 免费使用无需注册 • ✓ 即时出结果 • ✓ 100%安全私密
          </div>
        </div>

        {/* Bottom Features */}
        <div className="mt-12 grid md:grid-cols-4 gap-4 text-center">
          <div className="space-y-2">
            <div className="text-cyan-400 font-semibold">🚀 闪电处理</div>
            <div className="text-gray-400 text-sm">3-5秒出结果</div>
          </div>
          <div className="space-y-2">
            <div className="text-pink-400 font-semibold">🎯 AI精度</div>
            <div className="text-gray-400 text-sm">最新一代技术</div>
          </div>
          <div className="space-y-2">
            <div className="text-yellow-400 font-semibold">🔒 100%隐私</div>
            <div className="text-gray-400 text-sm">您的图片会自动删除</div>
          </div>
          <div className="space-y-2">
            <div className="text-green-400 font-semibold">📱 全平台支持</div>
            <div className="text-gray-400 text-sm">网页、手机、平板</div>
          </div>
        </div>
      </div>
    </div>
  );
}