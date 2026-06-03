---
name: convert-plan-to-issue
description: Use when you need to convert an implementation plan into individual, atomic GitHub issues.
---

### Objective
Deconstruct a high-level technical implementation plan into a series of independent, atomic, and actionable GitHub issues. Submit each issue to the repository using the provided helper command and establish dependencies between them.

### Step-by-Step Instructions

1. **Locate the Plan**:
   - Read the target implementation plan from the `specs/plan/` directory.

2. **Deconstruct the Plan into Atomic Issues**:
   - Divide the plan into sequential, manageable parts. Each part must represent a single, atomic unit of work that can be implemented and tested independently.
   - For each issue, write a clear title and draft the body following [ISSUE_TEMPLATE.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.github/templates/ISSUE_TEMPLATE.md).

3. **Define Relationships**:
   - Identify dependencies between issues (e.g., Issue B cannot start until Issue A is done).
   - When creating issues, reference the related issues by their number (e.g., `Depends on #123`).
   - *Tip*: Since `make generate-issue` outputs the URL of the created issue, you can capture the issue number and reference it in subsequent issue submissions.

4. **Submit the Issues**:
   - For each issue, call the `make generate-issue` command:
     ```bash
     make generate-issue TITLE="Issue Title" BODY_FILE="path/to/issue_body.md" LABEL="optional-label"
     ```
   - Ensure you pass the exact title and the path to a temporary file containing the populated template body.
