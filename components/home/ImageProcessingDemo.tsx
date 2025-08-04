'use client'

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload, Image as ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function ImageProcessingDemo() {
  const t = useTranslations('Landing.ImageProcessing');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState('standard');
  const [prompt, setPrompt] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const handleGenerate = () => {
    // 这里暂时只是演示，不连接后端API
    console.log('Generate with:', { selectedImage, mode, prompt });
    // 可以跳转到登录或者/home页面
    window.location.href = '/home';
  };

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* 左侧：上传图片区域 */}
        <div className="space-y-4">
          <h3 className="text-white text-xl font-semibold">
            {t('uploadTitle', { default: '上传图片' })}
          </h3>
          
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 cursor-pointer
              transition-all duration-200 min-h-[300px] flex flex-col items-center justify-center
              ${dragActive 
                ? 'border-pink-400 bg-pink-400/10' 
                : 'border-gray-600 hover:border-gray-500'
              }
              ${preview ? 'bg-gray-800/50' : 'bg-gray-900/50'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {preview ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={preview}
                  alt="Selected image"
                  width={250}
                  height={250}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {t('selected', { default: '已选择' })}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                  {dragActive ? (
                    <Upload className="w-8 h-8 text-pink-400" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <p className="text-white font-medium text-lg">
                    {dragActive
                      ? t('dropHere', { default: '拖放图片到这里' })
                      : t('uploadPrompt', { default: '上传图片' })
                    }
                  </p>
                  <p className="text-gray-400 text-sm">
                    {t('supportedFormats', { default: '支持 JPEG, PNG, WebP 格式' })}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {t('dragOrClick', { default: '拖拽文件到此处或点击选择' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：模式选择和提示词输入 */}
        <div className="space-y-6">
          <h3 className="text-white text-xl font-semibold">
            {t('settingsTitle', { default: '处理设置' })}
          </h3>
          
          {/* 模式选择 */}
          <div className="space-y-3" style={{ marginTop: '10px' }}>
            <label className="text-yellow-400 font-medium">
              {t('modeLabel', { default: '优化类型' })}
            </label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="bg-gray-800/80 border-gray-600 text-white h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="standard" className="text-white hover:bg-gray-700">
                  {t('modes.standard', { default: '标准' })}
                </SelectItem>
                <SelectItem value="soft_portraits" className="text-white hover:bg-gray-700">
                  {t('modes.soft_portraits', { default: '柔和人像' })}
                </SelectItem>
                <SelectItem value="hard_portraits" className="text-white hover:bg-gray-700">
                  {t('modes.hard_portraits', { default: '锐化人像' })}
                </SelectItem>
                <SelectItem value="art_n_illustration" className="text-white hover:bg-gray-700">
                  {t('modes.art_n_illustration', { default: '艺术插画' })}
                </SelectItem>
                <SelectItem value="nature_n_landscapes" className="text-white hover:bg-gray-700">
                  {t('modes.nature_n_landscapes', { default: '自然风景' })}
                </SelectItem>
                <SelectItem value="films_n_photography" className="text-white hover:bg-gray-700">
                  {t('modes.films_n_photography', { default: '电影摄影' })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 提示词输入 */}
          <div className="space-y-3" style={{ marginTop: '10px' }}>
            <label className="text-pink-400 font-medium">
              {t('promptLabel', { default: '提示词内容输入框' })}
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('promptPlaceholder', { default: '描述您想要的效果，例如：增强细节，提高清晰度，保持自然色彩...' })}
              className="bg-gray-800/80 border-gray-600 text-white placeholder-gray-400 resize-none min-h-[120px]"
              style={{ height: '108px', marginTop: '4px' }}
              rows={5}
              maxLength={500}
            />
            <div className="text-xs text-gray-400 text-right" style={{ marginTop: '8px' }}>
              {prompt.length}/500
            </div>
          </div>

          {/* 生成按钮 */}
          <div className="pt-4" style={{ marginTop: '0px', paddingTop: '0px' }}>
            <Button
              onClick={handleGenerate}
              className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white py-4 text-lg font-medium rounded-xl"
              size="lg"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {t('generateButton', { default: '生成' })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}