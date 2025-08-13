"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "@/components/upload/ImageUploader";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface UserBenefits {
  totalAvailableCredits: number;
  subscriptionCreditsBalance: number;
  oneTimeCreditsBalance: number;
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
  const t = useTranslations("Enhance");
  return (
    <div className="w-full sm:w-[350px] lg:w-[400px] xl:w-[450px] h-full bg-gray-900/95 border-r border-gray-700 flex flex-col overflow-hidden">
      {/* 头部区域 - 标题和积分 */}
      <div className="p-4 sm:p-6">
        <div className="mb-3">
          <h1 className="text-base sm:text-lg font-semibold text-white">{t('title')}</h1>
        </div>
        <p className="text-gray-500 text-xs">
          {t('description')}
        </p>
      </div>

      {/* 控制区域 */}
      <div className="flex-1 px-4 sm:px-6 space-y-4 sm:space-y-5 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-gray-700/60 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-600/80">
        {/* 模型选择 */}
        <div className="space-y-3">
          <label className="text-white font-medium text-sm">Imgenhancer AI</label>
          <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-cyan-400 font-medium text-sm">{t('settings.engine')}</span>
            </div>
            <p className="text-gray-500 text-xs">{t('settings.engineDescription')}</p>
          </div>
        </div>

        {/* 图像上传区域 */}
        <div className="space-y-3">
          <label className="text-white font-medium text-sm">{t('upload.title')}</label>
          <ImageUploader
            onFileSelected={onFileSelected}
            maxSizeMB={50}
            acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
          />
        </div>

        {/* 增强设置 */}
        <div className="space-y-5">
          <h3 className="text-cyan-400 text-lg font-semibold">{t('settings.scaleFactor')}</h3>

          {/* 放大倍数选择 */}
          <div className="space-y-3">
            <label className="text-cyan-400 font-medium">{t('settings.scaleFactor')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['2x', '4x', '8x', '16x'].map((scale) => {
                const credits = getRequiredCredits(scale);
                const canAfford = userBenefits ? userBenefits.totalAvailableCredits >= credits : true;
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
                    <div className="text-xs">{t('credits.required', { credits })}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 优化类型 */}
          <div className="space-y-3">
            <label className="text-yellow-400 font-medium">{t('settings.optimization')}</label>
            <Select value={optimizedFor} onValueChange={onOptimizedForChange} disabled={isProcessing}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">{t('settings.optimizationTypes.standard')}</SelectItem>
                <SelectItem value="soft_portraits">{t('settings.optimizationTypes.softPortraits')}</SelectItem>
                <SelectItem value="hard_portraits">{t('settings.optimizationTypes.hardPortraits')}</SelectItem>
                <SelectItem value="art_n_illustration">{t('settings.optimizationTypes.artIllustration')}</SelectItem>
                <SelectItem value="nature_n_landscapes">{t('settings.optimizationTypes.natureLandscapes')}</SelectItem>
                <SelectItem value="films_n_photography">{t('settings.optimizationTypes.filmsPhotography')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 创意度滑块 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-pink-400 font-medium">{t('settings.creativity')}</label>
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
              <label className="text-green-400 font-medium">{t('settings.hdr')}</label>
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
            <label className="text-white font-medium">{t('settings.prompt')}</label>
            <Textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder={t('settings.promptPlaceholder')}
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
              <span className="text-gray-400">{t('credits.consumed')}:</span>
              <span className="text-cyan-400 font-medium">
                {t('credits.required', { credits: getRequiredCredits(scaleFactor) })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="p-4 sm:p-6 space-y-3">
        <Button
          onClick={onProcess}
          disabled={isProcessing || !uploadedImage || !userBenefits || userBenefits.totalAvailableCredits < getRequiredCredits(scaleFactor)}
          className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white py-3 text-sm font-medium rounded-lg"
        >
          {isProcessing ? (
            <div className="flex items-center">
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
              {t('status.processing')}
            </div>
          ) : (
            <div className="flex items-center">
              <Sparkles className="mr-2 h-4 w-4" />
              {t('messages.processingStarted')}
            </div>
          )}
        </Button>

        {userBenefits && uploadedImage && userBenefits.totalAvailableCredits < getRequiredCredits(scaleFactor) && (
          <p className="text-red-400 text-xs text-center">
            {t('credits.insufficient')}, {t('credits.required', { credits: getRequiredCredits(scaleFactor) })}
          </p>
        )}
      </div>
    </div>
  );
}