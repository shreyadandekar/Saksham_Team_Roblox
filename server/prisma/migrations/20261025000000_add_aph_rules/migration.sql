-- CreateEnum
CREATE TYPE "PremisesOwnershipType" AS ENUM ('OWNED', 'LEASED_PRIVATE', 'LEASED_GOVERNMENT', 'GOVERNMENT_ALLOTTED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "aph_rules" (
    "id" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "regulatoryVersion" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "programme" TEXT NOT NULL,
    "academicLevel" TEXT NOT NULL,
    "baseAmountRupees" INTEGER NOT NULL,
    "sourceClause" TEXT,
    "sourceUrl" TEXT,
    "applicableConditions" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aph_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aph_rules_ruleKey_key" ON "aph_rules"("ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "aph_rules_regulatoryVersion_programme_academicLevel_key" ON "aph_rules"("regulatoryVersion", "programme", "academicLevel");

-- CreateIndex
CREATE INDEX "aph_rules_programme_academicLevel_idx" ON "aph_rules"("programme", "academicLevel");

-- CreateIndex
CREATE INDEX "aph_rules_regulatoryVersion_idx" ON "aph_rules"("regulatoryVersion");

-- CreateIndex
CREATE INDEX "aph_rules_isActive_idx" ON "aph_rules"("isActive");
