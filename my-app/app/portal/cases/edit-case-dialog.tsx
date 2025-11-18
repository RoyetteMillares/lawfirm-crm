"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PencilIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_OPTIONS,
  type CaseStatus,
  type CaseUser,
} from "@/types/case"
import { fetchTeamMembers, updateCase } from "@/app/portal/cases/actions"

interface EditCaseDialogProps {
  caseId: string
  title: string
  description?: string | null
  status: CaseStatus
  assignedToId?: string | null
}

export function EditCaseDialog({
  caseId,
  title,
  description,
  status,
  assignedToId,
}: EditCaseDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [formTitle, setFormTitle] = useState(title)
  const [formDescription, setFormDescription] = useState(description || "")
  const [formStatus, setFormStatus] = useState<CaseStatus>(status)
  const [assignedTo, setAssignedTo] = useState<string>(assignedToId || "")
  const [teamMembers, setTeamMembers] = useState<CaseUser[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function loadTeam() {
      setLoadingMembers(true)
      try {
        const members = await fetchTeamMembers()
        if (cancelled) return
        setTeamMembers(members)
        if (!assignedToId && members.length > 0) {
          setAssignedTo((prev) => prev || members[0].id)
        }
      } catch (error) {
        console.error("roy: fetchTeamMembers (edit) error:", error)
        toast.error("Unable to load team members")
      } finally {
        if (!cancelled) setLoadingMembers(false)
      }
    }
    if (teamMembers.length === 0) {
      loadTeam()
    }
    return () => {
      cancelled = true
    }
  }, [open, assignedToId, teamMembers.length])

  const handleOpenChange = (nextState: boolean) => {
    if (nextState) {
      setFormTitle(title)
      setFormDescription(description || "")
      setFormStatus(status)
      setAssignedTo(assignedToId || "")
    }
    setOpen(nextState)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    startTransition(async () => {
      try {
        await updateCase(caseId, {
          title: formTitle,
          description: formDescription,
          status: formStatus,
          assignedTo: assignedTo || null,
        })
        toast.success("Case updated")
        setOpen(false)
        router.refresh()
      } catch (error) {
        console.error("roy: updateCase error:", error)
        toast.error("Failed to update case", {
          description: error instanceof Error ? error.message : "Please try again",
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <PencilIcon className="size-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit case</DialogTitle>
          <DialogDescription>
            Update the case information or reassign it to another team member.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`case-title-${caseId}`}>Title</Label>
            <Input
              id={`case-title-${caseId}`}
              value={formTitle}
              onChange={(event) => setFormTitle(event.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`case-description-${caseId}`}>Description</Label>
            <Textarea
              id={`case-description-${caseId}`}
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`case-status-${caseId}`}>Status</Label>
            <Select
              value={formStatus}
              onValueChange={(value) => setFormStatus(value as CaseStatus)}
              disabled={isPending}
            >
              <SelectTrigger id={`case-status-${caseId}`} className="w-full justify-between">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {CASE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {CASE_STATUS_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`case-assignee-${caseId}`}>Assigned To</Label>
            <Select
              value={assignedTo || "unassigned"}
              onValueChange={(value) => {
                if (value === "unassigned") {
                  setAssignedTo("")
                  return
                }
                setAssignedTo(value)
              }}
              disabled={isPending || loadingMembers}
            >
              <SelectTrigger id={`case-assignee-${caseId}`} className="w-full justify-between">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.fullName} ({member.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !formTitle.trim()}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

