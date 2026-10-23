-- CreateEnum
CREATE TYPE "CustodyStatus" AS ENUM ('NOT_RECEIVED', 'IN_OFFICE_CUSTODY', 'SAFE_STORAGE', 'TEMPORARY_RELEASE', 'PERMANENTLY_RELEASED');

-- CreateEnum
CREATE TYPE "CustodyEventType" AS ENUM ('ORIGINAL_RECEIVED', 'LOCATION_UPDATED', 'CUSTODY_CONFIRMED', 'ORIGINAL_RELEASED', 'OTHER');

-- AlterTable
ALTER TABLE "instruments" ADD COLUMN     "custodyStatus" "CustodyStatus" NOT NULL DEFAULT 'NOT_RECEIVED',
ADD COLUMN     "originalReceived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalReceivedAt" TIMESTAMP(3),
ADD COLUMN     "physicalLocation" TEXT;

-- CreateTable
CREATE TABLE "custody_events" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "eventType" "CustodyEventType" NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "recordedLocation" TEXT,
    "custodyStatus" "CustodyStatus" NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custody_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maturity_alerts" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "priorityBand" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maturity_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "finishTime" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "alertsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custody_events_instrumentId_idx" ON "custody_events"("instrumentId");

-- CreateIndex
CREATE INDEX "custody_events_recordedById_idx" ON "custody_events"("recordedById");

-- CreateIndex
CREATE INDEX "custody_events_createdAt_idx" ON "custody_events"("createdAt");

-- CreateIndex
CREATE INDEX "maturity_alerts_instrumentId_idx" ON "maturity_alerts"("instrumentId");

-- CreateIndex
CREATE INDEX "maturity_alerts_priorityBand_idx" ON "maturity_alerts"("priorityBand");

-- CreateIndex
CREATE INDEX "maturity_alerts_createdAt_idx" ON "maturity_alerts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "maturity_alerts_instrumentId_alertType_window_key" ON "maturity_alerts"("instrumentId", "alertType", "window");

-- CreateIndex
CREATE INDEX "job_runs_jobName_idx" ON "job_runs"("jobName");

-- CreateIndex
CREATE INDEX "job_runs_createdAt_idx" ON "job_runs"("createdAt");

-- CreateIndex
CREATE INDEX "instruments_custodyStatus_idx" ON "instruments"("custodyStatus");

-- AddForeignKey
ALTER TABLE "custody_events" ADD CONSTRAINT "custody_events_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_events" ADD CONSTRAINT "custody_events_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maturity_alerts" ADD CONSTRAINT "maturity_alerts_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
