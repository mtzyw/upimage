"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Download, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import ImageUploader from "@/components/upload/ImageUploader";

export default function ImageProcessor() {
  const t = useTranslations("Landing.Hero");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageKey, setUploadedImageKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [creativity, setCreativity] = useState([75]);
  const [hdr, setHdr] = useState([50]);
  const [resemblance, setResemblance] = useState([85]);
  const [prompt, setPrompt] = useState("");

  const handleUploadSuccess = (url: string, key: string) => {
    setUploadedImage(url);
    setUploadedImageKey(key);
    setProcessedImage(null); // 清除之前的结果
  };

  const handleProcess = async () => {
    if (!uploadedImage) return;
    
    setIsProcessing(true);
    // 模拟处理过程
    setTimeout(() => {
      // 这里暂时使用相同的图片作为示例，实际应该调用AI API
      setProcessedImage(uploadedImage);
      setIsProcessing(false);
    }, 3000);
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
          上传您的图像，调整参数，让AI为您创造令人惊叹的高清细节
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* 左侧：上传和控制区域 */}
        <div className="space-y-6">
          {/* 图像上传区域 */}
          <Card className="bg-black/40 border-gray-600 p-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white">上传图像</h3>
            </div>
            <ImageUploader
              onUploadSuccess={handleUploadSuccess}
              maxSizeMB={10}
              acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
            />
          </Card>

          {/* 参数控制区域 */}
          {uploadedImage && (
            <Card className="bg-black/40 border-gray-600 p-6">
              <h3 className="text-xl font-semibold text-white mb-6">调整参数</h3>
              
              <div className="space-y-6">
                {/* 创造力滑块 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-cyan-400 font-medium">
                      {t("slider1.label")}
                    </label>
                    <span className="text-white bg-gray-800 px-2 py-1 rounded text-sm">
                      {creativity[0]}%
                    </span>
                  </div>
                  <Slider
                    value={creativity}
                    onValueChange={setCreativity}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* HDR滑块 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-yellow-400 font-medium">
                      {t("slider2.label")}
                    </label>
                    <span className="text-white bg-gray-800 px-2 py-1 rounded text-sm">
                      {hdr[0]}%
                    </span>
                  </div>
                  <Slider
                    value={hdr}
                    onValueChange={setHdr}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* 相似度滑块 */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-pink-400 font-medium">
                      {t("slider3.label")}
                    </label>
                    <span className="text-white bg-gray-800 px-2 py-1 rounded text-sm">
                      {resemblance[0]}%
                    </span>
                  </div>
                  <Slider
                    value={resemblance}
                    onValueChange={setResemblance}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* 提示词输入 */}
                <div className="space-y-3">
                  <label className="text-white font-medium">提示词（可选）</label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="描述您希望增强的细节..."
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 resize-none"
                    rows={3}
                  />
                </div>

                {/* 处理按钮 */}
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600 text-white py-6 text-lg"
                >
                  {isProcessing ? (
                    <div className="flex items-center">
                      <Sparkles className="animate-spin mr-2 h-5 w-5" />
                      处理中...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Wand2 className="mr-2 h-5 w-5" />
                      开始增强
                    </div>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* 右侧：结果展示区域 */}
        <div className="space-y-6">
          <Card className="bg-black/40 border-gray-600 p-8">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">处理结果</h3>
            
            {!processedImage ? (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-400">
                  {isProcessing ? "AI正在为您的图像增加细节..." : "上传图像并开始处理"}
                </p>
                {isProcessing && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-gradient-to-r from-pink-500 to-cyan-500 h-2 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative w-full h-64 rounded-lg overflow-hidden">
                  <Image
                    src={processedImage}
                    alt="Processed image"
                    fill
                    className="object-contain"
                  />
                </div>
                
                <div className="flex gap-4">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                    <Download className="mr-2 h-4 w-4" />
                    下载结果
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    onClick={() => setProcessedImage(null)}
                  >
                    重新处理
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* 处理历史（占位） */}
          <Card className="bg-black/40 border-gray-600 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">最近处理</h3>
            <p className="text-gray-400 text-center py-8">暂无处理记录</p>
          </Card>
        </div>
      </div>
    </div>
  );
}