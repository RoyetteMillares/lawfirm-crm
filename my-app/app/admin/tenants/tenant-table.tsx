"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal } from "lucide-react"
import { EditTenantDialog } from "@/app/admin/tenants/edit-tenant-dialog"
import { deleteTenant } from "@/app/admin/tenants/actions"
import { toast } from "sonner"
import { TENANT_PLAN_LABELS, type TenantPlan } from "@/app/admin/tenants/plan-options"

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
  createdAt: Date
  updatedAt: Date
  _count: {
    users: number
  }
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface TenantTableProps {
  tenants: Tenant[]
  pagination: Pagination
}

export function TenantTable({ tenants, pagination }: TenantTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set("search", value)
    } else {
      params.delete("search")
    }
    params.set("page", "1")
    router.push(`/admin/tenants?${params.toString()}`)
  }

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status && status !== "all") {
      params.set("status", status)
    } else {
      params.delete("status")
    }
    params.set("page", "1")
    router.push(`/admin/tenants?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(newPage))
    router.push(`/admin/tenants?${params.toString()}`)
  }

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (tenantId: string) => {
    if (!confirm("Are you sure you want to delete this law firm?")) return

    try {
      await deleteTenant(tenantId)
      toast.success("Law firm deleted successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete law firm")
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "TRIAL":
        return "secondary"
      case "ACTIVE":
        return "default"
      case "SUSPENDED":
        return "destructive"
      case "CANCELED":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search law firms..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select
          defaultValue={searchParams.get("status") || "all"}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="CANCELED">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No law firms found
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.slug}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(tenant.status)}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{TENANT_PLAN_LABELS[tenant.plan] ?? tenant.plan}</TableCell>
                  <TableCell>{tenant._count.users}</TableCell>
                  <TableCell>
                    {tenant.contactEmail ? (
                      <a
                        className="text-primary underline"
                        href={`mailto:${tenant.contactEmail}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tenant.contactEmail}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {tenant.website ? (
                      <a
                        className="text-primary underline"
                        href={tenant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {tenant.website}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                          Edit law firm
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(tenant.id)}
                          className="text-destructive"
                        >
                          Delete law firm
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
          {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
          {pagination.total} law firms
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {selectedTenant && (
        <EditTenantDialog
          tenant={selectedTenant}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  )
}
