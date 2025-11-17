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
  DialogTrigger,
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
import { Plus } from "lucide-react"
import { createUser, getTenants } from "@/app/admin/users/action"
import { toast } from "sonner"

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "LAWFIRMOWNER", "LAWFIRMSTAFF", "ENDUSER"]),
  tenantId: z.string().optional(),
})

type CreateUserForm = z.infer<typeof createUserSchema>

export function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: "ENDUSER",
    },
  })

  const roleValue = watch("role")
  const tenantIdValue = watch("tenantId")

  //Load tenants when dialog opens
  useEffect(() => {
    if (open) {
      getTenants().then(setTenants).catch(console.error)
    }
  }, [open])

  const onSubmit = async (data: CreateUserForm) => {
    setIsLoading(true)
    try {
      await createUser(data)
      toast.success("User created successfully")
      setOpen(false)
      reset()
    } catch (error: any) {
      toast.error(error.message || "Failed to create user")
    } finally {
      setIsLoading(false)
    }
  }

  //Show tenant field only for non-ADMIN roles
  const showTenantField = roleValue !== "ADMIN"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to Legal Fusion. User will be automatically verified.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={roleValue}
              onValueChange={(value) => setValue("role", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENDUSER">End User (Client)</SelectItem>
                <SelectItem value="LAWFIRMSTAFF">Law Firm Staff</SelectItem>
                <SelectItem value="LAWFIRMOWNER">Law Firm Owner</SelectItem>
                <SelectItem value="ADMIN">Platform Admin</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive mt-1">{errors.role.message}</p>
            )}
          </div>

          {/*Show tenant selector for non-ADMIN users */}
          {showTenantField && (
            <div>
              <Label htmlFor="tenantId">Law Firm (Tenant)</Label>
              <Select
                value={tenantIdValue}
                onValueChange={(value) => setValue("tenantId", value)}
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
              {errors.tenantId && (
                <p className="text-sm text-destructive mt-1">{errors.tenantId.message}</p>
              )}
            </div>
          )}

          {roleValue === "ADMIN" && (
            <p className="text-sm text-muted-foreground">
              Platform admins are not assigned to any specific law firm.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
