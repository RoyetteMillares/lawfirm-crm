"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TemplateDraftInput,
  SignatureField,
  SAMPLE_TEMPLATE_SOURCE,
  resolveTemplateContext,
} from "@/lib/document-template-utils"

interface DocumentTemplateBuilderProps {
  onCreate: (payload: TemplateDraftInput) => Promise<void>
  onPreviewPdf: (payload: TemplateDraftInput) => Promise<string>
}

export default function DocumentTemplateBuilder({
  onCreate,
  onPreviewPdf,
}: DocumentTemplateBuilderProps) {
  const [isPending, startTransition] = useTransition()
  const [isPdfPreviewPending, startPdfPreview] = useTransition()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("agreement")
  const [htmlContent, setHtmlContent] = useState("")
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([])

  const handleAddSignatureField = () => {
    const field: SignatureField = {
      id: `sig-${Date.now()}`,
      name: `signature_${signatureFields.length + 1}`,
      label: "Signer",
      x: 50,
      y: 600 + signatureFields.length * 120,
      width: 160,
      height: 32,
    }
    setSignatureFields((prev) => [...prev, field])
  }

  const fieldMappings = useMemo(() => {
    const regex = /{{\s*([A-Za-z0-9_]+)\s*}}/g
    const fields = new Set<string>()
    let match
    while ((match = regex.exec(htmlContent)) !== null) {
      fields.add(match[1])
    }
    const mappings: Record<string, string> = {}
    fields.forEach((field) => {
      mappings[field] = `case.${field}`
    })
    return mappings
  }, [htmlContent])

  const previewHtml = useMemo(() => {
    const context = resolveTemplateContext(fieldMappings, SAMPLE_TEMPLATE_SOURCE)
    return htmlContent.replace(/{{\s*([A-Za-z0-9_]+)\s*}}/g, (_, key: string) => {
      return context[key] ?? `{{${key}}}`
    })
  }, [htmlContent, fieldMappings])

  const buildPayload = (): TemplateDraftInput => ({
    name: name.trim() || "Untitled template",
    category,
    htmlContent,
    fieldMappings,
    signatureFields: signatureFields.length ? signatureFields : undefined,
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim() || !htmlContent.trim()) {
      toast.error("Template name and content are required")
      return
    }

    startTransition(async () => {
      try {
        await onCreate(buildPayload())

        toast.success("Template created")
        setName("")
        setHtmlContent("")
        setSignatureFields([])
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save template"
        toast.error(message)
      }
    })
  }

  const handlePreviewPdfClick = () => {
    if (!htmlContent.trim()) {
      toast.error("Add template content before generating a preview")
      return
    }

    startPdfPreview(async () => {
      try {
        const base64 = await onPreviewPdf(buildPayload())
        const byteCharacters = atob(base64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        window.open(url, "_blank", "noopener")
        toast.success("Sample PDF opened in a new tab")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate preview"
        toast.error(message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="template-name">Template name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Retainer Agreement"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-category">Category</Label>
          <select
            id="template-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            disabled={isPending}
          >
            <option value="agreement">Agreement</option>
            <option value="demand">Demand Letter</option>
            <option value="settlement">Settlement Offer</option>
            <option value="intake">Intake Form</option>
            <option value="motion">Motion</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-html">
          Template content <span className="text-muted-foreground text-xs">(use {"{{field}}"})</span>
        </Label>
        <Textarea
          id="template-html"
          value={htmlContent}
          onChange={(event) => setHtmlContent(event.target.value)}
          placeholder="Client {{clientName}} agrees to retain {{firmName}}..."
          className="min-h-[240px]"
          disabled={isPending}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Signature fields</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={handleAddSignatureField} disabled={isPending}>
            + Add field
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {signatureFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signature fields added yet.</p>
          ) : (
            signatureFields.map((field, index) => (
              <div key={field.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">{field.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Position: ({field.x}, {field.y}) – Size: {field.width}×{field.height}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSignatureFields((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
                  }
                >
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div
            className="min-h-[200px] rounded-md border bg-white p-4 text-sm"
            dangerouslySetInnerHTML={{
              __html: previewHtml || "<p class='text-muted-foreground'>Start typing to preview…</p>",
            }}
          />
          <p className="text-xs text-muted-foreground">
            Preview uses sample data (e.g., Jane Doe, Smith v. State). Actual case values will replace the
            placeholders when you generate documents.
          </p>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create template"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isPdfPreviewPending || !htmlContent.trim()}
        onClick={handlePreviewPdfClick}
      >
        {isPdfPreviewPending ? "Rendering preview…" : "Generate sample PDF"}
      </Button>
    </form>
  )
}
