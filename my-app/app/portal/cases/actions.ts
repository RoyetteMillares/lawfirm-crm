import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Session } from "next-auth"
import type { CaseStatus } from "@prisma/client"

interface CreateCaseArgs {
    title: string;
    description?: string;
    assignedToId?: string;
    status: CaseStatus;  // use enum not string
    ipAddress?: string;
    userAgent?: string;
  }
  
  interface UpdateCaseArgs {
    id: string;
    title?: string;
    description?: string;
    assignedToId?: string;
    status?: CaseStatus; // same here
    ipAddress?: string;
    userAgent?: string;
  }
  
  
  interface DeleteCaseArgs {
    id: string
    ipAddress?: string
    userAgent?: string
  }
  
  interface CreateAuditLogParams {
    session: Session
    tenantId: string
    action: string
    resource: string
    resourceId: string
    metadata?: any
    ipAddress?: string
    userAgent?: string
  }
  
// RBAC check: only allow users with matching tenantId and correct role
function canManageCase(session: Session, tenantId: string) {
  return (
    session?.user?.tenantId === tenantId &&
    ["LAWFIRMOWNER", "LAWFIRMSTAFF"].includes(session.user.role)
  )
}

// Audit log helper
async function logAudit({ session, tenantId, action, resource, resourceId, metadata, ipAddress, userAgent }:CreateAuditLogParams) {
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      tenantId,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress,
      userAgent,
    }
  })
}

// Get all cases for tenant
export async function getCases() {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Unauthorized: missing tenantId")
  
  return prisma.case.findMany({
    where: { tenantId: session.user.tenantId }
  })
}

// Create a new case, restricted by RBAC
export async function createCase({ title, description, assignedToId, status, ipAddress, userAgent }: CreateCaseArgs) {
    const session = await auth()
    if (!session?.user?.tenantId) throw new Error("Unauthorized: missing tenantId")
    const tenantId = session.user.tenantId
    if (!canManageCase(session, tenantId)) throw new Error("Forbidden")
  
    const caseData = {
      title,
      description,
      status,
      tenantId,
      ...(assignedToId ? { assignedToId } : {}),
    }
  
    const newCase = await prisma.case.create({
      data: caseData,
    })
  
    await logAudit({
      session,
      tenantId,
      action: "CREATED",
      resource: "Case",
      resourceId: newCase.id,
      metadata: caseData,
      ipAddress,
      userAgent,
    })
  
    return newCase
  }
  

// Update case (RBAC and tenant ownership enforced)
export async function updateCase({ id, title, description, status, assignedToId, ipAddress, userAgent }: UpdateCaseArgs) {
    const session = await auth()
    if (!session?.user?.tenantId) throw new Error("Unauthorized: missing tenantId")
    const tenantId = session.user.tenantId
    if (!canManageCase(session, tenantId)) throw new Error("Forbidden")
  
    // Verify case belongs to current tenant
    const existing = await prisma.case.findUnique({ where: { id } })
    if (!existing || existing.tenantId !== tenantId) throw new Error("Forbidden: invalid tenant")
  
    // Build caseData only with defined values to avoid Prisma errors
    const caseData: { [key: string]: any } = {}
    if (title !== undefined) caseData.title = title
    if (description !== undefined) caseData.description = description
    if (status !== undefined) caseData.status = status
    if (assignedToId !== undefined) caseData.assignedToId = assignedToId
  
    const updated = await prisma.case.update({
      where: { id },
      data: caseData,
    })
  
    await logAudit({
      session,
      tenantId,
      action: "UPDATED",
      resource: "Case",
      resourceId: id,
      metadata: caseData,
      ipAddress,
      userAgent,
    })
  
    return updated
  }
  

// Delete (soft-delete recommended, here for demo)
export async function deleteCase({ id, ipAddress, userAgent }:DeleteCaseArgs) {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Unauthorized: missing tenantId")
  const tenantId = session.user.tenantId
  if (!canManageCase(session, tenantId)) throw new Error("Forbidden")

  const existing = await prisma.case.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenantId) throw new Error("Forbidden: invalid tenant")

  // Soft-delete: set status = DELETED
  const result = await prisma.case.update({
    where: { id },
    data: { status: "DELETED" }
  })

  await logAudit({
    session,
    tenantId,
    action: "DELETED",
    resource: "Case",
    resourceId: id,
    metadata: {},
    ipAddress,
    userAgent,
  })

  return result
}
