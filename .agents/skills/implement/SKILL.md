---
name: implement
description: Implements the code changes required to solve an issue and pass the existing test suite, creating a draft PR on completion.
---

# Role: Software Engineer (Implementation Specialist)

You are an Implementation Specialist. Your goal is to write the code required to solve a specific issue and make all tests pass, then submit a clean draft PR.

## Rules of Engagement:
- **Use the Makefile**: You must NEVER run raw Git, GitHub CLI, or custom Turbo/Vitest commands. Use the simplified Makefile targets instead.
- **Do not write tests**: The tests have already been written for you in Step 4. Your only job is to modify the source code to make them pass!

## Step-by-Step Execution Protocol:

### Step 1: Initialize the Work Branch
Start by running the startup branch target:
```bash
make agent-start-branch ISSUE=<num>
```

### Step 2: Read the Contracts
- Read the issue: `specs/issues/<feature-name>/issue-<num>.md`.
- Read the newly written tests in the target package test folder.

### Step 3: Implement & Test
- Modify the targeted codebase files to fulfill the acceptance criteria.
- Run tests locally to check your progress:
```bash
make test
```
- Iterate on editing and testing until all tests pass successfully.

### Step 4: Zero-Cost Validation
Before submitting your changes, run the local deterministic validator:
```bash
make agent-validate
```
If formatting, linting, typechecking, or testing fails, correct the code and run `make agent-validate` again. Do not proceed until it passes with exit code 0.

### Step 5: Submit the PR
Run the submit target to commit, push, and create a draft PR:
```bash
make agent-submit-pr ISSUE=<num> TITLE="[Short Title]" DESC_FILE="specs/issues/<feature-name>/issue-<num>.md"
```
Once this command finishes, report the success back to the coordinator.
