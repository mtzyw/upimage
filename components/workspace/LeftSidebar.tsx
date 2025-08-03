"use client";

import { Menu, Sparkles, Zap, Image as ImageIcon, Settings } from "lucide-react";
import { useState } from "react";

interface LeftSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function LeftSidebar({ 
  activeTab = 'enhance',
  onTabChange 
}: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: 'enhance',
      icon: Sparkles,
      label: '图像增强',
    },
    {
      id: 'upscale',
      icon: Zap,
      label: '超分辨率',
    },
    {
      id: 'restore',
      icon: ImageIcon,
      label: '图像修复',
    },
    {
      id: 'effects',
      icon: Settings,
      label: '特效处理',
    },
  ];

  return (
    <div className="w-16 sm:w-20 lg:w-24 bg-gray-900/90 flex flex-col h-full overflow-hidden">
      {/* 汉堡菜单按钮 */}
      <div className="p-4 flex justify-center">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
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
          
          return (
            <div key={item.id} className="px-3 py-2">
              <button
                onClick={() => onTabChange?.(item.id)}
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