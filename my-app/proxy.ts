import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export function getRoleHomeRoute(role?: string): string {
  if (role === "ADMIN") return "/admin"
  if (role === "LAWFIRMOWNER" || role === "LAWFIRMSTAFF") return "/portal"
  if (role === "ENDUSER") return "/dashboard"
  return "/auth/signin"
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes - allow without auth
  const publicRoutes = ["/", "/auth/signin", "/auth/signup", "/auth/verify-email", "/auth/check-email"]
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Get session safely
  let session
  try {
    session = await auth()
  } catch (error) {
    console.error("roy: auth() failed in middleware:", error)
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Require authentication for all other routes
  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  const role = session.user.role

  if (!role) {
    console.warn("roy: Session missing role, redirecting to signin")
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // ====================
  // ADMIN ROUTES (/admin/*)
  // ====================
  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      const homeRoute = getRoleHomeRoute(role)
      console.log(`roy: ${role} attempted /admin access, redirecting to ${homeRoute}`)
      return NextResponse.redirect(new URL(homeRoute, request.url))
    }
    return NextResponse.next()
  }

  // ====================
  // PORTAL ROUTES (/portal/*)
  // ====================
  if (pathname.startsWith("/portal")) {
    if (!["LAWFIRMOWNER", "LAWFIRMSTAFF"].includes(role)) {
      const homeRoute = getRoleHomeRoute(role)
      console.log(`roy: ${role} attempted /portal access, redirecting to ${homeRoute}`)
      return NextResponse.redirect(new URL(homeRoute, request.url))
    }
    return NextResponse.next()
  }

  // ====================
  // DASHBOARD ROUTES (/dashboard/*)
  // ====================
  if (pathname.startsWith("/dashboard")) {
    if (role !== "ENDUSER") {
      const homeRoute = getRoleHomeRoute(role)
      console.log(`roy: ${role} attempted /dashboard access, redirecting to ${homeRoute}`)
      return NextResponse.redirect(new URL(homeRoute, request.url))
    }
    return NextResponse.next()
  }

  // ====================
  // LEGACY/SHARED ROUTES
  // ====================
  if (pathname.startsWith("/team") || pathname.startsWith("/cases")) {
    const homeRoute = getRoleHomeRoute(role)
    return NextResponse.redirect(new URL(homeRoute, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
