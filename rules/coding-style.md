# Coding Style & TypeScript Guidelines

This rule defines TypeScript standards, code organization, thin controller patterns, and error handling for the **AI Learning Support** system. All LLM agents and human developers MUST adhere to these rules.

---

## 1. TypeScript & Type Definitions

* **Strict Mode:** TypeScript `strict` mode is enabled. Never use implicit `any`.
* **Type vs Interface:** Prefer `type` over `interface` for React component props, schema types, and domain payloads.
  ```typescript
  // Preferred
  export type ChatMessageProps = {
    message: ChatMessage;
    onSelect?: (id: string) => void;
  };
  ```
* **Explicit Return Types:** Declare explicit return types for exported domain functions, utilities, and API client methods.
* **Zod Schemas:** Define runtime schemas for all boundary inputs (API requests, route params, forms) using Zod. Infer TypeScript types directly from schemas:
  ```typescript
  export const chatRequestSchema = z.object({
    id: z.string().uuid(),
    message: z.string().min(1),
  });
  export type ChatRequest = z.infer<typeof chatRequestSchema>;
  ```

---

## 2. Exports, Imports & File Conventions

* **Named Exports:** Use explicit named exports for components, functions, and modules.
  ```typescript
  export function MessageList() { ... }
  ```
* **Default Exports:** Use `export default` ONLY for Next.js App Router required entrypoints (`page.tsx`, `layout.tsx`, `error.tsx`).
* **Path Aliases:** Always import using absolute path aliases (`@/lib/...`, `@/components/...`, `@/app/...`). Never use relative back-tracking (`../../`).
* **File Naming:** Use `kebab-case` for file names (`chat-message.tsx`, `get-weather.ts`, `auth-provider.ts`).

---

## 3. Thin Controller Pattern

Next.js API route handlers (`app/api/*`) and Server Actions (`"use server"`) are **thin controllers**. They MUST NOT contain SQL queries or complex business logic.

* **Controller Responsibility:**
  1. Parse & validate request payload with Zod.
  2. For project-scoped endpoints, call `requireProjectContext({ id: projectId })` to authenticate and verify ownership in a single seam.
  3. Call domain modules in `@/lib/*` (e.g. `deleteProjectLifecycle` for deletions, `ingestMaterial` for materials).
  4. Return a structured JSON response or typed `AppError.toResponse()`.

  ```typescript
  // app/api/projects/[id]/route.ts
  import { requireProjectContext } from '@/lib/auth/project-context';
  import { deleteProjectLifecycle } from '@/lib/materials/lifecycle';
  import { ChatbotError } from '@/lib/errors';

  export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
      const { project, user } = await requireProjectContext(props.params);
      await deleteProjectLifecycle({ projectId: project.id, userId: user.id });
      return Response.json({ success: true });
    } catch (error) {
      if (error instanceof ChatbotError) {
        return error.toResponse();
      }
      return new ChatbotError('bad_request:api').toResponse();
    }
  }
  ```

---

## 4. Structured Error Handling

* **Domain Error Class:** Standardize error handling using `AppError` (aliased as `ChatbotError`) subclassing `Error`. Error utilities are defined in and imported from `@/lib/errors`.
* **Typed Error Codes:** Formulate error codes as `${ErrorType}:${Surface}` (e.g., `bad_request:api`, `unauthorized:chat`, `not_found:document`, `bad_request:database`).
* **Response Normalization:** Use `error.toResponse()` to return uniform HTTP responses (`{ type, surface, statusCode, message, code, cause }`) without exposing sensitive internal stack traces to clients.
* **UI Error Boundaries:** Implement Next.js App Router error boundaries (`app/error.tsx`, `app/global-error.tsx`, `app/projects/[projectId]/error.tsx`) with retry CTAs (`reset()`) and fallback navigations.

```typescript
export type ErrorType = 'bad_request' | 'unauthorized' | 'forbidden' | 'not_found' | 'rate_limit' | 'offline';
export type Surface = 'chat' | 'auth' | 'api' | 'stream' | 'database' | 'document' | 'learning' | 'history' | 'vote' | 'suggestions' | 'activate_gateway';
export type ErrorCode = `${ErrorType}:${Surface}`;

export type ErrorResponseBody = {
  type: ErrorType;
  surface: Surface;
  statusCode: number;
  message: string;
  code?: string;
  cause?: string;
};

export class AppError extends Error {
  type: ErrorType;
  surface: Surface;
  statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string | ErrorOptions) {
    const defaultMessage = getMessageByErrorCode(errorCode);
    const message = typeof cause === 'string' ? cause : defaultMessage;
    super(message, typeof cause === 'string' ? undefined : cause);
    // ...
  }
  toResponse(): Response {
    // Returns { type, surface, statusCode, message, code, cause }
  }
}
export { AppError as ChatbotError };
```

---

## 5. Asynchronous & Background Workloads

* **Serverless Timeout Limit:** Next.js route handlers capped at 60s max execution (`export const maxDuration = 60`).
* **Background Tasks:** Long-running tasks (>5s, e.g., PDF parsing, GraphRAG compilation) MUST be dispatched to `@/lib/queue`.
* **Non-Blocking Hooks:** Use Next.js `after()` (`import { after } from 'next/server'`) for non-blocking logging, telemetry, or cache invalidation after returning responses.

---

### Logging Conventions

- **Server-side (`lib/`):** Use structured logging. Never use raw `console.log` in production code. Use `console.error` for genuine errors only.
- **Client-side (`components/`):** `console.warn` for development-only warnings is acceptable. Remove or guard with `process.env.NODE_ENV` checks.
- **API Routes (`app/api/`):** Log request context (method, path, userId) on errors. Never log sensitive data (API keys, passwords, tokens).
