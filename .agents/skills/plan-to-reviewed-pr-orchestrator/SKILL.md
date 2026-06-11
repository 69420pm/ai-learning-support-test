---
name: plan-to-reviewed-pr-orchestrator
description: Use when a plan is already existing and it needs to get implemented, tested and opened into a pr, that gets reviewed. This complex process is mostly called just implement the plan.
---
- run `convert-plan-to-issue` subagent which will convert the plan (somewhere in `specs/plan/`) into well defined issues. 
- after the issues are created, look which issues belong to this plan and are not blocked by other issues. On all of these issues run the `implement-unit-test-for-issue` subagent, which will implement unit tests for the issue. (Test driven development)
- when for one issue the tests got implemenented, run the `implement-issue` subagent that implements the issue. Do this for all issues where the tests got implemented.
- when for one issue the implentation is done (subagent finished successfully), run the `review-pr` subagent that reviews the opened pr (the implementation issue subagents opens a pr after implementation) for the issue. Do this for all issues where the implementation got done.
- when all issues got implemented with a pr that were not blocked by other issues, write a short summary of the whole process and wait till the user, who is reviewing all prs, gives the command to continue with next steps (either fix the issues that aren't blocked anymore, or fix issues that had problems). Then do the flow again.
