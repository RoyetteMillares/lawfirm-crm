import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email/email"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 400 }
      )
    }

    // Delete any existing verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: email }
    })

    // Generate new verification token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Store new token in database
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })

    console.log(`✅ New verification token created for ${email}`)

    // Send verification email
    const emailResult = await sendVerificationEmail({
      email,
      token,
      name: user.name || undefined
    })

    if (!emailResult.success) {
      // Clean up token if email fails
      await prisma.verificationToken.deleteMany({
        where: { identifier: email }
      })
      
      console.error(`❌ Failed to resend verification email`)
      
      return NextResponse.json(
        { message: "Failed to send verification email. Please try again later." },
        { status: 500 }
      )
    }

    console.log(`✅ Verification email resent to ${email}`)

    return NextResponse.json(
      { 
        message: "Verification email sent successfully!",
        emailProvider: emailResult.provider
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
