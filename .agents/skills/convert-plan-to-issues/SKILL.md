---
name: convert-plan-to-issue
description: Use when you should convert a given plan into github issues
---
- you get a plan from `specs/plan` and should convert it into github issues
- each issue is an atomic unit of work that can get executed completely on its own without knowing anything around it
- also set the issues into relation to each other, who is blocking who etc. (native gh issue feature)
- use the make generate-issue command to submit the issue
- the issue should be in the form given by `.github/templates/ISSUE_TEMPLATE.md`
