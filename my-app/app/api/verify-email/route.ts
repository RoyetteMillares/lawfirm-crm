import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { message: "Missing verification token" },
      { status: 400 }
    )
  }

  try {
    console.log(`🔍 Verifying token: ${token.substring(0, 10)}...`)

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    })

    if (!verificationToken) {
      console.error(`Token not found`)
      return NextResponse.json(
        { message: "Invalid verification token" },
        { status: 400 }
      )
    }

    // Check if token expired
    if (verificationToken.expires < new Date()) {
      console.error(`Token expired`)
      
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: { token }
      })
      
      return NextResponse.json(
        { message: "Verification token expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier }
    })

    if (!user) {
      console.error(`User not found`)
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Check if already verified
    if (user.emailVerified) {
      console.log(`Email already verified`)
      await prisma.verificationToken.delete({
        where: { token }
      })
      return NextResponse.json(
        { 
          message: "Email already verified",
          verified: true 
        },
        { status: 200 }
      )
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() }
    })

    // Delete used token
    await prisma.verificationToken.delete({
      where: { token }
    })

    console.log(`✅ Email verified successfully for ${user.email}`)

    return NextResponse.json(
      { 
        message: "Email verified successfully!",
        verified: true 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
