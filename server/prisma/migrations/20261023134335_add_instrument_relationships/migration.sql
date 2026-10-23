-- CreateEnum
CREATE TYPE "InstrumentRelationshipType" AS ENUM ('RENEWAL', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "instrument_relationships" (
    "id" TEXT NOT NULL,
    "sourceInstrumentId" TEXT NOT NULL,
    "targetInstrumentId" TEXT NOT NULL,
    "relationshipType" "InstrumentRelationshipType" NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedById" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instrument_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instrument_relationships_sourceInstrumentId_idx" ON "instrument_relationships"("sourceInstrumentId");

-- CreateIndex
CREATE INDEX "instrument_relationships_targetInstrumentId_idx" ON "instrument_relationships"("targetInstrumentId");

-- CreateIndex
CREATE INDEX "instrument_relationships_status_idx" ON "instrument_relationships"("status");

-- CreateIndex
CREATE INDEX "instrument_relationships_createdAt_idx" ON "instrument_relationships"("createdAt");

-- AddForeignKey
ALTER TABLE "instrument_relationships" ADD CONSTRAINT "instrument_relationships_sourceInstrumentId_fkey" FOREIGN KEY ("sourceInstrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_relationships" ADD CONSTRAINT "instrument_relationships_targetInstrumentId_fkey" FOREIGN KEY ("targetInstrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_relationships" ADD CONSTRAINT "instrument_relationships_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
