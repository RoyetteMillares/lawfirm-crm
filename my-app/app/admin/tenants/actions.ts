"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAuditLog } from "@/lib/audit"
import { TenantStatus } from "@prisma/client"
import { TENANT_PLAN_OPTIONS, type TenantPlan } from "./plan-options"

// roy: Helper function to extract IP and User-Agent from request headers
async function getRequestMetadata() {
  const headersList = await headers()
  
  // roy: Extract IP address (handles proxies, load balancers, and CDNs)
  const ipAddress = 
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    headersList.get("cf-connecting-ip") || // Cloudflare
    headersList.get("true-client-ip") ||   // Cloudflare Enterprise
    "unknown"
  
  // roy: Extract User-Agent
  const userAgent = headersList.get("user-agent") || "unknown"
  
  return { ipAddress, userAgent }
}

// roy: Validation schema for creating tenants
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

// roy: Validation schema for updating tenants
const updateTenantSchema = z.object({
  id: z.string().cuid(),
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

// roy: Get all tenants with pagination and search
export async function getTenants({
  page = 1,
  pageSize = 10,
  search = "",
  status,
}: {
  page?: number
  pageSize?: number
  search?: string
  status?: TenantStatus
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
              { name: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
              { contactEmail: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
      status ? { status } : {},
    ],
  }

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        plan: true,
        contactEmail: true,
        contactPhone: true,
        website: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      skip,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.tenant.count({ where }),
  ])

  return {
    tenants,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// roy: Create new tenant
export async function createTenant(data: z.infer<typeof createTenantSchema>) {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }

  const validatedData = createTenantSchema.parse(data)

  // roy: Check if slug already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: validatedData.slug },
  })

  if (existingTenant) {
    throw new Error("Slug already exists")
  }

  const newTenant = await prisma.tenant.create({
    data: {
      name: validatedData.name,
      slug: validatedData.slug,
      status: validatedData.status,
      plan: validatedData.plan,
      contactEmail: validatedData.contactEmail || null,
      contactPhone: validatedData.contactPhone || null,
      website: validatedData.website || null,
      address: validatedData.address || null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
    },
  })

  // roy: Get request metadata (IP + User-Agent)
  const { ipAddress, userAgent } = await getRequestMetadata()

  // roy: Create audit log with IP and User-Agent
  await createAuditLog({
    userId: session.user.id,
    tenantId: newTenant.id,
    action: "CREATED",
    resource: "Tenant",
    resourceId: newTenant.id,
    metadata: {
      name: newTenant.name,
      slug: newTenant.slug,
      status: newTenant.status,
    },
    ipAddress,
    userAgent,
  })

  console.log(`roy: Tenant created - ${newTenant.name} by admin ${session.user.email} from ${ipAddress}`)

  revalidatePath("/admin/tenants")

  return { success: true, tenant: newTenant }
}

// roy: Update tenant
export async function updateTenant(data: z.infer<typeof updateTenantSchema>) {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }

  const validatedData = updateTenantSchema.parse(data)

  const { id, ...updateData } = validatedData

  // roy: Check if slug is being changed and if it's already taken
  if (updateData.slug) {
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        slug: updateData.slug,
        NOT: { id },
      },
    })

    if (existingTenant) {
      throw new Error("Slug already exists")
    }
  }

  const updatedTenant = await prisma.tenant.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      contactEmail: true,
    },
  })

  // roy: Get request metadata (IP + User-Agent)
  const { ipAddress, userAgent } = await getRequestMetadata()

  // roy: Create audit log with IP and User-Agent
  await createAuditLog({
    userId: session.user.id,
    tenantId: updatedTenant.id,
    action: "UPDATED",
    resource: "Tenant",
    resourceId: updatedTenant.id,
    metadata: updateData,
    ipAddress,
    userAgent,
  })

  console.log(`roy: Tenant updated - ${updatedTenant.name} by admin ${session.user.email} from ${ipAddress}`)

  revalidatePath("/admin/tenants")

  return { success: true, tenant: updatedTenant }
}

// roy: Delete tenant
export async function deleteTenant(tenantId: string) {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }

  // roy: Check if tenant has users
  const userCount = await prisma.user.count({
    where: { tenantId },
  })

  if (userCount > 0) {
    throw new Error(
      `Cannot delete tenant with ${userCount} user(s). Remove all users first.`
    )
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true },
  })

  if (!tenant) {
    throw new Error("Tenant not found")
  }

  await prisma.tenant.delete({
    where: { id: tenantId },
  })

  // roy: Get request metadata (IP + User-Agent)
  const { ipAddress, userAgent } = await getRequestMetadata()

  // roy: Create audit log with IP and User-Agent
  await createAuditLog({
    userId: session.user.id,
    action: "DELETED",
    resource: "Tenant",
    resourceId: tenantId,
    metadata: {
      name: tenant.name,
      slug: tenant.slug,
    },
    ipAddress,
    userAgent,
  })

  console.log(`roy: Tenant deleted - ${tenant.name} by admin ${session.user.email} from ${ipAddress}`)

  revalidatePath("/admin/tenants")

  return { success: true }
}
