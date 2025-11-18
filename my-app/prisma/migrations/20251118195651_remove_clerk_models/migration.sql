/*
  Warnings:

  - You are about to drop the column `clerkUserId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `clerk_org_tenant_maps` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "clerk_org_tenant_maps" DROP CONSTRAINT "clerk_org_tenant_maps_tenantId_fkey";

-- DropIndex
DROP INDEX "users_clerkUserId_idx";

-- DropIndex
DROP INDEX "users_clerkUserId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "clerkUserId";

-- DropTable
DROP TABLE "clerk_org_tenant_maps";
