# Skills

## Workflow
We try to mimic a workflow how software gets built in high performance teams (like SpaceX, Tesla, etc.), however while using AI agents to do the main work. However quality is of utmost importance. We want to use deterministic processes as much as possible and use AI agents only when truly necessary. Also it is important that each agent has a clear and well defined role with only as much context as needed to reduce costs and ensure high quality.

The workflow is as follows:

1. First let the idea get stresstested by the stresstest_idea skill and output a short md idea file. This skill doesn't get used always, it is more brainstorming with an llm as a judge and helper.
2. Then let an idea get turned into a spec by the create_spec skill, it should return a short spec md file 
3. Then the planning and issue creation skill takes the spec and plans it more detailed into code and generates gh issues for each task. Each issue is a standalone entity, where when you read this issue, you have all context you need. Every issue has strict acceptance criteria.
4. Then the test_implementation skill takes a single issue and creates thorough high quality tests for it.
5. Then the implement skill takes a single issue and the tests for it and implements it to pass all tests and creates a pr.
6. Then the pr gets reviewed by the pr_review and a human reviewer and then merged if it passes review or sent back to the implement skill if it doesn't pass review.
