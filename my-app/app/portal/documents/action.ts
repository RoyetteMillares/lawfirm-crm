"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import Handlebars from "handlebars"
import { generatePdf } from "@/lib/pdf-generator"
import { uploadToStorage } from "@/lib/storage"
import { encryptSensitiveData } from "@/lib/encryption"
import {
  resolveTemplateContext,
  SAMPLE_TEMPLATE_SOURCE,
  TemplateDraftInput,
  SignatureField,
} from "@/lib/document-template-utils"

const db = prisma as unknown as {
  documentTemplate: any
  document: any
  documentAuditLog: any
}
interface UserContext {
  tenantId: string
  userId: string
  userEmail: string
  role: string
}

async function requireUserContext(): Promise<UserContext> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  if (!session.user.tenantId) {
    throw new Error("No tenant context")
  }

  return {
    tenantId: session.user.tenantId,
    userId: session.user.id,
    userEmail: session.user.email ?? "unknown",
    role: session.user.role,
  }
}

function ensureLawFirmAuthor(sessionRole: string) {
  if (!["LAWFIRMOWNER", "LAWFIRMSTAFF"].includes(sessionRole)) {
    throw new Error("Only law firm owners or staff can manage templates")
  }
}

/**
 * Extract required fields from Handlebars template
 * Example: "Hello {{name}}, case {{caseId}}" → ["name", "caseId"]
 */
function extractHandlebarFields(template: string): string[] {
  const regex = /{{#?\s*([A-Za-z0-9_]+)/g
  const reserved = new Set(["if", "each", "with", "unless", "else"])
  const fields = new Set<string>()
  let match
  while ((match = regex.exec(template)) !== null) {
    const token = match[1]
    if (!reserved.has(token)) {
      fields.add(token)
    }
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
    const context = await requireUserContext()
    ensureLawFirmAuthor(context.role)

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

    // Ensure slug uniqueness within tenant
    const existingTemplate = await db.documentTemplate.findUnique({
      where: {
        tenantId_slug: {
          tenantId: context.tenantId,
          slug,
        },
      },
    })

    if (existingTemplate) {
      throw new Error(`Template with slug "${slug}" already exists`)
    }

    const template = await db.documentTemplate.create({
      data: {
        tenantId: context.tenantId,
        name: input.name,
        slug,
        category: input.category,
        htmlContent: input.htmlContent,
        requiredFields,
        fieldMappings: input.fieldMappings,
        signatureFields: input.signatureFields || [],
        createdBy: context.userId,
      },
      select: { id: true },
    })

    // Log creation in global audit log
    await prisma.auditLog.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        action: "TEMPLATE_CREATED",
        resource: "DocumentTemplate",
        resourceId: template.id,
        metadata: {
          slug,
          name: input.name,
          category: input.category,
          requiredFields,
          note: `Template "${input.name}" created`,
        },
      },
    })

    console.log("roy: template created", template.id)
    revalidatePath("/portal/templates")

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
    const context = await requireUserContext()
    ensureLawFirmAuthor(context.role)

    // Fetch template
    const template = await db.documentTemplate.findFirst({
      where: { id: input.templateId, tenantId: context.tenantId },
    })
    if (!template) throw new Error("Template not found")

    // Fetch case with related data
    const caseData = await prisma.case.findFirst({
      where: { id: input.caseId, tenantId: context.tenantId },
      include: {
        assignedTo: true,
        tenant: true,
        // Add additional relations (clients, contacts) here as schema grows
      },
    })
    if (!caseData) throw new Error("Case not found")

    // Build context object from field mappings
    const populatedContext = resolveTemplateContext(template.fieldMappings as Record<string, string>, {
      ...caseData,
      case: caseData,
      assignedUser: caseData.assignedTo,
    })

    // Compile Handlebars template
    const handlebars = Handlebars.create()
    const compiled = handlebars.compile(template.htmlContent)

    // Render HTML
    let renderedHtml: string
    try {
      renderedHtml = compiled(populatedContext)
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
    const storagePath = `documents/${context.tenantId}/${input.caseId}/${Date.now()}.pdf`
    const pdfUrl = await uploadToStorage(storagePath, pdfBuffer)

    // Encrypt sensitive substituted values
    const encryptedValues = await encryptSensitiveData(populatedContext)

    // Create document record
    const document = await db.document.create({
      data: {
        tenantId: context.tenantId,
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
        createdBy: context.userId,
        sentBy: context.userId,
      },
      select: { id: true, pdfUrl: true },
    })

    // Log rendering for audit
    await db.documentAuditLog.create({
      data: {
        tenantId: context.tenantId,
        documentId: document.id,
        action: "DOCUMENT_RENDERED",
        actionDetails: JSON.stringify({
          templateId: input.templateId,
          caseId: input.caseId,
          recipientEmail: input.recipientEmail,
          fieldsSubstituted: Object.keys(populatedContext),
        }),
        userId: context.userId,
        userEmail: context.userEmail,
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
  sourceData: Record<string, any>,
  fieldMappings: Record<string, string>
): Record<string, any> {
  const context: Record<string, any> = {}

  for (const [templateVar, dataPath] of Object.entries(fieldMappings)) {
    try {
      const parts = dataPath.split(".")
      let value: any = sourceData
      for (const part of parts) {
        if (value === null || value === undefined) break
        value = value[part]
      }
      context[templateVar] = value ?? ""
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
    const context = await requireUserContext()
    ensureLawFirmAuthor(context.role)

    await db.document.update({
      where: { id: documentId },
      data: {
        status: "sent",
        sentAt: new Date(),
        sentBy: context.userId,
        sentVia: sentVia,
      },
    })

    // Audit log
    await db.documentAuditLog.create({
      data: {
        tenantId: context.tenantId,
        documentId,
        action: "DOCUMENT_SENT",
        actionDetails: JSON.stringify({ sentVia }),
        userId: context.userId,
        userEmail: context.userEmail,
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
    const context = await requireUserContext()

    await db.document.update({
      where: { id: documentId },
      data: {
        status: "signed",
        signedAt: new Date(),
        signedBy: signedBy,
        signatureUrl: signatureUrl,
      },
    })

    // Audit log
    await db.documentAuditLog.create({
      data: {
        tenantId: context.tenantId,
        documentId,
        action: "DOCUMENT_SIGNED",
        actionDetails: JSON.stringify({ signedBy }),
        userId: context.userId,
        userEmail: context.userEmail,
        newValues: { status: "signed", signedAt: new Date() },
      },
    })

    console.log("roy: document signature recorded", documentId)
  } catch (error) {
    console.error("roy: recordDocumentSignature error:", error)
    throw error
  }
}

export async function generateTemplatePreviewPdf(
  draft: TemplateDraftInput
): Promise<string> {
  const context = resolveTemplateContext(draft.fieldMappings, SAMPLE_TEMPLATE_SOURCE)
  const handlebars = Handlebars.create()
  const compiled = handlebars.compile(draft.htmlContent || "<p>(empty template)</p>")
  const renderedHtml = compiled(context)
  const pdfBuffer = await generatePdf({
    html: renderedHtml,
    signatureFields: draft.signatureFields,
  })
  return Buffer.from(pdfBuffer).toString("base64")
}

export async function previewTemplateById(templateId: string): Promise<string> {
  const context = await requireUserContext()
  ensureLawFirmAuthor(context.role)

  const template = await prisma.documentTemplate.findUnique({
    where: {
      tenantId_slug: {
        tenantId: context.tenantId,
        slug: templateId,
      },
    },
  })

  const record =
    template ??
    (await prisma.documentTemplate.findFirst({
      where: { id: templateId, tenantId: context.tenantId },
    }))

  if (!record) {
    throw new Error("Template not found")
  }

  return generateTemplatePreviewPdf({
    name: record.name,
    category: record.category,
    htmlContent: record.htmlContent,
    fieldMappings: record.fieldMappings as Record<string, string>,
    signatureFields: record.signatureFields as unknown as SignatureField[] | undefined,
  })
}
