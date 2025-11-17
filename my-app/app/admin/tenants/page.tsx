import { Suspense } from "react"
import { getTenants } from "@/app/admin/tenants/actions"
import { TenantTable } from "@/app/admin/tenants/tenant-table"
import { CreateTenantDialog } from "@/app/admin/tenants/create-tenant-dialog"
import { Skeleton } from "@/components/ui/skeleton"

// roy: Accept query params for search, status, pagination
interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
  }>
}

export default async function AdminTenantsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ""
  const status = params.status as any

  const { tenants, pagination } = await getTenants({ page, search, status })

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Law Firm Management</h1>
          <p className="text-muted-foreground">
            Manage law firms (tenants) on the Legal Fusion platform
          </p>
        </div>
        <CreateTenantDialog />
      </div>
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <TenantTable tenants={tenants} pagination={pagination} />
      </Suspense>
    </div>
  )
}
