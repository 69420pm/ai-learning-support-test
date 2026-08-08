---
name: agentic-ui-verification
description: How to visually verify web application frontend changes against a Definition of Done. Trigger this skill whenever you need to independently verify UI tasks, check if visual goals are met, test button clicks and interactions on the local server, or act as a verification subagent evaluating a completed plan.
---

# Agentic UI Verification

You are acting as an autonomous verifier. Your job is to objectively check if a completed frontend task meets its Definition of Done (DoD) by actually running the app, interacting with it, and visually inspecting the results—exactly as a human QA would.

## Verification Workflow

Follow these steps strictly to verify the UI:

### 1. Start the Dev Server
The project uses `pnpm`. Start the development server as a background task.
Use the `run_command` tool:
- `Cwd`: `/workspaces/secure-ai-learning-support`
- `CommandLine`: `pnpm dev`
- `WaitMsBeforeAsync`: 5000 (give it a few seconds to boot up)
*Note: Read the output to find the exact localhost port (usually 3000).*

### 2. Write the Interaction Script
Write a temporary Node.js script using Playwright to interact with the app. Since you need to test specific DoD requirements (e.g., clicking a 'Submit' button and verifying a modal), the script must be custom to the task.

Save the script to a temporary location (e.g., `/tmp/verify_ui.js`).

**Playwright Script Template:**
```javascript
const { chromium } = require('playwright');

(async () => {
  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log("Navigating to app...");
    await page.goto('http://localhost:3000'); // Update port if necessary
    
    // Wait for the main elements to load
    await page.waitForLoadState('networkidle');

    // --- PERFORM YOUR DOD INTERACTIONS HERE ---
    // Example: await page.click('button#submit');
    // Example: await page.fill('input[name="email"]', 'test@example.com');
    
    // Wait for the UI to update after interaction
    await page.waitForTimeout(1000); 

    // Take a screenshot of the final state
    await page.screenshot({ path: '/tmp/verify_result.png', fullPage: true });
    console.log("Screenshot saved to /tmp/verify_result.png");
    
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await browser.close();
  }
})();
```

### 3. Run the Script
Execute the script using `run_command`:
- `CommandLine`: `npx playwright install chromium && node /tmp/verify_ui.js`
*(Installing chromium ensures Playwright has the binary it needs in the container).*

### 4. Visually Inspect the Result
Once the script completes, use the `view_file` tool to look at `/tmp/verify_result.png`. 
You can natively view image files. Look closely at the visual state of the application. 

### 5. Evaluate and Report
Compare what you see in the screenshot against the Definition of Done provided by the planner.
- **If it passes:** Report back that the DoD is met.
- **If it fails:** Provide explicit, actionable feedback on what is visually missing or incorrect (e.g., "The modal did not appear after clicking the button," or "The alignment of the header is broken"). Do not guess; describe exactly what is rendered.
