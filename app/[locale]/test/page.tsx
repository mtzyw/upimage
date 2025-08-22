'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface TaskResult {
  taskId: string;
  status: string;
  originalUrl?: string;
  cdnUrl?: string;
  editPrompt?: string;
  errorMessage?: string;
}

export default function TestPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const pollTaskStatus = async (taskId: string): Promise<TaskResult> => {
    const maxAttempts = 30; // 最多轮询30次
    const pollInterval = 2000; // 每2秒轮询一次

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`/api/qwen-image-edit/status/${taskId}`);
        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const statusData = await response.json();
        console.log(`轮询 ${attempt + 1}:`, statusData);

        // 处理 apiResponse 包装的数据结构
        const taskData = statusData.data || statusData;

        if (taskData.status === 'completed') {
          return taskData;
        } else if (taskData.status === 'failed') {
          throw new Error(taskData.errorMessage || '任务处理失败');
        }

        // 如果仍在处理中，等待后继续轮询
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`轮询错误 (attempt ${attempt + 1}):`, error);
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error('任务超时');
  };

  const handleGenerate = async () => {
    if (!selectedImage || !prompt.trim()) {
      setError('请上传图片并输入编辑指令');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      console.log('开始提交任务...');
      
      // 提交任务
      const submitResponse = await fetch('/api/qwen-image-edit/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: selectedImage,
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          num_images: 1,
          guidance_scale: 4,
          num_inference_steps: 30
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(errorData.message || `提交失败: ${submitResponse.status}`);
      }

      const submitData = await submitResponse.json();
      console.log('任务提交成功:', submitData);

      // 开始轮询状态
      console.log('开始轮询任务状态...');
      const finalResult = await pollTaskStatus(submitData.data.taskId);
      
      setResult(finalResult);
      console.log('任务完成:', finalResult);

    } catch (error) {
      console.error('处理错误:', error);
      setError(error instanceof Error ? error.message : '处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Qwen Image Edit API 测试</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：输入区域 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>上传图片</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full h-32 border-dashed"
                  >
                    {selectedImage ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={selectedImage}
                          alt="选择的图片"
                          fill
                          className="object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8" />
                        <span>点击上传图片</span>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>编辑指令</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      编辑提示词 *
                    </label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="例如: Change bag to apple macbook"
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      负向提示词 (可选)
                    </label>
                    <Textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="不希望出现的内容..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleGenerate}
              disabled={isProcessing || !selectedImage || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  生成图片
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* 右侧：结果展示区域 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>处理结果</CardTitle>
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-gray-600">正在处理图片...</p>
                  </div>
                ) : result ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">任务ID:</span>
                        <p className="text-gray-600 font-mono text-xs">{result.taskId}</p>
                      </div>
                      <div>
                        <span className="font-medium">状态:</span>
                        <p className={`font-medium ${
                          result.status === 'completed' ? 'text-green-600' : 
                          result.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {result.status}
                        </p>
                      </div>
                    </div>

                    {result.editPrompt && (
                      <div>
                        <span className="font-medium text-sm">编辑指令:</span>
                        <p className="text-gray-600 text-sm mt-1">{result.editPrompt}</p>
                      </div>
                    )}

                    {result.cdnUrl ? (
                      <div>
                        <span className="font-medium text-sm block mb-2">生成结果:</span>
                        <div className="relative w-full h-64 border rounded">
                          <Image
                            src={result.cdnUrl}
                            alt="处理结果"
                            fill
                            className="object-contain rounded"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = result.cdnUrl!;
                            link.download = `qwen-edit-${result.taskId}.png`;
                            link.click();
                          }}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          下载图片
                        </Button>
                      </div>
                    ) : result.errorMessage ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <span className="font-medium text-sm text-red-800">错误信息:</span>
                        <p className="text-red-700 text-sm mt-1">{result.errorMessage}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <p>请上传图片并输入编辑指令后点击生成</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}