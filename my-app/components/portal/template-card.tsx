"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { Eye, MoreHorizontal, PenSquare, Send } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
interface TemplateCardProps {
  template: {
    id: string
    slug?: string
    name: string
    category: string
    isPublished: boolean
    updatedAt: Date
  }
  onPreview: (id: string) => Promise<string>
}

export function TemplateCard({ template, onPreview }: TemplateCardProps) {
  const [isPreviewing, startPreview] = useTransition()

  const handlePreview = () => {
    startPreview(async () => {
      try {
        const base64 = await onPreview(template.slug ?? template.id)
        const byteCharacters = atob(base64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        window.open(url, "_blank", "noopener")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Preview failed")
      }
    })
  }

  return (
    <Card className="border shadow-sm transition hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg capitalize">{template.name}</CardTitle>
            <CardDescription className="capitalize">{template.category}</CardDescription>
          </div>
          <Badge variant={template.isPublished ? "default" : "secondary"}>
            {template.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={isPreviewing}>
            <Eye className="h-4 w-4 mr-1.5" />
            {isPreviewing ? "Opening…" : "Preview"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/portal/templates/${template.id}/edit`}>
              <PenSquare className="h-4 w-4 mr-1.5" />
              Edit
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview PDF
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Send className="h-4 w-4 mr-2" />
                Send (coming soon)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Updated {template.updatedAt.toLocaleDateString()}
      </CardContent>
    </Card>
  )
}

