# Research: Knowledge Granularity & Memory Representation

## 1. What is a "Knowledge Unit"?
In the context of Intelligent Tutoring Systems (ITS) and Cognitive Load Theory, learning involves organizing information into **schemas**--mental frameworks stored in long-term memory. A "knowledge unit" or **Knowledge Component (KC)** can vary in granularity:
- **Fine-grained KCs:** Atomic facts, definitions, or single steps in a procedure. These are highly specific and easy to test but can lead to overly complex models.
- **Coarse-grained KCs:** Broader concepts, schemas, or mental models that require integration of multiple fine-grained KCs. These represent true mastery but are harder to measure directly.

The brain forms retrievable memories at both levels: isolated facts (via rote accretion) and complex schemas (via tuning and restructuring).

## 2. FSRS vs BKT Granularity
- **FSRS (Free Spaced Repetition Scheduler):** Operates at the **item level** (e.g., individual flashcards). It tracks memory states using Difficulty, Stability, and Retrievability (DSR). It is optimized for preventing forgetting of specific, atomic facts.
- **BKT (Bayesian Knowledge Tracing):** Operates at the **concept/skill level**. It tracks the probability of mastery $P(L_n)$ of a KC based on a sequence of opportunities to apply the skill.

**Can they coexist? Yes, in a Two-Tier Model.**
- **Tier 1 (Item-Level):** FSRS handles the scheduling and tracking of atomic recall items.
- **Tier 2 (Concept-Level):** BKT (or similar latent models) infers conceptual mastery by aggregating data from Tier 1 item performance, as well as complex problem-solving tasks.

## 3. Prerequisite Graph Granularity
Prerequisite graphs should typically be mapped at the **concept level** (e.g., topics, textbook sections, or cohesive sub-skills).
- Nodes represent these coarse-grained concepts.
- Edges represent prerequisites (e.g., Concept A must be mastered before Concept B).
- **Mapping to items:** Multiple fine-grained items (FSRS flashcards or single questions) are attached to each node. Mastery of the node is evaluated by assessing the related items.

## 4. Schema Theory & Mastery Tracking
A **schema** can be modeled as a data structure similar to a **Semantic Network or Knowledge Graph**, where nodes are facts/concepts and edges are the relationships between them.
- **Mastery tracking of schemas:** Tracking mastery under schema theory means moving beyond isolated recall. It requires measuring the student's ability to integrate information, form connections, and apply the schema to novel problems.
- Assessments for schemas involve concept mapping, comparative analysis, and evaluating the transition from novice accretion to expert restructuring.

## Recommendation: Two-Tier Knowledge Model
For the AI Learning Support system, we recommend a **Two-Tier Knowledge Model**:

1. **Tier 1: Atomic (FSRS) Layer**
   - Tracks individual facts, definitions, and procedures using FSRS DSR parameters.
   - Granularity: Flashcard / single-step question.
   - Purpose: Ensure foundational building blocks are retained in long-term memory.

2. **Tier 2: Conceptual (BKT & Graph) Layer**
   - Tracks mastery of broader topics and schemas using BKT over a prerequisite graph.
   - Granularity: Topic / Skill / Schema.
   - Purpose: Direct the overall learning path, suggest next topics, and evaluate deep understanding. Data from Tier 1 performance feeds upward to inform Tier 2 mastery probabilities.

This hybrid approach leverages the precision of spaced repetition for retention and the pedagogical power of knowledge tracking for curriculum sequencing.