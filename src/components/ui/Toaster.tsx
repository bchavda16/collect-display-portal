'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  useEffect(() => {
    (window as any).__addToast = addToast
  }, [addToast])

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald flex-shrink-0" />,
    error:   <XCircle      className="w-4 h-4 text-rose flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0" />,
    info:    <Info          className="w-4 h-4 text-teal flex-shrink-0" />,
  }

  const colourClasses = {
    success: 'border-emerald/20 bg-white',
    error:   'border-rose/20 bg-white',
    warning: 'border-amber/20 bg-white',
    info:    'border-teal/20 bg-white',
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border shadow-card
              text-sm text-text-primary font-medium
              pointer-events-auto animate-slide-up max-w-sm
              ${colourClasses[toast.type]}
            `}
          >
            {icons[toast.type]}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-text-muted hover:text-text-primary transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function toast(message: string, type: ToastType = 'info') {
  if (typeof window !== 'undefined' && (window as any).__addToast) {
    ;(window as any).__addToast(message, type)
  }
}

// Alias for backwards-compat
export const Toaster = ToastProvider
