import { BG1 } from "@/components/shared/BGs";

export default function AIImageToImagePage() {
  return (
    <div className="w-full min-h-screen">
      <BG1 />
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">AI Image to Image</h1>
          <p className="text-gray-400 text-lg mb-8">
            功能开发中，敬请期待
          </p>
          <div className="max-w-md mx-auto p-8 bg-gray-800/40 backdrop-blur-sm border border-gray-600/30 rounded-xl">
            <div className="text-gray-300">
              <h2 className="text-xl font-semibold mb-4">即将推出</h2>
              <p className="text-sm">
                我们正在开发强大的AI图片转换功能，包括：
              </p>
              <ul className="text-left mt-4 space-y-2 text-sm">
                <li>• 图片风格转换</li>
                <li>• 智能图片编辑</li>
                <li>• 场景变换</li>
                <li>• 艺术风格迁移</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}