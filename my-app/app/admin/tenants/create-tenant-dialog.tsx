"use client"

import { useState } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createTenant } from "./actions"
import { toast } from "sonner"
import type { SubmitHandler } from "react-hook-form"
import { TENANT_PLAN_OPTIONS, TENANT_PLAN_LABELS, type TenantPlan } from "@/app/admin/tenants/plan-options"

const planEnum = z.enum(TENANT_PLAN_OPTIONS)

const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELED"]),
  plan: planEnum,
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
})

type CreateTenantForm = z.infer<typeof createTenantSchema>

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema), // roy: No generic here
    defaultValues: {
      status: "TRIAL",
      plan: "trial",
      contactEmail: "",
      contactPhone: "",
      website: "",
      address: "",
    },
  })

  const statusValue = watch("status")
  const planValue = (watch("plan") as TenantPlan) || "trial"

  const onSubmit: SubmitHandler<CreateTenantForm> = async (data) => {
    setIsLoading(true)
    try {
      await createTenant(data)
      toast.success("Law firm created successfully")
      setOpen(false)
      reset()
    } catch (error: any) {
      toast.error(error.message || "Failed to create law firm")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Law Firm
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Law Firm</DialogTitle>
          <DialogDescription>
            Add a new law firm (tenant) to Legal Fusion.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Organization Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="slug">Slug (unique)</Label>
            <Input id="slug" {...register("slug")} />
            <p className="text-xs text-muted-foreground mt-1">
              Example: <em>acme-law-firm</em>
            </p>
            {errors.slug && (
              <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={statusValue as "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELED"}
              onValueChange={(value) => setValue("status", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive mt-1">{errors.status.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="plan">Plan</Label>
            <Select
              value={planValue}
              onValueChange={(value) => setValue("plan", value as TenantPlan)}
              disabled={isLoading}
            >
              <SelectTrigger id="plan">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {TENANT_PLAN_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {TENANT_PLAN_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.plan && (
              <p className="text-sm text-destructive mt-1">{errors.plan.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input id="contactEmail" {...register("contactEmail")} />
            {errors.contactEmail && (
              <p className="text-sm text-destructive mt-1">{errors.contactEmail.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input id="contactPhone" {...register("contactPhone")} />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register("website")} />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Law Firm"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
