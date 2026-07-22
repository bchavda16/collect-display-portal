"use client"
import { useEffect } from "react"

export function PresencePing() {
  useEffect(() => {
    const ping = () => fetch("/api/presence", { method: "POST" }).catch(() => {})
    
    // Ping immediately on load
    ping()
    
    // Then every 2 minutes
    const interval = setInterval(ping, 2 * 60 * 1000)
    
    // Also ping on user activity
    const onActivity = () => ping()
    window.addEventListener("focus", onActivity)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onActivity)
    }
  }, [])

  return null
}
