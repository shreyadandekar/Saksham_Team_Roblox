/**
 * src/api/documents.ts
 * Frontend API client for document upload, listing, download, and deletion.
 */

import type {
  DocumentListResponse,
  DocumentUploadResponse,
  SignedUrlResponse,
  DocumentCategory,
} from "../types/document";

/**
 * Upload a document for an instrument.
 * Uses multipart/form-data — the browser sets the Content-Type boundary automatically.
 */
export async function uploadDocument(
  instrumentId: string,
  file: File,
  category: DocumentCategory = "FDR Receipt",
  onProgress?: (percent: number) => void
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  // We use XMLHttpRequest instead of fetch to get upload progress events
  return new Promise<DocumentUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      let data: unknown;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Unexpected server response."));
        return;
      }

      if (xhr.status === 201) {
        resolve(data as DocumentUploadResponse);
      } else {
        const body = data as { message?: string; error?: string };
        reject(new Error(body.message || body.error || `Upload failed (HTTP ${xhr.status})`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during file upload."));
    });

    xhr.open("POST", `/api/instruments/${instrumentId}/documents`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

/**
 * List all documents attached to an instrument.
 */
export async function listDocuments(instrumentId: string): Promise<DocumentListResponse> {
  const res = await fetch(`/api/instruments/${instrumentId}/documents`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Failed to list documents (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Get a short-lived signed URL (60 s) for downloading a document.
 */
export async function getDocumentDownloadUrl(
  instrumentId: string,
  documentId: string
): Promise<SignedUrlResponse> {
  const res = await fetch(
    `/api/instruments/${instrumentId}/documents/${documentId}/download`,
    {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Failed to generate download link (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Delete a document (DRAFT instruments only, owning institution user).
 */
export async function deleteDocument(
  instrumentId: string,
  documentId: string
): Promise<{ message: string }> {
  const res = await fetch(
    `/api/instruments/${instrumentId}/documents/${documentId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `Failed to delete document (HTTP ${res.status})`);
  }

  return res.json();
}
