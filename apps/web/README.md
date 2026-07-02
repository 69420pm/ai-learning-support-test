# Web App (Next.js)

This package contains the Next.js web application (Frontend UI & API routes).

## Document Upload Flow (Local vs. Cloud Mode)

To circumvent the Vercel serverless function payload limit (4.5MB), the system uses dual upload strategies dependent on the active mode:

### Local Mode (`LOCAL_MODE=true`)
1. **Frontend** POSTs the PDF file to Next.js API route `/api/documents/upload` using a standard `FormData` body.
2. **Next.js API** reads the file buffer, invokes the `StorageService.uploadFile` method (writing to local disk `.data/storage/`), and registers the document metadata in the local SQLite DB.
3. **API** returns the registered `documentId` to the frontend.

### Cloud Mode (`LOCAL_MODE=false`)
1. **Frontend** requests a presigned upload payload from Next.js API `/api/documents/upload/presigned` containing the target path and token (or uses Supabase Client direct authorization).
2. **Frontend** uploads the binary PDF file *directly* to the Supabase Storage Bucket using the presigned URL/token. This bypasses Next.js serverless limitations completely.
3. **Frontend** notifies Next.js API `/api/documents/register` that the upload is complete, passing the document details.
4. **Next.js API** registers the document metadata in Supabase Postgres and triggers the asynchronous background processing queue.
