"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, RefreshCw } from "lucide-react"
import { useState } from "react"

export default function CheckEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState("")

  const handleResendEmail = async () => {
    setResending(true)
    setResendMessage("")
    
    try {
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await response.json()

      if (response.ok) {
        setResendMessage("Verification email sent! Check your inbox.")
      } else {
        setResendMessage("" + (data.message || "Failed to resend email."))
      }
    } catch (error) {
      setResendMessage("Something went wrong. Please try again.")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Mail className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          
          <CardDescription className="text-center mt-2">
            We've sent a verification link to
            {email && (
              <span className="block font-medium text-gray-900 mt-1">
                {email}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Next steps:
            </p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Open your email inbox</li>
              <li>Find the email from Legal Fusion</li>
              <li>Click the verification link</li>
              <li>Return here to sign in</li>
            </ol>
          </div>

          {resendMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              resendMessage.includes("✅") 
                ? "bg-green-50 text-green-800 border border-green-200" 
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {resendMessage}
            </div>
          )}

          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder.
            </p>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendEmail}
              disabled={resending || !email}
              className="w-full"
            >
              {resending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-center text-gray-500">
              Already verified?{" "}
              <a href="/auth/signin" className="text-blue-600 hover:underline">
                Sign in here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
