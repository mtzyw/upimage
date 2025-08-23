'use client'

import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { BG1 } from "@/components/shared/BGs";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import CallToAction from "./CallToAction";
import FeaturesShowcase from "./FeaturesShowcase";
import HowItWorks from "./HowItWorks";
import ImageUploadArea from "./ImageUploadArea";
import BackgroundRemovalHistory from "./BackgroundRemovalHistory";

export default function QuitarFondoPage() {
  const t = useTranslations('QuitarFondo');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTask, setPendingTask] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 获取历史记录数据
  const fetchHistory = async () => {
    if (!user) return;
    
    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const response = await fetch('/api/remove-background/history?limit=10');

      if (!response.ok) {
        throw new Error(t('history.errors.fetchFailed'));
      }

      const result = await response.json();

      if (result.success && result.data) {
        setHistoryItems(result.data.items || []);
      } else {
        throw new Error(result.message || t('history.errors.fetchFailed'));
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setHistoryError(err instanceof Error ? err.message : t('history.errors.fetchFailed'));
    } finally {
      setHistoryLoading(false);
    }
  };

  // 当用户登录时获取历史记录
  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setHistoryItems([]);
      setHistoryLoading(false);
      setHistoryError(null);
    }
  }, [user]);

  // 处理删除操作的本地状态更新
  const handleDeleteSuccess = (deletedTaskId: string) => {
    setHistoryItems(prev => prev.filter(item => item.id !== deletedTaskId));
  };

  const handleRemoveBackground = async () => {
    if (user) {
      if (!uploadedImage) {
        alert(t('page.alerts.pleaseUploadFirst'));
        return;
      }

      if (isProcessing) {
        return; // 防止重复点击
      }

      try {
        setIsProcessing(true);
        console.log(t('page.console.executingRemoval'), uploadedImage);
        
        // 立即创建一个处理中的任务显示在历史记录中
        const tempTaskId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const processingTask = {
          id: tempTaskId,
          status: 'processing' as const,
          statusMessage: t('page.task.statusMessage.processing'),
          creditsConsumed: 2,
          originalUrl: uploadedImage,
          cdnUrl: undefined,
          errorMessage: undefined,
          createdAt: new Date().toISOString(),
          completedAt: undefined,
          timestamp: new Date().toLocaleString('zh-CN'),
          filename: `background-removal-${Date.now()}`,
          processingTime: undefined
        };

        // 设置待处理任务以立即显示
        setPendingTask(processingTask);
        
        const response = await fetch('/api/remove-background/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: uploadedImage,
            tempTaskId: tempTaskId // 传递临时任务ID
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(t('page.console.removalSuccess'), result);
          
          // 创建完成的任务数据
          const completedTask = {
            id: result.data.taskId,
            status: 'completed' as const,
            statusMessage: t('page.task.statusMessage.completed'),
            creditsConsumed: result.data.creditsConsumed || 2,
            originalUrl: result.data.originalUrl,
            cdnUrl: result.data.cdnUrl,
            errorMessage: undefined,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            timestamp: new Date().toLocaleString('zh-CN'),
            filename: `background-removal-${Date.now()}`,
            processingTime: undefined
          };

          // 清除临时任务，直接添加完成的任务到历史记录开头
          setPendingTask(null);
          setHistoryItems(prev => [completedTask, ...prev]);
        } else {
          const errorData = await response.json();
          console.error(t('page.console.removalFailed'), errorData);
          alert(errorData.message || t('page.alerts.backgroundRemovalFailed'));
          
          // 清除临时任务
          setPendingTask(null);
        }
      } catch (error) {
        console.error(t('page.console.processingError'), error);
        alert(t('page.alerts.processingError'));
        
        // 清除临时任务
        setPendingTask(null);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // 用户未登录，显示登录弹窗
      setIsLoginModalOpen(true);
    }
  };

  const handleGetStarted = () => {
    // 无论是否登录，都滚动到顶部上传区域
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="w-full">
      <BG1 />

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center space-y-6 mb-12">
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-white">{t('page.titleColorful.intelligent')}</span>
              <span className="text-pink-400">{t('page.titleColorful.cutout')}</span>
              <br />
              <span className="text-cyan-400">{t('page.titleColorful.ai')}</span>
              <span className="text-white">{t('page.titleColorful.instant')}</span>
              <span className="text-yellow-400">{t('page.titleColorful.processing')}</span>
              <span className="text-white">{t('page.titleColorful.sparkle')}</span>
            </h1>

            <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
              {t('page.description')}
            </p>
          </div>

        </div>

        {/* Upload Area with Side-by-Side Layout */}
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side - Upload Area */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">{t('page.uploadTitle')}</h3>
              <p className="text-gray-400">{t('page.uploadDescription')}</p>
            </div>

            <ImageUploadArea
              onImageUpload={setUploadedImage}
              uploadedImage={uploadedImage}
            />

            {/* Process Button */}
            <div className="w-full">
              <Button
                onClick={handleRemoveBackground}
                disabled={isProcessing}
                className={`w-full px-6 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 ${
                  isProcessing 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
                } text-white`}
              >
                <div className="flex items-center justify-center gap-3">
                  {isProcessing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Zap className="w-6 h-6" />
                  )}
                  {isProcessing ? t('page.processButton.processing') : t('page.processButton.idle')}
                </div>
              </Button>
            </div>
          </div>

          {/* Right Side - Demo Image or History */}
          <div className="space-y-6 mt-12">
            {user ? (
              // 已登录用户显示历史记录
              <BackgroundRemovalHistory 
                historyItems={historyItems}
                pendingTask={pendingTask}
                loading={historyLoading}
                error={historyError}
                onRefresh={fetchHistory}
                onDeleteSuccess={handleDeleteSuccess}
              />
            ) : (
              // 未登录用户显示示例图片
              <div className="rounded-xl overflow-hidden bg-gray-800 border border-gray-600 shadow-lg">
                <div className="relative aspect-[4/3]">
                  <img
                    src="https://cdn.imgenhancer.ai/2222.png"
                    alt="Demo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Showcase */}
      {/* <FeaturesShowcase /> */}

      {/* How It Works */}
      <HowItWorks />

      {/* Call to Action */}
      <CallToAction 
        isLoggedIn={!!user}
        onGetStarted={handleGetStarted}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        redirectTo={pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')}
      />
    </div>
  );
}