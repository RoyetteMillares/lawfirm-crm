import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import DocumentTemplateBuilder from "@/components/document-template-builder"
import {
  createDocumentTemplate,
  generateTemplatePreviewPdf,
  previewTemplateById,
} from "@/app/portal/documents/action"
import { TemplateDraftInput } from "@/lib/document-template-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TemplateCard } from "@/components/portal/template-card"

type TemplateListItem = {
  id: string
  slug: string
  name: string
  category: string
  isPublished: boolean
  updatedAt: Date
}

async function getTemplates(tenantId: string): Promise<TemplateListItem[]> {
  const client = (prisma as any).documentTemplate
  const results = await client.findMany({
    where: { tenantId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      isPublished: true,
      updatedAt: true,
    },
  })
  return results as TemplateListItem[]
}

export default async function TemplatesPage() {
  const session = await auth()

  if (!session?.user?.tenantId || !["LAWFIRMOWNER", "LAWFIRMSTAFF"].includes(session.user.role)) {
    return (
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You need to be part of a law firm to manage document templates.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const templates = await getTemplates(session.user.tenantId)

  async function handleCreateTemplate(payload: TemplateDraftInput) {
    "use server"
    await createDocumentTemplate(payload)
  }

  async function handlePreviewPdf(payload: TemplateDraftInput) {
    "use server"
    return generateTemplatePreviewPdf(payload)
  }

  async function handleTemplateCardPreview(templateId: string) {
    "use server"
    return previewTemplateById(templateId)
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create document template</CardTitle>
          <CardDescription>
            Use placeholders like <code>{"{{clientName}}"}</code> to auto-fill case data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentTemplateBuilder onCreate={handleCreateTemplate} onPreviewPdf={handlePreviewPdf} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Existing templates</h2>
            <p className="text-sm text-muted-foreground">
              Manage and reuse templates across your firm.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/portal/cases">Back to cases</Link>
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              No templates yet. Use the builder above to create your first document template.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={{
                  id: template.id,
                  slug: template.slug,
                  name: template.name,
                  category: template.category,
                  isPublished: template.isPublished,
                  updatedAt: template.updatedAt,
                }}
                onPreview={handleTemplateCardPreview}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

