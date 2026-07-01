import { forwardRef, ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconPosition = 'left', children, className = '', disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none'

    const variants = {
      primary:   'bg-brand hover:bg-brand-hover text-white shadow-sm focus:ring-brand/30',
      teal:      'bg-teal hover:bg-teal-hover text-white shadow-sm focus:ring-teal/30',
      secondary: 'bg-bg-elevated hover:bg-border border border-border text-text-primary focus:ring-brand/20',
      outline:   'border border-brand text-brand hover:bg-brand-light focus:ring-brand/20',
      ghost:     'text-text-secondary hover:text-text-primary hover:bg-bg-elevated focus:ring-brand/20',
      danger:    'bg-rose hover:bg-rose/90 text-white focus:ring-rose/30',
    }

    const sizes = {
      sm:  'px-3 py-1.5 text-xs',
      md:  'px-4 py-2.5 text-sm',
      lg:  'px-6 py-3 text-base',
    }

    const Spinner = () => (
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Spinner />
        ) : (
          icon && iconPosition === 'left' && icon
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    )
  }
)

Button.displayName = 'Button'
