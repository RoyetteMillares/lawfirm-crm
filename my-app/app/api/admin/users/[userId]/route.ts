import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET USER DETAILS
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            plan: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // PERMISSION CHECK
    if (session.user.role !== "ADMIN") {
      if (session.user.role === "LAWFIRMOWNER") {
        if (user.tenantId !== session.user.tenantId) {
          return NextResponse.json(
            { message: "Forbidden - You can only view users in your law firm" },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { message: "Forbidden - Insufficient permissions" },
          { status: 403 }
        )
      }
    }

    // Remove sensitive data
    const { passwordHash, ...sanitizedUser } = user

    return NextResponse.json({ user: sanitizedUser })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// UPDATE USER (Role, Tenant, Status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { role, tenantId, status } = await req.json()
    const targetUserId = params.userId

    // PERMISSION CHECKS
    if (session.user.role === "ADMIN") {
      // ✅ Platform Admin can do anything
    }
    else if (session.user.role === "LAWFIRMOWNER") {
      // Check if target user is in same tenant
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { tenantId: true }
      })

      if (!targetUser) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        )
      }

      if (targetUser.tenantId !== session.user.tenantId) {
        return NextResponse.json(
          { message: "Forbidden - You can only manage users in your law firm" },
          { status: 403 }
        )
      }

      // Law firm owner cannot create ADMIN or other LAWFIRMOWNERs
      if (role === "ADMIN" || role === "LAWFIRMOWNER") {
        return NextResponse.json(
          { message: "Forbidden - You cannot assign admin or owner roles" },
          { status: 403 }
        )
      }
    }
    else {
      return NextResponse.json(
        { message: "Forbidden - Insufficient permissions" },
        { status: 403 }
      )
    }

    // Build update data dynamically
    const updateData: any = {}
    if (role !== undefined) updateData.role = role
    if (tenantId !== undefined) updateData.tenantId = tenantId
    if (status !== undefined) updateData.status = status

    // Validate role enum
    if (role && !['ADMIN', 'LAWFIRMOWNER', 'LAWFIRMSTAFF', 'ENDUSER'].includes(role)) {
      return NextResponse.json(
        { message: "Invalid role" },
        { status: 400 }
      )
    }

    // Validate status enum
    if (status && !['ACTIVE', 'DISABLED', 'PENDING_INVITATION'].includes(status)) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      )
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    console.log(`✅ User updated: ${updatedUser.email} by ${session.user.email}`)

    // ✅ CREATE AUDIT LOG (matches your schema exactly!)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,          // String? nullable
        tenantId: session.user.tenantId,  // String? nullable
        action: "UPDATED",                 // String
        resource: "User",                  //String
        resourceId: targetUserId,          //String?
        metadata: {                        //Json?
          changes: { role, tenantId, status },
          updatedBy: session.user.email,
          updatedAt: new Date().toISOString()
        },
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent")
      }
    })

    // Remove sensitive data
    const { passwordHash, ...sanitizedUser } = updatedUser

    return NextResponse.json({
      message: "User updated successfully",
      user: sanitizedUser
    })
  } catch (error: any) {
    console.error("Update user error:", error)
    
    // Handle Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { message: "Invalid tenant ID" },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
