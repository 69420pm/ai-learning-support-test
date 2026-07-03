# PRD 05: Active Recall & Spaced Repetition (Review Phase)

---

## 1. Document Control

| Attribute | Value |
| :--- | :--- |
| **Product Name** | AI Learning Support |
| **Domain** | Active Recall, Feynman Audits & Spaced Repetition |
| **Version** | 1.0.0 |
| **Status** | MVP Draft |
| **Last Updated** | 2026-07-03 |

---

## 2. Overview & Requirements

This document specifies the review mechanisms used to lock knowledge into long-term memory via spaced repetition and conceptual testing.

### 2.1 Automated Flashcard Ingestion
- Automatically generate atomic, targeted flashcards from extracted core concepts and key facts during document preprocessing.
- Support standard Q&A, cloze deletion, and concept-definition card formats.

### 2.2 Feynman Audits
- Prompt the user to explain a complex topic in their own plain language (as if teaching a beginner).
- Evaluate the user's explanation against the document ground-truth using LLM evaluation.
- Identify misconceptions, missing key points, or jargon reliance, providing immediate constructive feedback.

### 2.3 FSRS (Free Spaced Repetition Scheduler) Integration
- Schedule card reviews using the modern **FSRS** algorithm to calculate optimal review intervals based on user rating history (Again, Hard, Good, Easy).
- Adapt interval calculations per user memory model to optimize retention while minimizing total review count.

### 2.4 Interleaving Review Sessions
- Algorithmically mix cards and audit prompts from different modules and topics in a single study session.
- Prevents rote memorization and forces the brain to discriminate between related concepts in context.
- Leverage concept graph and summary helper data for fast, token-efficient retrieval during review sessions.
