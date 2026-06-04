# AI Learning Support - Product Requirements Document
---
### Metadata
|  | |
| --- | --- |
| **Last Updated ** | 2024-06-01 |
| **Version** | 1.0 |
| **Status** | MVP|

# 1. Overview
This document describes the product requirements for the AI Learning Support project. The project aims to create a system uses AI agents/workflows to support users in learning basically anything that you can learn in text form (university, school, business, for life, ...). The system will actively apply learning science principles to optimize the learning process and take over the "grunt work" of learning (e.g. note-taking, summarization, flashcard creation, spaced repetition scheduling, etc.) so that users can focus on the actual learning and application of knowledge. The system will be designed to be flexible and adaptable to different learning styles and goals, and will leverage the latest advancements in AI to provide personalized support and guidance throughout the learning journey.

# 2. Context & Background
In the educational realm currently AI (especially the ChatGPT and Gemini App) gets often abused to skip the hard part of learning and solving problems. Using AI feels really productive and rewarding in the short term, however in the long term users end up without actually learning much, because the work is not happening in their brain. This is a bad advancement and should be fixed.
However also AI can be really really beneficial for learning if used in the right way. E.g. automate the tiring work of creating flashcards, giving context around a topic, answering any imaginable question about a topic, creating learning plans, etc. 
Furthermore a lot of students learn without applying the learning science principles that are effective for learning, and make learning much more efficient. The main techniques are here active recall, spaced repetition, interleaving, etc. These techniques get not used by a lot of students because they are unintuitive, often are complex to actually implement them into your learning process and often feel really counterproductive. 
However with the power of AI we can try to minimize the friction of applying these learning science principles and minimize the burocratic overhead of learning, that the user can focus entirely on the learning itself, that is happening in the user's brain and nowhere else.

# 3. Goals & Non-Goals
## Goals
- User uploads content they want to learn (e.g. a textbook, lecture slides, an article, etc. in PDF format) and it is available for the LLM in all subsequent steps.
- User formulates goals for learning (e.g. A+ in the exam, understand the topic to apply it in real life, pass-only limits) and the system uses these goals to optimize the learning process.
- System creates a learning plan based on goals, optimized for learning efficiency.
- System guides the user according to the learning plan and guides him through the learning process.
- It is possible to change the learning plan, goals, and uploaded content at any time.

## Non-Goals
- No support for non-textual assets (e.g. art/images, videos, audio files) in the first phase.
- No native PDF annotation or editing tools inside the application (keep it to a clean PDF viewer/viewer integration).
- No collaborative or social learning tools (fully single-user focused for the MVP).
- No offline desktop application wrapper (fully web-based).

# 4. High-Level Architecture

## Preprocessing & GraphRAG
- Parse uploaded PDFs and extract text.
- Generate a simplified conceptual knowledge graph (cheap GraphRAG) outlining how topics relate to each other. This is built from the start to significantly boost prompt grounding and answering quality.
- Generate summaries of the content at different levels of granularity.
- Generate a table of contents with mapped links to the original PDF locations, summaries, and the knowledge graph to avoid bloating the LLM context window.

## Learning Plan Generation
- Generate a visual learning plan based on user learning goals that tracks progress, highlights completed topics, and notes areas where the user struggled.

## Encoding (Active & Guided)
- Guide the user to encode new concepts using structured scientific priming.
- Present content with varying detail levels, adapting to user struggles to build strong mental models without overwhelming them.
- Ground explanations strictly in the uploaded PDF to prevent hallucinations.
- Make encoding interactive (e.g., pre-reading predictions, quick questions) to prevent passive reading loops.

## Recall (Active Retrieval)
- Automatically generate high-quality flashcards based on core concepts.
- Use the Feynman technique, prompting the user to explain concepts in their own words.
- Schedule reviews programmatically using the **Free Spaced Repetition Scheduler (FSRS)** algorithm.
- Implement interleaving (mixing different topics during recall sessions) to reinforce retention.

## Tech Stack & Hosting
- **Application Type:** Web Application.
- **Frontend & Backend API:** Next.js hosted on Vercel.
- **Database:** Supabase (Postgres for managing user profiles, learning plan state, flashcards, and FSRS metadata).
- **Storage:** Supabase Storage (for hosting uploaded PDFs).
- **Cost Model:** Strictly designed around utilizing the free tiers of Vercel, Supabase, and AI API providers (e.g., Gemini Flash free tier) to ensure the MVP operates at $0/month.

# 5. Financial Viability and Competitors
- Everything should be built with reducing tokens and only using the smartest model needed in mind to drastically reduce LLM API costs, without compromising the quality.
- Minimize token usage by caching queries, using smart chunking, and utilizing cheaper models (e.g., Gemini 1.5 Flash) for processing-heavy jobs (like GraphRAG generation and initial summaries).
- Ensure competitive differentiation by offering an active learning loop instead of the passive QA offered by general-purpose LLM chat apps.

# 6. Questions & Open Issues
- **Vercel Execution Limits:** Processing large PDFs (GraphRAG generation, deep summarization) might exceed Vercel's serverless function timeout limits (typically 10-60s on free tiers). We need to design an asynchronous queue or chunk-by-chunk ingestion process. Or maybe are there better solutions, we don't have to only use vercel.
- **GraphRAG Schema:** Define the exact node/edge structure of our "cheap GraphRAG" to prevent over-complicating entity extraction.
