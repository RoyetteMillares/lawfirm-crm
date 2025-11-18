"use client"

import { Briefcase } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CASE_STATUS_LABELS, CaseRow, CaseStatus } from "@/types/case"
import { EditCaseDialog } from "@/app/portal/cases/edit-case-dialog"

interface CaseTableProps {
  cases: CaseRow[]
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

const statusBadgeClasses: Record<CaseStatus, string> = {
  OPEN: "bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-500/10 dark:text-emerald-200",
  PENDING: "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-500/10 dark:text-amber-200",
  ON_HOLD: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-500/10 dark:text-blue-200",
  CLOSED: "bg-slate-200 text-slate-900 border-transparent dark:bg-slate-500/10 dark:text-slate-100",
  DELETED: "bg-rose-100 text-rose-800 border-transparent dark:bg-rose-500/10 dark:text-rose-200",
}

export default function CaseTable({ cases }: CaseTableProps) {
  if (!cases.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center text-muted-foreground">
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
            <Briefcase className="size-6" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">No cases yet</p>
            <p className="text-sm">
              You can create your first case to start tracking matters across the firm.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="px-0 pb-6">
        <div className="px-6">
          <Table>
            <TableCaption>
              {cases.length} {cases.length === 1 ? "case" : "cases"} in this tenant
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">{item.title}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClasses[item.status]}>
                      {CASE_STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.assignedToName ?? "Unassigned"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {dateFormatter.format(new Date(item.updatedAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditCaseDialog
                      caseId={item.id}
                      title={item.title}
                      description={item.description}
                      status={item.status}
                      assignedToId={item.assignedToId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
