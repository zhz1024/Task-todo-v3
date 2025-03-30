"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CalendarIcon,
  Edit2,
  Trash2,
  X,
  Save,
  Clock,
  Star,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Tag,
  Paperclip,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import type { Task, Category } from "@/lib/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"

interface TaskDetailProps {
  task?: Task
  categories: Category[]
  onSubmit: (task: Task) => void
  onDelete?: (id: string) => void
  onClose: () => void
  isCreating?: boolean
  initialDate?: Date | null
}

export default function TaskDetail({
  task,
  categories,
  onSubmit,
  onDelete,
  onClose,
  isCreating = false,
  initialDate,
}: TaskDetailProps) {
  // 如果是创建模式，默认进入编辑状态
  const [isEditing, setIsEditing] = useState(isCreating)
  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [categoryId, setCategoryId] = useState<string | null>(task?.categoryId || null)
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.dueDate ? new Date(task.dueDate) : initialDate || undefined,
  )
  const [important, setImportant] = useState(task?.important || false)
  const [completed, setCompleted] = useState(task?.completed || false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showProperties, setShowProperties] = useState(true)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [cursorPosition, setCursorPosition] = useState<number | null>(null)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  // 当进入编辑模式时，聚焦标题输入框
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isEditing])

  // 保存任务更新
  const handleSave = () => {
    if (!title.trim()) {
      // 标题为空时聚焦标题输入框
      titleInputRef.current?.focus()
      return
    }

    if (typeof onSubmit !== "function") {
      console.error("onSubmit is not a function")
      return
    }

    const updatedTask: Task = {
      id: task?.id || crypto.randomUUID(),
      title,
      description,
      categoryId,
      important,
      completed,
      dueDate: dueDate ? dueDate.toISOString() : null,
      createdAt: task?.createdAt || new Date().toISOString(),
    }

    onSubmit(updatedTask)

    // 如果不是创建模式，保存后退出编辑模式
    if (!isCreating) {
      setIsEditing(false)
    }
  }

  // 获取分类颜色
  const getCategoryColor = (id: string | null) => {
    if (!id) return "#94a3b8"
    const category = categories.find((c) => c.id === id)
    return category ? category.color : "#94a3b8"
  }

  // 获取分类名称
  const getCategoryName = (id: string | null) => {
    if (!id) return "无分类"
    const category = categories.find((c) => c.id === id)
    return category ? category.name : "无分类"
  }

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
    exit: { opacity: 0, y: 10 },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  // 模式切换动画变体
  const modeTransitionVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeIn" } },
  }

  // 当按下Escape键时退出全屏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen])

  // 处理编辑器内容变化
  const handleEditorChange = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerText || ""
    setDescription(content)

    // 保存光标位置
    if (document.activeElement === e.currentTarget) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        setCursorPosition(range.startOffset)
      }
    }
  }

  // 恢复光标位置
  useEffect(() => {
    if (cursorPosition !== null && editorRef.current && document.activeElement === editorRef.current) {
      const selection = window.getSelection()
      if (selection) {
        try {
          // 尝试设置光标位置
          const range = document.createRange()
          let textNode

          // 找到第一个文本节点
          for (let i = 0; i < editorRef.current.childNodes.length; i++) {
            if (editorRef.current.childNodes[i].nodeType === Node.TEXT_NODE) {
              textNode = editorRef.current.childNodes[i]
              break
            }
          }

          // 如果没有文本节点，创建一个
          if (!textNode) {
            textNode = document.createTextNode("")
            editorRef.current.appendChild(textNode)
          }

          // 设置光标位置
          const pos = Math.min(cursorPosition, textNode.textContent?.length || 0)
          range.setStart(textNode, pos)
          range.setEnd(textNode, pos)
          selection.removeAllRanges()
          selection.addRange(range)
        } catch (e) {
          console.error("Error setting cursor position:", e)
        }
      }
    }
  }, [cursorPosition])

  // 切换预览模式
  const togglePreviewMode = () => {
    setIsPreviewMode(!isPreviewMode)
  }

  return (
    <motion.div
      className={cn("flex flex-col h-full bg-background", isFullscreen && "fixed inset-0 z-[100] p-6")}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* 顶部导航栏 */}
      <motion.div className="flex items-center justify-between p-4 border-b" variants={itemVariants}>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isCreating) {
                  onClose()
                } else {
                  setIsEditing(false)
                  // 重置为原始值
                  if (task) {
                    setTitle(task.title)
                    setDescription(task.description)
                    setCategoryId(task.categoryId)
                    setDueDate(task.dueDate ? new Date(task.dueDate) : undefined)
                    setImportant(task.important)
                    setCompleted(task.completed)
                  }
                }
              }}
              className="gap-1.5"
            >
              <X className="h-4 w-4" /> 取消
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
              <Edit2 className="h-4 w-4" /> 编辑
            </Button>
          )}

          {isEditing && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-1.5"
            >
              <Save className="h-4 w-4" /> 保存
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-full hover:bg-muted"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧内容区域 */}
        <motion.div className="flex-1 overflow-y-auto p-6" variants={itemVariants}>
          {isEditing ? (
            <div className="space-y-6">
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="任务标题"
                className="text-3xl font-bold border-none shadow-none px-0 focus-visible:ring-0 font-serif"
              />

              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">描述（支持Markdown格式）</div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" onClick={togglePreviewMode} className="text-xs gap-1.5">
                    {isPreviewMode ? <Edit2 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {isPreviewMode ? "编辑模式" : "预览模式"}
                  </Button>
                </motion.div>
              </div>

              <AnimatePresence mode="wait">
                {isPreviewMode ? (
                  <motion.div
                    key="preview"
                    variants={modeTransitionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="min-h-[300px] border rounded-md p-4 prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-p:text-base prose-p:leading-relaxed"
                  >
                    {description ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {description}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground italic">无描述内容</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="editor"
                    variants={modeTransitionVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="relative"
                  >
                    <div
                      ref={editorRef}
                      contentEditable
                      className="min-h-[300px] font-mono text-sm resize-none border border-muted rounded-md p-4 focus-visible:ring-1 focus-visible:ring-primary focus:outline-none whitespace-pre-wrap"
                      onInput={handleEditorChange}
                      suppressContentEditableWarning={true}
                    >
                      {description}
                    </div>

                    {/* 实时预览层 */}
                    {description && (
                      <div
                        className="absolute inset-0 pointer-events-none p-4 prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-p:text-base prose-p:leading-relaxed"
                        style={{
                          color: "transparent",
                          WebkitTextFillColor: "transparent",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          background: "var(--foreground)",
                        }}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {description}
                        </ReactMarkdown>
                      </div>
                    )}

                    <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
                      {description.length} 字符
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-3 bg-muted/30 rounded-md">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Markdown 支持:</span> **粗体**, *斜体*, # 标题, - 列表, 1. 有序列表,
                  [链接](url), ![图片](url), `代码`, \`\`\`代码块\`\`\`
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <motion.h1
                className="text-3xl font-bold font-serif"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {title}
              </motion.h1>

              {description && (
                <motion.div
                  className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-serif prose-p:text-base prose-p:leading-relaxed"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {description}
                  </ReactMarkdown>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        {/* 右侧属性面板 */}
        <motion.div
          className={cn(
            "border-l overflow-y-auto p-4 space-y-6 bg-muted/20 transition-all duration-300",
            showProperties ? "w-72" : "w-12",
          )}
          variants={itemVariants}
        >
          <div className="flex items-center justify-between">
            <h3 className={cn("text-sm font-medium text-muted-foreground", !showProperties && "hidden")}>任务属性</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setShowProperties(!showProperties)}
            >
              {showProperties ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {showProperties && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">状态</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={completed} onCheckedChange={setCompleted} disabled={!isEditing} />
                    <span className={cn("text-sm", completed ? "text-green-500" : "text-muted-foreground")}>
                      {completed ? "已完成" : "未完成"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">重要</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={important} onCheckedChange={setImportant} disabled={!isEditing} />
                    <span className={cn("text-sm", important ? "text-amber-500" : "text-muted-foreground")}>
                      {important ? "重要" : "普通"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">分类</span>
                  </div>
                  {isEditing ? (
                    <Select
                      value={categoryId || "none"}
                      onValueChange={(value) => setCategoryId(value === "none" ? null : value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无分类</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center">
                              <div className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant="outline"
                      className="rounded-full border-border"
                      style={{
                        borderColor: `${getCategoryColor(categoryId)}40`,
                        backgroundColor: `${getCategoryColor(categoryId)}10`,
                      }}
                    >
                      <div
                        className="h-2 w-2 rounded-full mr-1"
                        style={{ backgroundColor: getCategoryColor(categoryId) }}
                      />
                      {getCategoryName(categoryId)}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">截止日期</span>
                  </div>
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-[140px] justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "yyyy-MM-dd", { locale: zhCN }) : "设置日期"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={zhCN} initialFocus />
                        {dueDate && (
                          <div className="p-2 border-t flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setDueDate(undefined)}>
                              清除
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span className="text-sm">
                      {dueDate ? format(dueDate, "yyyy-MM-dd", { locale: zhCN }) : "无截止日期"}
                    </span>
                  )}
                </div>

                {!isCreating && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">创建时间</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(task?.createdAt || new Date()), "yyyy-MM-dd", { locale: zhCN })}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {!isEditing && !isCreating && onDelete && (
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (typeof onDelete === "function" && task) {
                        onDelete(task.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> 删除任务
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

