-- CreateEnum
CREATE TYPE "ReleaseRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUND_CONFIRMED');

-- CreateTable
CREATE TABLE "release_requests" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "previousInstrumentStatus" "InstrumentStatus" NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReleaseRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "officerRemarks" TEXT,
    "refundReference" TEXT,
    "refundConfirmedAt" TIMESTAMP(3),
    "refundConfirmedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "release_requests_instrumentId_idx" ON "release_requests"("instrumentId");

-- CreateIndex
CREATE INDEX "release_requests_status_idx" ON "release_requests"("status");

-- CreateIndex
CREATE INDEX "release_requests_createdAt_idx" ON "release_requests"("createdAt");

-- CreateIndex
CREATE INDEX "release_requests_requestedById_idx" ON "release_requests"("requestedById");

-- AddForeignKey
ALTER TABLE "release_requests" ADD CONSTRAINT "release_requests_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_requests" ADD CONSTRAINT "release_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_requests" ADD CONSTRAINT "release_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_requests" ADD CONSTRAINT "release_requests_refundConfirmedById_fkey" FOREIGN KEY ("refundConfirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreatePartialUniqueIndex
-- Enforces that only one PENDING release request may exist per instrument at any time.
-- Historical requests (APPROVED, REJECTED, REFUND_CONFIRMED) are not affected.
CREATE UNIQUE INDEX "release_requests_instrumentId_pending_unique"
    ON "release_requests" ("instrumentId")
    WHERE (status = 'PENDING');
