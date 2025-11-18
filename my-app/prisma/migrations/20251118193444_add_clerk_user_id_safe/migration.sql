/*
  Warnings:

  - A unique constraint covering the columns `[clerkUserId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "description" TEXT,
ADD COLUMN     "newValues" JSONB,
ADD COLUMN     "oldValues" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "clerkUserId" TEXT;

-- CreateTable
CREATE TABLE "clerk_org_tenant_maps" (
    "id" TEXT NOT NULL,
    "clerkOrgId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clerk_org_tenant_maps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clerk_org_tenant_maps_clerkOrgId_key" ON "clerk_org_tenant_maps"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "clerk_org_tenant_maps_tenantId_key" ON "clerk_org_tenant_maps"("tenantId");

-- CreateIndex
CREATE INDEX "clerk_org_tenant_maps_clerkOrgId_idx" ON "clerk_org_tenant_maps"("clerkOrgId");

-- CreateIndex
CREATE INDEX "clerk_org_tenant_maps_tenantId_idx" ON "clerk_org_tenant_maps"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_resourceId_idx" ON "audit_logs"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkUserId_key" ON "users"("clerkUserId");

-- CreateIndex
CREATE INDEX "users_clerkUserId_idx" ON "users"("clerkUserId");

-- AddForeignKey
ALTER TABLE "clerk_org_tenant_maps" ADD CONSTRAINT "clerk_org_tenant_maps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
