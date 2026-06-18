import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Setup paths
const appDataDir =
	process.env.GEMINI_APP_DATA_DIR || path.join(os.homedir(), ".gemini", "antigravity-cli");
const conversationsDir = path.join(appDataDir, "conversations");
const brainDir = path.join(appDataDir, "brain");
const historyFile = path.join(appDataDir, "history.jsonl");

// Helper to truncate text for cells
function truncateText(text, maxLen = 200) {
	if (!text) return "";
	const cleanText = text.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
	if (cleanText.length > maxLen) {
		return `${cleanText.substring(0, maxLen)}...`;
	}
	return cleanText;
}

// Clean leading/trailing quotes from string values
function cleanArgValue(val) {
	if (typeof val === "string") {
		let s = val.trim();
		if (s.startsWith('"') && s.endsWith('"')) {
			s = s.substring(1, s.length - 1);
		}
		if (s.startsWith("'") && s.endsWith("'")) {
			s = s.substring(1, s.length - 1);
		}
		return s;
	}
	return val;
}

// Helper to extract a string field from protobuf binary data
function extractProtobufString(content, idx, offset) {
	if (idx + offset >= content.length || content[idx + offset] !== 0x22) {
		return null;
	}
	let lenIdx = idx + offset + 1;
	let length = 0;
	let shift = 0;
	while (lenIdx < content.length) {
		const b = content[lenIdx];
		length |= (b & 0x7f) << shift;
		lenIdx++;
		if (!(b & 0x80)) break;
		shift += 7;
	}
	if (lenIdx + length > content.length) {
		return null;
	}
	try {
		const rawTitle = content.subarray(lenIdx, lenIdx + length).toString("utf8");
		const title = rawTitle.split("\u0000")[0];
		let isValid = true;
		for (let i = 0; i < title.length; i++) {
			const code = title.charCodeAt(i);
			if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || (code >= 127 && code <= 159)) {
				isValid = false;
				break;
			}
		}
		if (isValid && title.length > 0) {
			return title;
		}
	} catch {}
	return null;
}

// Generalized function to parse conversation title from SQLite database
function getTitleFromDb(dbPath) {
	try {
		const content = fs.readFileSync(dbPath);
		let idx = 0;
		while (true) {
			idx = content.indexOf(Buffer.from([0xf2, 0x01]), idx);
			if (idx === -1) break;
			for (const offset of [3, 4]) {
				const title = extractProtobufString(content, idx, offset);
				if (title) return title;
			}
			idx += 2;
		}
	} catch {}
	return null;
}

function formatUserInputStep(step) {
	const content = step.content || "";
	const requestText = content.replace(/<\/?[A-Z_]+>/g, "").trim();
	return `  - **Objective:**\n    > ${requestText.replace(/\r?\n/g, "\n    > ")}`;
}

function formatPlannerResponseStep(step) {
	const content = step.content || "";
	let details = "";
	if (content) {
		const cleanThoughts = content.trim();
		details += `  - **Thoughts:** ${cleanThoughts.replace(/\r?\n/g, "\n    ")}\n`;
	}
	if (step.tool_calls && step.tool_calls.length > 0) {
		details += "  - **Tool Calls:**\n";
		step.tool_calls.forEach((tc) => {
			let argsStr = "";
			try {
				argsStr = Object.entries(tc.args)
					.map(([k, v]) => `${k}: ${JSON.stringify(cleanArgValue(v))}`)
					.join(", ");
			} catch {
				argsStr = JSON.stringify(tc.args);
			}
			details += `    - 🔧 \`${tc.name}(${argsStr})\`\n`;
		});
	}
	return details.trimEnd();
}

function formatViewFileStep(step) {
	const content = step.content || "";
	const filePathMatch = content.match(/File Path: `file:\/\/(.*?)`/);
	const showingLinesMatch = content.match(/Showing lines (\d+) to (\d+)/);
	const fp = filePathMatch ? path.relative(process.cwd(), filePathMatch[1]) : "file";
	const lines = showingLinesMatch
		? `lines ${showingLinesMatch[1]}-${showingLinesMatch[2]}`
		: "all content";
	return `  - Read file \`${fp}\` (${lines})`;
}

function formatListDirectoryStep(step) {
	const content = step.content || "";
	const summaryMatch = content.match(/Summary: (.*)/);
	const summary = summaryMatch ? summaryMatch[1] : "listed contents";
	return `  - Listed directory contents. Summary: ${summary}`;
}

function formatRunCommandStep(step) {
	const content = step.content || "";
	const errorMatch =
		content.match(/failed with exit code: (\d+)/) || content.match(/blocked by sandbox/);
	const exitCodeStr = errorMatch ? "failed/blocked" : "succeeded";

	let outputSnippet = "";
	const stdoutMatch =
		content.match(/Output:\n([\s\S]*)/) || content.match(/Log output:\n([\s\S]*)/);
	if (stdoutMatch?.[1].trim()) {
		const cleanStdout = stdoutMatch[1].trim();
		outputSnippet = `\n    **Output:**\n    \`\`\`\n    ${cleanStdout.substring(0, 500).replace(/\r?\n/g, "\n    ")}\n    \`\`\``;
	}
	return `  - Run command ${exitCodeStr}.${outputSnippet}`;
}

// Format the details of step chronology as nested list items
function formatStepDetails(step) {
	if (step.type === "USER_INPUT") return formatUserInputStep(step);
	if (step.type === "CONVERSATION_HISTORY")
		return "  - Loaded past conversation history/summaries.";
	if (step.type === "PLANNER_RESPONSE") return formatPlannerResponseStep(step);
	if (step.type === "VIEW_FILE") return formatViewFileStep(step);
	if (step.type === "LIST_DIRECTORY") return formatListDirectoryStep(step);
	if (step.type === "RUN_COMMAND") return formatRunCommandStep(step);

	const content = step.content || "";
	return `  - ${content.trim().replace(/\r?\n/g, "\n  ")}`;
}

// Parse args
const args = process.argv.slice(2);
if (args.length === 0) {
	console.error("Usage: node extract_conversation.js <conversation-id-or-query> [output-file]");
	process.exit(1);
}

const query = args[0];
let targetId = null;
let targetTitle = "";

// Check if query is a UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (uuidRegex.test(query)) {
	targetId = query;
	// Try to find the title from db if possible
	const dbPath = path.join(conversationsDir, `${targetId}.db`);
	if (fs.existsSync(dbPath)) {
		targetTitle = getTitleFromDb(dbPath) || `Conversation ${targetId}`;
	} else {
		targetTitle = `Conversation ${targetId}`;
	}
} else {
	console.log(`Searching for conversation matching: "${query}"...`);
	const candidates = [];

	// Method 1: Scan SQLite DBs and extract titles
	if (fs.existsSync(conversationsDir)) {
		const files = fs.readdirSync(conversationsDir).filter((f) => f.endsWith(".db"));
		files.forEach((f) => {
			const dbPath = path.join(conversationsDir, f);
			const title = getTitleFromDb(dbPath);
			const uuid = f.replace(".db", "");
			if (title && (title.toLowerCase().includes(query.toLowerCase()) || uuid.includes(query))) {
				const stats = fs.statSync(dbPath);
				candidates.push({ id: uuid, title, mtime: stats.mtime });
			}
		});
	}

	// Method 2: Scan history.jsonl as fallback
	if (candidates.length === 0 && fs.existsSync(historyFile)) {
		const lines = fs.readFileSync(historyFile, "utf8").split("\n");
		lines.forEach((line) => {
			if (!line.trim()) return;
			try {
				const entry = JSON.parse(line);
				if (entry.conversationId && entry.display?.toLowerCase().includes(query.toLowerCase())) {
					// Check if not already in candidates
					if (!candidates.some((c) => c.id === entry.conversationId)) {
						candidates.push({
							id: entry.conversationId,
							title: entry.display,
							mtime: new Date(entry.timestamp),
						});
					}
				}
			} catch {}
		});
	}

	if (candidates.length === 0) {
		console.error(`Error: No conversations found matching "${query}".`);
		process.exit(1);
	}

	// Sort candidates by modified time (newest first)
	candidates.sort((a, b) => b.mtime - a.mtime);
	console.log("Found matching conversations:");
	candidates.forEach((c, idx) => {
		console.log(
			`  [${idx + 1}] ID: ${c.id} | Title: "${truncateText(c.title, 60)}" | Last modified: ${c.mtime.toISOString()}`,
		);
	});

	// Pick the newest one
	const selected = candidates[0];
	targetId = selected.id;
	targetTitle = selected.title;
	console.log(`Selecting the most recent match: "${truncateText(targetTitle, 60)}" (${targetId})`);
}

// Locate transcript path
const transcriptPath = path.join(
	brainDir,
	targetId,
	".system_generated",
	"logs",
	"transcript.jsonl",
);
if (!fs.existsSync(transcriptPath)) {
	console.error(`Error: Transcript file not found at ${transcriptPath}`);
	process.exit(1);
}

console.log(`Reading transcript from ${transcriptPath}...`);
const fileContent = fs.readFileSync(transcriptPath, "utf8");
const lines = fileContent.split("\n").filter((l) => l.trim().length > 0);

let steps = [];
try {
	steps = lines.map((line) => JSON.parse(line));
} catch (e) {
	console.error("Error parsing transcript JSONL:", e);
	process.exit(1);
}

// -------------------------------------------------------------
// Heuristics Analysis
// -------------------------------------------------------------
const loopFindings = [];
let consecutiveIdenticalCalls = 0;
let lastCallKey = null;

const toolCounts = {};
const fileAccessCounts = {};
const commandCounts = {};

const failureFindings = [];
let consecutiveFailures = 0;

const deviationFindings = [];

steps.forEach((step) => {
	// 1. Loops detection
	if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
		step.tool_calls.forEach((tc) => {
			const callKey = `${tc.name}:${JSON.stringify(tc.args)}`;
			if (callKey === lastCallKey) {
				consecutiveIdenticalCalls++;
				if (consecutiveIdenticalCalls >= 2) {
					loopFindings.push(
						`- Step ${step.step_index}: Repeated consecutive tool call to \`${tc.name}\` with identical arguments.`,
					);
				}
			} else {
				consecutiveIdenticalCalls = 0;
				lastCallKey = callKey;
			}
		});
	}

	// 2. Excessive usage counts
	if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
		step.tool_calls.forEach((tc) => {
			toolCounts[tc.name] = (toolCounts[tc.name] || 0) + 1;
			let file = tc.args.TargetFile || tc.args.AbsolutePath;
			if (file) {
				file = cleanArgValue(file);
				fileAccessCounts[file] = (fileAccessCounts[file] || 0) + 1;
			}
			if (tc.name === "run_command" && tc.args.CommandLine) {
				const cmd = cleanArgValue(tc.args.CommandLine);
				commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
			}
		});
	}

	// 3. Failures detection
	if (step.status === "ERROR") {
		failureFindings.push(`- Step ${step.step_index} (${step.type}): Failed with error status.`);
		consecutiveFailures++;
		if (consecutiveFailures >= 3) {
			failureFindings.push(
				`- Step ${step.step_index}: ⚠️ Stuck in a failure loop (3+ consecutive errors).`,
			);
		}
	} else if (
		step.type === "RUN_COMMAND" &&
		(step.content.includes("failed with exit") ||
			step.content.includes("Operation not permitted") ||
			step.content.includes("blocked by sandbox"))
	) {
		failureFindings.push(
			`- Step ${step.step_index} (RUN_COMMAND): Command failed or was blocked by the sandbox.`,
		);
		consecutiveFailures++;
		if (consecutiveFailures >= 3) {
			failureFindings.push(
				`- Step ${step.step_index}: ⚠️ Stuck in a command failure loop (3+ consecutive command issues).`,
			);
		}
	} else {
		consecutiveFailures = 0;
	}

	// 4. Deviation detection
	if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
		step.tool_calls.forEach((tc) => {
			if (tc.name === "search_web" || tc.name === "read_url_content") {
				deviationFindings.push(
					`- Step ${step.step_index}: Triggered web tool \`${tc.name}\`. Check if web access was relevant to the objective.`,
				);
			}
			const pathArg = tc.args.TargetFile || tc.args.AbsolutePath || tc.args.DirectoryPath;
			if (pathArg && typeof pathArg === "string") {
				if (!pathArg.includes("ai-learning-support") && !pathArg.includes(".gemini")) {
					deviationFindings.push(
						`- Step ${step.step_index}: Accessed paths outside workspace boundary: \`${pathArg}\`.`,
					);
				}
			}
		});
	}
});

// Post-process excessive tools
const excessiveFindings = [];
Object.entries(toolCounts).forEach(([tool, count]) => {
	if (count > 10) {
		excessiveFindings.push(`- Tool \`${tool}\` was called ${count} times (high usage).`);
	}
});
Object.entries(fileAccessCounts).forEach(([file, count]) => {
	if (count > 3) {
		const displayPath = path.relative(process.cwd(), file);
		excessiveFindings.push(`- File \`${displayPath}\` was accessed/modified ${count} times.`);
	}
});
Object.entries(commandCounts).forEach(([cmd, count]) => {
	if (count > 3) {
		excessiveFindings.push(`- Command \`${cmd}\` was run ${count} times.`);
	}
});

// Format summaries for the template
const loopAnalysisText =
	loopFindings.length > 0
		? loopFindings.join("\n")
		: "- No repetitive loops or consecutive identical tool calls detected.";
const excessiveAnalysisText =
	excessiveFindings.length > 0
		? excessiveFindings.join("\n")
		: "- No excessive tool calls or repetitive file reads/writes detected.";
const deviationAnalysisText =
	deviationFindings.length > 0
		? deviationFindings.join("\n")
		: "- No obvious scope deviations or unrelated file access detected.";
const failuresAnalysisText =
	failureFindings.length > 0
		? failureFindings.join("\n")
		: "- No tool failures or sandbox blocks detected.";

const toolSummaryText =
	Object.entries(toolCounts)
		.map(([tool, count]) => `\`${tool}\`: ${count}`)
		.join(", ") || "No tools executed";

// -------------------------------------------------------------
// Chronology List Generation
// -------------------------------------------------------------
const chronologyRows = [];
steps.forEach((step) => {
	let actor = "🤖 Agent";
	if (step.source === "USER_EXPLICIT") actor = "👤 User";
	else if (step.source === "SYSTEM") actor = "🖥️ System";
	else if (step.source === "MODEL" && step.type !== "PLANNER_RESPONSE") actor = "🔧 Tool Output";

	const stepIdx = step.step_index;
	const actionType = step.type;
	const details = formatStepDetails(step);

	chronologyRows.push(`- **Step ${stepIdx}** · **${actor}** · \`${actionType}\`\n${details}`);
});
const chronologyListText = chronologyRows.join("\n\n");

// -------------------------------------------------------------
// Read template and write output
// -------------------------------------------------------------
const templatePath = path.join(
	process.cwd(),
	"specs",
	"conversation-reviews",
	"CONVERSATION_REVIEW_TEMPLATE.md",
);
if (!fs.existsSync(templatePath)) {
	console.error(`Error: Template not found at ${templatePath}`);
	process.exit(1);
}

let templateContent = fs.readFileSync(templatePath, "utf8");

// Replace placeholders
const firstNonEmptyLine =
	targetTitle
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)[0] || "Untitled Conversation";
const titleClean = firstNonEmptyLine.replace(/<\/?[A-Z_]+>/g, "").trim();
const titleShort = titleClean.length > 80 ? `${titleClean.substring(0, 80)}...` : titleClean;

templateContent = templateContent
	.replace(/\{\{TITLE\}\}/g, titleClean)
	.replace(/\{\{TITLE_SHORT\}\}/g, titleShort)
	.replace(/\{\{CONVERSATION_ID\}\}/g, targetId)
	.replace(/\{\{REVIEW_DATE\}\}/g, new Date().toISOString().slice(0, 10))
	.replace(/\{\{TOTAL_STEPS\}\}/g, steps.length.toString())
	.replace(/\{\{TOOL_SUMMARY\}\}/g, toolSummaryText)
	.replace(/\{\{LOOP_ANALYSIS\}\}/g, loopAnalysisText)
	.replace(/\{\{EXCESSIVE_TOOL_ANALYSIS\}\}/g, excessiveAnalysisText)
	.replace(/\{\{SCOPE_DEVIATION_ANALYSIS\}\}/g, deviationAnalysisText)
	.replace(/\{\{FAILURES_ANALYSIS\}\}/g, failuresAnalysisText)
	.replace(/\{\{CHRONOLOGY_LIST\}\}/g, chronologyListText);

// Write to specs/conversation-reviews/review-<id>.md
const outputDir = path.join(process.cwd(), "specs", "conversation-reviews");
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

const defaultOutputPath = path.join(outputDir, `review-${targetId}.md`);
const outputPath = args[1] ? path.resolve(args[1]) : defaultOutputPath;

fs.writeFileSync(outputPath, templateContent);
console.log(`\nSuccessfully extracted review to: ${outputPath}`);
console.log(`Total steps: ${steps.length}`);
console.log(`Tool usage summary: ${toolSummaryText}`);
