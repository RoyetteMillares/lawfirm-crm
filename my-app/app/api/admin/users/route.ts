import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    let users

    // Platform Admin sees ALL users
    if (session.user.role === "ADMIN") {
      users = await prisma.user.findMany({
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }
    // Law Firm Owner sees only users in their tenant
    else if (session.user.role === "LAWFIRMOWNER") {
      if (!session.user.tenantId) {
        return NextResponse.json(
          { message: "No tenant assigned" },
          { status: 400 }
        )
      }

      users = await prisma.user.findMany({
        where: {
          tenantId: session.user.tenantId
        },
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }
    // Others cannot list users
    else {
      return NextResponse.json(
        { message: "Forbidden - Insufficient permissions" },
        { status: 403 }
      )
    }

    // Remove sensitive data from all users
    const sanitizedUsers = users.map(user => {
      const { passwordHash, ...sanitized } = user
      return sanitized
    })

    return NextResponse.json({ users: sanitizedUsers })
  } catch (error) {
    console.error("List users error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
