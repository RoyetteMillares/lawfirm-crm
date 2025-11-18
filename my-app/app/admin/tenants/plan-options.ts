export const TENANT_PLAN_OPTIONS = ["trial", "basic", "pro", "enterprise"] as const

export type TenantPlan = (typeof TENANT_PLAN_OPTIONS)[number]

export const TENANT_PLAN_LABELS: Record<TenantPlan, string> = {
  trial: "Trial",
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
}

