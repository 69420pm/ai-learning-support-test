# LLM Prompting Guidelines

This document outlines the core principles for writing highly effective prompts for Large Language Models (LLMs). It serves as the definitive standard for all prompt-engineering tasks within the harness.

All written prompts MUST adhere strictly to the following rules:

## 1. Be Clear, Direct, and Explicit
Prompts MUST state exactly what is required without ambiguity. You MUST NOT rely on the model to infer unstated constraints or background knowledge.

- **Bad:** "Make it sound professional but also kind of friendly."
- **Good:** "You MUST adopt a professional and encouraging tone. You MUST avoid colloquialisms but use positive reinforcement (e.g., 'Great job on this section')."

## 2. Define the Role and Context
You MUST provide the LLM with a specific role and the necessary context to perform the task effectively.

- **Bad:** "Write a summary of this code."
- **Good:** "You are an expert Python developer conducting a code review. You MUST summarize the following code snippet, focusing on security vulnerabilities and performance bottlenecks."

## 3. Utilize Few-Shot Prompting (Provide Examples)
You MUST include 3 to 5 diverse, high-quality examples when the desired output format, tone, or logic is complex. Examples are the most reliable way to steer the model's behavior.

## 4. Instruct What To Do (Positive Framing)
You SHOULD tell the model what to do rather than what *not* to do whenever possible. Positive framing yields more consistent results.

- **Bad:** "Don't use lists."
- **Good:** "You MUST write your response in smoothly flowing prose paragraphs."
