-- AlterEnum
ALTER TYPE "CriteriaCategory" ADD VALUE 'AVAILABILITY';

-- AlterTable
ALTER TABLE "Criticality" ADD COLUMN     "availability" INTEGER NOT NULL DEFAULT 0;
