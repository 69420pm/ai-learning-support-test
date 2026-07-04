# PRD 04: Guided Encoding (Active Study Phase)

---

## 1. Document Control

| Attribute | Value |
| :--- | :--- |
| **Product Name** | AI Learning Support |
| **Domain** | Active Study & Guided Encoding |
| **Version** | 1.0.0 |
| **Status** | MVP Draft |
| **Last Updated** | 2026-07-03 |

---

## 2. Overview & Requirements

This document specifies the interactive reading and active encoding features that turn passive reading into cognitive engagement.

### 2.1 Scientific Priming
- Prompt the user with baseline questions or prediction prompts *before* introducing a new concept.
- Activates prior knowledge structures, increasing subsequent retention and engagement.

### 2.2 Scaffolded Detail Levels
- Present concept explanations in dynamic levels of depth (e.g., intuitive analogy -> high-level summary -> deep technical detail).
- Adapt explanation depth on-the-fly based on immediate user comprehension feedback to prevent cognitive overload.

### 2.3 Strict Context Grounding
- Enforce strict system prompt rules and RAG retrieval boundaries to ensure explanations are 100% grounded in uploaded source materials.
- Eliminate hallucinations and out-of-scope external facts unless explicitly requested.

### 2.4 Interactive Checks & Retrieval Helper Data
- Interject quick comprehension checks throughout reading flows to interrupt passive skimming.
- Utilize pre-computed graph nodes, summaries, and directory mappings to minimize LLM token usage and maximize response relevance during interactive sessions.
