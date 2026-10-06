"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

const navItems = [
  { href: "/dashboard", label: "Home",    icon: "ti-home" },
  { href: "/stock",     label: "Stock",   icon: "ti-package" },
  { href: "/offers",    label: "Offers",  icon: "ti-tag" },
  { href: "/orders",    label: "Orders",  icon: "ti-clipboard-list" },
  { href: "/checkout",  label: "Basket",  icon: "ti-shopping-cart", badge: true },
  { href: "/account",   label: "Account", icon: "ti-user" },
]

export function MobileNav() {
  const pathname = usePathname()

  const { data: basket } = useQuery({
    queryKey: ["basket"],
    queryFn: async () => { const r = await fetch("/api/basket"); return r.json() },
    refetchInterval: 30000,
  })

  const basketCount = basket?.items?.length ?? 0

  return (
    <>
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css');
        .mobile-bottom-nav{display:none !important}
        .mobile-spacer{display:none !important}
        @media(max-width:768px){
          .mobile-bottom-nav{display:flex !important}
          .mobile-spacer{display:block !important}
        }
        .mobile-bottom-nav a{
          flex:1;display:flex;flex-direction:column;align-items:center;
          justify-content:center;gap:3px;text-decoration:none;
          padding:6px 2px 4px;position:relative;transition:color .15s;
          -webkit-tap-highlight-color:transparent;
        }
        .mobile-bottom-nav a.active i{color:#88dde1}
        .mobile-bottom-nav a.active span{color:#88dde1;font-weight:700}
        .mobile-bottom-nav a i{font-size:22px;color:#8888AA;line-height:1}
        .mobile-bottom-nav a span{font-size:9.5px;color:#8888AA;font-weight:500;font-family:system-ui,sans-serif}
        .nav-badge{
          position:absolute;top:4px;right:calc(50% - 18px);
          background:#e11d48;color:white;border-radius:99px;
          min-width:16px;height:16px;font-size:9px;font-weight:700;
          display:flex;align-items:center;justify-content:center;
          padding:0 4px;border:1.5px solid white;
        }
      `}</style>

      <div className="mobile-spacer" style={{height:64}} />

      <nav className="mobile-bottom-nav" style={{
        position:"fixed",bottom:0,left:0,right:0,
        background:"white",borderTop:"1px solid rgba(0,0,0,.1)",
        display:"flex",alignItems:"stretch",
        height:64,zIndex:100,
        paddingBottom:"env(safe-area-inset-bottom)",
        boxShadow:"0 -4px 20px rgba(0,0,0,.08)",
      }}>
        {navItems.map(({ href, label, icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          const count = badge ? basketCount : 0
          return (
            <Link key={href} href={href} className={active ? "active" : ""}>
              <i className={`ti ${icon}`} aria-hidden="true" />
              {count > 0 && <span className="nav-badge">{count > 99 ? "99+" : count}</span>}
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
