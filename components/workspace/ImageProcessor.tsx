"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wand2, Download, Sparkles, History, Coins, Clock, CheckCircle, XCircle, Loader2, Eye, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import Image from "next/image";
import ImageUploader from "@/components/upload/ImageUploader";
import { toast } from "sonner";

interface UserBenefits {
  credits: number;
  isPro: boolean;
  maxUploadSize: number;
  dailyLimit: number;
  dailyUsed: number;
}

interface TaskStatus {
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  createdAt: string;
  scaleFactor: string;
  creditsConsumed: number;
  originalUrl?: string;
  cdnUrl?: string;
  completedAt?: string;
  error?: string;
  progress?: number;
  estimatedTimeRemaining?: string;
}

export default function ImageProcessor() {
  const t = useTranslations("Landing.Hero");
  const { user } = useAuth();
  
  // 上传和基本状态
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageKey, setUploadedImageKey] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  
  // 参数设置
  const [scaleFactor, setScaleFactor] = useState<'2x' | '4x' | '8x' | '16x'>('4x');
  const [optimizedFor, setOptimizedFor] = useState('standard');
  const [engine, setEngine] = useState('automatic');
  const [creativity, setCreativity] = useState([0]);
  const [hdr, setHdr] = useState([0]);
  const [resemblance, setResemblance] = useState([0]);
  const [fractality, setFractality] = useState([0]);
  const [prompt, setPrompt] = useState("");
  
  // 用户信息
  const [userBenefits, setUserBenefits] = useState<UserBenefits | null>(null);

  // 获取用户权益信息
  const fetchUserBenefits = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/benefits');
      const result = await response.json();
      
      if (result.success) {
        setUserBenefits(result.data);
      }
    } catch (error) {
      console.error('Error fetching user benefits:', error);
    }
  }, [user]);

  // 获取任务状态
  const fetchTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/enhance/status?taskId=${taskId}`);
      const result = await response.json();
      
      if (result.success) {
        setTaskStatus(result.data);
        
        // 如果任务完成，停止轮询
        if (result.data.status === 'completed' || result.data.status === 'failed') {
          setIsProcessing(false);
          if (result.data.status === 'completed') {
            toast.success('图像增强完成！');
            fetchUserBenefits(); // 刷新积分信息
          } else {
            toast.error('图像处理失败');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching task status:', error);
    }
  }, [fetchUserBenefits]);

  // 轮询任务状态 - 优化为2秒间隔
  useEffect(() => {
    if (currentTaskId && isProcessing) {
      const interval = setInterval(() => {
        fetchTaskStatus(currentTaskId);
      }, 2000); // 改为2秒

      return () => clearInterval(interval);
    }
  }, [currentTaskId, isProcessing, fetchTaskStatus]);

  useEffect(() => {
    if (user) {
      fetchUserBenefits();
    }
  }, [user, fetchUserBenefits]);

  const handleUploadSuccess = (url: string, key: string) => {
    setUploadedImage(url);
    setUploadedImageKey(key);
    setTaskStatus(null);
    setCurrentTaskId(null);
  };

  // 文件上传回调（需要获取实际文件对象）
  const handleFileSelected = (file: File) => {
    setUploadedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setUploadedImage(previewUrl);
    setTaskStatus(null);
    setCurrentTaskId(null);
  };

  const handleProcess = async () => {
    if (!uploadedFile || !user || !userBenefits) {
      toast.error('请先选择图片');
      return;
    }

    // 检查积分
    const requiredCredits = getRequiredCredits(scaleFactor);
    if (userBenefits.credits < requiredCredits) {
      toast.error('积分不足，请先充值');
      return;
    }

    setIsProcessing(true);

    try {
      // 将文件转换为 base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFile);
      });

      // 发送 JSON 数据
      const response = await fetch('/api/enhance/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
          scaleFactor,
          optimizedFor,
          engine,
          creativity: creativity[0],
          hdr: hdr[0],
          resemblance: resemblance[0],
          fractality: fractality[0],
          prompt: prompt || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentTaskId(result.data.taskId);
        toast.success('图像处理已开始');
        
        // 更新用户积分（乐观更新）
        setUserBenefits(prev => prev ? {
          ...prev,
          credits: prev.credits - requiredCredits
        } : null);
      } else {
        toast.error(result.error || '处理失败，请重试');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error starting enhancement:', error);
      toast.error('网络错误，请重试');
      setIsProcessing(false);
    }
  };

  const getRequiredCredits = (scaleFactor: string): number => {
    const creditMap: Record<string, number> = {
      '2x': 1, '4x': 2, '8x': 4, '16x': 8
    };
    return creditMap[scaleFactor] || 1;
  };

  const handleDownload = async (url: string) => {
    try {
      if (!currentTaskId) {
        toast.error('任务ID缺失，无法下载');
        return;
      }
      
      // 使用后端代理API下载图片，避免CORS问题
      const proxyUrl = `/api/enhance/download?url=${encodeURIComponent(url)}&taskId=${currentTaskId}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '下载失败');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `enhanced-${currentTaskId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('图片下载成功');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : '下载失败，请重试');
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('链接已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold mb-4">
          <span className="text-white">AI </span>
          <span className="text-pink-400">图像</span>
          <span className="text-cyan-400">增强</span>
          <span className="text-white"> 工作台</span>
        </h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          使用先进的 Freepik AI 技术放大并增强您的图像，支持最高 16x 放大
        </p>
      </div>

      {/* 用户信息栏 */}
      {userBenefits && (
        <Card className="bg-black/60 border-gray-600 mb-8">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant={userBenefits.isPro ? 'default' : 'secondary'}>
                  {userBenefits.isPro ? 'Pro 用户' : '免费用户'}
                </Badge>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span className="text-white font-medium">{userBenefits.credits} 积分</span>
                </div>
                <div className="text-sm text-gray-400">
                  今日已用: {userBenefits.dailyUsed}/{userBenefits.dailyLimit}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                  <History className="h-4 w-4 mr-2" />
                  历史记录
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-12">
        {/* 左侧：上传和控制区域 */}
        <div className="space-y-6">
          {/* 图像上传区域 */}
          <Card className="bg-black/40 border-gray-600 p-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white">上传图像</h3>
            </div>
            <ImageUploader
              onFileSelected={handleFileSelected}
              maxSizeMB={userBenefits?.maxUploadSize || 10}
              acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
            />
          </Card>

          {/* 参数控制区域 */}
          {uploadedImage && (
            <Card className="bg-black/40 border-gray-600 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">增强设置</h3>
              
              <div className="space-y-6">
                {/* 放大倍数选择 */}
                <div className="space-y-3">
                  <label className="text-cyan-400 font-medium">放大倍数</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['2x', '4x', '8x', '16x'].map((scale) => {
                      const credits = getRequiredCredits(scale);
                      const canAfford = userBenefits ? userBenefits.credits >= credits : true;
                      const isSelected = scaleFactor === scale;
                      
                      return (
                        <button
                          key={scale}
                          onClick={() => canAfford && setScaleFactor(scale as any)}
                          disabled={!canAfford || isProcessing}
                          className={`
                            p-3 rounded border text-center transition-all
                            ${isSelected 
                              ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400' 
                              : canAfford 
                                ? 'border-gray-600 hover:border-cyan-400/50 text-white' 
                                : 'border-gray-700 text-gray-500 cursor-not-allowed'
                            }
                          `}
                        >
                          <div className="font-bold">{scale}</div>
                          <div className="text-xs">{credits} 积分</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 优化类型 */}
                <div className="space-y-3">
                  <label className="text-yellow-400 font-medium">优化类型</label>
                  <Select value={optimizedFor} onValueChange={setOptimizedFor} disabled={isProcessing}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">标准</SelectItem>
                      <SelectItem value="soft_portraits">柔和人像</SelectItem>
                      <SelectItem value="hard_portraits">锐化人像</SelectItem>
                      <SelectItem value="art_n_illustration">艺术插画</SelectItem>
                      <SelectItem value="nature_n_landscapes">自然风景</SelectItem>
                      <SelectItem value="films_n_photography">电影摄影</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 创造力滑块 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-pink-400 font-medium">创意度</label>
                    <span className="text-white bg-gray-800 px-2 py-1 rounded text-sm">
                      {creativity[0]}
                    </span>
                  </div>
                  <Slider
                    value={creativity}
                    onValueChange={setCreativity}
                    min={-10}
                    max={10}
                    step={1}
                    disabled={isProcessing}
                    className="w-full"
                  />
                </div>

                {/* HDR滑块 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-green-400 font-medium">HDR强度</label>
                    <span className="text-white bg-gray-800 px-2 py-1 rounded text-sm">
                      {hdr[0]}
                    </span>
                  </div>
                  <Slider
                    value={hdr}
                    onValueChange={setHdr}
                    min={-10}
                    max={10}
                    step={1}
                    disabled={isProcessing}
                    className="w-full"
                  />
                </div>

                {/* 提示词输入 */}
                <div className="space-y-3">
                  <label className="text-white font-medium">增强提示词（可选）</label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="例如：增强细节，提高清晰度，保持自然色彩..."
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 resize-none"
                    rows={3}
                    disabled={isProcessing}
                    maxLength={500}
                  />
                  <div className="text-xs text-gray-400 text-right">
                    {prompt.length}/500
                  </div>
                </div>

                {/* 处理按钮 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">消耗积分:</span>
                    <span className="text-cyan-400 font-medium">
                      {getRequiredCredits(scaleFactor)} 积分
                    </span>
                  </div>
                  <Button
                    onClick={handleProcess}
                    disabled={isProcessing || !userBenefits || userBenefits.credits < getRequiredCredits(scaleFactor)}
                    className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white py-6 text-lg"
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                        处理中...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Wand2 className="mr-2 h-5 w-5" />
                        开始增强 ({scaleFactor})
                      </div>
                    )}
                  </Button>
                  {userBenefits && userBenefits.credits < getRequiredCredits(scaleFactor) && (
                    <p className="text-destructive text-sm text-center">
                      积分不足，需要 {getRequiredCredits(scaleFactor)} 积分
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* 右侧：结果展示区域 */}
        <div className="space-y-6">
          <Card className="bg-black/40 border-gray-600 p-8">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">处理结果</h3>
            
            {!taskStatus && !isProcessing ? (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-400">上传图像并开始处理</p>
              </div>
            ) : isProcessing && !taskStatus ? (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-400">AI正在为您的图像增加细节...</p>
                <div className="mt-4 space-y-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-pink-500 to-cyan-500 h-2 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-sm text-gray-400">正在连接 Freepik AI 服务...</p>
                </div>
              </div>
            ) : taskStatus ? (
              <div className="space-y-4">
                {/* 任务状态信息 */}
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {taskStatus.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                      {taskStatus.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-400" />}
                      {taskStatus.status === 'failed' && <XCircle className="h-4 w-4 text-red-400" />}
                      <span className="text-white font-medium">
                        {taskStatus.status === 'processing' && '处理中'}
                        {taskStatus.status === 'completed' && '已完成'}
                        {taskStatus.status === 'failed' && '失败'}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {taskStatus.scaleFactor}
                    </Badge>
                  </div>
                  {taskStatus.status !== 'completed' && (
                    <p className="text-gray-400 text-sm">{taskStatus.message}</p>
                  )}
                  
                  {/* 进度条 */}
                  {taskStatus.status === 'processing' && taskStatus.progress !== undefined && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">进度</span>
                        <span className="text-cyan-400">{taskStatus.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-pink-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${taskStatus.progress}%` }}
                        />
                      </div>
                      {taskStatus.estimatedTimeRemaining && (
                        <p className="text-xs text-gray-400 text-center">
                          {taskStatus.estimatedTimeRemaining}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 图片展示和操作 */}
                {taskStatus.status === 'completed' && taskStatus.cdnUrl && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 原图 */}
                      {taskStatus.originalUrl && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-300">原图</h4>
                          <div className="relative aspect-square border border-gray-600 rounded-lg overflow-hidden bg-gray-800">
                            <Image
                              src={taskStatus.originalUrl}
                              alt="Original image"
                              fill
                              className="object-contain"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* 增强后 */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-cyan-400">增强后</h4>
                        <div className="relative aspect-square border border-cyan-400/50 rounded-lg overflow-hidden bg-gray-800">
                          <Image
                            src={taskStatus.cdnUrl}
                            alt="Enhanced image"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleDownload(taskStatus.cdnUrl!)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        下载增强图
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        onClick={() => window.open(taskStatus.cdnUrl!, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        onClick={() => handleCopyUrl(taskStatus.cdnUrl!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 错误信息 */}
                {taskStatus.status === 'failed' && taskStatus.error && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-400 mt-0.5" />
                      <div>
                        <p className="text-red-400 font-medium text-sm">处理失败</p>
                        <p className="text-red-300 text-sm mt-1">{taskStatus.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 任务信息 */}
                <div className="text-xs text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>任务ID:</span>
                    <span className="font-mono">{taskStatus.taskId.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>消耗积分:</span>
                    <span className="text-cyan-400">{taskStatus.creditsConsumed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>创建时间:</span>
                    <span>{new Date(taskStatus.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>

          {/* 操作说明 */}
          <Card className="bg-black/40 border-gray-600 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">使用说明</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-medium">1.</span>
                <span>上传您要增强的图片</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-medium">2.</span>
                <span>选择放大倍数和优化类型</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-medium">3.</span>
                <span>调整创意度和HDR强度</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-medium">4.</span>
                <span>点击开始增强等待处理完成</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-cyan-400 font-medium">5.</span>
                <span>下载或分享您的增强图片</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}