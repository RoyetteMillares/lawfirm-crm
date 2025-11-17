"use client"

import { useState } from "react"
import { updateTenantUser, deleteTenantUser } from "@/app/portal/users/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { UserRole, UserStatus } from "@prisma/client"

// roy: Define the User type based on what getTenantUsers returns
interface TenantUser {
    id: string
    name: string | null
    email: string | null  // roy: Changed from 'string' to 'string | null' to match Prisma
    role: UserRole
    status: UserStatus
    createdAt: Date
    emailVerified: Date | null
  }

interface UserTableProps {
  users: TenantUser[]
}

export function UserTable({ users }: UserTableProps) {
  const [editId, setEditId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this team member?")) {
      try {
        await deleteTenantUser(id)
        toast.success("User deleted successfully")
      } catch (error: any) {
        toast.error(error.message || "Failed to delete user")
      }
    }
  }

  const getStatusBadgeVariant = (status: UserStatus) => {
    switch (status) {
      case "ACTIVE":
        return "default"
      case "DISABLED":
        return "destructive"
      case "PENDING_INVITATION":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "LAWFIRMOWNER":
        return "Law Firm Owner"
      case "LAWFIRMSTAFF":
        return "Law Firm Staff"
      case "ENDUSER":
        return "End User"
      default:
        return role
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No team members found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name || "—"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getRoleLabel(user.role)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(user.status)}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEditId(user.id)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive" 
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
