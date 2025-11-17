import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Only ENDUSER can access portal
  if (session.user.role !== "ENDUSER") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Legal Fusion Portal</h1>
          <div className="flex items-center gap-4">
            <span>{session.user.name}</span>
            <a href="/api/auth/signout" className="text-sm text-gray-600 hover:text-gray-900">
              Sign Out
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
