'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Package, ClipboardList,
  Building2, Upload, LogOut, Settings
} from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/orders',     label: 'Orders',      icon: ClipboardList },
  { href: '/admin/products',   label: 'Products',    icon: Package },
  { href: '/admin/retailers',  label: 'Retailers',   icon: Building2 },
  { href: '/admin/imports',    label: 'Imports',     icon: Upload },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col bg-white border-r border-border">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-1 h-8 rounded-full bg-gradient-brand" />
          <div>
            <span className="text-base font-bold tracking-tight text-text-primary">
              collect<span className="text-brand">&</span>display
            </span>
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mt-0.5">
              <span className="text-teal-dark">Admin</span>
              <span className="text-text-muted"> Panel</span>
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
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

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-border pt-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-teal-light border border-teal/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-teal-dark">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">Administrator</p>
            <p className="text-[10px] text-text-muted">collect&display</p>
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
