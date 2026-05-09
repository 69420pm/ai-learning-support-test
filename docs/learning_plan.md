# Learning Plan

Goal is to generate a learning plan for the user based based on his learning tools, the learning plan should make pedagiogical sense and acts as a basis for the tutoring sessions. 

## Overview
The entire learning plan is based on entities. The USER.json file and the table of contents get provided to the llm with tools to analyze specific exercises (get all relating topics and complexity) and a tool to an exercise summary or specific edges of the entities. As output a learning_plan.json gets returned which contains a list of the relevant topics and metadata to them. It should act as a retrospective revision time table for the tutoring phase.

## Tools
- analyze_exercise: gets all the topics related to an exercise and a few more metadata about exercise (complexity, type, etc.), this is an extra small llm call. Contents get saved for later use and applied to graph when new connections get found.
- get_entity_edges: gets the edges of an entity, only graph traversal

- update_session_plan: update the session plan to adapt to the user during a session (e.g. he understood something really bad, or really quick)

## Execution flow
1. Create a broad learning plan skeleteton baseed on table of contents and user.json, llm call with high thinking, analyze exercise tools get provided. A list of independet steps to process get returned.
2. Each step gets processed in parallel, all tools get used to write then into learning plan.
3. The entire learning plan gets reviewed with original skeleton, duplicates get removed and entry get updated when necesarry.
