import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email/email"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user (NOT verified yet)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: null  // wit for verification roy 
      }
    })

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Store token in database
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours ROY haha time limit
      }
    })

    // Send verification email (with automatic failover)
    const emailResult = await sendVerificationEmail({
      email,
      token,
      name
    })

    if (!emailResult.success) {
      // Rollback user creation if email fails
      await prisma.user.delete({ where: { id: user.id } })
      await prisma.verificationToken.deleteMany({ where: { identifier: email } })
      
      return NextResponse.json(
        { message: "Failed to send verification email. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        message: "Account created! Please check your email to verify your account.",
        userId: user.id,
        emailProvider: emailResult.provider
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Sign up error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
