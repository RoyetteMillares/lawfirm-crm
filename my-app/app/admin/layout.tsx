import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminSignOutButton } from "@/components/admin/sign-out-button"
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Only ADMIN role can access
  if (!session?.user || session.user.role !== "ADMIN") {
    // If not ADMIN, redirect to correct home for their role
    if (session?.user?.role === "LAWFIRMOWNER" || session?.user?.role === "LAWFIRMSTAFF") redirect("/portal")
    if (session?.user?.role === "ENDUSER") redirect("/dashboard")
    redirect("/auth/signin")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r">
        <div className="p-6">
          <h2 className="text-xl font-bold">Platform Admin</h2>
          <nav className="mt-6 space-y-2">
            <a href="/admin" className="block px-4 py-2 rounded hover:bg-gray-100">
              Dashboard
            </a>
            <a href="/admin/users" className="block px-4 py-2 rounded hover:bg-gray-100">
              Users
            </a>
            <a href="/admin/tenants" className="block px-4 py-2 rounded hover:bg-gray-100">
              Law Firms
            </a>
          </nav>
        </div>
        <div className="px-6 pb-6">
          <AdminSignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
