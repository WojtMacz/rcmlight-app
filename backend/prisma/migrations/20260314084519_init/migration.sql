-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "FunctionLevel" AS ENUM ('SYSTEM', 'ASSEMBLY');

-- CreateEnum
CREATE TYPE "PMTaskType" AS ENUM ('REDESIGN', 'PDM', 'PM_INSPECTION', 'PM_OVERHAUL', 'RTF');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defaultDowntimeCostPerHour" DECIMAL(12,2) NOT NULL DEFAULT 1000,
    "defaultTechnicianHourlyCost" DECIMAL(12,2) NOT NULL DEFAULT 80,
    "defaultAllowedUnavailability" DECIMAL(6,4) NOT NULL DEFAULT 0.03,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ANALYST',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "machineDowntimeCostPerHour" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "technicianHourlyCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allowedUnavailability" DECIMAL(6,4) NOT NULL DEFAULT 0.03,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assembly" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "Assembly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,

    CONSTRAINT "MaterialGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "catalogNumber" TEXT,
    "materialGroupId" TEXT NOT NULL,

    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionDef" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "level" "FunctionLevel" NOT NULL,
    "systemId" TEXT,
    "assemblyId" TEXT,

    CONSTRAINT "FunctionDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionalFailure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,

    CONSTRAINT "FunctionalFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalFailure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mtbfMonths" DECIMAL(8,2),
    "functionalFailureId" TEXT NOT NULL,
    "materialGroupId" TEXT NOT NULL,

    CONSTRAINT "PhysicalFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailureCause" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "physicalFailureId" TEXT NOT NULL,

    CONSTRAINT "FailureCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criticality" (
    "id" TEXT NOT NULL,
    "safety" INTEGER NOT NULL DEFAULT 0,
    "impact" INTEGER NOT NULL DEFAULT 0,
    "quality" INTEGER NOT NULL DEFAULT 0,
    "production" INTEGER NOT NULL DEFAULT 0,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "repairCost" INTEGER NOT NULL DEFAULT 0,
    "laborTime" INTEGER NOT NULL DEFAULT 0,
    "downtimeHours" DECIMAL(10,2),
    "qualityLossCost" DECIMAL(12,2),
    "secondaryDamageCost" DECIMAL(12,2),
    "sparepartCost" DECIMAL(12,2),
    "repairManHours" DECIMAL(10,2),
    "causeId" TEXT NOT NULL,

    CONSTRAINT "Criticality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PMTask" (
    "id" TEXT NOT NULL,
    "taskType" "PMTaskType" NOT NULL,
    "description" TEXT NOT NULL,
    "assignedTo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "plannedDowntimeH" DECIMAL(10,2),
    "sparepartCost" DECIMAL(12,2),
    "repairManHours" DECIMAL(10,2),
    "calculatedFrequencyMonths" DECIMAL(8,2),
    "finalFrequencyMonths" INTEGER,
    "totalCostPM" DECIMAL(12,2),
    "causeId" TEXT NOT NULL,

    CONSTRAINT "PMTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ANALYST',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Criticality_causeId_key" ON "Criticality"("causeId");

-- CreateIndex
CREATE UNIQUE INDEX "PMTask_causeId_key" ON "PMTask"("causeId");

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_token_key" ON "InviteToken"("token");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "System" ADD CONSTRAINT "System_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assembly" ADD CONSTRAINT "Assembly_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialGroup" ADD CONSTRAINT "MaterialGroup_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePart" ADD CONSTRAINT "SparePart_materialGroupId_fkey" FOREIGN KEY ("materialGroupId") REFERENCES "MaterialGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionDef" ADD CONSTRAINT "FunctionDef_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionDef" ADD CONSTRAINT "FunctionDef_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "Assembly"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionalFailure" ADD CONSTRAINT "FunctionalFailure_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "FunctionDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalFailure" ADD CONSTRAINT "PhysicalFailure_functionalFailureId_fkey" FOREIGN KEY ("functionalFailureId") REFERENCES "FunctionalFailure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalFailure" ADD CONSTRAINT "PhysicalFailure_materialGroupId_fkey" FOREIGN KEY ("materialGroupId") REFERENCES "MaterialGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailureCause" ADD CONSTRAINT "FailureCause_physicalFailureId_fkey" FOREIGN KEY ("physicalFailureId") REFERENCES "PhysicalFailure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criticality" ADD CONSTRAINT "Criticality_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "FailureCause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PMTask" ADD CONSTRAINT "PMTask_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "FailureCause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
