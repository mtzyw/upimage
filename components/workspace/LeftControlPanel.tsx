"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, History, Sparkles, Loader2, Coins } from "lucide-react";
import ImageUploader from "@/components/upload/ImageUploader";

interface UserBenefits {
  credits: number;
}

interface LeftControlPanelProps {
  userBenefits: UserBenefits | null;
  uploadedImage: string | null;
  scaleFactor: '2x' | '4x' | '8x' | '16x';
  optimizedFor: string;
  creativity: number[];
  hdr: number[];
  prompt: string;
  isProcessing: boolean;
  onFileSelected: (file: File) => void;
  onScaleFactorChange: (scale: '2x' | '4x' | '8x' | '16x') => void;
  onOptimizedForChange: (value: string) => void;
  onCreativityChange: (value: number[]) => void;
  onHdrChange: (value: number[]) => void;
  onPromptChange: (value: string) => void;
  onProcess: () => void;
  getRequiredCredits: (scaleFactor: string) => number;
}

export default function LeftControlPanel({
  userBenefits,
  uploadedImage,
  scaleFactor,
  optimizedFor,
  creativity,
  hdr,
  prompt,
  isProcessing,
  onFileSelected,
  onScaleFactorChange,
  onOptimizedForChange,
  onCreativityChange,
  onHdrChange,
  onPromptChange,
  onProcess,
  getRequiredCredits,
}: LeftControlPanelProps) {
  return (
    <div className="w-full sm:w-[350px] lg:w-[400px] xl:w-[450px] h-full bg-gray-900/95 border-r border-gray-700 flex flex-col overflow-hidden">
      {/* 头部区域 - 标题和积分 */}
      <div className="p-4 sm:p-6">
        <div className="mb-3">
          <h1 className="text-base sm:text-lg font-semibold text-white">图像增强</h1>
        </div>
        <p className="text-gray-500 text-xs">
          我们最多能将您的图像分辨率提高 20MB、4096 x 4096 像素的 JPEG、PNG、GIF 或 WEBP 格式。
        </p>
      </div>

      {/* 控制区域 */}
      <div className="flex-1 px-4 sm:px-6 space-y-4 sm:space-y-5 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-gray-700/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-600/80">
        {/* 模型选择 */}
        <div className="space-y-3">
          <label className="text-white font-medium text-sm">Freepik AI</label>
          <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-cyan-400 font-medium text-sm">专业图像增强</span>
            </div>
            <p className="text-gray-500 text-xs">使用 AI 技术定制的模型，让您的作品更适合</p>
          </div>
        </div>

        {/* 图像上传区域 */}
        <div className="space-y-3">
          <label className="text-white font-medium text-sm">图像</label>
          <ImageUploader
            onFileSelected={onFileSelected}
            maxSizeMB={50}
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          />
        </div>

        {/* 增强设置 */}
        <div className="space-y-5">
          <h3 className="text-cyan-400 text-lg font-semibold">增强设置</h3>
          
          {/* 放大倍数选择 */}
          <div className="space-y-3">
            <label className="text-cyan-400 font-medium">放大倍数</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['2x', '4x', '8x', '16x'].map((scale) => {
                const credits = getRequiredCredits(scale);
                const canAfford = userBenefits ? userBenefits.credits >= credits : true;
                const isSelected = scaleFactor === scale;
                
                return (
                  <button
                    key={scale}
                    onClick={() => canAfford && onScaleFactorChange(scale as any)}
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
            <Select value={optimizedFor} onValueChange={onOptimizedForChange} disabled={isProcessing}>
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

          {/* 创意度滑块 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-pink-400 font-medium">创意度</label>
              <span className="text-white bg-gray-800 px-2 py-1 rounded text-sm">
                ({creativity[0]})
              </span>
            </div>
            <Slider
              value={creativity}
              onValueChange={onCreativityChange}
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
                ({hdr[0]})
              </span>
            </div>
            <Slider
              value={hdr}
              onValueChange={onHdrChange}
              min={-10}
              max={10}
              step={1}
              disabled={isProcessing}
              className="w-full"
            />
          </div>

          {/* 增强提示词 */}
          <div className="space-y-3">
            <label className="text-white font-medium">增强提示词（可选）</label>
            <Textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="例如：增强细节，提高清晰度，保持自然色彩..."
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 resize-none"
              rows={3}
              disabled={isProcessing}
              maxLength={500}
            />
            <div className="text-xs text-gray-400 text-right">
              {prompt?.length || 0}/500
            </div>
          </div>

          {/* 消耗积分显示 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">消耗积分:</span>
              <span className="text-cyan-400 font-medium">
                {getRequiredCredits(scaleFactor)} 积分
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="p-4 sm:p-6 space-y-3">
        <Button
          onClick={onProcess}
          disabled={isProcessing || !uploadedImage || !userBenefits || userBenefits.credits < getRequiredCredits(scaleFactor)}
          className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white py-3 text-sm font-medium rounded-lg"
        >
          {isProcessing ? (
            <div className="flex items-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              创建
            </div>
          ) : (
            <div className="flex items-center">
              <Sparkles className="mr-2 h-4 w-4" />
              创建
            </div>
          )}
        </Button>
        
        {userBenefits && uploadedImage && userBenefits.credits < getRequiredCredits(scaleFactor) && (
          <p className="text-red-400 text-xs text-center">
            积分不足，需要 {getRequiredCredits(scaleFactor)} 积分
          </p>
        )}
      </div>
    </div>
  );
}