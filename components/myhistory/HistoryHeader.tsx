'use client'

import { Button } from "@/components/ui/button";
import { Search, Filter, RefreshCw, ChevronDown } from "lucide-react";
import { useState } from "react";

interface HistoryHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTool: string;
  onToolChange: (tool: string) => void;
  stats: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
    totalCreditsUsed: number;
  };
  onRefresh: () => void;
}

export default function HistoryHeader({
  searchQuery,
  onSearchChange,
  selectedTool,
  onToolChange,
  stats,
  onRefresh
}: HistoryHeaderProps) {
  const [isToolDropdownOpen, setIsToolDropdownOpen] = useState(false);

  const toolOptions = [
    { value: "all", label: "所有工具", icon: "🔧" },
    { value: "remove_background", label: "去除背景", icon: "🎨" },
    { value: "upscaler", label: "图片增强", icon: "✨" },
  ];

  const selectedToolOption = toolOptions.find(tool => tool.value === selectedTool) || toolOptions[0];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">我的图片库</h1>
          <p className="text-gray-400">
            共 {stats.total} 张图片 · 已消耗 {stats.totalCreditsUsed} 积分
          </p>
        </div>
        
        <Button
          onClick={onRefresh}
          className="bg-gray-700/60 hover:bg-gray-600/80 text-white p-3 rounded-lg border border-gray-600/50"
          title="刷新"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>

      {/* 筛选和搜索区域 */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* 左侧：筛选器 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm">筛选</span>
          </div>
          
          {/* 工具类型选择器 */}
          <div className="relative">
            <Button
              onClick={() => setIsToolDropdownOpen(!isToolDropdownOpen)}
              className="bg-gray-800/60 hover:bg-gray-700/80 text-white px-4 py-2 rounded-lg border border-gray-600/50 flex items-center gap-2 min-w-[140px]"
            >
              <span className="text-lg">{selectedToolOption.icon}</span>
              <span className="text-sm">{selectedToolOption.label}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isToolDropdownOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {isToolDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-full min-w-[140px] bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-lg shadow-xl z-10">
                {toolOptions.map((tool) => (
                  <button
                    key={tool.value}
                    onClick={() => {
                      onToolChange(tool.value);
                      setIsToolDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-700/60 transition-colors flex items-center gap-2 ${
                      selectedTool === tool.value ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300'
                    } ${tool === toolOptions[0] ? 'rounded-t-lg' : ''} ${tool === toolOptions[toolOptions.length - 1] ? 'rounded-b-lg' : ''}`}
                  >
                    <span className="text-lg">{tool.icon}</span>
                    <span className="text-sm">{tool.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：搜索框 */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Input key word"
            className="w-full pl-10 pr-4 py-3 bg-gray-800/60 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-gray-400 text-sm">总计</div>
        </div>
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-gray-400 text-sm">已完成</div>
        </div>
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.processing}</div>
          <div className="text-gray-400 text-sm">处理中</div>
        </div>
        <div className="bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
          <div className="text-gray-400 text-sm">失败</div>
        </div>
      </div>
    </div>
  );
}