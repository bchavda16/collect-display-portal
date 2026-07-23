'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, Package, ClipboardList, Building2, Upload, LogOut, FileText, Tag, Bell } from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard',     label: 'Dashboard',     icon: LayoutDashboard, badge: null },
  { href: '/admin/orders',        label: 'Orders',        icon: ClipboardList,   badge: 'orders' },
  { href: '/admin/products',      label: 'Inventory',     icon: Package,         badge: null },
  { href: '/admin/retailers',     label: 'Retailers',     icon: Building2,       badge: null },
  { href: '/admin/imports',       label: 'Imports',       icon: Upload,          badge: null },
  { href: '/admin/offers',        label: 'Offers',        icon: Tag,             badge: 'offers' },
  { href: '/admin/applications',  label: 'Applications',  icon: FileText,        badge: 'applications' },
  { href: '/admin/stock-alert',     label: 'Stock Alert',    icon: Bell,            badge: null },
]

const s = {
  sidebar: { width: 220, flexShrink: 0, height: '100vh', position: 'sticky' as const, top: 0, display: 'flex', flexDirection: 'column' as const, background: 'white', borderRight: '1px solid rgba(0,0,0,0.08)' },
  logoArea: { padding: '18px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)' },
  logoText: { fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px', color: '#1A1A2E' },
  logoSub: { fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#8888AA', marginTop: 2 },
  nav: { flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column' as const, gap: 2, overflowY: 'auto' as const },
  navItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#4A4A6A', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.15s' },
  navActive: { background: '#e6f9fa', color: '#1a9da3', fontWeight: 600 },
  footer: { padding: '10px', borderTop: '1px solid rgba(0,0,0,0.08)' },
  userRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: '#E8F8F7', border: '1px solid rgba(92,200,197,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#3A9E9B', flexShrink: 0 },
  userName: { fontSize: 12, fontWeight: 500, color: '#1A1A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  userRole: { fontSize: 10, color: '#8888AA' },
}

export function AdminSidebar() {
  const pathname = usePathname()

  const { data: counts } = useQuery({
    queryKey: ['admin-badges'],
    queryFn: async () => {
      const [orders, offers, applications] = await Promise.all([
        fetch('/api/orders?status=PLACED&limit=1').then(r => r.json()),
        fetch('/api/offers?status=PENDING').then(r => r.json()),
        fetch('/api/applications?status=PENDING').then(r => r.json()),
      ])
      return {
        orders: orders.total ?? 0,
        offers: offers.data?.length ?? 0,
        applications: applications.data?.length ?? 0,
      }
    },
    refetchInterval: 30000, // refresh every 30 seconds
  })

  const getBadge = (key: string | null) => {
    if (!key || !counts) return 0
    return (counts as any)[key] ?? 0
  }

  return (
    <aside style={s.sidebar}>
      <div style={s.logoArea}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 28, borderRadius: 99, background: 'linear-gradient(135deg, #88dde1, #5CC8C5)' }} />
          <div>
            <div style={s.logoText}>collect<span style={{ color: '#88dde1' }}>&</span>display</div>
            <div style={s.logoSub}><span style={{ color: '#3A9E9B' }}>Admin</span> Panel</div>
          </div>
        </div>
      </div>

      <nav style={s.nav}>
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const count = getBadge(badge)
          return (
            <Link key={href} href={href} style={{ ...s.navItem, ...(active ? s.navActive : {}) }}>
              <Icon size={16} />
              <span style={{ flex: 1 }}>{label}</span>
              {count > 0 && (
                <span style={{
                  background: '#e11d48',
                  color: 'white',
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                  lineHeight: 1,
                }}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div style={s.footer}>
        <div style={s.userRow}>
          <div style={s.avatar}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.userName}>Administrator</div>
            <div style={s.userRole}>collect&display</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888AA', padding: 4, display: 'flex', alignItems: 'center' }}
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
