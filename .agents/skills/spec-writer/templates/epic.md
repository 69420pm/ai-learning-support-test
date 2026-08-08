# Epic: [Feature Name]

## 1. Overview & Vision
[Explain what we are building and why. Who is it for? Keep it concise.]

## 2. Technical Architecture & Directory Placement
[Explain the system design. You MUST categorize all new components into their directory locations based on `rules/single-app-architecture.md`:]

- **`lib/`**: [List domain orchestrators, AI providers, DB schemas, or queue workers here]
- **`components/`**: [List React UI components here]
- **`app/`**: [List Next.js App Router pages and thin API route handlers here]

## 3. Out of Scope
[What are we explicitly NOT building in this Epic?]

## 4. Implementation Steps
[Break the feature down into sequential implementation steps. Each step must be exactly one agent implementation large (one unit of reviewable code in one session for a human). For each step, provide a clear, AI-verifiable Definition of Done.]

### Step 1: [Name of Step 1]
- **Goal:** [Brief description]
- **Definition of Done:** [AI-verifiable steps, e.g., "Run dev server, navigate to `/path`, verify success state visually."]
