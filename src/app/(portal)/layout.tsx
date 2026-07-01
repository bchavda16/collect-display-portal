import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { BasketDrawer } from "@/components/portal/BasketDrawer";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin/dashboard");

  return (
    <div className="flex h-screen bg-bg-surface overflow-hidden">
      <PortalSidebar user={session.user} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {children}
        </div>
      </main>

      <BasketDrawer />
    </div>
  );
}
