import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex h-screen bg-bg-surface overflow-hidden">
      <AdminSidebar user={session.user} />
      <main className="flex-1 overflow-y-auto scrollbar-none">
        {children}
      </main>
    </div>
  );
}
