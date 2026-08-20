# AI Learning Support

A document-grounded active learning platform combining material ingestion, GraphRAG knowledge structuring, dynamic study plans, and pedagogical science engines (FSRS spaced repetition, Feynman technique evaluation, guided encoding).

## Language

### Ingestion & Knowledge Graph

**Material**:
A source document (e.g. PDF, lecture notes, textbook) uploaded by a learner to anchor study sessions.
_Avoid_: Document, file, upload, resource

**Chunk**:
A semantically coherent text segment extracted from a material and indexed with vector embeddings.
_Avoid_: Snippet, passage, fragment

**Knowledge Graph**:
A structured graph of entities, relationships, and concepts extracted across ingested materials to support multi-hop reasoning.
_Avoid_: Concept map, mindmap, ontology

**GraphRAG**:
Retrieval-Augmented Generation that queries both vector similarity and knowledge graph relationships to ground model responses in materials.
_Avoid_: RAG, vector search, semantic search

### Pedagogical Science & Study

**Learning Plan**:
A structured, goal-oriented study curriculum dynamically synthesized from ingested materials and learner objectives.
_Avoid_: Course, syllabus, curriculum, roadmap

**FSRS (Free Spaced Repetition Scheduler)**:
The mathematical model used to calculate memory stability, item difficulty, and optimal review intervals for spaced repetition flashcards.
_Avoid_: Anki algorithm, SM-2, Leitner system, spaced rep algorithm

**Feynman Audit**:
An active-learning exercise where the learner explains a concept in simple language, evaluated by the AI for gaps, misconceptions, and clarity.
_Avoid_: Quiz, test, exam, comprehension check, oral exam

**Guided Encoding**:
An interactive prompt sequence that prompts the learner to elaborate, generate analogies, or self-test on material before review.
_Avoid_: Tutoring, scaffolding, coaching

### System & Sessions

**Project**:
A top-level organizational boundary (e.g. subject, course, or topic) that groups study sessions, materials, and learning interactions for a learner.
_Avoid_: Workspace, folder, subject, category, course

**Study Session**:
A focused learning interaction bounded by a specific material, topic, or pedagogical exercise (chat, flashcards, Feynman audit).
_Avoid_: Chat session, lesson, class
