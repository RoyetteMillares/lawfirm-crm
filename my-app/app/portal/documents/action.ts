"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { revalidatePath } from "next/cache"
import Handlebars from "handlebars"
import { generatePdf } from "@/lib/pdf-generator"
import { uploadToStorage } from "@/lib/storage"
import { encryptSensitiveData } from "@/lib/encryption"
import type { DocumentTemplate } from "@prisma/client"

/**
 * Get tenant context from NextAuth session
 */
async function getTenantIdFromSession(): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) throw new Error("No tenant context")
  return session.user.tenantId
}

/**
 * Extract required fields from Handlebars template
 * Example: "Hello {{name}}, case {{caseId}}" → ["name", "caseId"]
 */
function extractHandlebarFields(template: string): string[] {
  const regex = /{{#?\s*(\w+)/g
  const fields = new Set<string>()
  let match
  while ((match = regex.exec(template)) !== null) {
    fields.add(match[1])
  }
  return Array.from(fields)
}

/**
 * Create a new document template
 */
export async function createDocumentTemplate(input: {
  name: string
  category: string
  htmlContent: string
  fieldMappings: Record<string, string> // { clientName: "case.client.name" }
  signatureFields?: Array<{
    id: string
    name: string
    label: string
    x: number
    y: number
    width: number
    height: number
  }>
}): Promise<{ templateId: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) throw new Error("Not authenticated")

    const tenantId = await getTenantIdFromSession()

    // Extract required fields from template
    const requiredFields = extractHandlebarFields(input.htmlContent)

    // Validate all required fields have mappings
    const missingMappings = requiredFields.filter((f) => !input.fieldMappings[f])
    if (missingMappings.length > 0) {
      throw new Error(
        `Missing field mappings for: ${missingMappings.join(", ")}`
      )
    }

    // Create slug from name
    const slug = input.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")

    const template = await prisma.documentTemplate.create({
      data: {
        tenantId,
        name: input.name,
        slug,
        category: input.category,
        htmlContent: input.htmlContent,
        requiredFields: requiredFields,
        fieldMappings: input.fieldMappings,
        signatureFields: input.signatureFields || [],
        createdBy: session.user.id,
      },
      select: { id: true },
    })

    // Log creation for audit
    await prisma.documentAuditLog.create({
      data: {
        tenantId,
        documentId: "", // Not tied to specific document; it's template audit
        action: "TEMPLATE_CREATED",
        actionDetails: JSON.stringify({
          templateId: template.id,
          name: input.name,
          category: input.category,
          requiredFields,
        }),
        userId: session.user.id,
        userEmail: session.user.email || "unknown",
      },
    })

    console.log("roy: template created", template.id)
    revalidatePath("/portal/documents/templates")

    return { templateId: template.id }
  } catch (error) {
    console.error("roy: createDocumentTemplate error:", error)
    throw new Error(
      error instanceof Error ? error.message : "Failed to create template"
    )
  }
}

/**
 * Render a document from template with case data
 */
export async function renderDocument(input: {
  templateId: string
  caseId: string
  recipientEmail: string
  recipientName?: string
  recipientType: "client" | "third_party" | "opposing_counsel" | "witness"
}): Promise<{ documentId: string; pdfUrl: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) throw new Error("Not authenticated")

    const tenantId = await getTenantIdFromSession()

    // Fetch template
    const template = await prisma.documentTemplate.findFirst({
      where: { id: input.templateId, tenantId },
    })
    if (!template) throw new Error("Template not found")

    // Fetch case with related data
    const caseData = await prisma.case.findFirst({
      where: { id: input.caseId, tenantId },
      include: {
        assignedTo: true,
        tenant: true,
      },
    })
    if (!caseData) throw new Error("Case not found")

    // Build context object from field mappings
    const context = buildContext(caseData, template.fieldMappings as Record<string, string>)

    // Compile Handlebars template
    const handlebars = Handlebars.create()
    const compiled = handlebars.compile(template.htmlContent)

    // Render HTML
    let renderedHtml: string
    try {
      renderedHtml = compiled(context)
    } catch (err) {
      console.error("roy: handlebars render error:", err)
      throw new Error("Failed to render template with case data")
    }

    // Generate PDF (async)
    const pdfBuffer = await generatePdf({
      html: renderedHtml,
      signatureFields: template.signatureFields as any,
    })

    // Upload to storage
    const storagePath = `documents/${tenantId}/${input.caseId}/${Date.now()}.pdf`
    const pdfUrl = await uploadToStorage(storagePath, pdfBuffer)

    // Encrypt sensitive substituted values
    const encryptedValues = await encryptSensitiveData(context)

    // Create document record
    const document = await prisma.document.create({
      data: {
        tenantId,
        templateId: input.templateId,
        caseId: input.caseId,
        title: `${template.name} - ${caseData.title}`,
        status: "rendered",
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName,
        recipientType: input.recipientType,
        renderedHtml: renderedHtml,
        pdfUrl: pdfUrl,
        pdfStoragePath: storagePath,
        substitutedValues: encryptedValues,
        createdBy: session.user.id,
      },
      select: { id: true, pdfUrl: true },
    })

    // Log rendering for audit
    await prisma.documentAuditLog.create({
      data: {
        tenantId,
        documentId: document.id,
        action: "DOCUMENT_RENDERED",
        actionDetails: JSON.stringify({
          templateId: input.templateId,
          caseId: input.caseId,
          recipientEmail: input.recipientEmail,
          fieldsSubstituted: Object.keys(context),
        }),
        userId: session.user.id,
        userEmail: session.user.email || "unknown",
        newValues: {
          status: "rendered",
          pdfUrl: pdfUrl,
        },
      },
    })

    console.log("roy: document rendered", document.id)
    revalidatePath(`/portal/cases/${input.caseId}`)

    return { documentId: document.id, pdfUrl: document.pdfUrl || "" }
  } catch (error) {
    console.error("roy: renderDocument error:", error)
    throw new Error(
      error instanceof Error ? error.message : "Failed to render document"
    )
  }
}

/**
 * Build context object from case data using field mappings
 * Maps: { clientName: "case.client.name" } → actual values
 */
function buildContext(
  caseData: any,
  fieldMappings: Record<string, string>
): Record<string, any> {
  const context: Record<string, any> = {}

  for (const [templateVar, dataPath] of Object.entries(fieldMappings)) {
    try {
      // Simple path traversal: "case.client.name" → caseData.client.name
      const parts = dataPath.split(".")
      let value: any = caseData
      for (const part of parts) {
        value = value?.[part]
      }
      context[templateVar] = value || ""
    } catch (err) {
      console.warn(`roy: failed to resolve ${dataPath}`, err)
      context[templateVar] = ""
    }
  }

  return context
}

/**
 * Mark document as sent
 */
export async function markDocumentSent(
  documentId: string,
  sentVia: string
): Promise<void> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) throw new Error("Not authenticated")

    const tenantId = await getTenantIdFromSession()

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "sent",
        sentAt: new Date(),
        sentBy: session.user.id,
        sentVia: sentVia,
      },
    })

    // Audit log
    await prisma.documentAuditLog.create({
      data: {
        tenantId,
        documentId,
        action: "DOCUMENT_SENT",
        actionDetails: JSON.stringify({ sentVia }),
        userId: session.user.id,
        userEmail: session.user.email || "unknown",
        newValues: { status: "sent", sentVia },
      },
    })

    console.log("roy: document marked sent", documentId)
  } catch (error) {
    console.error("roy: markDocumentSent error:", error)
    throw error
  }
}

/**
 * Record document signature
 */
export async function recordDocumentSignature(
  documentId: string,
  signedBy: string,
  signatureUrl?: string
): Promise<void> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) throw new Error("Not authenticated")

    const tenantId = await getTenantIdFromSession()

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "signed",
        signedAt: new Date(),
        signedBy: signedBy,
        signatureUrl: signatureUrl,
      },
    })

    // Audit log
    await prisma.documentAuditLog.create({
      data: {
        tenantId,
        documentId,
        action: "DOCUMENT_SIGNED",
        actionDetails: JSON.stringify({ signedBy }),
        userId: session.user.id,
        userEmail: session.user.email || "unknown",
        newValues: { status: "signed", signedAt: new Date() },
      },
    })

    console.log("roy: document signature recorded", documentId)
  } catch (error) {
    console.error("roy: recordDocumentSignature error:", error)
    throw error
  }
}
