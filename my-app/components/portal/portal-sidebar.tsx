"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  Users,
  Settings,
  LayoutDashboard,
  Briefcase,
  FileText,
  PenLine,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PortalSidebarProps {
  user: {
    name?: string | null
    email?: string | null
    role: string
    tenantId?: string | null
  }
}

export function PortalSidebar({ user }: PortalSidebarProps) {
  const pathname = usePathname()

  const navigation = [
    {
      name: "Dashboard",
      href: "/portal",
      icon: LayoutDashboard,
      current: pathname === "/portal",
    },
    {
      name: "Cases",
      href: "/portal/cases",
      icon: Briefcase,
      current: pathname?.startsWith("/portal/cases"),
    },
    {
      name: "Templates",
      href: "/portal/templates",
      icon: FileText,
      current: pathname?.startsWith("/portal/templates"),
      show: ["LAWFIRMOWNER", "LAWFIRMSTAFF"].includes(user.role),
    },
    {
      name: "Documents",
      href: "/portal/documents",
      icon: PenLine,
      current: pathname?.startsWith("/portal/documents"),
      show: ["LAWFIRMOWNER", "LAWFIRMSTAFF"].includes(user.role),
    },
    {
      name: "Users",
      href: "/portal/users",
      icon: Users,
      current: pathname?.startsWith("/portal/users"),
      // roy: Only law firm owners can manage users
      show: user.role === "LAWFIRMOWNER",
    },
    {
      name: "Settings",
      href: "/portal/settings",
      icon: Settings,
      current: pathname?.startsWith("/portal/settings"),
      // roy: Only law firm owners can access settings
      show: user.role === "LAWFIRMOWNER",
    },
  ]

  return (
    <div className="flex flex-col w-64 bg-white border-r">
      <div className="flex items-center h-16 px-6 border-b">
        <Building2 className="h-8 w-8 text-primary" />
        <span className="ml-2 text-xl font-bold">Law Firm Portal</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation
          .filter((item) => item.show !== false)
          .map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                  item.current
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </span>
            </div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
