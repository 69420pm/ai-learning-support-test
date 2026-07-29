# Epic: [Feature Name]

## 1. Overview & Vision
[Explain what we are building and why. Who is it for? Keep it concise.]

## 2. Technical Architecture & Package Layering
[Explain the system design. You MUST categorize all new components into their strict monorepo layers based on `rules/package-architecture.md`:]

- **`packages/infrastructure`**: [List external API clients, DB drivers, SDKs, or third-party adapters here]
- **`packages/core`**: [List pure domain workflow orchestrators and business logic here (NO external I/O)]
- **`apps/web`**: [List UI components, Next.js pages, and thin API route controllers here]
- **`packages/shared`**: [List zero-dependency domain entities, types, and DTOs here]

## 3. Out of Scope
[What are we explicitly NOT building in this Epic?]

## 4. Implementation Steps
[Break the feature down into sequential implementation steps. Each step must be exactly one agent implementation large (one unit of reviewable code in one session for a human). For each step, provide a clear, AI-verifiable Definition of Done.]

### Step 1: [Name of Step 1]
- **Goal:** [Brief description]
- **Definition of Done:** [AI-verifiable steps, e.g., "Run dev server, navigate to `/path`, verify success state visually."]
