
export interface EmailProvider {
    name: string
    send(params: {
      to: string
      subject: string
      html: string
      from?: string
    }): Promise<{ success: boolean; error?: any; data?: any }>
  }
  
  // Documentation: https://resend.com/docs/send-with-nodejs
  import { Resend } from 'resend'
  
  export class ResendProvider implements EmailProvider {
    name = 'Resend'
    private resend: Resend
  
    constructor(apiKey: string) {
      if (!apiKey) {
        throw new Error('Resend API key is required')
      }
      this.resend = new Resend(apiKey)
    }
  
    async send({ to, subject, html, from }: any) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: from || process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to: [to], // Resend expects array roy
          subject,
          html
        })
        
        if (error) {
          console.error(`[Resend] Error:`, error)
          return { 
            success: false, 
            error: error 
          }
        }
  
        console.log(`[Resend] Email sent to ${to}, ID: ${data?.id}`)
        return { 
          success: true, 
          data: data 
        }
      } catch (error: any) {
        console.error(`[Resend] Failed to send email:`, error.message)
        return { 
          success: false, 
          error: error.message || error 
        }
      }
    }
  }
  
  // Documentation: https://docs.aws.amazon.com/ses/latest/dg/send-an-email-using-sdk-programmatically.html
  
  import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
  
  export class SESProvider implements EmailProvider {
    name = 'Amazon SES'
    private sesClient: SESClient
  
    constructor() {
      const region = process.env.AWS_REGION
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  
      if (!region || !accessKeyId || !secretAccessKey) {
        throw new Error('AWS SES credentials (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are required')
      }

      this.sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      })
    }
  
    async send({ to, subject, html, from }: any) {
      try {
        const params = {
          Source: from || process.env.AWS_SES_FROM_EMAIL || process.env.EMAIL_FROM!,
          Destination: {
            ToAddresses: [to]
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8'
            },
            Body: {
              Html: {
                Data: html,
                Charset: 'UTF-8'
              }
            }
          }
        }
  
        const command = new SendEmailCommand(params)
        const response = await this.sesClient.send(command)
        
        console.log(`[Amazon SES] Email sent to ${to}, MessageId: ${response.MessageId}`)
        return { 
          success: true, 
          data: { messageId: response.MessageId } 
        }
      } catch (error: any) {
        console.error(`[Amazon SES] Failed to send email:`, error.message)
        return { 
          success: false, 
          error: error.message || error 
        }
      }
    }
  }
  
  // IF PROVIDER FACTORY WITH FAILOVER ROY

  export function getPrimaryProvider(): EmailProvider {
    const provider = process.env.EMAIL_PROVIDER || 'resend'
  
    try {
      switch (provider.toLowerCase()) {
        case 'resend':
          if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY environment variable is required')
          }
          return new ResendProvider(process.env.RESEND_API_KEY)
        
        case 'ses':
          return new SESProvider()
        
        default:
          console.warn(`Unknown email provider: ${provider}, falling back to Resend`)
          return new ResendProvider(process.env.RESEND_API_KEY!)
      }
    } catch (error: any) {
      console.error(`Failed to initialize ${provider} provider roy:`, error.message)
      throw error
    }
  }
  
  export function getBackupProvider(): EmailProvider | null {
    const primaryProvider = process.env.EMAIL_PROVIDER || 'resend'
    const failoverEnabled = process.env.EMAIL_FAILOVER_ENABLED === 'true'
  
    if (!failoverEnabled) {
      return null
    }
  
    try {
      // If primary is Resend, backup is SES
      if (primaryProvider.toLowerCase() === 'resend') {
        return new SESProvider()
      }
      // If primary is SES, backup is Resend
      else if (primaryProvider.toLowerCase() === 'ses') {
        if (!process.env.RESEND_API_KEY) {
          console.warn('Backup provider (Resend) not configured roy')
          return null
        }
        return new ResendProvider(process.env.RESEND_API_KEY)
      }
    } catch (error: any) {
      console.warn(`Failed to initialize backup provider roy:`, error.message)
      return null
    }
  
    return null
  }
  