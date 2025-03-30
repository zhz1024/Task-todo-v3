"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import ReactMarkdown from "react-markdown"
import "katex/dist/katex.min.css"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

interface AIAssistantProps {
  apiKey: string
  baseUrl: string
  systemContext: string
  model: string
  onExecuteCommand?: (command: any) => void
  tasks: any[] // 传入任务列表，让AI了解当前任务
  categories: any[] // 传入分类列表，让AI了解当前分类
}

export default function AIAssistant({
  apiKey,
  baseUrl,
  systemContext,
  model,
  onExecuteCommand,
  tasks,
  categories,
}: AIAssistantProps) {
  // 使用本地存储保存聊天历史
  const [savedMessages, setSavedMessages] = useLocalStorage<Message[]>("ai-chat-history", [
    { role: "system", content: "你是一个任务管理助手，可以帮助用户管理任务、提供建议和回答问题。" },
    {
      role: "assistant",
      content: "你好！我是你的任务管理助手。我可以帮你管理任务、提供建议或回答问题。有什么我能帮到你的吗？",
    },
  ])

  // 确保初始化时有一条欢迎消息，这样界面不会显得空白
  const [messages, setMessages] = useState<Message[]>(savedMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingMessage, setStreamingMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 当消息更新时，保存到本地存储
  useEffect(() => {
    setSavedMessages(messages)
  }, [messages, setSavedMessages])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingMessage])

  // 自动调整文本区域高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // 自动聚焦输入框
  useEffect(() => {
    // 使用短暂延迟确保组件已完全渲染
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 100)

    return () => clearTimeout(timer)
  }, []) // 仅在组件挂载时执行一次

  // 清除聊天历史
  const clearChatHistory = () => {
    const initialMessages = [
      { role: "system", content: "你是一个任务管理助手，可以帮助用户管理任务、提供建议和回答问题。" },
      {
        role: "assistant",
        content: "你好！我是你的任务管理助手。我可以帮你管理任务、提供建议或回答问题。有什么我能帮到你的吗？",
      },
    ]
    setMessages(initialMessages)
    setSavedMessages(initialMessages)
  }

  // 解析AI响应中的命令
  const parseCommands = (content: string) => {
    // 检查是否包含命令标记
    if (content.includes("```json-command") && content.includes("```")) {
      try {
        const commandMatch = content.match(/```json-command\n([\s\S]*?)\n```/)
        if (commandMatch && commandMatch[1]) {
          const commandData = JSON.parse(commandMatch[1])
          if (commandData && commandData.action && onExecuteCommand) {
            console.log("执行命令:", commandData)
            onExecuteCommand(commandData)
            return true
          }
        }
      } catch (e) {
        console.error("解析命令失败:", e)
      }
    }
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    if (!apiKey) {
      setError("请在设置中配置 OpenAI API 密钥")
      return
    }

    const userMessage = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)
    setStreamingMessage("")

    try {
      // 添加系统上下文作为最新的系统消息
      const contextMessage = { role: "system", content: systemContext }

      // 添加命令系统提示
      const commandSystemMessage = {
        role: "system",
        content: `你是一个任务管理助手，可以帮助用户管理任务。当用户请求你执行任务管理操作时，请使用以下JSON命令格式回复，包裹在\`\`\`json-command\`\`\`代码块中：

对于添加任务:
\`\`\`json-command
{
  "action": "addTask",
  "task": {
    "title": "任务标题",
    "description": "任务描述",
    "categoryId": "分类ID或null",
    "important": true/false,
    "dueDate": "2023-01-01T00:00:00.000Z或null"
  }
}
\`\`\`

对于编辑任务:
\`\`\`json-command
{
  "action": "updateTask",
  "taskId": "要编辑的任务ID",
  "updates": {
    "title": "新标题",
    "description": "新描述",
    "categoryId": "新分类ID",
    "important": true/false,
    "completed": true/false,
    "dueDate": "2023-01-01T00:00:00.000Z或null"
  }
}
\`\`\`

对于删除任务:
\`\`\`json-command
{
  "action": "deleteTask",
  "taskId": "要删除的任务ID"
}
\`\`\`

对于添加分类:
\`\`\`json-command
{
  "action": "addCategory",
  "category": {
    "name": "分类名称",
    "color": "#颜色代码"
  }
}
\`\`\`

对于编辑分类:
\`\`\`json-command
{
  "action": "updateCategory",
  "categoryId": "要编辑的分类ID",
  "updates": {
    "name": "新名称",
    "color": "#新颜色代码"
  }
}
\`\`\`

对于删除分类:
\`\`\`json-command
{
  "action": "deleteCategory",
  "categoryId": "要删除的分类ID"
}
\`\`\`

在提供命令的同时，也用自然语言回复用户，解释你执行的操作。

当前系统中的任务ID列表：
${tasks.map((task) => `- ${task.id}: ${task.title}`).join("\n")}

当前系统中的分类ID列表：
${categories.map((category) => `- ${category.id}: ${category.name}`).join("\n")}
`,
      }

      // 获取最近的消息，避免超出上下文长度
      const recentMessages = messages.slice(-10)
      const messagesToSend = [commandSystemMessage, contextMessage, ...recentMessages, userMessage]

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || "gpt-3.5-turbo",
          messages: messagesToSend,
          stream: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder("utf-8")
      let fullContent = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n").filter((line) => line.trim() !== "")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices[0]?.delta?.content || ""
                fullContent += content
                setStreamingMessage(fullContent)
              } catch (e) {
                console.error("解析流数据失败:", e)
              }
            }
          }
        }
      }

      // 添加完整的助手消息
      setMessages((prev) => [...prev, { role: "assistant", content: fullContent }])

      // 解析并执行命令
      parseCommands(fullContent)
    } catch (err) {
      console.error("AI 请求错误:", err)
      setError(err instanceof Error ? err.message : "请求 AI 助手时出错")
    } finally {
      setIsLoading(false)
      setStreamingMessage("")
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages
          .filter((m) => m.role !== "system")
          .map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex flex-col max-w-[85%] rounded-lg p-3",
                message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              <ReactMarkdown
                className={cn(
                  "prose prose-sm max-w-none break-words",
                  message.role === "user" ? "prose-invert" : "prose-neutral dark:prose-invert",
                )}
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" />
                  ),
                  code: ({ node, inline, className, children, ...props }) => {
                    // 不显示json-command代码块
                    if (className === "language-json-command") {
                      return null
                    }
                    return (
                      <code
                        className={cn(
                          "bg-muted-foreground/20 rounded px-1 py-0.5",
                          message.role === "user" ? "text-primary-foreground" : "text-foreground",
                          inline ? "inline" : "block",
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  },
                  pre: ({ node, ...props }) => {
                    // 检查是否是json-command代码块
                    const childNodes = Array.isArray(node?.children) ? node.children : []
                    const codeNode = childNodes.find((child: any) => child.tagName === "code")
                    if (codeNode && codeNode.properties?.className?.includes("language-json-command")) {
                      return null
                    }
                    return <pre className="bg-muted-foreground/20 p-2 rounded overflow-x-auto" {...props} />
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ))}

        {streamingMessage && (
          <div className="flex flex-col max-w-[85%] rounded-lg p-3 bg-muted">
            <ReactMarkdown
              className="prose prose-sm max-w-none break-words prose-neutral dark:prose-invert"
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" />
                ),
                code: ({ node, inline, className, children, ...props }) => {
                  // 不显示json-command代码块
                  if (className === "language-json-command") {
                    return null
                  }
                  return (
                    <code
                      className={cn("bg-muted-foreground/20 rounded px-1 py-0.5", inline ? "inline" : "block")}
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
                pre: ({ node, ...props }) => {
                  // 检查是否是json-command代码块
                  const childNodes = Array.isArray(node?.children) ? node.children : []
                  const codeNode = childNodes.find((child: any) => child.tagName === "code")
                  if (codeNode && codeNode.properties?.className?.includes("language-json-command")) {
                    return null
                  }
                  return <pre className="bg-muted-foreground/20 p-2 rounded overflow-x-auto" {...props} />
                },
              }}
            >
              {streamingMessage}
            </ReactMarkdown>
          </div>
        )}

        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-border flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={clearChatHistory} className="text-muted-foreground">
          <Trash2 className="h-4 w-4 mr-1" /> 清除历史
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2 items-end relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          className="min-h-[40px] max-h-[120px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
          className={cn("shrink-0 relative z-10", isLoading && "opacity-50 cursor-not-allowed")}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

