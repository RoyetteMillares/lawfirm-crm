import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Public routes - allow without auth
  const publicRoutes = ["/", "/auth/signin", "/auth/signup", "/auth/verify-email", "/auth/check-email"]
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Require authentication for all other routes
  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  const role = session.user.role

  // ====================
  // ADMIN ROUTES (/admin/*)
  // ====================
  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      // Non-admins trying to access /admin → send to their correct home
      if (role === "LAWFIRMOWNER" || role === "LAWFIRMSTAFF") {
        return NextResponse.redirect(new URL("/portal", request.url))
      }
      if (role === "ENDUSER") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }
    // ADMIN users: allow
    return NextResponse.next()
  }

  // ====================
  // PORTAL ROUTES (/portal/*)
  // Law Firm Owners and Staff ONLY
  // ====================
  if (pathname.startsWith("/portal")) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    if (role === "ENDUSER") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    // LAWFIRMOWNER and LAWFIRMSTAFF: allow
    return NextResponse.next()
  }

  // ====================
  // DASHBOARD ROUTES (/dashboard/*)
  // End Users (Clients) ONLY
  // ====================
  if (pathname.startsWith("/dashboard")) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    if (role === "LAWFIRMOWNER" || role === "LAWFIRMSTAFF") {
      return NextResponse.redirect(new URL("/portal", request.url))
    }
    // ENDUSER: allow
    return NextResponse.next()
  }

  // ====================
  // LEGACY/SHARED ROUTES (e.g., /team, /cases)
  // Route based on role
  // ====================
  if (pathname.startsWith("/team") || pathname.startsWith("/cases")) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    if (role === "LAWFIRMOWNER" || role === "LAWFIRMSTAFF") {
      return NextResponse.redirect(new URL("/portal", request.url))
    }
    if (role === "ENDUSER") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
