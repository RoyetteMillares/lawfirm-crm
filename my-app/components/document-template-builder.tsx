"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createDocumentTemplate } from "@/app/portal/documents/actions"

interface SignatureField {
  id: string
  name: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export default function DocumentTemplateBuilder() {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("agreement")
  const [htmlContent, setHtmlContent] = useState("")
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([])

  const handleAddSignatureField = () => {
    const newField: SignatureField = {
      id: `sig-${Date.now()}`,
      name: `signature_${signatureFields.length + 1}`,
      label: "Signature",
      x: 50,
      y: 500 + signatureFields.length * 100,
      width: 150,
      height: 30,
    }
    setSignatureFields([...signatureFields, newField])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !htmlContent.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    // Extract field mappings from content (simple parser)
    const fieldRegex = /{{(\w+)}}/g
    const fields = new Set<string>()
    let match
    while ((match = fieldRegex.exec(htmlContent)) !== null) {
      fields.add(match[1])
    }

    // Build basic mappings (user will refine in next step)
    const fieldMappings: Record<string, string> = {}
    for (const field of fields) {
      fieldMappings[field] = `case.${field}`
    }

    startTransition(async () => {
      try {
        const result = await createDocumentTemplate({
          name,
          category,
          htmlContent,
          fieldMappings,
          signatureFields: signatureFields.length > 0 ? signatureFields : undefined,
        })
        toast.success("Template created successfully")
        // Reset form
        setName("")
        setHtmlContent("")
        setSignatureFields([])
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create template"
        )
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          placeholder="E.g. Retainer Agreement"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isPending}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="agreement">Agreement</option>
          <option value="demand">Demand Letter</option>
          <option value="settlement">Settlement Offer</option>
          <option value="intake">Intake Form</option>
          <option value="motion">Motion</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">
          Template Content (Use {{fieldName}} for variables)
        </Label>
        <Textarea
          id="content"
          placeholder="Client {{clientName}} agrees to retain {{firmName}} for legal services regarding case {{caseId}}..."
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          disabled={isPending}
          className="min-h-64"
        />
        <p className="text-xs text-gray-500">
          Use double curly braces for variables: {{"{clientName}}"}}
        </p>
      </div>

      <div className="space-y-4">
        <Label>Signature Fields</Label>
        {signatureFields.map((field, idx) => (
          <div key={field.id} className="p-3 border rounded-md bg-gray-50">
            <p className="text-sm font-medium">{field.label}</p>
            <button
              type="button"
              onClick={() =>
                setSignatureFields(signatureFields.filter((_, i) => i !== idx))
              }
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={handleAddSignatureField}
          disabled={isPending}
        >
          + Add Signature Field
        </Button>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating..." : "Create Template"}
      </Button>
    </form>
  )
}
