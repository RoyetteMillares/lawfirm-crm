import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Redirect admin to admin panel
  if (session.user.role === "ADMIN") {
    redirect("/admin")
  }

  // Redirect end users to portal
  if (session.user.role === "ENDUSER") {
    redirect("/portal")
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r">
        <div className="p-6">
          <h2 className="text-xl font-bold">Law Firm</h2>
          <nav className="mt-6 space-y-2">
            <a href="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-100">
              Dashboard
            </a>
            <a href="/dashboard/team" className="block px-4 py-2 rounded hover:bg-gray-100">
              Team
            </a>
            <a href="/dashboard/cases" className="block px-4 py-2 rounded hover:bg-gray-100">
              Cases
            </a>
            <a href="/dashboard/templates" className="block px-4 py-2 rounded hover:bg-gray-100">
              Templates
            </a>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
