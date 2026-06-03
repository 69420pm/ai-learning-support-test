# Pull Request Review: PR #[PR_NUMBER] - [PR Title]

## 1. Overview & Verdict
- **PR Author**: [Author Name/Username]
- **Branch**: [Branch Name]
- **Review Verdict**: [Approve / Request Changes / Comment]
- **Summary of Review**: [Provide a brief high-level summary of the review findings, highlighting the major strengths and weaknesses]

## 2. Validation Checks
- **Build & Quality Pipeline Status**: [e.g., Passed `make check` locally / Failed]
- **Test Suite Execution**: [e.g., All tests passed / List specific failing tests]

## 3. Code Quality Dimensions
Assess the pull request across the following key dimensions:
- **Bugs & Reliability**: [Identify potential runtime bugs, edge cases, error handling shortcomings, or resource leaks]
- **Simplicity & Readability**: [Is the code easy to understand? Is it overengineered or unnecessarily complex?]
- **Clean Code & Maintainability**: [Does the implementation follow clean code principles, avoid code duplication, and follow correct naming conventions?]
- **Architecture & Extensibility**: [Does the code fit nicely with the existing architecture? Is it open for extension but closed for modification where appropriate?]
- **Testing & Coverage**: [Are new features and edge cases covered by unit tests? Do the tests test behavior, not implementation details?]

## 4. Actionable Feedback
List specific code recommendations, classified by severity:

### 🔴 Critical (Must fix before merging)
1. **[Issue Title]** - [File and Line Reference]
   - *Problem*: [Explain the critical issue, bug, or design flaw]
   - *Suggested Fix*:
     ```typescript
     // Provide code suggestions where applicable
     ```

### 🟡 Major (Highly recommended to fix)
1. **[Issue Title]** - [File and Line Reference]
   - *Problem*: [Explain the issue]
   - *Suggested Fix*:
     ```typescript
     // Suggested code
     ```

### 🟢 Minor / Nitpicks (Optional improvements)
1. **[Issue Title]** - [File and Line Reference]
   - *Problem*: [Style improvement, naming suggestion, minor cleanup]
   - *Suggested Fix*:
     ```typescript
     // Suggested code
     ```

## 5. Summary of Recommended Changes
[Brief closing note summarizing the next steps for the PR author]
