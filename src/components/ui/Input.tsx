import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={`
              w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-text-primary
              placeholder:text-text-muted outline-none
              transition-all duration-150
              ${error
                ? 'border-rose focus:border-rose focus:ring-2 focus:ring-rose/20'
                : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
              }
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-rose">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className = '', children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-text-secondary">{label}</label>
        )}
        <select
          ref={ref}
          className={`
            w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-text-primary
            outline-none appearance-none cursor-pointer
            transition-all duration-150
            ${error
              ? 'border-rose focus:border-rose focus:ring-2 focus:ring-rose/20'
              : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
            }
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-rose">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-text-secondary">{label}</label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-text-primary
            placeholder:text-text-muted outline-none resize-none
            transition-all duration-150
            ${error
              ? 'border-rose focus:border-rose focus:ring-2 focus:ring-rose/20'
              : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20'
            }
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-rose">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
