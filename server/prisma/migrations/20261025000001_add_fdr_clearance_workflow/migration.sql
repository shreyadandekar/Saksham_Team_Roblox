-- CreateEnum
CREATE TYPE "ClearanceDepartment" AS ENUM ('PGRC', 'VIGILANCE', 'OTHER_APPLICABLE_BUREAU');

-- CreateEnum
CREATE TYPE "ClearanceStatus" AS ENUM ('PENDING', 'CLEARED', 'OBJECTION_RAISED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ReleaseWorkflowStage" AS ENUM ('SUBMITTED', 'DOCUMENT_REVIEW', 'CORRECTION_REQUIRED', 'CLEARANCES_PENDING', 'READY_FOR_FINAL_DECISION', 'NOC_ISSUED', 'REJECTED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ReleaseDocumentType" AS ENUM ('APPLICATION_LETTER', 'AFFIDAVIT_6', 'FDR_DEPOSIT_EVIDENCE', 'LATEST_LOA_EOA');

-- CreateEnum
CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CORRECTION_REQUIRED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "department" TEXT;
CREATE INDEX "users_department_idx" ON "users"("department");

-- AlterTable
ALTER TABLE "release_requests" ADD COLUMN "workflowStage" "ReleaseWorkflowStage" NOT NULL DEFAULT 'SUBMITTED',
ADD COLUMN "holdReason" TEXT,
ADD COLUMN "holdPlacedById" TEXT;

CREATE INDEX "release_requests_workflowStage_idx" ON "release_requests"("workflowStage");

-- CreateTable
CREATE TABLE "release_clearances" (
    "id" TEXT NOT NULL,
    "releaseRequestId" TEXT NOT NULL,
    "department" "ClearanceDepartment" NOT NULL,
    "status" "ClearanceStatus" NOT NULL DEFAULT 'PENDING',
    "assignedOfficerId" TEXT,
    "decidedById" TEXT,
    "decisionReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_clearances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_document_reviews" (
    "id" TEXT NOT NULL,
    "releaseRequestId" TEXT NOT NULL,
    "documentType" "ReleaseDocumentType" NOT NULL,
    "documentId" TEXT,
    "status" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewRemarks" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_document_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "release_clearances_releaseRequestId_department_key" ON "release_clearances"("releaseRequestId", "department");
CREATE INDEX "release_clearances_releaseRequestId_idx" ON "release_clearances"("releaseRequestId");
CREATE INDEX "release_clearances_department_idx" ON "release_clearances"("department");
CREATE INDEX "release_clearances_status_idx" ON "release_clearances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "release_document_reviews_releaseRequestId_documentType_key" ON "release_document_reviews"("releaseRequestId", "documentType");
CREATE INDEX "release_document_reviews_releaseRequestId_idx" ON "release_document_reviews"("releaseRequestId");
CREATE INDEX "release_document_reviews_documentType_idx" ON "release_document_reviews"("documentType");
CREATE INDEX "release_document_reviews_status_idx" ON "release_document_reviews"("status");

-- AddForeignKey
ALTER TABLE "release_requests" ADD CONSTRAINT "release_requests_holdPlacedById_fkey" FOREIGN KEY ("holdPlacedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_clearances" ADD CONSTRAINT "release_clearances_releaseRequestId_fkey" FOREIGN KEY ("releaseRequestId") REFERENCES "release_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "release_clearances" ADD CONSTRAINT "release_clearances_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "release_clearances" ADD CONSTRAINT "release_clearances_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_document_reviews" ADD CONSTRAINT "release_document_reviews_releaseRequestId_fkey" FOREIGN KEY ("releaseRequestId") REFERENCES "release_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "release_document_reviews" ADD CONSTRAINT "release_document_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "release_document_reviews" ADD CONSTRAINT "release_document_reviews_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
