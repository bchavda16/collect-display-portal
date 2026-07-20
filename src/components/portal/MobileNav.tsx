"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

const navItems = [
  { href: "/dashboard", label: "Home", icon: "⊞" },
  { href: "/stock", label: "Stock", icon: "📦" },
  { href: "/offers", label: "Offers", icon: "💬" },
  { href: "/orders", label: "Orders", icon: "📋" },
  { href: "/checkout", label: "Basket", icon: "🛒", badge: true },
  { href: "/account", label: "Account", icon: "👤" },
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
      {/* Spacer so content isn't hidden behind nav */}
      <div style={{height:64,display:"block"}} className="mobile-spacer" />

      <nav style={{
        position:"fixed",bottom:0,left:0,right:0,
        background:"white",
        borderTop:"1px solid rgba(0,0,0,.1)",
        display:"flex",alignItems:"center",
        height:64,zIndex:100,
        paddingBottom:"env(safe-area-inset-bottom)",
        boxShadow:"0 -4px 20px rgba(0,0,0,.08)",
      }} className="mobile-bottom-nav">
        {navItems.map(({ href, label, icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          const count = badge ? basketCount : 0
          return (
            <Link key={href} href={href} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",gap:3,textDecoration:"none",
              color:active?"#1a9da3":"#8888AA",
              padding:"6px 2px",position:"relative",
              transition:"color .15s",
            }}>
              <span style={{fontSize:20,lineHeight:1}}>{icon}</span>
              <span style={{fontSize:9.5,fontWeight:active?700:500,letterSpacing:".02em"}}>{label}</span>
              {count > 0 && (
                <span style={{
                  position:"absolute",top:4,right:"50%",transform:"translateX(10px)",
                  background:"#e11d48",color:"white",
                  borderRadius:99,minWidth:16,height:16,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:9,fontWeight:700,padding:"0 4px",
                  border:"1.5px solid white",
                }}>{count}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <style>{`
        .mobile-bottom-nav { display: none !important; }
        .mobile-spacer { display: none !important; }
        @media (max-width: 768px) {
          .mobile-bottom-nav { display: flex !important; }
          .mobile-spacer { display: block !important; }
        }
      `}</style>
    </>
  )
}
