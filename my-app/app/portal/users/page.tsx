import { getTenantUsers } from "@/app/portal/users/actions"
import { UserTable } from "@/app/portal/users/user-table"
import { InviteUserDialog } from "@/app/portal/users/invite-user-dialog"

// roy: Type the page props properly for Next.js app router
interface TenantUsersPageProps {
  searchParams: Promise<{
    search?: string
  }>
}

export default async function TenantUsersPage({ searchParams }: TenantUsersPageProps) {
  const params = await searchParams
  const search = params.search || ""
  const users = await getTenantUsers({ search })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Team Members</h2>
          <p className="text-muted-foreground">Manage staff and invite new users</p>
        </div>
        <InviteUserDialog />
      </div>
      <UserTable users={users} />
    </div>
  )
}
