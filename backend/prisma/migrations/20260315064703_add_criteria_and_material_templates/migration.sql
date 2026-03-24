-- CreateEnum
CREATE TYPE "CriteriaCategory" AS ENUM ('SAFETY', 'IMPACT', 'QUALITY', 'PRODUCTION', 'FREQUENCY', 'REPAIR_COST', 'LABOR');

-- CreateTable
CREATE TABLE "CriticalityCriteria" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" "CriteriaCategory" NOT NULL,
    "level" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "CriticalityCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialGroupTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "description" TEXT,
    "inspectionStandards" TEXT,
    "typicalCauses" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialGroupTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CriticalityCriteria_companyId_category_level_key" ON "CriticalityCriteria"("companyId", "category", "level");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialGroupTemplate_companyId_code_key" ON "MaterialGroupTemplate"("companyId", "code");

-- AddForeignKey
ALTER TABLE "CriticalityCriteria" ADD CONSTRAINT "CriticalityCriteria_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialGroupTemplate" ADD CONSTRAINT "MaterialGroupTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
