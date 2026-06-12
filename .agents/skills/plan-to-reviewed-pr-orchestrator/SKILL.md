---
name: plan-to-reviewed-pr-orchestrator
description: Use when a plan is already existing and it needs to get implemented, tested and opened into a pr, that gets reviewed. This complex process is mostly called just implement the plan.
---

1. define a subagent with the given prompt: "Run the `convert-plan-to-issue` skill with the given plan name: {name} defined in `specs/plan/`." The plan name is the name of the markdown file with the given plan from the user.
2. after the subagent finished, run the `make list-issues` command to get the list of all issues and decide which issues can be implemented (not blocked by other issues) that belong to the plan. For all of these issues define for each one a new subagent with the prompt: "Run the `implement-unit-test-for-issue` skill for issue number {number}." The issue number is the number of the issue that can be implemented.
3. after a subagent for the implementation of unit tests finished, create a new subagent with the prompt: "Run the `implement-issue` skill for issue number {number}." The issue number is the number of the issue for which the unit tests got implemented.
4. after a subagent for the implementation of an issue finished, create a new subagent with the prompt: "Run the `review-pr` skill for issue number {number}." The issue number is the number of the issue for which the implementation got done and a pr got opened.
5. after all subagents for the issues that are not blocked by other issues got implemented and reviewed, write a short summary of the whole process and wait for the user to give the command to continue with next steps (either fix the issues that aren't blocked anymore, or fix issues that had problems). Then do the flow again.
