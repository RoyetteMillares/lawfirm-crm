import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { PortalSidebar } from "@/components/portal/portal-sidebar"
import { PortalHeader } from "@/components/portal/portal-header"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user || (session.user.role !== "LAWFIRMOWNER" && session.user.role !== "LAWFIRMSTAFF")) {
    if (session?.user?.role === "ADMIN") redirect("/admin")
    if (session?.user?.role === "ENDUSER") redirect("/dashboard")
    redirect("/auth/signin")
  }

  // roy: After ADMIN check, TypeScript knows role is one of the other three
  // roy: Law firm users must have a tenant
  if (!session.user.tenantId) {
    redirect("/auth/signin?error=NoTenant")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <PortalSidebar user={session.user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PortalHeader user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
