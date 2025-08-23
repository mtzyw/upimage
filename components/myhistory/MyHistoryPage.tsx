'use client'

import { useAuth } from "@/components/providers/AuthProvider";
import { BG1 } from "@/components/shared/BGs";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import HistoryHeader from "./HistoryHeader";
import HistoryGrid from "./HistoryGrid";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface HistoryItem {
  id: string;
  status: 'completed' | 'processing' | 'failed';
  statusMessage: string;
  creditsConsumed: number;
  originalUrl?: string;
  cdnUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  timestamp: string;
  filename: string;
  processingTime?: number;
  engine: string; // 'remove_background', 'upscaler', etc.
}

interface HistoryResponse {
  items: HistoryItem[];
  count: number;
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  stats: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
    totalCreditsUsed: number;
  };
}

export default function MyHistoryPage() {
  const t = useTranslations('Landing.MyHistory');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState("all");
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    totalCreditsUsed: 0
  });

  const ITEMS_PER_PAGE = 18;
  
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // 获取历史记录数据
  const fetchHistory = async (offset = 0, isLoadMore = false, tool?: string) => {
    if (!user) return;
    
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      // 构建API请求URL，根据工具类型筛选
      const currentTool = tool || selectedTool;
      let apiUrl = `/api/history/all?limit=${ITEMS_PER_PAGE}&offset=${offset}`;
      
      // 只有当不是 "all" 时才添加 tool 参数
      if (currentTool !== "all") {
        apiUrl += `&tool=${encodeURIComponent(currentTool)}`;
      }
      
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(t('errors.fetchFailed'));
      }

      const result = await response.json();

      if (result.success && result.data) {
        if (isLoadMore) {
          // 追加新数据，去重处理
          setHistoryItems(prev => {
            const newItems = result.data.items || [];
            const existingIds = new Set(prev.map((item: any) => item.id));
            const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id));
            return [...prev, ...uniqueNewItems];
          });
        } else {
          // 替换数据
          setHistoryItems(result.data.items || []);
        }
        
        setStats(result.data.stats || stats);
        setHasMore(result.data.hasMore);
        setCurrentOffset(offset + ITEMS_PER_PAGE);
      } else {
        throw new Error(result.message || t('errors.fetchFailed'));
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(err instanceof Error ? err.message : t('errors.fetchFailed'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 加载更多数据
  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    
    console.log('Loading more data, current offset:', currentOffset);
    await fetchHistory(currentOffset, true);
  };

  // 处理工具筛选变更
  const handleToolChange = async (newTool: string) => {
    setSelectedTool(newTool);
    setCurrentOffset(0);
    setHasMore(true);
    await fetchHistory(0, false, newTool);
  };

  // 筛选数据（工具筛选已在服务端完成，这里只处理搜索筛选）
  const filteredItems = historyItems.filter(item => {
    return searchQuery === "" || 
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.statusMessage.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 当用户登录时获取历史记录
  useEffect(() => {
    if (user) {
      // 检查URL参数设置初始工具筛选
      const toolParam = searchParams.get('tool');
      const initialTool = (toolParam && ['all', 'remove_background', 'upscaler', 'image-edit', 'text-to-image'].includes(toolParam)) 
        ? toolParam 
        : 'all';
      
      // 如果URL参数指定了工具且与当前不同，更新状态
      if (initialTool !== selectedTool) {
        setSelectedTool(initialTool);
      }
      
      setCurrentOffset(0);
      setHasMore(true);
      fetchHistory(0, false, initialTool);
    } else {
      setHistoryItems([]);
      setLoading(false);
      setError(null);
    }
  }, [user, searchParams]);

  // 滚动监听
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= 
        document.documentElement.offsetHeight - 1000 && // 提前1000px开始加载
        hasMore && 
        !loadingMore && 
        !loading &&
        historyItems.length > 0
      ) {
        loadMore();
      }
    };

    // 使用节流来避免频繁触发
    let timeoutId: NodeJS.Timeout | null = null;
    const throttledHandleScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 100);
    };

    window.addEventListener('scroll', throttledHandleScroll);
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [hasMore, loadingMore, loading, historyItems.length]);

  // 如果用户未登录
  if (!user) {
    return (
      <div className="w-full min-h-screen">
        <BG1 />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">{t('title')}</h1>
            <p className="text-gray-400 text-lg">{t('loginRequired')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <BG1 />
      
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题和筛选区域 */}
        <HistoryHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTool={selectedTool}
          onToolChange={handleToolChange}
          stats={stats}
          onRefresh={() => {
            setCurrentOffset(0);
            setHasMore(true);
            fetchHistory(0, false);
          }}
        />

        {/* 主要内容区域 */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mr-3" />
              <span className="text-gray-400 text-lg">{t('messages.loading')}</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 text-lg mb-4">{error}</p>
              <button
                onClick={() => {
                  setCurrentOffset(0);
                  setHasMore(true);
                  fetchHistory(0, false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {t('messages.retry')}
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">
                {historyItems.length === 0 ? (
                  <>
                    <p className="mb-2">{t('messages.noRecords')}</p>
                    <p className="text-sm">{t('messages.getStarted')}</p>
                  </>
                ) : (
                  <p>{t('messages.noMatches')}</p>
                )}
              </div>
              <div className="mt-8 text-center text-gray-500">
                <p>{t('messages.endOfList')}</p>
              </div>
            </div>
          ) : (
            <>
              <HistoryGrid 
                items={filteredItems}
                onRefresh={() => {
                  setCurrentOffset(0);
                  setHasMore(true);
                  fetchHistory(0, false);
                }}
              />
              
              {/* 加载更多指示器 */}
              {loadingMore && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400 mr-2" />
                  <span className="text-gray-400">{t('messages.loadingMore')}</span>
                </div>
              )}
              
              {/* 底部提示 */}
              {!hasMore && historyItems.length > 0 && (
                <div className="mt-12 text-center text-gray-500">
                  <p>{t('messages.endOfList')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}