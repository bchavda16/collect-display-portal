import { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'pink' | 'teal'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-elevated text-text-secondary border border-border',
  success: 'bg-emerald-light text-emerald border border-emerald/20',
  warning: 'bg-amber-light text-amber border border-amber/20',
  danger:  'bg-rose-light text-rose border border-rose/20',
  info:    'bg-teal-light text-teal-dark border border-teal/20',
  purple:  'bg-violet-light text-violet border border-violet/20',
  pink:    'bg-brand-light text-brand-dark border border-brand/20',
  teal:    'bg-teal-light text-teal-dark border border-teal/20',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`badge ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

// Order status badge
type OrderStatus =
  | 'PLACED' | 'CONFIRMED' | 'PROCESSING' | 'PICKED' | 'PACKED'
  | 'DISPATCHED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

const statusConfig: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  PLACED:           { label: 'Placed',           variant: 'info' },
  CONFIRMED:        { label: 'Confirmed',         variant: 'teal' },
  PROCESSING:       { label: 'Processing',        variant: 'purple' },
  PICKED:           { label: 'Picked',            variant: 'purple' },
  PACKED:           { label: 'Packed',            variant: 'warning' },
  DISPATCHED:       { label: 'Dispatched',        variant: 'success' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  variant: 'success' },
  DELIVERED:        { label: 'Delivered',         variant: 'default' },
  CANCELLED:        { label: 'Cancelled',         variant: 'danger' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] ?? { label: status, variant: 'default' as BadgeVariant }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// Product badge chip
type ProductBadgeType = 'NEW' | 'BEST_SELLER' | 'EXCLUSIVE' | 'LOW_STOCK' | 'COMING_SOON'

const productBadgeConfig: Record<ProductBadgeType, { label: string; classes: string }> = {
  NEW:         { label: 'New',         classes: 'bg-teal-light text-teal-dark border border-teal/25' },
  BEST_SELLER: { label: 'Best Seller', classes: 'bg-brand-light text-brand-dark border border-brand/25' },
  EXCLUSIVE:   { label: 'Exclusive',   classes: 'bg-violet-light text-violet border border-violet/25' },
  LOW_STOCK:   { label: 'Low Stock',   classes: 'bg-amber-light text-amber border border-amber/25' },
  COMING_SOON: { label: 'Coming Soon', classes: 'bg-bg-elevated text-text-secondary border border-border' },
}

export function ProductBadgeChip({ badge }: { badge: ProductBadgeType }) {
  const config = productBadgeConfig[badge]
  if (!config) return null
  return (
    <span className={`badge text-[10px] font-semibold tracking-wide uppercase ${config.classes}`}>
      {config.label}
    </span>
  )
}
