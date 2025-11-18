import { getCases } from "./actions"
import CaseTable from "@/app/portal/cases/case-table"
import CreateCaseModal from "@/app/portal/cases/case-modal"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default async function CasesPage() {
  const cases = await getCases()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Cases</h1>
      <CaseTable cases={cases} />
      <CreateCaseModal />
    </main>
  )
}
