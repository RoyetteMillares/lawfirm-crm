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
import { updateTenant } from "./actions"
import { toast } from "sonner"
import { TENANT_PLAN_OPTIONS, TENANT_PLAN_LABELS, type TenantPlan } from "@/app/admin/tenants/plan-options"

const planEnum = z.enum(TENANT_PLAN_OPTIONS)

const updateTenantSchema = z.object({
    id: z.string(),
    name: z.string().min(2).optional(),
    slug: z
        .string()
        .min(2)
        .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
        .optional(),
    status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELED"]).optional(),
    plan: planEnum.optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    contactPhone: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
    address: z.string().optional(),
})

type UpdateTenantForm = z.infer<typeof updateTenantSchema>

interface Tenant {
    id: string
    name: string
    slug: string
    status: string
    plan: TenantPlan
    contactEmail: string | null
    contactPhone: string | null
    website: string | null
    address: string | null
}

interface EditTenantDialogProps {
    tenant: Tenant
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditTenantDialog({ tenant, open, onOpenChange }: EditTenantDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        watch,
        formState: { errors },
    } = useForm<UpdateTenantForm>({
        resolver: zodResolver(updateTenantSchema),
    })

    const statusValue = watch("status")
    const planValue = watch("plan") as TenantPlan | undefined

    useEffect(() => {
        if (tenant) {
            reset({
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                status: tenant.status as "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELED",
                plan: tenant.plan,
                contactEmail: tenant.contactEmail || "",
                contactPhone: tenant.contactPhone || "",
                website: tenant.website || "",
                address: tenant.address || "",
            })
        }
    }, [tenant, reset])

    const onSubmit = async (data: UpdateTenantForm) => {
        setIsLoading(true)
        try {
            await updateTenant(data)
            toast.success("Law firm updated successfully")
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "Failed to update law firm")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Law Firm</DialogTitle>
                    <DialogDescription>
                        Update law firm (tenant) details.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <input type="hidden" {...register("id")} />

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
                        {errors.slug && (
                            <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={statusValue as "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELED" | undefined}
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
                            value={(planValue || tenant.plan) as TenantPlan}
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
