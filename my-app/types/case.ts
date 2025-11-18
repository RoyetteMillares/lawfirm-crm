/**
 * Case-related types for the Law Firm Portal
 * Aligned with Prisma schema (CaseStatus enum uses UPPERCASE)
 */

// ============================================
// CASE STATUS (from Prisma CaseStatus enum)
// ============================================

export const CASE_STATUS_OPTIONS = [
  "OPEN",
  "PENDING",
  "ON_HOLD",
  "CLOSED",
  "DELETED",
] as const

export type CaseStatus = (typeof CASE_STATUS_OPTIONS)[number]

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  OPEN: "Open",
  PENDING: "Pending Review",
  ON_HOLD: "On Hold",
  CLOSED: "Closed",
  DELETED: "Deleted",
}

// ============================================
// CASE DATA STRUCTURES
// ============================================

export interface CaseRow {
  id: string
  title: string
  description?: string | null
  status: CaseStatus
  assignedToId?: string | null
  assignedToName?: string | null
  assignedToEmail?: string | null
  updatedAt: string
}

export interface CaseRecord {
  id: string
  title: string
  description?: string
  status: CaseStatus
  assignedToId?: string | null
  assignedTo?: CaseUser
  createdAt: Date
  updatedAt: Date
}

// ============================================
// USER/ASSIGNMENT TYPES
// ============================================

export interface CaseUser {
  id: string
  email: string
  fullName: string
  role: "attorney" | "paralegal" | "staff" | "owner"
}

// ============================================
// FORM INPUT TYPES
// ============================================

export interface CreateCaseInput {
  title: string
  description?: string
  status: CaseStatus
  assignedTo: string // User ID
}

export interface UpdateCaseInput {
  title?: string
  description?: string
  status?: CaseStatus
  assignedTo?: string
}
