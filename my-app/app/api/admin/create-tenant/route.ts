import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { TENANT_PLAN_OPTIONS, type TenantPlan } from "@/app/admin/tenants/plan-options"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can create tenants
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    const { name, slug, contactEmail, contactPhone, website, plan } = await req.json()

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { message: "Name and slug are required" },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug }
    })

    if (existingTenant) {
      return NextResponse.json(
        { message: "A law firm with this slug already exists" },
        { status: 400 }
      )
    }

    const normalizePlan = (value: unknown): TenantPlan => {
      if (typeof value === "string") {
        const lower = value.toLowerCase() as TenantPlan
        if ((TENANT_PLAN_OPTIONS as readonly string[]).includes(lower)) {
          return lower
        }
      }
      return "trial"
    }

    const safePlan = normalizePlan(plan)

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: slug.toLowerCase(),
        contactEmail,
        contactPhone,
        website,
        plan: safePlan,
        status: "TRIAL"
      }
    })

    console.log(`✅ Tenant created: ${tenant.name} by ${session.user.email}`)

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: tenant.id,
        action: "CREATED",
        resource: "Tenant",
        resourceId: tenant.id,
        metadata: {
          name: tenant.name,
          slug: tenant.slug,
          createdBy: session.user.email
        },
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent")
      }
    })

    return NextResponse.json(
      {
        message: "Law firm created successfully",
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          plan: tenant.plan
        }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Create tenant error:", error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { message: "Slug already exists" },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
