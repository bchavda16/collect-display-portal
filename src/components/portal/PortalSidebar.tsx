'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { LayoutDashboard, Package, ClipboardList, Truck, User, LogOut, ShoppingCart } from 'lucide-react'
import { useBasket } from '@/hooks/useBasket'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/stock',     label: 'Live Stock',  icon: Package },
  { href: '/orders',    label: 'My Orders',   icon: ClipboardList },
  { href: '/tracking',  label: 'Tracking',    icon: Truck },
  { href: '/account',   label: 'Account',     icon: User },
]

const s = {
  sidebar: { width: 220, flexShrink: 0, height: '100vh', position: 'sticky' as const, top: 0, display: 'flex', flexDirection: 'column' as const, background: 'white', borderRight: '1px solid rgba(0,0,0,0.08)' },
  logoArea: { padding: '18px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)' },
  logoText: { fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px', color: '#1A1A2E' },
  logoSub: { fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#8888AA', marginTop: 2 },
  nav: { flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column' as const, gap: 2, overflowY: 'auto' as const },
  navItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#4A4A6A', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.15s' },
  navActive: { background: '#FDE8EF', color: '#C4638A', fontWeight: 600 },
  basketBtn: { margin: '0 8px 8px', background: '#FDE8EF', border: '1px solid rgba(240,163,188,0.35)', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' },
  basketLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#C4638A' },
  basketCount: { background: '#F0A3BC', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  footer: { padding: '10px', borderTop: '1px solid rgba(0,0,0,0.08)' },
  userRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: '#FDE8EF', border: '1px solid rgba(240,163,188,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#C4638A', flexShrink: 0 },
  userName: { fontSize: 12, fontWeight: 500, color: '#1A1A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  userRole: { fontSize: 10, color: '#8888AA' },
}

export function PortalSidebar({ onBasketOpen }: { onBasketOpen?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { data: basket } = useBasket()
  const totalItems = basket?.items.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0

  const handleBasketOpen = () => {
    window.dispatchEvent(new Event('open-basket'))
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.logoArea}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 28, borderRadius: 99, background: '#F0A3BC' }} />
          <div>
            <div style={s.logoText}>collect<span style={{ color: '#F0A3BC' }}>&</span>display</div>
            <div style={s.logoSub}>Distribution Portal</div>
          </div>
        </div>
      </div>

      <nav style={s.nav}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{ ...s.navItem, ...(active ? s.navActive : {}) }}>
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '0 8px 8px' }}>
        <button onClick={handleBasketOpen} style={s.basketBtn}>
          <div style={s.basketLabel}>
            <ShoppingCart size={14} />
            My Basket
          </div>
          {totalItems > 0 && <div style={s.basketCount}>{totalItems > 99 ? '99+' : totalItems}</div>}
        </button>
      </div>

      <div style={s.footer}>
        <div style={s.userRow}>
          <div style={s.avatar}>{session?.user?.email?.[0]?.toUpperCase() ?? '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.userName}>{(session?.user as any)?.businessName ?? session?.user?.email}</div>
            <div style={s.userRole}>Retailer</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888AA', padding: 4 }} title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
