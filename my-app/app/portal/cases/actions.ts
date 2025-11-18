"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { CaseStatus, CaseUser } from "@/types/case"

interface TenantContext {
  tenantId: string
  userId: string
}

async function requireTenantContext(): Promise<TenantContext> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  if (!session.user.tenantId) {
    throw new Error("No tenant context in session")
  }

  const tenantId = session.user.tenantId

  // Optional: ensure tenant still exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  })

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`)
  }

  return {
    tenantId,
    userId: session.user.id,
  }
}

/**
 * Fetch team members (LAWFIRMSTAFF role only)
 */
export async function fetchTeamMembers(): Promise<CaseUser[]> {
  try {
    const { tenantId } = await requireTenantContext()

    const teamMembers = await prisma.user.findMany({
      where: {
        tenantId,
        role: {
          in: ["LAWFIRMOWNER", "LAWFIRMSTAFF"],
        },
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: { name: "asc" },
    })

    const mapped: CaseUser[] = teamMembers.map((u) => ({
      id: u.id,
      email: u.email || "",
      fullName: u.name || "Unknown",
      role: u.role === "LAWFIRMOWNER" ? "owner" : "staff",
    }))

    console.log("roy: fetched", mapped.length, "team members")
    return mapped
  } catch (error) {
    console.error("roy: fetchTeamMembers error:", error)
    throw new Error(
      error instanceof Error ? error.message : "Failed to fetch team members"
    )
  }
}

/**
 * Retrieve all cases for the current tenant
 */
export async function getCases() {
  const { tenantId } = await requireTenantContext()

  const cases = await prisma.case.findMany({
    where: { tenantId },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return cases
}

/**
 * Create a case with assignment and audit log
 */
export async function createCase(input: {
  title: string
  description?: string
  status: CaseStatus
  assignedTo: string
}): Promise<{ caseId: string }> {
  try {
    const { tenantId, userId } = await requireTenantContext()

    // Validate assignedTo user
    const assignedUser = await prisma.user.findFirst({
      where: {
        id: input.assignedTo,
        tenantId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!assignedUser) {
      throw new Error("Team member not found in your organization")
    }

    // Status is already UPPERCASE
    const prismaStatus: CaseStatus = input.status

    // Create case
    const caseRecord = await prisma.case.create({
      data: {
        title: input.title,
        description: input.description || "",
        status: prismaStatus,
        assignedToId: input.assignedTo,
        tenantId,
      },
      select: { id: true, title: true },
    })

    // Log audit entry (non-blocking)
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          tenantId,
          action: "CREATED_CASE",
          resource: "Case",
          resourceId: caseRecord.id,
          metadata: {
            message: `Case "${caseRecord.title}" created and assigned to ${assignedUser.email}`,
            newValues: {
              title: input.title,
              status: input.status,
              assignedTo: assignedUser.email,
            },
          },
        },
      })
    } catch (auditError) {
      console.error("roy: auditLog creation failed (non-blocking):", auditError)
    }

    console.log("roy: case created", caseRecord.id)
    revalidatePath("/portal/cases")

    return { caseId: caseRecord.id }
  } catch (error) {
    console.error("roy: createCase error:", error)
    throw new Error(
      error instanceof Error ? error.message : "Failed to create case"
    )
  }
}

/**
 * Update an existing case
 */
export async function updateCase(
  caseId: string,
  updates: Partial<{
    title: string
    description: string
    status: CaseStatus
    assignedTo: string | null
  }>
): Promise<void> {
  try {
    const { tenantId, userId } = await requireTenantContext()

    // Fetch existing case
    const existingCase = await prisma.case.findFirst({
      where: { id: caseId, tenantId },
      select: {
        title: true,
        description: true,
        status: true,
        assignedToId: true,
      },
    })

    if (!existingCase) {
      throw new Error("Case not found")
    }

    const updateData: any = {}
    if (updates.title) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.status) updateData.status = updates.status
    if (updates.assignedTo !== undefined) {
      updateData.assignedToId = updates.assignedTo || null
    }

    // Update case
    await prisma.case.update({
      where: { id: caseId },
      data: updateData,
    })

    // Log audit entry
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          tenantId,
          action: "UPDATED_CASE",
          resource: "Case",
          resourceId: caseId,
          metadata: {
            message: `Case "${existingCase.title}" updated`,
            oldValues: {
              title: existingCase.title,
              status: existingCase.status,
            },
            newValues: updates,
          },
        },
      })
    } catch (auditError) {
      console.error("roy: auditLog update failed (non-blocking):", auditError)
    }

    console.log("roy: case updated", caseId)
    revalidatePath("/portal/cases")
  } catch (error) {
    console.error("roy: updateCase error:", error)
    throw new Error(
      error instanceof Error ? error.message : "Failed to update case"
    )
  }
}
