-- CreateEnum
CREATE TYPE "OcrExtractionStatus" AS ENUM ('PENDING', 'EXTRACTED', 'FAILED', 'REVIEWED');

-- CreateTable
CREATE TABLE "ocr_extractions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "OcrExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extractedFdrNumber" TEXT,
    "extractedBankName" TEXT,
    "extractedBranchName" TEXT,
    "extractedAmount" DECIMAL(15,2),
    "extractedIssueDate" TIMESTAMP(3),
    "extractedMaturityDate" TIMESTAMP(3),
    "rawText" TEXT,
    "confidenceScores" JSONB,
    "ocrEngine" TEXT,
    "ocrDurationMs" INTEGER,
    "errorMessage" TEXT,
    "hasMismatches" BOOLEAN,
    "ruleCheckResults" JSONB,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewRemarks" TEXT,
    "acceptedValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ocr_extractions_instrumentId_idx" ON "ocr_extractions"("instrumentId");

-- CreateIndex
CREATE INDEX "ocr_extractions_documentId_idx" ON "ocr_extractions"("documentId");

-- CreateIndex
CREATE INDEX "ocr_extractions_status_idx" ON "ocr_extractions"("status");

-- CreateIndex
CREATE INDEX "ocr_extractions_reviewedById_idx" ON "ocr_extractions"("reviewedById");

-- CreateIndex
CREATE INDEX "ocr_extractions_createdAt_idx" ON "ocr_extractions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_extractions_documentId_attemptNumber_key" ON "ocr_extractions"("documentId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "ocr_extractions" ADD CONSTRAINT "ocr_extractions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_extractions" ADD CONSTRAINT "ocr_extractions_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_extractions" ADD CONSTRAINT "ocr_extractions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreatePartialUniqueIndex
-- Enforces that only one in-flight (PENDING) extraction may exist per document at any time.
-- Historical attempts (EXTRACTED, FAILED, REVIEWED) are preserved.
CREATE UNIQUE INDEX "ocr_extractions_documentId_pending_unique"
    ON "ocr_extractions" ("documentId")
    WHERE (status = 'PENDING');

