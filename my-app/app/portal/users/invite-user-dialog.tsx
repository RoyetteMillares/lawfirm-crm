"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { inviteTenantUser } from "@/app/portal/users/actions"
import { UserRole } from "@prisma/client"
import { toast } from "sonner"

export function InviteUserDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<UserRole>("LAWFIRMSTAFF") // roy: Type as UserRole, not string
  const [loading, setLoading] = useState(false)

  const handleInvite = async () => {
    if (!name || !email) {
      toast.error("Name and email are required")
      return
    }

    setLoading(true)
    try {
      await inviteTenantUser({ name, email, role })
      toast.success("User invited successfully")
      setOpen(false)
      setName("")
      setEmail("")
      setRole("LAWFIRMSTAFF")
    } catch (error: any) {
      toast.error(error.message || "Failed to invite user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Invite User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite New Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name"
              placeholder="John Doe" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email"
              type="email"
              placeholder="john@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LAWFIRMSTAFF">Law Firm Staff</SelectItem>
                <SelectItem value="ENDUSER">End User (Client)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={loading}>
              {loading ? "Inviting..." : "Invite User"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
