"use client"

import { useState, useEffect } from "react"

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // 创建状态来存储值
  // 如果可用，则从本地存储中获取初始值
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // 返回一个包装版本的 useState 的 setter 函数，
  // 它将新值同步到 localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // 允许值是一个函数，以便与 useState 的 API 保持一致
      const valueToStore = value instanceof Function ? value(storedValue) : value
      // 保存到状态
      setStoredValue(valueToStore)
      // 保存到 localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  // 监听其他标签页的存储事件
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        setStoredValue(JSON.parse(event.newValue))
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange)
      return () => {
        window.removeEventListener("storage", handleStorageChange)
      }
    }
  }, [key])

  return [storedValue, setValue]
}

