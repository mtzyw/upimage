'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { useState, useRef } from "react"
import { toast } from "sonner"
import Image from "next/image"

interface ImageUploaderProps {
  onUploadSuccess?: (url: string, key: string) => void
  maxSizeMB?: number
  acceptedTypes?: string[]
  className?: string
}

export default function ImageUploader({
  onUploadSuccess,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = ""
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<{url: string, key: string} | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // 检查文件类型
    if (!acceptedTypes.includes(file.type)) {
      return `只支持 ${acceptedTypes.join(', ')} 格式的图片`
    }
    
    // 检查文件大小
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      return `文件大小不能超过 ${maxSizeMB}MB`
    }
    
    return null
  }

  const uploadFile = async (file: File) => {
    const validation = validateFile(file)
    if (validation) {
      toast.error(validation)
      return
    }

    setIsUploading(true)
    
    try {
      console.log('Starting upload for file:', file.name, file.type, file.size)
      
      // 1. 获取预签名 URL
      const response = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: 获取上传权限失败`)
      }

      const result = await response.json()
      console.log('Presigned URL response:', result)

      if (!result.success || !result.data) {
        throw new Error(result.error || '获取上传权限失败')
      }

      const { presignedUrl, key, publicObjectUrl } = result.data
      console.log('Got presigned URL:', presignedUrl)

      // 2. 上传文件到 R2
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      console.log('Upload response status:', uploadResponse.status)

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => 'Unknown error')
        console.error('Upload failed:', errorText)
        throw new Error(`图片上传失败: ${uploadResponse.status} ${errorText}`)
      }

      // 3. 上传成功
      console.log('Upload successful, public URL:', publicObjectUrl)
      const imageData = { url: publicObjectUrl, key }
      setUploadedImage(imageData)
      onUploadSuccess?.(publicObjectUrl, key)
      toast.success('图片上传成功！')

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : '上传失败，请重试')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    uploadFile(files[0])
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const clearImage = () => {
    setUploadedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {!uploadedImage ? (
        <Card
          className={`relative border-2 border-dashed border-gray-600 bg-gray-800/50 hover:bg-gray-800/70 transition-colors cursor-pointer ${
            dragActive ? 'border-pink-400 bg-pink-400/10' : ''
          }`}
          onDrop={handleDrop}
          onDragOver={handleDrag}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            {isUploading ? (
              <>
                <Loader2 className="h-12 w-12 text-pink-400 animate-spin mb-4" />
                <p className="text-white font-medium">上传中...</p>
                <p className="text-gray-400 text-sm mt-1">请稍候</p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-pink-500/20 p-4 mb-4">
                  <Upload className="h-8 w-8 text-pink-400" />
                </div>
                <p className="text-white font-medium mb-2">
                  点击上传或拖拽图片到此处
                </p>
                <p className="text-gray-400 text-sm">
                  支持 JPG、PNG、WebP 格式，最大 {maxSizeMB}MB
                </p>
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card className="relative bg-gray-800/50 border-gray-600">
          <div className="relative">
            <Image
              src={uploadedImage.url}
              alt="已上传的图片"
              width={400}
              height={300}
              className="w-full h-64 object-cover rounded-t-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <ImageIcon className="h-4 w-4" />
              <span className="text-sm font-medium">上传成功</span>
            </div>
            <p className="text-gray-400 text-xs truncate">
              {uploadedImage.key}
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}