# Technical Plan: Multi-Tenancy & Auth (Milestone 3)

## 1. Overview & Context
- **Feature Description**: Secure the application and isolate user documents using Supabase Auth. Replace the mock user ID with a real authentication flow on the frontend (Next.js) and protect the document tables and file storage paths so users can only access their own materials.
- **User Value / Problem Solved**: Multi-tenancy security. Ensures users have private, authenticated access to their study assets.
- **Dependency**: Milestone 1 (Local Ingestion) and Milestone 2 (Cloud Adapters) must be completed.

---

## 2. Scope Boundaries (Goals & Non-Goals)
- **Goals (In Scope)**:
  - Set up `@supabase/ssr` or standard Supabase auth cookies handler in Next.js web application (`apps/web`).
  - Create login/signup forms inside `apps/web/app/auth/` utilizing Vanilla CSS styling.
  - Implement a Next.js middleware router blocking unauthorized `/dashboard` page requests.
  - Replace the Next.js server mock `MOCK_USER_ID` with the actual user ID parsed from the JWT authentication cookie.
  - Implement client direct-to-storage uploads in Cloud Mode:
    - Next.js API route `/api/documents/upload/presigned` returns an upload token or presigned post URL.
    - Frontend browser uploads the PDF binary directly to Supabase storage using the presigned payload to bypass the 4.5MB serverless execution limit.
    - Frontend notifies `/api/documents/register` once the upload is completed to insert the database entry.
- **Non-Goals (Out of Scope)**:
  - Stripe billing subscriptions or paywalls (remains a future milestone).
  - Social OAuth setup (Google/Github login) - will focus on basic email/password signup first.

---

## 3. Architecture & Security Design

### Next.js Authentication Middleware Flow
1. User requests `/dashboard`.
2. Middleware intercepts request, reads cookie JWT, and validates it against Supabase.
3. If invalid, user is redirected to `/auth/login`.

### Presigned Direct Storage Upload Flow (SaaS Environment)
```text
[ Browser ] --(1. GET Presigned Path)--> [ Next.js API ]
[ Browser ] <--(2. Returns upload token)-- [ Next.js API ]
[ Browser ] --(3. Uploads binary directly)--> [ Supabase Storage Bucket ]
[ Browser ] --(4. POST complete metadata)--> [ Next.js API (registers DB) ]
```

### Database Row Level Security (RLS)
On Supabase PostgreSQL, enable Row Level Security on the `documents` table:
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only read/write their own documents" ON documents
  FOR ALL USING (auth.uid() = user_id);
```

---

## 4. Testing Strategy
- Unit tests verifying middleware JWT parsing.
- Integration checks verifying that User A cannot request or delete documents owned by User B via modified API arguments.
