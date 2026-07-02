import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="flex h-screen bg-bg-surface overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto scrollbar-none">{children}</main>
    </div>
  )
}
