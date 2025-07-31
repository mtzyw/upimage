import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Info, ChevronLeft, ChevronRight } from "lucide-react"

export default function Component() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-slate-800">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-white">The image </span>
                <span className="text-pink-400">Upscaler</span>
                <span className="text-white">,</span>
                <br />
                <span className="text-cyan-400">Transformer</span>
                <span className="text-white"> & </span>
                <span className="text-pink-400">Generator</span>
                <br />
                <span className="text-white">that feels like </span>
                <span className="text-yellow-400">Magic</span>
                <span className="text-white"> ✨</span>
              </h1>

              <p className="text-gray-300 text-lg max-w-lg leading-relaxed">
                The most advanced AI tech to achieve insanely high-res upscaling. Not only upscale, enhance, transform &
                generate! Magnific can reimagine as many details as you wish guided by your prompt and parameters!
              </p>
            </div>

            <Button className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-6 text-lg rounded-lg">
              Upscale, transform or generate an image
            </Button>
          </div>

          {/* Right Content - Before/After Images */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Image
                  src="/placeholder.svg?height=400&width=300"
                  alt="Before image"
                  width={300}
                  height={400}
                  className="rounded-lg object-cover w-full h-80"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 text-black px-3 py-1 rounded-full text-sm font-medium">Before</span>
                </div>
                <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Image
                  src="/placeholder.svg?height=400&width=300"
                  alt="After image"
                  width={300}
                  height={400}
                  className="rounded-lg object-cover w-full h-80"
                />
                <div className="absolute top-4 right-4">
                  <span className="bg-white/90 text-black px-3 py-1 rounded-full text-sm font-medium">After</span>
                </div>
                <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid lg:grid-cols-3 gap-12 mt-24">
          {/* Feature 1 - Control Panel */}
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-pink-400">Let Magnific</h3>
              <h3 className="text-2xl font-bold text-pink-400">hallucinate</h3>
            </div>

            <Card className="bg-black/40 border-gray-700 p-6 max-w-sm mx-auto">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">Creativity</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-white text-sm">7</span>
                  </div>
                  <Slider defaultValue={[70]} max={100} step={1} className="w-full" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">HDR</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-white text-sm">-4</span>
                  </div>
                  <Slider defaultValue={[30]} max={100} step={1} className="w-full" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">Anchor</span>
                      <Info className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-white text-sm">5</span>
                  </div>
                  <Slider defaultValue={[50]} max={100} step={1} className="w-full" />
                </div>
              </div>
            </Card>
          </div>

          {/* Feature 2 - Generative AI */}
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-cyan-400">Powered by</h3>
              <h3 className="text-2xl font-bold text-cyan-400">Generative AI</h3>
            </div>

            <div className="relative max-w-sm mx-auto">
              <Image
                src="/placeholder.svg?height=300&width=300"
                alt="AI generated landscape"
                width={300}
                height={300}
                className="rounded-lg object-cover w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-red-500/20 rounded-lg"></div>
            </div>
          </div>

          {/* Feature 3 - Magic Results */}
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-orange-400">Indistinguishable</h3>
              <h3 className="text-2xl font-bold text-orange-400">from magic</h3>
            </div>

            <div className="max-w-sm mx-auto">
              <Image
                src="/placeholder.svg?height=300&width=300"
                alt="High quality detail result"
                width={300}
                height={300}
                className="rounded-lg object-cover w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
