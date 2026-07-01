# Coding Standards

* **Monorepo Dependency Flow:**
  * Application layer (`apps/web`) may depend on core orchestrators (`packages/core/src/services/*`).
  * Core orchestrators coordinate feature modules and adapters.
  * Feature modules (`packages/core/src/features/*`) must be framework-agnostic, pure data-in/data-out modules. No database client imports, and absolutely no cross-imports between features.
* **TypeScript Strictness:**
  * Use strict type definitions. Avoid `any` type annotations. Use explicit return types for public service signatures.
* **Clean Code:**
  * No loose `console.log` statements. If logging is required, use a proper logger wrapper or service.
