"use client"

import React, { useState, useTransition } from "react"
import { createCase } from "./actions"
import { toast } from "sonner"
import { CaseStatus } from "@prisma/client"
import { useRouter } from "next/navigation"

export default function CreateCaseModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<CaseStatus>(CaseStatus.OPEN)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(() => {
      createCase({ title, description, status })
        .then(() => {
          toast.success("Case created")
          setIsOpen(false)
          router.refresh()
        })
        .catch(() => toast.error("Failed to create case"))
    })
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary mb-4">
        New Case
      </button>

      {isOpen && (
        <dialog open className="modal">
          <form onSubmit={onSubmit} className="modal-box">
            <h3 className="font-bold text-lg">Create New Case</h3>
            <input
              className="input input-bordered w-full mt-4"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="textarea textarea-bordered w-full mt-2"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <select
              className="select select-bordered w-full mt-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus)}
            >
              {Object.values(CaseStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="modal-action">
              <button type="submit" disabled={isPending} className="btn btn-primary">
                {isPending ? "Creating..." : "Create"}
              </button>
              <button type="button" className="btn" onClick={() => setIsOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  )
}
