"use client";

import { Menu, Sparkles, History } from "lucide-react";
import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface LeftSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function LeftSidebar({ 
  activeTab = 'enhance',
  onTabChange 
}: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const t = useTranslations("Enhance");

  const menuItems = [
    {
      id: 'enhance',
      icon: Sparkles,
      label: t('title'),
    },
    {
      id: 'history',
      icon: History,
      label: t('history.title'),
    },
  ];

  return (
    <div className="w-20 sm:w-24 lg:w-28 xl:w-32 bg-gray-900/95 border-r border-gray-700 flex flex-col h-full overflow-hidden">
      {/* 汉堡菜单按钮 */}
      <div className="p-4 flex justify-center">
        <button
          onClick={() => {
            // 跳转到首页根路径
            window.location.href = '/';
          }}
          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* 导航选项 */}
      <div className="flex-1 py-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          const handleItemClick = () => {
            // 获取当前语言环境，保持语言路径一致性
            const currentPath = window.location.pathname;
            const locale = currentPath.match(/^\/(en|zh|ja)\//)?.[1] || 'zh';
            
            if (item.id === 'history') {
              // 跳转到历史记录页面
              window.location.href = `/${locale}/history`;
            } else if (item.id === 'enhance') {
              // 跳转到首页/工作台
              window.location.href = `/${locale}/home`;
            } else {
              // 对于其他选项，调用onTabChange
              onTabChange?.(item.id);
            }
          };
          
          return (
            <div key={item.id} className="px-3 py-2">
              <button
                onClick={handleItemClick}
                className={`
                  w-full p-3 flex flex-col items-center gap-1.5 text-xs transition-all rounded-xl
                  hover:bg-gray-800/60 relative
                  ${isActive ? 'bg-purple-500/10' : ''}
                `}
              >
                {/* 左侧紫色指示条 */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500 rounded-r-full" />
                )}
                
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center transition-all
                  ${isActive ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-300'}
                `}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`
                  text-center leading-tight font-medium text-xs
                  ${isActive ? 'text-purple-400' : 'text-gray-500'}
                `}>
                  {item.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}