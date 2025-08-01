'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTranslations } from 'next-intl';
import { Info, Zap, Clock, Coins } from 'lucide-react';

export interface EnhancementSettings {
  scaleFactor: '2x' | '4x' | '8x' | '16x';
  optimizedFor: string;
  prompt?: string;
  creativity: number;
  hdr: number;
  resemblance: number;
  fractality: number;
  engine: string;
}

interface EnhancementOptionsProps {
  settings: EnhancementSettings;
  onSettingsChange: (settings: EnhancementSettings) => void;
  disabled?: boolean;
  userCredits?: number;
}

const SCALE_FACTOR_INFO = {
  '2x': { credits: 1, time: '30-60秒', description: '基础增强，适合快速处理' },
  '4x': { credits: 2, time: '1-2分钟', description: '标准增强，平衡质量与速度' },
  '8x': { credits: 4, time: '2-5分钟', description: '高质量增强，适合专业用途' },
  '16x': { credits: 8, time: '5-10分钟', description: '超高质量增强，极致细节' }
};

const OPTIMIZATION_TYPES = [
  { value: 'standard', label: '标准', description: '适合大多数图片' },
  { value: 'soft_portraits', label: '柔和人像', description: '适合人像照片' },
  { value: 'hard_portraits', label: '锐化人像', description: '适合清晰人像' },
  { value: 'art_n_illustration', label: '艺术插画', description: '适合艺术作品' },
  { value: 'videogame_assets', label: '游戏素材', description: '适合游戏图像' },
  { value: 'nature_n_landscapes', label: '自然风景', description: '适合风景照片' },
  { value: 'films_n_photography', label: '电影摄影', description: '适合电影级质量' },
  { value: '3d_renders', label: '3D渲染', description: '适合3D图像' },
  { value: 'science_fiction_n_horror', label: '科幻恐怖', description: '适合特殊题材' }
];

const ENGINES = [
  { value: 'automatic', label: '自动选择', description: '智能选择最佳引擎' },
  { value: 'magnific_illusio', label: 'Illusio', description: '适合艺术风格' },
  { value: 'magnific_sharpy', label: 'Sharpy', description: '适合锐化增强' },
  { value: 'magnific_sparkle', label: 'Sparkle', description: '适合细节增强' }
];

export function EnhancementOptions({
  settings,
  onSettingsChange,
  disabled = false,
  userCredits = 0
}: EnhancementOptionsProps) {
  const t = useTranslations('Enhance');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleScaleChange = (scaleFactor: '2x' | '4x' | '8x' | '16x') => {
    onSettingsChange({ ...settings, scaleFactor });
  };

  const handleOptimizationChange = (optimizedFor: string) => {
    onSettingsChange({ ...settings, optimizedFor });
  };

  const handlePromptChange = (prompt: string) => {
    onSettingsChange({ ...settings, prompt: prompt || undefined });
  };

  const handleAdvancedChange = (key: keyof EnhancementSettings, value: number | string) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const requiredCredits = SCALE_FACTOR_INFO[settings.scaleFactor].credits;
  const hasEnoughCredits = userCredits >= requiredCredits;

  return (
    <div className="space-y-6">
      {/* 放大倍数选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            放大倍数
          </CardTitle>
          <CardDescription>
            选择图像放大的倍数，倍数越高质量越好但消耗积分更多
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(SCALE_FACTOR_INFO).map(([scale, info]) => {
              const isSelected = settings.scaleFactor === scale;
              const canAfford = userCredits >= info.credits;
              
              return (
                <div
                  key={scale}
                  className={`
                    relative p-4 border rounded-lg cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/5' 
                      : canAfford 
                        ? 'border-muted hover:border-primary/50' 
                        : 'border-muted-foreground/20 opacity-50 cursor-not-allowed'
                    }
                    ${disabled ? 'pointer-events-none' : ''}
                  `}
                  onClick={() => canAfford && !disabled && handleScaleChange(scale as any)}
                >
                  <div className="text-center space-y-2">
                    <div className="font-bold text-lg">{scale}</div>
                    <Badge variant={canAfford ? 'default' : 'secondary'} className="text-xs">
                      <Coins className="h-3 w-3 mr-1" />
                      {info.credits} 积分
                    </Badge>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      {info.time}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {info.description}
                    </div>
                  </div>
                  {!canAfford && (
                    <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-destructive font-medium">积分不足</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">当前选择：{settings.scaleFactor}</span>
            </div>
            <div className="text-sm">
              消耗 <span className="font-semibold text-primary">{requiredCredits}</span> 积分
              {!hasEnoughCredits && (
                <span className="text-destructive ml-2">（积分不足）</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 优化类型 */}
      <Card>
        <CardHeader>
          <CardTitle>优化类型</CardTitle>
          <CardDescription>
            根据图像内容选择合适的优化类型可以获得更好的效果
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.optimizedFor}
            onValueChange={handleOptimizationChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择优化类型" />
            </SelectTrigger>
            <SelectContent>
              {OPTIMIZATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 提示词 */}
      <Card>
        <CardHeader>
          <CardTitle>增强提示词（可选）</CardTitle>
          <CardDescription>
            描述你希望如何增强图像，可以提高处理效果
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.prompt || ''}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="例如：增强细节，提高清晰度，保持自然色彩..."
            maxLength={500}
            disabled={disabled}
            className="min-h-20"
          />
          <div className="text-xs text-muted-foreground mt-2">
            {(settings.prompt || '').length}/500 字符
          </div>
        </CardContent>
      </Card>

      {/* 高级设置 */}
      <Card>
        <CardHeader>
          <CardTitle 
            className="cursor-pointer flex items-center justify-between"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            高级设置
            <Badge variant="outline" className="text-xs">
              {showAdvanced ? '收起' : '展开'}
            </Badge>
          </CardTitle>
          <CardDescription>
            精细调节增强参数，需要一定的图像处理经验
          </CardDescription>
        </CardHeader>
        
        {showAdvanced && (
          <CardContent className="space-y-6">
            {/* 引擎选择 */}
            <div className="space-y-2">
              <Label>处理引擎</Label>
              <Select
                value={settings.engine}
                onValueChange={(value) => handleAdvancedChange('engine', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGINES.map((engine) => (
                    <SelectItem key={engine.value} value={engine.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{engine.label}</span>
                        <span className="text-xs text-muted-foreground">{engine.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* 参数调节 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>创意度</Label>
                  <span className="text-sm text-muted-foreground">{settings.creativity}</span>
                </div>
                <Slider
                  value={[settings.creativity]}
                  onValueChange={([value]) => handleAdvancedChange('creativity', value)}
                  min={-10}
                  max={10}
                  step={1}
                  disabled={disabled}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  控制AI的创造性，负值更保守，正值更创新
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>HDR强度</Label>
                  <span className="text-sm text-muted-foreground">{settings.hdr}</span>
                </div>
                <Slider
                  value={[settings.hdr]}
                  onValueChange={([value]) => handleAdvancedChange('hdr', value)}
                  min={-10}
                  max={10}
                  step={1}
                  disabled={disabled}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  调节细节和清晰度级别
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>相似度</Label>
                  <span className="text-sm text-muted-foreground">{settings.resemblance}</span>
                </div>
                <Slider
                  value={[settings.resemblance]}
                  onValueChange={([value]) => handleAdvancedChange('resemblance', value)}
                  min={-10}
                  max={10}
                  step={1}
                  disabled={disabled}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  控制与原图的相似程度
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>分形度</Label>
                  <span className="text-sm text-muted-foreground">{settings.fractality}</span>
                </div>
                <Slider
                  value={[settings.fractality]}
                  onValueChange={([value]) => handleAdvancedChange('fractality', value)}
                  min={-10}
                  max={10}
                  step={1}
                  disabled={disabled}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  控制提示词强度和像素复杂度
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}