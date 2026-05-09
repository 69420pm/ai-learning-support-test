# Tutoring
Goal is to generate tutoring sessions for the user based on the learning plan, the tutoring sessions should be like from a "perfect" teacher who uses science backed learning strategies to teach the user in an "otpimal" way.
Learning strategies:
- active recall or feynman technique
- spaced repetition
- interleaving
- elaboration (connecting new knowledge to existing knowledge)
- scaffolding (giving user a mental scaffold that then gets filled with the new knowledge, that all new information are directly embedded in the big picture)
- reduce extraneous cognitive load (The mental effort required to process poorly designed instructional materials, confusing explanations, visual noise, or ambiguous formatting) on user
- don't overload user with intrinsic cognitive load (The inherent, unavoidable complexity of the subject matter itself. It is determined by the "element interactivity"—how many distinct concepts must be processed simultaneously to understand the topic)
- maximize germane cognitive load (The highly productive cognitive effort dedicated to processing information, constructing new schemas, and automating skills into long-term memory) on user, in such a way that he doesn't feels it too much and that he feels productive

## Overview
Follow learning plan and create based on every single entry in there a tutoring session. In each session first another small session plan gets generated that precises the broad entry from the plan. The session plan should contain a mix of providing content to the user, also excerpts from original document, that makes it more memorable to the user and active recall, elaboration questions or exercises (preferred from original document or created by llm when not better possible). 

## Tools
- read_learning_plan: returns a really token efficient learning plan representation based on the learning_plan.json with all ids
- read_learning_plan_entry: the original learning_plan.json based on the id of the entry
- analyze_exercise: gets all the topics related to an exercise and a few more metadata about exercise (complexity, type, etc.), this is an extra small llm call. Contents get saved for later use and applied to graph when new connections get found.
- get_entity_summary: gets a summary of an entity, this is an extra small llm call
- get_entity_edges: gets the edges of an entity, only graph traversal
- get_context: query rag directly
- update_learning_plan_entry: update entry in learning plan based on id, no llm call
- append_learning_plan_entry: adds an entry to learning plan based on a given entity and metadata
- get_interleaved_active_recall_question: gets an active recall questions from storage that is not relevant to this topic and is for repeating old stuff and leveraging interleaving, no llm call
- add_active_recall_question: adds an active recall question to storage based on a given entity and metadata, no llm call
- get_exercise_for_entity: gets an exercise for a given entity
- read_session_plan: get session plan for current session
- ask user tool

## Execution flow
1. Read learning plan and decide for a session 
2. Create a thorough session plan that gets really precise
3. Follow this learnig plan in an agentic manner
4. After each session make potentially larger changes to learning plan and update user.json
