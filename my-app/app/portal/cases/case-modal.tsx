"use client"

import { Loader2Icon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"

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
import { CASE_STATUS_LABELS, CASE_STATUS_OPTIONS, CaseStatus, type CaseUser } from "@/types/case"

import { createCase, fetchTeamMembers } from "@/app/portal/cases/actions"

export default function CreateCaseModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<CaseStatus>(CASE_STATUS_OPTIONS[0])
  const [assignedTo, setAssignedTo] = useState<string>("")
  const [teamMembers, setTeamMembers] = useState<CaseUser[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Fetch team members when modal opens
  useEffect(() => {
    if (open && teamMembers.length === 0) {
      setLoadingTeam(true)
      fetchTeamMembers()
        .then((members) => {
          console.log("roy: fetched team members", members)
          setTeamMembers(members)
          if (members.length > 0) {
            setAssignedTo(members[0].id)
          }
        })
        .catch((error) => {
          console.error("roy: fetchTeamMembers error:", error)
          toast.error("Failed to load team members")
        })
        .finally(() => setLoadingTeam(false))
    }
  }, [open, teamMembers.length])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setStatus(CASE_STATUS_OPTIONS[0])
    setAssignedTo("")
  }

  const handleOpenChange = (nextState: boolean) => {
    if (!nextState) {
      resetForm()
    }
    setOpen(nextState)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!assignedTo.trim()) {
      toast.error("Please assign the case to a team member")
      return
    }

    startTransition(async () => {
      try {
        await createCase({
          title,
          description,
          status,
          assignedTo,
        })

        toast.success("Case created and assigned successfully")
        handleOpenChange(false)
        router.refresh()
      } catch (error: unknown) {
        console.error("roy: createCase error:", error)
        toast.error("Failed to create case", {
          description: error instanceof Error ? error.message : "Please try again",
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg">
          <PlusIcon className="size-4" />
          New Case
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create case</DialogTitle>
          <DialogDescription>
            Capture the key details so your team can get to work immediately.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="case-title">Title</Label>
            <Input
              id="case-title"
              placeholder="E.g. Smith vs. State filing"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="case-description">Description</Label>
            <Textarea
              id="case-description"
              placeholder="Add background notes, deadlines, or intake details."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="case-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as CaseStatus)}
              disabled={isPending}
            >
              <SelectTrigger id="case-status" className="w-full justify-between">
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

          {/* NEW: Assign To Field */}
          <div className="space-y-2">
            <Label htmlFor="case-assigned-to">Assign To</Label>
            <Select
              value={assignedTo}
              onValueChange={(value) => setAssignedTo(value)}
              disabled={isPending || loadingTeam}
            >
              <SelectTrigger id="case-assigned-to" className="w-full justify-between">
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {loadingTeam ? (
                  <div className="p-2 text-sm text-gray-500">Loading team members...</div>
                ) : teamMembers.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">No team members available</div>
                ) : (
                  teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.fullName} ({member.role})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !title.trim() || !assignedTo.trim() || loadingTeam}
            >
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              {isPending ? "Creating..." : "Create case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
