'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/Modal"
import { createClient } from "@/lib/supabase/client"
import { FcGoogle } from "react-icons/fc"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  redirectTo?: string // 可选的重定向地址
}

export function LoginModal({ isOpen, onClose, redirectTo }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect_to=${redirectTo || window.location.pathname + window.location.search}`
        }
      })
      if (error) throw error
    } catch (error: any) {
      setError(error.message || "Login failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log in to ImgEnhancer.ai">
      <div className="space-y-6">
        {/* Google Login Button */}
        <Button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-transparent border border-gray-600 hover:border-white/50 text-white py-4 rounded-lg relative overflow-hidden group transition-all duration-200"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-green-500 via-blue-500 via-purple-500 to-red-500 opacity-0 group-hover:opacity-20 transition-opacity rounded-lg" />
          <div className="flex items-center justify-center gap-3 relative z-10">
            <FcGoogle className="w-6 h-6" />
            <span className="text-lg font-medium">
              {isLoading ? "Connecting..." : "Log in with Google"}
            </span>
            {!isLoading && <span className="ml-2 text-xl">→</span>}
          </div>
        </Button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Info Text */}
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Sign in with your Google account to get started
          </p>
        </div>
      </div>
    </Modal>
  )
}