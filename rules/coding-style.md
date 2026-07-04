# Coding Styles

Rules for writing TS/React/Next.js code. Formatting, casing, import order,
`any`, unused code, and hook-deps are enforced by Biome — do NOT restate them here.
This file covers only judgment the linter can't make. Follow it exactly.

## Principles
- Optimize for the reader, not the writer. Code is read far more than written.
- Prefer clarity over cleverness. No premature abstraction — duplicate twice
  before extracting a shared helper (rule of three).
- Smallest correct change. Don't refactor unrelated code in a feature commit.

## Naming
- Names describe intent/domain, not type or implementation
  (`activeUsers`, not `arr` / `dataList`).
- Booleans read as predicates: `isLoading`, `hasAccess`, `canEdit`, `shouldRetry`.
- Functions are verb phrases (`fetchInvoice`, `normalizeEmail`); values are nouns.
- Event handlers: `handleX` for the impl, `onX` for the prop.
- No abbreviations except industry-standard (`id`, `url`, `db`). No Hungarian notation.
- Avoid vague nouns: `data`, `info`, `manager`, `helper`, `util`, `stuff`.

## Functions
- One job per function. If you need "and" to describe it, split it.
- Keep them short; extract when a block needs a comment to explain what it does.
- Max ~3 positional params. Beyond that, take a single options object.
- Guard clauses + early returns over nested `if/else`. Fail fast at the top.
- No boolean "mode" flags that change behavior — make two functions.
- Pure by default: no hidden side effects; don't mutate inputs. Return new values.

## TypeScript
- Make illegal states unrepresentable. Prefer discriminated unions over
  optional-flag soup:
  `{ status: 'loading' } | { status: 'error'; error: Error } | { status: 'ok'; data: T }`.
- Type the domain, not the primitive. Avoid stringly-typed code; use unions
  (`'draft' | 'published'`) or branded types for IDs.
- Never use `as` to silence the compiler. Narrow with type guards / `in` / schema
  validation instead. `as const` is fine; `as unknown as T` is banned.
- Validate all external data (API, forms, env, `localStorage`) at the boundary
  with a schema (e.g. Zod) and infer types from it — don't hand-write duplicate types.
- Prefer inference for locals; write explicit types at exported/public boundaries.
- Model absence with a single mechanism per field; avoid `null | undefined` together.
- No enums — use `as const` object + union type.

## React
- Components are pure render functions of props/state. Side effects live in
  event handlers or `useEffect` — never during render.
- `useEffect` is a last resort. Don't use it to transform props into state
  (derive during render) or to react to user events (do it in the handler).
- Composition over configuration: pass `children`/slots instead of many
  boolean props. Split a component when it renders unrelated concerns.
- Lift state only as high as needed; keep it colocated otherwise.
- Keys must be stable domain IDs, never array index or random values.
- Derive, don't duplicate: never store in state what can be computed from props/state.
- Keep JSX flat; extract a subcomponent instead of deeply nested ternaries.
- Custom hooks for reusable stateful logic; name them `useX` and return
  a stable, minimal shape.

## Next.js (App Router)
- Server Components by default. Add `'use client'` only when you need
  interactivity, browser APIs, or hooks — and push it to the leaves.
- Fetch data on the server; never expose secrets or call internal DBs from client code.
- Keep `'use server'` actions thin: validate input, delegate to a service, return typed result.
- Co-locate route-specific components; promote to `shared/` only when reused.

## Async & errors
- No floating promises — `await` or explicitly handle every promise.
- Run independent async work concurrently (`Promise.all`), not sequentially.
- Throw `Error` (or subclasses) with actionable messages; never throw strings.
- Catch only where you can add context or recover; otherwise let it propagate.
- Handle the failure/empty/loading path explicitly — don't assume the happy path.
- Never swallow errors silently (empty `catch`). Log with context or rethrow.

## Comments
- Explain *why*, not *what*. The code shows what; comments justify non-obvious decisions.
- Comment tradeoffs, workarounds, invariants, and links to issues/specs.
- No commented-out code, no changelog/TODO-with-name noise — use git and the tracker.
- Keep comments truthful: update or delete them when the code changes.

## Structure
- One primary export per file; file name matches it.
- Order top-down: exported/public API first, helpers below (readable as prose).
- No barrel `index.ts` files that re-export whole folders (hurts tree-shaking/clarity).
- Keep modules cohesive — group by feature/domain, not by technical layer.

## Testing
- Test behavior and public contracts, not implementation details.
- Names state the expectation: `returns 401 when token is expired`.
- Cover edge cases: empty, boundary, error, and concurrent paths.
- No logic in tests (no loops/conditionals deciding assertions); keep them flat and obvious.
