"use client"

import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function AdminSignOutButton() {
  return (
    <Button
      justify="start"
      variant="ghost"
      className="w-full flex items-center gap-2 mt-4 text-left"
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  )
}
