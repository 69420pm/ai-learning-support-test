# AI Learning Support


## 1. Motivation & Context
When students use AI to clarify concepts from lectures or exercises, it often leads to a "click" in their heads—especially in STEM or economics. However, while AI is a powerful learning tool, it often takes on the mental load required for true learning, inadvertently promoting laziness. This system aims to optimize AI utilization for education by explicitly addressing this flaw.
The Target Scenario:
A standard university STEM course where a student must master a large volume of material over a semester, culminating in a single final exam worth 100% of the grade.
• Material: ~1,000 PDF slides, exercise sheets, and (if lucky) old exams.
• Timeline: All material is accessible in PDF format weeks or months before the final exam.
## 2. Strict System Requirements
To ensure the system facilitates genuine education rather than just providing easy answers, it must adhere to three core principles:
1. Learning happens in the user's brain: The AI is a facilitator, not a replacement for the student's cognition.
2. No promotion of laziness: The system must not make learning "too easy." It should preserve the productive struggle of learning while removing unnecessary mental load that doesn't facilitate understanding (e.g., searching for files, organizing notes, or decoding bad/incomplete explanations).
3. Strict adherence to source material: The system must orient itself closely to the original learning material to drastically reduce hallucinations and prevent teaching out-of-scope concepts.
## 3. Data Processing & Knowledge Representation
Dumping all PDFs into an LLM's context window is not viable due to cost and quality limitations. The system must process the uploaded material (slides, exercises, old exams) into a structured format so the LLM knows exactly what is—and isn't—in the curriculum.
The AI will utilize three main tools to become an "expert" on the specific course material:
• Master Table of Contents (Map): The LLM generates a massive, broad summary and table of contents for all material. This acts as a map to guide the AI, outline the scope of the course, and help create study plans.
• Vector Database (Semantic Search): All material is chunked and embedded into a vector database. This provides the LLM with a highly semantic "Ctrl+F" capability to pull exact excerpts.
• Graph Representation (Cheaper GraphRAG): Standard search is insufficient for understanding relationships. The system needs a graph structure (similar to Microsoft's GraphRAG experiments) to map out how topics connect, identify parent/subtopics, and link specific exercises to their corresponding theoretical concepts.
## 4. User Profiling & Live Memory
Before any teaching begins, the system must get to know the user.
• Initial Assessment: The user answers multiple-choice and open-ended questions to establish a baseline of what they know, what they don't, and where they typically struggle.
• Live Markdown Memory: The user's profile is stored in free-to-read-and-write Markdown files. The LLM continuously updates these files as it observes the user's progress, learning style, and changing weaknesses.
## 5. The Learning Process
The system divides learning into two scientifically backed phases: Encoding (understanding) and Recall (retention).
Phase 1: Encoding (Understanding the Material)
The goal of encoding is to bring the user to a point where they deeply understand the content, see the big picture, and act as an expert at that specific moment.
1. Dynamic Learning Plan: • The LLM and user collaboratively build a broad, overarching roadmap in a Markdown file, taking the user's goals into account. • Crucial Step: The user monitors and approves this plan. Starting with a "garbage plan" (bad order or missing topics) will flaw the entire process. The plan remains flexible to adapt to the user's evolving learning style.
2. The "Big Picture" First: Before diving into details, the LLM provides scaffolding. It might generate a quick Mermaid diagram to explain the why and show how upcoming concepts connect.
3. Active Teaching: • The LLM fills in the scaffolding step-by-step using original information from the slides, supplemented by clear explanations. • The user is encouraged to ask questions constantly. • The LLM asks quick, intermediate questions to keep the user active and gauge their comprehension.
Phase 2: Active Recall (Long-Term Retention)
The goal of recall is to stretch that single moment of understanding across multiple months so the user can pull information fast and effortlessly during the exam. Science shows active recall is the highest-value technique for human learning.
• Spaced Repetition & Topic Scoring: The LLM tracks the user's mastery of every topic, assigning it a "score" similar to an Anki card.
• Progressive Difficulty: As topics become better understood, the active recall questions get progressively harder to deeply consolidate the information.
• Smart Flashcards: The system generates flashcards only where it makes sense (e.g., information that must be learned by heart). It actively avoids the over-usage of flashcards.
• Exam/Exercise Integration: Once topics are covered, original exercises and old exams are thrown into the recall phase. This trains the user in the exact format they will be tested on.
• Quality Control (Avoiding Over/Underfitting): The LLM must find a middle ground. It shouldn't be so creative that it asks random, irrelevant questions (underfitting), nor should it just let the user memorize old exam solutions by heart (overfitting). • Note: While old exams provide a high signal of what is important, they can vary in quality (e.g., if the professor changed, or if the "exams" are just student-written summaries).
## 6. Implementation & Evaluation Strategy
• MVP Feasibility: While this is an exhaustive Minimum Viable Product (MVP), stripping away core features would likely degrade the quality too much. Fortunately, the core of this MVP can likely be implemented in a few days to see it in action.
• Metrics & Evaluation: The system must include evaluation mechanisms to track user performance. This data is essential to identify which features are actually helping, which are failing, and how to iterate and improve the LLM prompts over time.
