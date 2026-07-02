import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { PortalSidebar } from "@/components/portal/PortalSidebar"
import { BasketDrawer } from "@/components/portal/BasketDrawer"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role === "ADMIN") redirect("/admin/dashboard")

  return (
    <div className="portal-layout">
      <PortalSidebar />
      <main className="portal-main">{children}</main>
      <BasketDrawer />
    </div>
  )
}
