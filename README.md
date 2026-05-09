<!--# README

Goal is to create a simple AI learning support tool that solves the simple problem of teaching a student from start to finish complex contents in a way that the user deeply understands the topics and can apply it in real life. It is the counter idea to a lot of AI usage in the education space right now where the student uses AI to skip the learning process and just gets the answer, which is more like cheating. This tool should leverage AI to help the user actually learn and deeply understand the content to also apply it. 

The data that needs to get learned for example a text book or presentation slides get uploaded to the system by the user. Furthermore the user defines what his learning intentions and goals are, does he need to pass an exam, does he truly want to understand the contents to teach others, does he only want to learn the contents that are important for xyz, ...
Then the system preprocesses the data to get to know the data and after that create a sound sequential learning plan, that makes hierarchical sense and is based on the learning goals of the user.
After this preprocessing the system works through the learning plan with the user while using excerpts from the original material. For example when the ai teaches a specific topic it first tells the user why he should learn this topic and where it fits in the big picture. After that it quotes the original material (or even shows excerpts of pdfs, but that is too complex for now) and the user should then understand the topic, aks questions about it until the user thinks he understands it. Then the system aks questions (when there were questions/exercises in the material they also should get used) about it to check the understanding. If the user does not understand it, the system should try to explain it in a different way, maybe with different examples, until the user understands it. After that the system moves on to the next topic in the learning plan and does the same thing again.

### Preprocessing
First a custom rag gets build (more in custom_rag/ARCHITECTURE.md) to preprocess the data, it gets used further for context retrieval to reduce the amount of tokens used.
Then based on this preprocessing a learning plan gets created that is based on the learning goals of the user, and can get adjusted by the user (not implemented yet)

### Live tutoring (not implemented yet)
The live tutoring follows the learning plan created based on the preprocessing phase in an agentic manner. The system teaches the user one topic after another, while using the structured representation created in the preprocessing phase to retrieve relevant information and excerpts from the original material. The system also checks the understanding of the user by asking questions and exercises, and if the user does not understand something, it tries to explain it in a different way until the user understands it. After one step of the learning plan got finished it gets noted.

Here is a reformatted and polished version of your README. It retains all of your original ideas and technical details but uses a cleaner structure to make it highly scannable and much faster to read. 

***-->

# AI Learning Support Tool

> **Mission:** To build an AI educational tool focused on *genuine comprehension* and real-world application. Instead of acting as a shortcut to just "get the answer"—which bypasses actual learning—this system acts as a dedicated tutor that guides students through complex materials from start to finish.

---

## Workflow & Core Concept

The platform operates through a structured, user-centric process:

1. **Upload & Define:** 
   * The user uploads their learning materials (e.g., textbooks, presentation slides).
   * The user defines their specific learning goals (e.g., passing an exam, mastering the content to teach others, or focusing on a specific sub-topic).
2. **Analysis & Planning:** 
   * The system preprocesses the data to understand the context.
   * It generates a logical, hierarchical learning plan tailored exactly to the user's objectives.
3. **Interactive Tutoring Loop:** 
   * **Contextualize:** The AI explains *why* a topic matters and how it fits into the big picture.
   * **Teach:** It presents the content using direct quotes and excerpts from the uploaded source material.
   * **Clarify:** The user asks questions until they feel comfortable with the concept.
   * **Verify:** The system tests the user's understanding (using original exercises from the text if available).
   * **Adapt:** If the user struggles, the AI re-explains the concept using different angles or new examples until true mastery is achieved. Only then does it move to the next topic.

---

## Architecture & Implementation Status

### Preprocessing *(Partially implemented)*
* **Custom RAG:** The system builds a custom Retrieval-Augmented Generation (RAG) pipeline to preprocess the data. This handles efficient context retrieval to significantly reduce token usage. *(For deeper technical details, see `custom_rag/ARCHITECTURE.md`)*.
* **Plan Generation:** Based on the RAG data, a sequential learning plan is created to match the user's goals. *(Note: This is not yet implemented).*

### Live Tutoring *(Not Yet Implemented)*
Once built, this module will handle the live execution of the learning plan:
* **Agentic Teaching:** The system will autonomously guide the user topic-by-topic.
* **Dynamic Retrieval:** It will leverage the structured RAG representation from the preprocessing phase to pull relevant material exactly when needed.
* **Progress Tracking:** The AI will manage the entire teaching, testing, and adapting loop, marking steps as "complete" as the user masters the curriculum.

---

## Quick Start

You can test the core backend functionality right away:
* **Crete a `.env` file** in the root directory with your GOOGLE API key:
  ```
  GOOGLE_API_KEY=your_openai_api_key_here
  ```
* **Set up virtual environment** and install dependencies:
  ```bash
  python -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  pip install -r requirements.txt
  ```
* **Run `main.py`** (specifically the main method) to build the custom RAG pipeline with your own inputted document and test the context retrieval based on your uploaded data.
