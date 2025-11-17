"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { updateUser, getTenants } from "@/app/admin/users/action"
import { toast } from "sonner"
import { UserRole, UserStatus } from "@prisma/client"
import { CheckCircle2, XCircle } from "lucide-react"

// ✅ REMOVED emailVerified from schema
const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "LAWFIRMOWNER", "LAWFIRMSTAFF", "ENDUSER"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "PENDING_INVITATION"]).optional(),
  tenantId: z.string().nullable().optional(),
})

type UpdateUserForm = z.infer<typeof updateUserSchema>

interface User {
  id: string
  name: string | null
  email: string | null
  emailVerified: Date | null
  role: UserRole
  status: UserStatus
  tenantId: string | null
}

interface EditUserDialogProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
  })

  const roleValue = watch("role")
  const statusValue = watch("status")
  const tenantIdValue = watch("tenantId")

  useEffect(() => {
    if (open) {
      getTenants().then(setTenants).catch(console.error)
    }
  }, [open])

  useEffect(() => {
    if (user) {
      reset({
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        role: user.role,
        status: user.status,
        tenantId: user.tenantId,
      })
    }
  }, [user, reset])

  const onSubmit = async (data: UpdateUserForm) => {
    setIsLoading(true)
    try {
      await updateUser(data)
      toast.success("User updated successfully")
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to update user")
    } finally {
      setIsLoading(false)
    }
  }

  const showTenantField = roleValue !== "ADMIN"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user information and permissions</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("id")} />

          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={roleValue}
              onValueChange={(value) => setValue("role", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENDUSER">End User (Client)</SelectItem>
                <SelectItem value="LAWFIRMSTAFF">Law Firm Staff</SelectItem>
                <SelectItem value="LAWFIRMOWNER">Law Firm Owner</SelectItem>
                <SelectItem value="ADMIN">Platform Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={statusValue}
              onValueChange={(value) => setValue("status", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
                <SelectItem value="PENDING_INVITATION">Pending Invitation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showTenantField && (
            <div>
              <Label htmlFor="tenantId">Law Firm (Tenant)</Label>
              <Select
                value={tenantIdValue || ""}
                onValueChange={(value) => setValue("tenantId", value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a law firm" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ✅ READ-ONLY Email Verification Display */}
          <div className="rounded-lg border p-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Email Verification</Label>
                <p className="text-xs text-muted-foreground">
                  System-controlled verification status
                </p>
              </div>
              {user.emailVerified ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Verified
                </Badge>
              )}
            </div>
            {user.emailVerified && (
              <p className="text-xs text-muted-foreground mt-2">
                Verified on {new Date(user.emailVerified).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
