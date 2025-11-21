"use client"

import { useMemo, useState, useTransition, useRef, useEffect } from "react"
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
import { GripVertical, X } from "lucide-react"

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
  
  // Dragging state
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleAddSignatureField = () => {
    // Default position near the top or below last field
    const lastField = signatureFields[signatureFields.length - 1]
    const startY = lastField ? lastField.y + 50 : 100

    const field: SignatureField = {
      id: `sig-${Date.now()}`,
      name: `signature_${signatureFields.length + 1}`,
      label: "Signer",
      x: 100,
      y: startY,
      width: 200,
      height: 60,
    }
    setSignatureFields((prev) => [...prev, field])
  }

  const updateField = (id: string, updates: Partial<SignatureField>) => {
    setSignatureFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, ...updates } : field))
    )
  }

  const removeField = (id: string) => {
    setSignatureFields((prev) => prev.filter((field) => field.id !== id))
  }

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, field: SignatureField) => {
    e.preventDefault()
    setDraggingId(field.id)
    
    // Calculate offset from top-left of the element
    // We need this so the element doesn't "jump" to the cursor
    // e.clientX is global, field.x is relative to container
    // But simpler: just track the cursor movement
    // OR: Calculate offset relative to the element's corner
    
    // Better approach:
    // Get the mouse position relative to the element
    // But we need to update X/Y relative to container
    
    // Let's store the initial click offset within the element
    // e.nativeEvent.offsetX ??
    
    // Let's stick to standard method:
    // when mouse down, record where in the box we clicked.
    // but since we rely on container-relative coordinates for updates...
    
    // Easier:
    // 1. Get container bounds
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    
    // 2. Get mouse position relative to container
    const mouseX = e.clientX - containerRect.left
    const mouseY = e.clientY - containerRect.top
    
    // 3. Offset = MousePos - ElementPos
    setDragOffset({
      x: mouseX - field.x,
      y: mouseY - field.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return
    
    e.preventDefault()
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - containerRect.left
    const mouseY = e.clientY - containerRect.top
    
    // New position = MousePos - DragOffset
    let newX = mouseX - dragOffset.x
    let newY = mouseY - dragOffset.y
    
    // Constrain to bounds (optional, but good UX)
    newX = Math.max(0, Math.min(newX, containerRect.width - 50))
    newY = Math.max(0, newY)
    
    updateField(draggingId, { x: Math.round(newX), y: Math.round(newY) })
  }

  const handleMouseUp = () => {
    setDraggingId(null)
  }
  
  // Global mouse up to catch drags that go outside
  useEffect(() => {
    const handleGlobalMouseUp = () => setDraggingId(null)
    if (draggingId) {
      window.addEventListener('mouseup', handleGlobalMouseUp)
    }
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [draggingId])


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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT COLUMN: Editor */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="template-html">
              Template Content (HTML) <span className="text-muted-foreground text-xs">(use {"{{field}}"})</span>
            </Label>
            <Textarea
              id="template-html"
              value={htmlContent}
              onChange={(event) => setHtmlContent(event.target.value)}
              placeholder="Client {{clientName}} agrees to retain {{firmName}}..."
              className="min-h-[400px] font-mono text-sm"
              disabled={isPending}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Signature Fields</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSignatureField} disabled={isPending}>
                + Add Field
              </Button>
            </CardHeader>
            <CardContent className="grid gap-2 p-3">
              {signatureFields.length === 0 && (
                 <p className="text-sm text-muted-foreground text-center py-4">No fields yet. Add one to drag & drop on the preview.</p>
              )}
              {signatureFields.map((field) => (
                <div key={field.id} className="flex items-center gap-2 rounded border p-2 text-sm bg-muted/40">
                   <Input 
                     value={field.label} 
                     onChange={(e) => updateField(field.id, { label: e.target.value })}
                     className="h-8 w-32"
                   />
                   <span className="text-xs text-muted-foreground flex-1">
                     ({field.x}, {field.y})
                   </span>
                   <Button type="button" variant="ghost" size="icon" onClick={() => removeField(field.id)}>
                     <X className="h-4 w-4" />
                   </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Visual Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Visual Preview (Drag fields here)</Label>
            <div className="text-xs text-muted-foreground">Letter Size (8.5" x 11")</div>
          </div>
          
          <div className="overflow-auto rounded-md border bg-gray-100 p-4 h-[800px] flex justify-center">
             {/* This container simulates the PDF page */}
             <div 
               ref={containerRef}
               className="relative bg-white shadow-sm"
               style={{ 
                 width: '816px', // 8.5in * 96px
                 minHeight: '1056px', // 11in * 96px
                 padding: '48px', // 0.5in margin
               }}
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}
               onMouseLeave={handleMouseUp}
             >
                {/* Content Layer */}
                <div 
                  className="prose max-w-none pointer-events-none select-none" 
                  dangerouslySetInnerHTML={{
                    __html: previewHtml || "<p class='text-muted-foreground'>Start typing content...</p>",
                  }}
                />

                {/* Interaction Layer */}
                {signatureFields.map((field) => (
                  <div
                    key={field.id}
                    onMouseDown={(e) => handleMouseDown(e, field)}
                    style={{
                      left: field.x,
                      top: field.y,
                      width: field.width,
                      height: field.height,
                      position: 'absolute',
                      cursor: draggingId === field.id ? 'grabbing' : 'grab',
                      zIndex: 10,
                    }}
                    className={`
                      flex items-center justify-between rounded border border-blue-500 bg-blue-50/80 px-2 text-xs font-medium text-blue-700 shadow-sm transition-colors
                      ${draggingId === field.id ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:bg-blue-100'}
                    `}
                  >
                    <span className="truncate pointer-events-none">{field.label}</span>
                    <GripVertical className="h-3 w-3 opacity-50 pointer-events-none" />
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Create Template"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPdfPreviewPending || !htmlContent.trim()}
          onClick={handlePreviewPdfClick}
        >
          {isPdfPreviewPending ? "Generating..." : "Download Sample PDF"}
        </Button>
      </div>
    </form>
  )
}
