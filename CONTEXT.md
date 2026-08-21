# AI Learning Support

A document-grounded active learning platform combining material ingestion, GraphRAG knowledge structuring, dynamic study plans, and pedagogical science engines (FSRS spaced repetition, Feynman technique evaluation, guided encoding).

## Language

### Material Ingestion & Processing Lifecycle

**Material**:
A source document (e.g. PDF, lecture notes, textbook, slide deck, diagram) uploaded by a learner to anchor study sessions.
_Avoid_: Document, file, upload, resource

**Material Ingestion**:
The multi-stage domain pipeline that converts uploaded material binaries into structured Markdown, semantic chunks, and 768-dimensional vector embeddings with page attribution.
_Avoid_: Document parsing, file processing, ETL pipeline, ingestion job

**Ingestion Status**:
The macro-level database persistence state (`pending`, `processing`, `ready`, `failed`) tracking the lifecycle of a material record.
_Avoid_: Ingestion state, job status, processing phase

- `pending`: The material record is created and queued for processing.
- `processing`: Ingestion is actively running across intermediate pipeline stages.
- `ready`: Ingestion completed successfully; chunks and vector embeddings are queryable.
- `failed`: Ingestion encountered an unrecoverable error; error details are recorded.

**Ingestion Stage**:
A granular, transient execution phase within the active ingestion pipeline, reported via progress callbacks and persisted in material metadata.
_Avoid_: Sub-status, job step, pipeline phase

1. `downloading`: Fetching the raw material binary from storage (`lib/storage`).
2. `rasterizing`: Rendering multi-page documents (e.g. PDFs, presentations) into page images (`sharp` / `pdfjs-dist`).
3. `extracting_vision`: Transcribing rasterized page images into structured Markdown via Vision LLMs (preserving diagrams, tables, and handwriting).
4. `chunking`: Splitting Markdown into semantically coherent chunks while preserving page number attribution.
5. `embedding`: Generating dense 768-dimensional vector embeddings for all chunks (`lib/ai/embedding`).
6. `persisting`: Batch inserting chunk records and vector embeddings into PostgreSQL (`material_chunks` table).
7. `completed`: Successfully finalized ingestion; triggers transition to `ready` status.
8. `failed`: Terminal stage triggered on error; records failure stage and message before transitioning to `failed` status.

### Ingestion Architecture & Module Boundaries

**Ingestion Engine (`ingestMaterial`)**:
The transport-agnostic deep module (`lib/materials/ingestion.ts`) that orchestrates the entire ingestion lifecycle, progress tracking, database updates, and failure transitions.
_Avoid_: Ingestion service, queue handler, ingest helper, ingestion worker

**Ingestion Transport Worker**:
A thin queue adapter (`lib/queue/worker.ts`) that dequeues background jobs (e.g. via `pg-boss`) and delegates execution to `ingestMaterial`, suppressing retries on domain failures to prevent API quota exhaustion.
_Avoid_: Heavy worker, ingestion manager, backend daemon

### Ingestion Progress & Metadata Schema

**Ingestion Progress Metadata (`MaterialProgress`)**:
Structured JSON tracking granular progress within `material.metadata.progress`:
- `stage`: Current intermediate `Ingestion Stage` (`downloading`, `rasterizing`, `extracting_vision`, `chunking`, `embedding`, `persisting`, `completed`, `failed`).
- `stagePercent`: Numeric progress percentage (0–100) within the active stage.
- `totalPages`: Total page count for multimodal documents (optional).
- `currentPage`: Current page number being processed (optional).
- `completedPages`: Number of pages successfully processed (optional).

**Ingestion Summary Metadata**:
Summary attributes persisted in `material.metadata` upon successful ingestion:
- `pageCount`: Total count of pages extracted.
- `chunkCount`: Total number of semantic chunks created.
- `tokenCount`: Total token count across all chunks.
- `processedAt`: ISO 8601 timestamp of completion.
- `progress`: Final `MaterialProgress` record (`stage: 'completed'`, `stagePercent: 100`).

**Ingestion Error Metadata**:
Structured failure details persisted in `material.metadata.error` (and mirrored in `material.errorMessage`):
- `message`: Human-readable error description.
- `stage`: The `Ingestion Stage` during which the failure occurred.
- `failedAt`: ISO 8601 timestamp of the failure.
- `progress`: Failure `MaterialProgress` record (`stage: 'failed'`, `stagePercent: 0`).

### Knowledge Graph & GraphRAG

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
