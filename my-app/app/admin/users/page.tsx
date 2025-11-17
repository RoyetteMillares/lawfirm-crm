import { Suspense } from "react"
import { getUsers } from "@/app/admin/users/action"
import { UserTable } from "@/app/admin/users/user-table"
import { CreateUserDialog } from "./create-user-dialog"
import { Skeleton } from "@/components/ui/skeleton"

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    role?: string
    status?: string
  }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.search || ""
  const role = params.role as any
  const status = params.status as any

  const { users, pagination } = await getUsers({ 
    page, 
    search, 
    role,
    status 
  })

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions for Legal Fusion
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <UserTable users={users} pagination={pagination} />
      </Suspense>
    </div>
  )
}
