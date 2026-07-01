# Web App Gotchas (apps/web)

* **Serverless Limits:** Next.js API routes have a 4.5MB payload limit. Never POST large PDFs directly to `/api/documents/upload` in Cloud Mode. Use presigned storage URLs.
