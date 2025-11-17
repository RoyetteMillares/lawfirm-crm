"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Settings } from "lucide-react"
import { signOut } from "next-auth/react"
import Link from "next/link"

interface PortalHeaderProps {
  user: {
    name?: string | null
    email?: string | null
    role: string
  }
}

export function PortalHeader({ user }: PortalHeaderProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/signin" })
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "LAWFIRMOWNER":
        return "Law Firm Owner"
      case "LAWFIRMSTAFF":
        return "Law Firm Staff"
      case "ENDUSER":
        return "Client"
      default:
        return role
    }
  }

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name || "User"}!</h1>
        <p className="text-sm text-muted-foreground">
          Role: {getRoleLabel(user.role)}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user.role === "LAWFIRMOWNER" && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/portal/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
