import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Public routes
  const publicRoutes = ["/", "/auth/signin", "/auth/signup", "/auth/verify-email", "/auth/check-email"]
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Require authentication
  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  const role = session.user.role

  // Platform admin routes
  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // Law firm routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/team") || pathname.startsWith("/cases")) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    if (role === "ENDUSER") {
      return NextResponse.redirect(new URL("/portal", request.url))
    }
  }

  // Portal routes
  if (pathname.startsWith("/portal")) {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    if (role === "LAWFIRMOWNER" || role === "LAWFIRMSTAFF") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
