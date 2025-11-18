import CaseTable from "@/app/portal/cases/case-table"
import CreateCaseModal from "@/app/portal/cases/case-modal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCases } from "./actions"
import type { CaseRow, CaseStatus } from "@/types/case"

export default async function CasesPage() {
  const cases = await getCases()
  const preparedCases: CaseRow[] = cases.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    assignedToId: c.assignedToId,
    assignedToName: c.assignedTo?.name || c.assignedTo?.email || null,
    assignedToEmail: c.assignedTo?.email || null,
    updatedAt: c.updatedAt.toISOString(),
  }))

  const statusTotals = preparedCases.reduce<Record<CaseStatus, number>>(
    (acc, current) => {
      acc[current.status] = (acc[current.status] ?? 0) + 1
      return acc
    },
    {
      OPEN: 0,
      PENDING: 0,
      ON_HOLD: 0,
      CLOSED: 0,
      DELETED: 0,
    }
  )

  const headlineStats = [
    {
      label: "Open",
      value: statusTotals.OPEN,
      hint: "Matters currently in progress",
    },
    {
      label: "Pending",
      value: statusTotals.PENDING,
      hint: "Awaiting information or approvals",
    },
    {
      label: "On hold",
      value: statusTotals.ON_HOLD,
      hint: "Paused by client or court",
    },
    {
      label: "Closed",
      value: statusTotals.CLOSED,
      hint: "Resolved this quarter",
    },
  ]

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Cases</h1>
          <p className="text-muted-foreground">
            Monitor every client matter from intake to resolution.
          </p>
        </div>
        <CreateCaseModal />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {headlineStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CaseTable cases={preparedCases} />
    </section>
  )
}
