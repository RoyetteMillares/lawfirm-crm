"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAuditLog } from "@/lib/audit"
import { UserRole, UserStatus } from "@prisma/client"

// roy: Form schema for updates
const updateUserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["LAWFIRMOWNER", "LAWFIRMSTAFF", "ENDUSER"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "PENDING_INVITATION"]).optional(),
})

// roy: Tenant-scoped user query
export async function getTenantUsers({ search = "" }: { search?: string }) {
  const session = await auth()
  if (!session || !session.user.tenantId || session.user.role !== "LAWFIRMOWNER") {
    throw new Error("Unauthorized")
  }

  const users = await prisma.user.findMany({
    where: {
      tenantId: session.user.tenantId,
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      emailVerified: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return users
}

// roy: Only LAWFIRMOWNER can update users in their tenant
export async function updateTenantUser(data: z.infer<typeof updateUserSchema>) {
  const session = await auth()
  if (!session || !session.user.tenantId || session.user.role !== "LAWFIRMOWNER") {
    throw new Error("Unauthorized")
  }
  const updateData = updateUserSchema.parse(data)
  const { id, ...fields } = updateData

  const user = await prisma.user.findUnique({
    where: { id },
    select: { tenantId: true },
  })

  if (!user || user.tenantId !== session.user.tenantId) {
    throw new Error("Cannot manage users outside your firm")
  }

  // Prevent demoting other LAWFIRMOWNERs, add logic if you allow multiple
  if (fields.role && fields.role !== "ENDUSER" && session.user.id === id)
    throw new Error("You cannot demote yourself")

  const updated = await prisma.user.update({
    where: { id },
    data: fields,
    select: { id: true, name: true, email: true, role: true, status: true },
  })

  await createAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "UPDATED",
    resource: "User",
    resourceId: id,
    metadata: fields,
  })

  revalidatePath("/portal/users")
  return updated
}

// roy: Only LAWFIRMOWNER can invite/create (email/password or invite-token)
export async function inviteTenantUser({ name, email, role }: { name: string; email: string; role: UserRole }) {
  const session = await auth()
  if (!session || !session.user.tenantId || session.user.role !== "LAWFIRMOWNER") {
    throw new Error("Unauthorized")
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      status: "PENDING_INVITATION",
      tenantId: session.user.tenantId,
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  })

  // TODO: Send invite email (integrate later)
  await createAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "CREATED",
    resource: "User",
    resourceId: user.id,
    metadata: { name, email, role },
  })

  revalidatePath("/portal/users")
  return user
}

// roy: Delete user
export async function deleteTenantUser(id: string) {
  const session = await auth()
  if (!session || !session.user.tenantId || session.user.role !== "LAWFIRMOWNER") {
    throw new Error("Unauthorized")
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { tenantId: true },
  })

  if (!user || user.tenantId !== session.user.tenantId) {
    throw new Error("Cannot delete users outside your firm")
  }

  await prisma.user.delete({ where: { id } })

  await createAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "DELETED",
    resource: "User",
    resourceId: id,
    metadata: {},
  })

  revalidatePath("/portal/users")
  return { success: true }
}
