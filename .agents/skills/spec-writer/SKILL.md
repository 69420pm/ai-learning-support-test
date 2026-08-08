---
name: spec-writer
description: Use this skill whenever the user asks to design, specify, architect, or write requirements for a new large feature, system, or "epic". It is highly recommended to brainstorm and discuss the feature with the user first. Once the technical choices and vision are clear (or when the user explicitly says "write the epic"), trigger this skill. This skill creates an Epic document, splits the work into implementation steps, defines AI-verifiable Definitions of Done for each plan, and generates Architectural Decision Records (ADRs) for major technical choices.
---

# Spec Writer (Epic Generator)

You are responsible for designing large features and systems by creating **Epics**. An Epic acts as a combined product and technical document. Your output is an Epic, and potentially one or more Architectural Decision Records (ADRs).

## Your Responsibilities

1. **Context Gathering & Pre-flight Rules**
   - Always read `AGENTS.md` to understand the broad project context and landmines.
   - **MANDATORY**: You MUST read `rules/single-app-architecture.md` to learn directory boundaries and import rules before you design any technical architecture.
   - Understand the user's feature request fully before writing.

2. **Drafting the Epic**
   - Create a new markdown document for the Epic in `specs/epics/` (create the directory if it doesn't exist).
   - Use the exact template provided in `templates/epic.md`.
   - The Epic must cover both the "what" (Product Vision) and the "how" (Technical Architecture).
   - Ensure the technical architecture strictly adheres to single-app directory boundaries (`app/`, `components/`, `lib/`).

3. **Generating ADRs**
   - **ADR Granularity Rule**: Never create a 'catch-all' ADR. Each ADR MUST cover exactly ONE single architectural decision. If a feature involves multiple major choices, create multiple numbered ADRs.
   - **Single-App Directory Boundaries**: Before specifying technical architecture, you MUST read `rules/single-app-architecture.md` and verify layer placement (e.g., AI/DB/queue logic -> `lib/`, UI -> `components/` or `app/`).
   - **Conciseness & AI Consumption Rule**: ADRs are primarily read by AI agents with finite context windows. You MUST use extreme conciseness. Do not include introductory fluff. Do not repeat the same point across different sections. An ADR should rarely exceed 30-40 lines.
   - Create the ADR in `specs/adrs/` and use the template provided in `templates/adr.md`.
   - Link to the generated ADR(s) from within the Epic.

4. **Defining Implementation Steps & Definitions of Done (DoD)**
   - At the end of the Epic, split the entire feature into a sequence of implementation steps.
   - **Crucial Sizing Rule:** Each step should be sized to be exactly **one agent implementation large**. That means one unit of reviewable code that a human can easily review in one session. Do not make steps too massive.
   - Each step will be executed by another skill/agent later. *Do not write the detailed implementation plans yourself.* Just define what the step is.
   - For each step, you MUST write a broad, robust **Definition of Done (DoD)** designed to be verified by an AI agent (like the `agentic-ui-verification` skill). 
   - Good DoDs for AI include executable tasks: "Start the web app using `pnpm dev`, navigate to `/feature-url`, click the 'Submit' button, and verify the resulting success state visually using screenshots."
