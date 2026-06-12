---
name: full-tdd-issue-implementation
description: Use when an issue defined on github needs to get implemented from start to finish (pr) using test-driven development (TDD) principles.
---
### Input
- An issue name or number that corresponds to a valid issue in the repository.

### Workflow
1. Create a new feature branch for the issue with the `make create-branch NAME=fix-issue-<issue-number>` command.
2. Define a subagent with the following prompt: "Use the skill `implement-unit-test-for-issue` with this issue number: <issue-number>"
3. When the subagent completes, define a new subagent with the following prompt: "Use the skill `implement-code-for-issue` with this issue number: <issue-number>"
4. Look at the defined 
5. When the second subagent completes, define a new subagent with the following prompt: "Use the skill `review-pr` with this PR number: <pr-number>"
