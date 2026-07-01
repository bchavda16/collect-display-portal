'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, Package, ClipboardList, ShoppingCart,
  Truck, User, LogOut, ShoppingBag
} from 'lucide-react'
import { useBasket } from '@/hooks/useBasket'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/stock',      label: 'Live Stock',  icon: Package },
  { href: '/orders',     label: 'My Orders',   icon: ClipboardList },
  { href: '/tracking',   label: 'Tracking',    icon: Truck },
  { href: '/account',    label: 'Account',     icon: User },
]

export function PortalSidebar({ onBasketOpen }: { onBasketOpen?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { data: basket } = useBasket()

  const totalItems = basket?.items.reduce((s, i) => s + i.quantity, 0) ?? 0

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col bg-white border-r border-border">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Pink bar accent */}
          <div className="w-1 h-8 rounded-full bg-brand" />
          <div>
            <span className="text-base font-bold tracking-tight text-text-primary">
              collect<span className="text-brand">&</span>display
            </span>
            <p className="text-[10px] font-semibold tracking-[0.12em] text-text-muted uppercase mt-0.5">
              Distribution Portal
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${active ? 'nav-item-active' : ''}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Basket button */}
      <div className="px-3 pb-3">
        <button
          onClick={onBasketOpen}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                     bg-brand-light hover:bg-brand/20 border border-brand/25
                     text-brand-dark font-medium text-sm transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span>My Basket</span>
          </div>
          {totalItems > 0 && (
            <span className="bg-brand text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </button>
      </div>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-border pt-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-brand-light border border-brand/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-brand-dark">
              {session?.user?.email?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">
              {session?.user?.businessName ?? session?.user?.email}
            </p>
            <p className="text-[10px] text-text-muted">Retailer</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-text-muted hover:text-rose transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
