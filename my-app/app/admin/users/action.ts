"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { createAuditLog } from "@/lib/audit"
import { UserRole, UserStatus } from "@prisma/client"

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "LAWFIRMOWNER", "LAWFIRMSTAFF", "ENDUSER"]),
  tenantId: z.string().optional(), // Optional for ADMIN users
})

const updateUserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "LAWFIRMOWNER", "LAWFIRMSTAFF", "ENDUSER"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "PENDING_INVITATION"]).optional(),
  tenantId: z.string().nullable().optional(),
})

export async function getUsers({
  page = 1,
  pageSize = 10,
  search = "",
  role,
  status,
}: {
  page?: number
  pageSize?: number
  search?: string
  role?: UserRole
  status?: UserStatus
}) {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }

  const skip = (page - 1) * pageSize

  const where = {
    AND: [
      search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
      role ? { role } : {},
      status ? { status } : {},
    ],
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        status: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
      skip,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function createUser(data: z.infer<typeof createUserSchema>) {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }

  const validatedData = createUserSchema.parse(data)

  const existingUser = await prisma.user.findUnique({
    where: { email: validatedData.email },
  })

  if (existingUser) {
    throw new Error("Email already exists")
  }

  // ✅ ADMIN users should have tenantId = null
  // ✅ Other users must have a tenantId
  if (validatedData.role !== "ADMIN" && !validatedData.tenantId) {
    throw new Error("Non-admin users must be assigned to a tenant")
  }

  const passwordHash = await bcrypt.hash(validatedData.password, 10)

  const newUser = await prisma.user.create({
    data: {
      name: validatedData.name,
      email: validatedData.email,
      passwordHash,
      role: validatedData.role,
      tenantId: validatedData.role === "ADMIN" ? null : validatedData.tenantId,
      status: "ACTIVE",
      emailVerified: new Date(), 
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
    },
  })

  // Audit log using your schema
  await createAuditLog({
    userId: session.user.id,
    tenantId: newUser.tenantId || undefined,
    action: "CREATED",
    resource: "User",
    resourceId: newUser.id,
    metadata: {
      email: newUser.email,
      role: newUser.role,
    },
  })

  console.log(`roy: User created - ${newUser.email} by admin ${session.user.email}`)

  revalidatePath("/admin/users")

  return { success: true, user: newUser }
}

export async function updateUser(data: z.infer<typeof updateUserSchema>) {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }

  const validatedData = updateUserSchema.parse(data)

  const { id, ...updateData } = validatedData

  if (updateData.email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: updateData.email,
        NOT: { id },
      },
    })

    if (existingUser) {
      throw new Error("Email already exists")
    }
  }

  //If changing to ADMIN, clear tenantId
  if (updateData.role === "ADMIN") {
    updateData.tenantId = null
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...updateData,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      tenantId: true,
      emailVerified: true,
    },
  })

  await createAuditLog({
    userId: session.user.id,
    tenantId: updatedUser.tenantId || undefined,
    action: "UPDATED",
    resource: "User",
    resourceId: updatedUser.id,
    metadata: updateData,
  })

  console.log(`roy: User updated - ${updatedUser.email} by admin ${session.user.email}`)

  revalidatePath("/admin/users")

  return { success: true, user: updatedUser }
}

export async function deleteUser(userId: string) {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }

  if (userId === session.user.id) {
    throw new Error("Cannot delete your own account")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, tenantId: true },
  })

  if (!user) {
    throw new Error("User not found")
  }

  await prisma.user.delete({
    where: { id: userId },
  })

  await createAuditLog({
    userId: session.user.id,
    tenantId: user.tenantId || undefined,
    action: "DELETED",
    resource: "User",
    resourceId: userId,
    metadata: {
      email: user.email,
      role: user.role,
    },
  })

  console.log(`roy: User deleted - ${user.email} by admin ${session.user.email}`)

  revalidatePath("/admin/users")

  return { success: true }
}

// ✅ NEW: Get all tenants for dropdown
export async function getTenants() {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }

  return await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    },
    orderBy: {
      name: "asc",
    },
  })
}
