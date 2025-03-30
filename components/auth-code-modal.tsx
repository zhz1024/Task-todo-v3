"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface AuthCodeModalProps {
  authCode: string
  authCodeExpiry: number
  lastAuthTime: string | null
  onAuth: () => void
}

export default function AuthCodeModal({ authCode, authCodeExpiry, lastAuthTime, onAuth }: AuthCodeModalProps) {
  const [inputCode, setInputCode] = useState("")
  const [error, setError] = useState(false)
  const [success, setSuccess] = useState(false)
  const [remainingDays, setRemainingDays] = useState<number | null>(null)

  useEffect(() => {
    // 计算授权码剩余有效期
    if (lastAuthTime && authCodeExpiry > 0) {
      const lastAuth = new Date(lastAuthTime)
      const expiryDate = new Date(lastAuth)
      expiryDate.setDate(expiryDate.getDate() + authCodeExpiry)

      const now = new Date()
      const diffTime = expiryDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      setRemainingDays(diffDays > 0 ? diffDays : 0)
    }
  }, [lastAuthTime, authCodeExpiry])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (inputCode === authCode) {
      setError(false)
      setSuccess(true)

      // 短暂延迟后关闭模态框
      setTimeout(() => {
        onAuth()
      }, 1000)
    } else {
      setError(true)
      setSuccess(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-xl shadow-lg w-full max-w-md border border-border p-6"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="bg-primary/10 p-3 rounded-full mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">需要授权码</h2>
            <p className="text-muted-foreground">
              请输入授权码以访问任务管理系统
              {remainingDays !== null && remainingDays > 0 && (
                <span className="block mt-1 text-sm">
                  您的授权码还有 <span className="font-medium text-primary">{remainingDays}</span> 天有效期
                </span>
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-code">授权码</Label>
              <div className="relative">
                <Input
                  id="auth-code"
                  type="password"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value)
                    setError(false)
                  }}
                  placeholder="请输入授权码"
                  className={cn(
                    "pr-10",
                    error && "border-destructive focus-visible:ring-destructive",
                    success && "border-green-500 focus-visible:ring-green-500",
                  )}
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {error && <AlertCircle className="h-5 w-5 text-destructive" />}
                  {success && <CheckCircle className="h-5 w-5 text-green-500" />}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">授权码不正确，请重试</p>}
            </div>

            <Button type="submit" className="w-full">
              {success ? "授权成功" : "验证授权码"}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

