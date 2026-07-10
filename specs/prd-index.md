# AI Learning Support — Product Requirements Documents (PRDs)

This directory contains domain-specific Product Requirements Documents (PRDs) for the AI Learning Support system.

---

## Index of PRDs

### 1. [Product Vision & Learning Strategy](prds/01-product-vision.md)
* **Scope:** Executive summary, problem statement, core value proposition, active guidance paradigm, target persona, document-grounded learning, strategic goals, and non-goals.
* **Target Packages:** `apps/web`, `packages/core`.

### 2. [Material Ingestion & Knowledge Structuring](prds/02-material-ingestion-knowledge-structing.md)
* **Scope:** PDF extraction, hierarchical Table of Contents document trees, multi-level summaries, low-cost concept mapping, and hybrid contextual retrieval (Proposed / In Review).
* **Target Packages:** `packages/core/src/features/parser`, `packages/core/src/features/graphrag`.

### 3. [Learning Plan & Analytics](prds/03-learning-plan-analytics.md)
* **Scope:** Dynamic learning schedule synthesis, visual milestones timeline UI, progress tracking states, and struggle analytics for automated remediation.
* **Target Packages:** `packages/core/src/features/planner`, UI timeline components.

### 4. [Guided Encoding (Active Study Phase)](prds/04-guided-encoding-study.md)
* **Scope:** Pre-reading scientific priming, dynamic scaffolded detail levels, strict context grounding (RAG), and interactive reading checks.
* **Target Packages:** Study session UI, prompt grounding handlers, reader orchestrators.

### 5. [Active Recall & FSRS Review](prds/05-active-recall-fsrs-review.md)
* **Scope:** Automated flashcard generation, Feynman audit evaluation, Free Spaced Repetition Scheduler (FSRS) integration, and interleaved review sessions.
* **Target Packages:** `packages/core/src/features/scheduler`, flashcard UI, Feynman scoring engine.

### 6. [Pedagogical Science Engine](prds/06-pedagogical-science-engine.md)
* **Scope:** Core cognitive science engine enforcing active recall gates, FSRS review interval calculation, interleaved review queues, and Feynman concept explanation audits.
* **Target Packages:** `packages/core/src/features/pedagogy`, `packages/core/src/features/scheduler`.

### 7. [Business Model & Licensing Strategy](prds/07-business-model-licensing.md)
* **Scope:** Dual-licensing strategy (ELv2 source-available vs Hosted Cloud SaaS), competitive differentiation, monetization, self-hosting privacy rights, and SaaS subscription tiers.
* **Target Packages:** Root repository, `apps/web`.

### 8. [Developer LLM Chat Playground](prds/08-llm-chat-playground.md)
* **Scope:** End-to-end streaming chat playground, sidebar reorganization (collapsible left panel for document upload and list, main panel for general-purpose LLM streaming chat), and server-side swappable environment configuration (Google Gemini or OpenAI-compatible providers).
* **Target Packages:** `apps/web`, `packages/core`, `packages/shared`, `packages/infrastructure`.
