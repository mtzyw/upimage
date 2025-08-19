"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import LeftSidebar from "@/components/workspace/LeftSidebar";
import HistoryListPanel from "./HistoryListPanel";
import HistoryDetailPanel from "./HistoryDetailPanel";

interface HistoryItem {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  scale_factor: string;
  credits_consumed: number;
  optimization_type: string;
  creativity: number;
  hdr: number;
  prompt?: string;
  r2_original_key?: string;
  cdn_url?: string;
  error_message?: string;
}

export default function HistoryViewer() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('history');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  
  // 使用 ref 来跟踪请求状态，防止竞态条件
  const isLoadingMoreRef = useRef(false);

  // 删除历史记录项
  const handleDeleteItem = async (itemId: string) => {
    console.log('🗑️ [HISTORY VIEWER] 开始删除历史记录:', itemId);
    
    try {
      const response = await fetch('/api/history/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId: itemId })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // 从列表中移除被删除的项目
        setHistoryItems(prev => prev.filter(item => item.id !== itemId));
        
        // 如果删除的是当前选中项，清除选中状态或选择下一个
        if (selectedItem?.id === itemId) {
          const currentIndex = historyItems.findIndex(item => item.id === itemId);
          const nextItem = historyItems[currentIndex + 1] || historyItems[currentIndex - 1] || null;
          setSelectedItem(nextItem);
        }
        
        // 更新总数
        setTotalCount(prev => prev ? prev - 1 : null);
        
        console.log('✅ [HISTORY VIEWER] 删除成功');
      } else {
        console.error('❌ [HISTORY VIEWER] 删除失败:', result);
        throw new Error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('💥 [HISTORY VIEWER] 删除过程中发生错误:', error);
      throw error; // 重新抛出错误，让组件处理
    }
  };

  // 获取历史记录数据（初始加载）
  const fetchHistory = async (reset = true) => {
    if (!user) {
      console.log('No user found, skipping history fetch');
      return;
    }
    console.log('Fetching history for user:', user.id, 'reset:', reset);
    
    try {
      if (reset) {
        setIsLoading(true);
        setHistoryItems([]);
        setSelectedItem(null);
        setHasMore(true);
        setTotalCount(null);
      }
      
      const url = new URL('/api/history', window.location.origin);
      url.searchParams.set('limit', '10');
      url.searchParams.set('offset', '0');
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const result = await response.json();
        console.log('History API response:', result);
        
        if (result.success) {
          const items = result.data.items || [];
          setHistoryItems(items);
          setHasMore(result.data.hasMore || false);
          setTotalCount(result.data.total);
          
          // 默认选择第一个项目
          if (items.length > 0) {
            setSelectedItem(items[0]);
          }
        }
      } else {
        console.error('History API error:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载更多历史记录
  const loadMoreHistory = useCallback(async () => {
    // 严格的状态检查，防止重复请求
    if (!user || isLoadingMore || !hasMore || isLoadingMoreRef.current) {
      console.log('Skipping load more:', { 
        user: !!user, 
        isLoadingMore, 
        hasMore, 
        isLoadingMoreRef: isLoadingMoreRef.current 
      });
      return;
    }
    
    console.log('Loading more history, current count:', historyItems.length);
    
    try {
      setIsLoadingMore(true);
      isLoadingMoreRef.current = true;
      
      const url = new URL('/api/history', window.location.origin);
      url.searchParams.set('limit', '10');
      url.searchParams.set('offset', historyItems.length.toString());
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const result = await response.json();
        console.log('Load more API response:', result);
        
        if (result.success) {
          const newItems = result.data.items || [];
          setHistoryItems(prev => {
            // 防止重复添加相同的项目
            const existingIds = new Set(prev.map((item: HistoryItem) => item.id));
            const uniqueNewItems = newItems.filter((item: HistoryItem) => !existingIds.has(item.id));
            return [...prev, ...uniqueNewItems];
          });
          setHasMore(result.data.hasMore || false);
        } else {
          console.error('Load more API failed:', result);
        }
      } else {
        console.error('Load more API error:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Failed to load more history:', error);
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [user, isLoadingMore, hasMore, historyItems.length]);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleItemSelect = (item: HistoryItem) => {
    setSelectedItem(item);
  };

  const handleTabChange = (tabId: string) => {
    if (tabId === 'enhance') {
      // 导航到图片增强页面
      window.location.href = '/app?target=upscaler';
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-900/95">
      {/* 最左侧导航栏 */}
      <LeftSidebar 
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      
      {/* 中间历史记录列表 */}
      <HistoryListPanel
        historyItems={historyItems}
        selectedItem={selectedItem}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        totalCount={totalCount}
        onItemSelect={handleItemSelect}
        onRefresh={() => fetchHistory(true)}
        onLoadMore={loadMoreHistory}
        onDeleteItem={handleDeleteItem}
      />
      
      {/* 右侧详情展示区域 */}
      <HistoryDetailPanel
        selectedItem={selectedItem}
      />
    </div>
  );
}