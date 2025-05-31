/*
  Warnings:

  - The values [Basic,Premium] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `subscriptionId` on the `InitiatePayment` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlanType_new" AS ENUM ('Free', 'Monthly', 'Yearly');
ALTER TABLE "Team" ALTER COLUMN "currentPlan" DROP DEFAULT;
ALTER TABLE "Team" ALTER COLUMN "currentPlan" TYPE "PlanType_new" USING ("currentPlan"::text::"PlanType_new");
ALTER TABLE "Subscription" ALTER COLUMN "plan" TYPE "PlanType_new" USING ("plan"::text::"PlanType_new");
ALTER TABLE "InitiatePayment" ALTER COLUMN "plan" TYPE "PlanType_new" USING ("plan"::text::"PlanType_new");
ALTER TYPE "PlanType" RENAME TO "PlanType_old";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";
DROP TYPE "PlanType_old";
ALTER TABLE "Team" ALTER COLUMN "currentPlan" SET DEFAULT 'Free';
COMMIT;

-- DropForeignKey
ALTER TABLE "InitiatePayment" DROP CONSTRAINT "InitiatePayment_subscriptionId_fkey";

-- AlterTable
ALTER TABLE "InitiatePayment" DROP COLUMN "subscriptionId";

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'Free';

-- CreateTable
CREATE TABLE "PlanPrices" (
    "id" TEXT NOT NULL,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "yearlyPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PlanPrices_pkey" PRIMARY KEY ("id")
);
