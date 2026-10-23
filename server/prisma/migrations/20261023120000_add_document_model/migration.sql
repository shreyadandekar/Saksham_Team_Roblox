-- Migration: add_document_model
-- Adds the documents table for Milestone 4 Secure Document Upload.
-- Binary content is stored in Supabase Storage; only metadata is persisted here.

CREATE TABLE "documents" (
    "id"           TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath"  TEXT NOT NULL,
    "mimeType"     TEXT NOT NULL,
    "sizeBytes"    INTEGER NOT NULL,
    "category"     TEXT NOT NULL DEFAULT 'FDR Receipt',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "documents_instrumentId_idx" ON "documents"("instrumentId");
CREATE INDEX "documents_uploadedById_idx" ON "documents"("uploadedById");

-- Foreign Keys
ALTER TABLE "documents" ADD CONSTRAINT "documents_instrumentId_fkey"
    FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
