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
















## Original text
When learning for school, university or anything else and you ask AI to clarify something on a slide, a solution of an exercise or anything else related to the topic, it gives you most of the time really good answers and often it then clicks in your head why something is the way it is. Especially in STEM subjects or ecoomics I personally find it very helpful. That's why I thought about can't we just somehow optimize this utilization of AI for learning. Also we need to consider that AI often is taking the mental load that usually generates learning from the user and promotes laziness. This must get absolutely adressed.
This is a really abstract idea, so I first want to narrow it down to be more specific. In a normal STEM course at university through the semester you have lectures mostly as pdf slides (around 1000 slides), exercise sheets and when you are lucky some old exams. At the end of the semester one large exam takes place that is 100% of the grade.
I thought about solving this type of learning with an AI Learning Support System. First a few strict requirements for such a system:
- the learning/understanding should happen in the brain of the user and nowhere else
- the system should not make learning too easy or promote laziness, it should remove all unnecessary mental load that is still necessary in a classical learning environment but doesn't facilitate understanding (e.g., searching for information, organizing notes, understanding bad/incomplete explanations etc.)
- the system should orient itself closely at the original learning material to reduce hallucinations

Now to my proposed system: Learning consists of two main parts, understanding the material also known as encoding the information in the brain of the user that at a specific point in time can understand the content deeply, place it in the big picture and just be an expert. The second part is to stretch this single point of time understanding into a longer period like multiple months that the user still knows at the end of the semester in the exam what he did on day one and that he can also pulls the information fast and effortless out of his brain. We call this phase recall.
Before explaining how these phases will work we start with outlining the context of the system. Before learning anything the user uploads all slides, exercise sheets and old exams into the system. For simplicity we pretend the user has all of them in pdf format and has access to all of them multiple weeks or months before the "exam" or a point where the user must have mastered all of this.
This material needs to get brought into a representation that it is easily accessible by an llm that can make tool calls. Dumping everything is no option due to quality and cost reasons. When having access to this data the llm should exactly know what is in the material and what not to reduce hallucinations and that the llm doesn't teach the user stuff that is not in the material. By having an overview of what is there and what not it should also be able to create a plan, when having access to old exams, what is possibly important and what not. Furthermore the system should easily search this material and pull out relevant information or exercises. But a basic search that just pulls a text excerpt to a given prompt is not enough. The system should be also able to understand how topics are connected to each other, what is a subtopic of what and thus needs to get teached after understanding the parent topic. Which exercise is covering which content of the material, when talking about topic X maybe topic Y needs to get also mentioned. This understanding is more than a Ctrl+F search and probably needs some form of a graph representation of the material.
Now how i think we can practically implement these requirements: An llm will get all material and output a large table of contents for everything, llms are exceptionally good at broad summarization of content. This table of contents acts as a map for the llm what is in the material and what not. Then the entire material gets chunked and embedded into a vector database that the llm can vector search everything, so we have a Ctrl+F search that is more semantic. The creation of graph will be the hardest part, we need some form of cheaper GraphRAG (Microsoft already tried something like this) that builds this graph representation with respect to exercises. These 3 tools are available to the llm to hopfully make it an expert in the material.
Before we can start with encoding the system needs to get to know the user. What does he know, what does he not know, on what type of questions does he struggle etc. This will be done before starting with anything by just letting him answering a few multiple choice questions and some open questions. This entire memory of the user will be stored in free to write and read markdown files that the llm can access. This memory is live and will get updated all the time by the llm.
Lets finally start with the encoding phase: First we need to find out what makes the most sense to start with, often the original order of the topics in the material pdf is not a bad start but it still should work when the pdfs are disorganized. Also it is better if the llm first creates a really broad overarching learn plan from start to finish to have a big picture to follow in all following learning sessions. This plan however should be flexible and adapt to the user's progress and learning style that maybe crystalizes during learning.
This plan will be a markdown file explaining the roadmap to follow and taking the goals of the user into account. The llm will build this plan together with the user by asking him questions and letting him monitor it. Because when we start with a garbage plan where the order doesn't make sense or important topics are entirely missing, every step further will be flawed.
When the plan is set the llm actually starts teaching the user and encoding the information into his brain. We try to follow scientifically proven techniques here to optimize the process. First the llm gives the user a quick big picture of the topic they will cover in this section, maybe draw him a quick mermaid diagram, that the user already understands the why and the connections that will follow. With every step this broad scaffolding gets filled out more and more with information till everything got covered. The llm mostly presents original information from the slides with further explanations. Also quick llm generated questions get asked during it that the user stays active and the llm can judge whether how the user he understands it. The user can and should ask the llm questions all the time about the content. At the end of such a session a user should have deeply understood the given material.
Now we come to the part that has the same importance or even more than the encoding the recall. Science says active recall is the most high value technique there is for human learning. The llm keeps track of the state of every topic how well the user understood it and can recall it, similar to the score of an anki card. According to this score and spaced repetition it asks the user active recall questions or creates flashcards for him where it makes sense e.g. information you have to learn by heart, no overusage of flashcards. The goal is that the recall process covers the topics from all angles and gets harder with time for well understood and recalled topics to really consolidate this information into the human brain. 
With time when for example all topics got covered for an old exam or normal exercises it gets thrown into the recall phase to test the user on original material and train him similar like the exam will probably be. This is really important the quality of the active recall questions and flashcards must be really good and close to the material and way the old exams or exercises test it. We need to find a middle ground between the llm is really creative and asks random questions about the topics (underfitting) and that the user learns old exams questions and solutions by heart (overfitting). But always keep in mind exercises and old exams have a high signal but are not always the highest quality e.g. when the professor changed from last year to this or the exams are just summaries of students.

This is my take on a system that can potentially work in this specific scenario (slides, exercises, old exams) to try to optimze the learning of student and make his life easier and letting him waste less time learning inefficient. 
This is an approach I just thought about, I haven't tried anything yet. Also we have to implement evaluations of the performance of this system to actually see which features help and which don't and to improve the llm prompts. It also is a fairly exhaustive mvp version but i think when stripping more of it the quality degrades too much and also this mvp can probably get implemented in a few days to see it in action and see whehter it helps or not.
