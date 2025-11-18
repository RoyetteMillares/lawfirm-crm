export interface SignatureField {
  id: string
  name: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface TemplateDraftInput {
  name: string
  category: string
  htmlContent: string
  fieldMappings: Record<string, string>
  signatureFields?: SignatureField[]
}

export const SAMPLE_TEMPLATE_SOURCE = {
  case: {
    id: "CASE-2025-001",
    title: "Smith v. State",
    reference: "2025-CV-001",
    type: "Civil Litigation",
    amount: "$50,000",
    status: "Open",
  },
  client: {
    name: "Jane Doe",
    email: "jane.doe@example.com",
    phone: "(555) 123-4567",
    address: "123 Main Street, Springfield, NY",
  },
  firm: {
    name: "Aurora Legal Group",
    email: "hello@auroralegal.com",
    phone: "(555) 987-6543",
  },
  assignedUser: {
    name: "Alex Morgan, Esq.",
    email: "alex@auroralegal.com",
  },
  date: "January 15, 2026",
  amount: "$50,000",
}

export function resolveTemplateContext(
  fieldMappings: Record<string, string>,
  source: Record<string, any>
): Record<string, any> {
  const context: Record<string, any> = {}

  for (const [templateVar, dataPath] of Object.entries(fieldMappings)) {
    try {
      const parts = dataPath.split(".")
      let value: any = source
      for (const part of parts) {
        if (value === null || value === undefined) break
        value = value[part]
      }
      context[templateVar] = value ?? ""
    } catch {
      context[templateVar] = ""
    }
  }

  return context
}

