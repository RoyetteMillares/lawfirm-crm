import { prisma } from "@/lib/prisma"

interface CreateAuditLogParams {
  userId?: string
  tenantId?: string
  action: string // CREATED, UPDATED, DELETED, etc.
  resource: string // User, Case, Template, etc.
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog({
  userId,
  tenantId,
  action,
  resource,
  resourceId,
  metadata,
  ipAddress,
  userAgent,
}: CreateAuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        tenantId,
        action,
        resource,
        resourceId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        ipAddress,
        userAgent,
      },
    })
    console.log(`roy: Audit log created - ${action} ${resource} by ${userId}`)
  } catch (error) {
    console.error("roy: Failed to create audit log", error)
  }
}

export async function getAuditLogs({
  userId,
  tenantId,
  resource,
  limit = 100,
}: {
  userId?: string
  tenantId?: string
  resource?: string
  limit?: number
}) {
  return await prisma.auditLog.findMany({
    where: {
      ...(userId && { userId }),
      ...(tenantId && { tenantId }),
      ...(resource && { resource }),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  })
}
