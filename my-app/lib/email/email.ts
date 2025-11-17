import { getPrimaryProvider, getBackupProvider } from '@/lib/email/providers'

interface SendVerificationEmailParams {
  email: string
  token: string
  name?: string
}

/**
 * Send verification email with automatic failover
 * Primary: Uses EMAIL_PROVIDER from .env (resend or ses)
 * Backup: Automatically tries alternate provider if primary fails
 */
export async function sendVerificationEmail({
  email,
  token,
  name
}: SendVerificationEmailParams) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`
  
  const emailParams = {
    to: email,
    subject: 'Verify your Legal Fusion account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Legal Fusion</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome${name ? `, ${name}` : ''}!</h2>
            
            <p style="font-size: 16px; color: #4b5563;">
              Thank you for signing up for Legal Fusion. To complete your registration and access all features, please verify your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 14px; color: #667eea; word-break: break-all;">
              ${verificationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              This verification link will expire in 24 hours. If you didn't create an account with Legal Fusion, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `
  }

  // Try primary provider roy
  console.log(`📧 Attempting to send email via primary provider...`)
  const primaryProvider = getPrimaryProvider()
  const primaryResult = await primaryProvider.send(emailParams)

  if (primaryResult.success) {
    return { success: true, provider: primaryProvider.name }
  }

  // If primary fails and failover is enabled, try backup
  console.warn(`Primary provider (${primaryProvider.name}) failed, trying backup...`)
  const backupProvider = getBackupProvider()

  if (!backupProvider) {
    console.error(`No backup provider available roy`)
    return { 
      success: false, 
      error: `Failed to send via ${primaryProvider.name} and no backup provider configured` 
    }
  }

  console.log(`Attempting to send email via backup provider (${backupProvider.name})...`)
  const backupResult = await backupProvider.send(emailParams)

  if (backupResult.success) {
    console.log(`Email sent successfully via backup provider (${backupProvider.name})`)
    return { success: true, provider: backupProvider.name, usedBackup: true }
  }

  // Both providers failed roy
  console.error(`Both primary and backup providers failed`)
  return { 
    success: false, 
    error: `Failed to send via both ${primaryProvider.name} and ${backupProvider.name}` 
  }
}
