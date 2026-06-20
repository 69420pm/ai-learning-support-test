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

function formatArgValue(val) {
	const cleaned = cleanArgValue(val);
	if (typeof cleaned === "string") {
		if (cleaned.length > 100) {
			return `${cleaned.substring(0, 100)}...`;
		}
		return cleaned;
	}
	if (cleaned && typeof cleaned === "object") {
		const str = JSON.stringify(cleaned);
		if (str.length > 100) {
			return `${str.substring(0, 100)}...`;
		}
	}
	return val;
}

function formatUserInputStep(step) {
	const content = step.content || "";
	let requestText = content.replace(/<\/?[A-Z_]+>/g, "").trim();
	if (requestText.length > 200) {
		requestText = `${requestText.substring(0, 200)}...`;
	}
	return `  - **Objective:**\n    > ${requestText.replace(/\r?\n/g, "\n    > ")}`;
}

function formatPlannerResponseStep(step) {
	const content = step.content || "";
	let details = "";
	if (content) {
		let cleanThoughts = content.trim();
		if (cleanThoughts.length > 150) {
			cleanThoughts = `${cleanThoughts.substring(0, 150)}...`;
		}
		details += `  - **Thoughts:** ${cleanThoughts.replace(/\r?\n/g, "\n    ")}\n`;
	}
	if (step.tool_calls && step.tool_calls.length > 0) {
		details += "  - **Tool Calls:**\n";
		step.tool_calls.forEach((tc) => {
			let argsStr = "";
			try {
				argsStr = Object.entries(tc.args)
					.map(([k, v]) => `${k}: ${JSON.stringify(formatArgValue(v))}`)
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
		outputSnippet = `\n    **Output:**\n    \`\`\`\n    ${cleanStdout.substring(0, 200).replace(/\r?\n/g, "\n    ")}\n    \`\`\``;
	}
	return `  - Run command ${exitCodeStr}.${outputSnippet}`;
}

// Format the details of step chronology as nested list items
function formatStepDetails(step) {
	switch (step.type) {
		case "USER_INPUT":
			return formatUserInputStep(step);
		case "CONVERSATION_HISTORY":
			return "  - Loaded past conversation history/summaries.";
		case "PLANNER_RESPONSE":
			return formatPlannerResponseStep(step);
		case "VIEW_FILE":
			return formatViewFileStep(step);
		case "LIST_DIRECTORY":
			return formatListDirectoryStep(step);
		case "RUN_COMMAND":
			return formatRunCommandStep(step);
		case "DEFINE_SUBAGENT":
			return "  - Defined subagent.";
		case "INVOKE_SUBAGENT": {
			const content = step.content || "";
			const cidMatch = content.match(/"conversationId":\s*"([^"]+)"/);
			const cid = cidMatch ? cidMatch[1] : "unknown";
			return `  - Invoked subagent with ID: \`${cid}\``;
		}
		case "WRITE_TO_FILE":
		case "REPLACE_FILE_CONTENT":
		case "MULTI_REPLACE_FILE_CONTENT": {
			const content = step.content || "";
			const filePathMatch =
				content.match(/File Path: `file:\/\/(.*?)`/) || content.match(/TargetFile:\s*([^\s]+)/);
			const fp = filePathMatch ? path.relative(process.cwd(), filePathMatch[1]) : "file";
			const action = step.type === "WRITE_TO_FILE" ? "Wrote" : "Modified";
			return `  - ${action} file \`${fp}\``;
		}
		default: {
			const content = step.content || "";
			let cleanContent = content.trim();
			if (cleanContent.length > 200) {
				cleanContent = `${cleanContent.substring(0, 200)}...`;
			}
			return `  - ${cleanContent.replace(/\r?\n/g, "\n  ")}`;
		}
	}
}

// Helper to look up a title in the history file
function findTitleInHistory(convId) {
	if (fs.existsSync(historyFile)) {
		try {
			const lines = fs.readFileSync(historyFile, "utf8").split("\n");
			for (const line of lines) {
				if (!line.trim()) continue;
				const entry = JSON.parse(line);
				if (entry.conversationId === convId && entry.display) {
					return entry.display;
				}
			}
		} catch {}
	}
	return null;
}

function detectLoops(step, ctx) {
	if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
		step.tool_calls.forEach((tc) => {
			const callKey = `${tc.name}:${JSON.stringify(tc.args)}`;
			if (callKey === ctx.lastCallKey) {
				ctx.consecutiveIdenticalCalls++;
				if (ctx.consecutiveIdenticalCalls >= 2) {
					ctx.loopFindings.push(
						`- Step ${step.step_index}: Repeated consecutive tool call to \`${tc.name}\` with identical arguments.`,
					);
				}
			} else {
				ctx.consecutiveIdenticalCalls = 0;
				ctx.lastCallKey = callKey;
			}
		});
	}
}

function countToolsUsage(step, ctx) {
	if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
		step.tool_calls.forEach((tc) => {
			ctx.toolCounts[tc.name] = (ctx.toolCounts[tc.name] || 0) + 1;
			let file = tc.args.TargetFile || tc.args.AbsolutePath;
			if (file) {
				file = cleanArgValue(file);
				ctx.fileAccessCounts[file] = (ctx.fileAccessCounts[file] || 0) + 1;
			}
			if (tc.name === "run_command" && tc.args.CommandLine) {
				const cmd = cleanArgValue(tc.args.CommandLine);
				ctx.commandCounts[cmd] = (ctx.commandCounts[cmd] || 0) + 1;
			}
		});
	}
}

function detectFailures(step, ctx) {
	if (step.status === "ERROR") {
		ctx.failureFindings.push(`- Step ${step.step_index} (${step.type}): Failed with error status.`);
		ctx.consecutiveFailures++;
		if (ctx.consecutiveFailures >= 3) {
			ctx.failureFindings.push(
				`- Step ${step.step_index}: ⚠️ Stuck in a failure loop (3+ consecutive errors).`,
			);
		}
	} else if (
		step.type === "RUN_COMMAND" &&
		(step.content?.includes("failed with exit") ||
			step.content?.includes("Operation not permitted") ||
			step.content?.includes("blocked by sandbox"))
	) {
		ctx.failureFindings.push(
			`- Step ${step.step_index} (RUN_COMMAND): Command failed or was blocked by the sandbox.`,
		);
		ctx.consecutiveFailures++;
		if (ctx.consecutiveFailures >= 3) {
			ctx.failureFindings.push(
				`- Step ${step.step_index}: ⚠️ Stuck in a command failure loop (3+ consecutive command issues).`,
			);
		}
	} else {
		ctx.consecutiveFailures = 0;
	}
}

function detectDeviations(step, ctx) {
	if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
		step.tool_calls.forEach((tc) => {
			if (tc.name === "search_web" || tc.name === "read_url_content") {
				ctx.deviationFindings.push(
					`- Step ${step.step_index}: Triggered web tool \`${tc.name}\`. Check if web access was relevant to the objective.`,
				);
			}
			const pathArg = tc.args.TargetFile || tc.args.AbsolutePath || tc.args.DirectoryPath;
			if (pathArg && typeof pathArg === "string") {
				if (!pathArg.includes("ai-learning-support") && !pathArg.includes(".gemini")) {
					ctx.deviationFindings.push(
						`- Step ${step.step_index}: Accessed paths outside workspace boundary: \`${pathArg}\`.`,
					);
				}
			}
		});
	}
}

// Run heuristics checks on steps
function runHeuristicsOnSteps(steps) {
	const ctx = {
		loopFindings: [],
		consecutiveIdenticalCalls: 0,
		lastCallKey: null,
		toolCounts: {},
		fileAccessCounts: {},
		commandCounts: {},
		failureFindings: [],
		consecutiveFailures: 0,
		deviationFindings: [],
	};

	steps.forEach((step) => {
		detectLoops(step, ctx);
		countToolsUsage(step, ctx);
		detectFailures(step, ctx);
		detectDeviations(step, ctx);
	});

	// Post-process excessive tools
	const excessiveFindings = [];
	Object.entries(ctx.toolCounts).forEach(([tool, count]) => {
		if (count > 10) {
			excessiveFindings.push(`- Tool \`${tool}\` was called ${count} times (high usage).`);
		}
	});
	Object.entries(ctx.fileAccessCounts).forEach(([file, count]) => {
		if (count > 3) {
			const displayPath = path.relative(process.cwd(), file);
			excessiveFindings.push(`- File \`${displayPath}\` was accessed/modified ${count} times.`);
		}
	});
	Object.entries(ctx.commandCounts).forEach(([cmd, count]) => {
		if (count > 3) {
			excessiveFindings.push(`- Command \`${cmd}\` was run ${count} times.`);
		}
	});

	return {
		toolCounts: ctx.toolCounts,
		loopFindings: ctx.loopFindings,
		excessiveFindings,
		deviationFindings: ctx.deviationFindings,
		failureFindings: ctx.failureFindings,
	};
}

function sanitizeRole(role) {
	if (!role) return "";
	return role.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

// Recursively load subagents transcript and details
function getConversationDataRecursive(convId, visited = new Set(), role = "Main Agent") {
	if (visited.has(convId)) return [];
	visited.add(convId);

	const transcriptPath = path.join(
		brainDir,
		convId,
		".system_generated",
		"logs",
		"transcript.jsonl",
	);

	if (!fs.existsSync(transcriptPath)) {
		return [];
	}

	let fileContent;
	try {
		fileContent = fs.readFileSync(transcriptPath, "utf8");
	} catch {
		return [];
	}

	const lines = fileContent.split("\n").filter((l) => l.trim().length > 0);
	let steps = [];
	try {
		steps = lines.map((line) => JSON.parse(line));
	} catch (e) {
		console.error(`Error parsing transcript JSONL for ${convId}:`, e);
		return [];
	}

	// 1. Analyze this conversation (heuristics)
	const analysis = runHeuristicsOnSteps(steps);

	// 2. Scan for subagents in this transcript
	const subagentsFound = [];
	steps.forEach((step) => {
		if (step.type === "INVOKE_SUBAGENT") {
			const content = step.content || "";
			const regex = /"conversationId":\s*"([^"]+)"/g;
			let match = regex.exec(content);
			while (match !== null) {
				const subId = match[1];
				let subRole = "Subagent";
				const dbPath = path.join(conversationsDir, `${subId}.db`);
				const dbTitle = getTitleFromDb(dbPath);
				if (dbTitle) {
					subRole = sanitizeRole(dbTitle);
				} else {
					subRole = sanitizeRole(findTitleInHistory(subId)) || "Subagent";
				}
				subagentsFound.push({ id: subId, role: subRole });
				match = regex.exec(content);
			}
		}
	});

	const currentConvData = {
		id: convId,
		role: sanitizeRole(role),
		steps,
		analysis,
	};

	let allConvs = [currentConvData];
	for (const sub of subagentsFound) {
		const subConvs = getConversationDataRecursive(sub.id, visited, sub.role);
		allConvs = allConvs.concat(subConvs);
	}

	return allConvs;
}

// Compile Section 1: Metadata
function compileMetadataSection(conversations) {
	let markdown = "";
	const main = conversations[0];
	markdown += `### Main Agent Metadata\n\n`;
	markdown += `| Field | Value |\n`;
	markdown += `|---|---|\n`;
	markdown += `| **Conversation ID** | \`${main.id}\` |\n`;
	markdown += `| **Title / Objective** | ${main.role} |\n`;
	markdown += `| **Total Steps** | ${main.steps.length} |\n`;

	const mainToolSummary =
		Object.entries(main.analysis.toolCounts)
			.map(([tool, count]) => `\`${tool}\`: ${count}`)
			.join(", ") || "No tools executed";
	markdown += `| **Tool Execution Summary** | ${mainToolSummary} |\n\n`;

	if (conversations.length > 1) {
		markdown += `### Subagents Metadata\n\n`;
		markdown += `| Conversation ID | Role / Title | Steps | Tool Execution Summary |\n`;
		markdown += `|---|---|---|---|\n`;
		for (let i = 1; i < conversations.length; i++) {
			const sub = conversations[i];
			const subToolSummary =
				Object.entries(sub.analysis.toolCounts)
					.map(([tool, count]) => `\`${tool}\`: ${count}`)
					.join(", ") || "No tools executed";
			markdown += `| \`${sub.id}\` | ${sub.role} | ${sub.steps.length} | ${subToolSummary} |\n`;
		}
		markdown += `\n`;
	}

	return markdown;
}

// Compile Section 2: Programmatic Analysis
function compileAnalysisSection(conversations) {
	let markdown = "";

	conversations.forEach((conv, index) => {
		const prefix = index === 0 ? "🤖 Main Agent" : `⚓ Subagent: ${conv.role}`;
		markdown += `### ${prefix} (\`${conv.id}\`)\n\n`;

		const loopAnalysisText =
			conv.analysis.loopFindings.length > 0
				? conv.analysis.loopFindings.join("\n")
				: "- No repetitive loops or consecutive identical tool calls detected.";
		markdown += `#### 🔄 Looping & Repetition\n${loopAnalysisText}\n\n`;

		const excessiveAnalysisText =
			conv.analysis.excessiveFindings.length > 0
				? conv.analysis.excessiveFindings.join("\n")
				: "- No excessive tool calls or repetitive file reads/writes detected.";
		markdown += `#### ⚠️ Excessive Tool Usage\n${excessiveAnalysisText}\n\n`;

		const deviationAnalysisText =
			conv.analysis.deviationFindings.length > 0
				? conv.analysis.deviationFindings.join("\n")
				: "- No obvious scope deviations or unrelated file access detected.";
		markdown += `#### 🚫 Irrelevant Actions / Scope Deviations\n${deviationAnalysisText}\n\n`;

		const failuresAnalysisText =
			conv.analysis.failureFindings.length > 0
				? conv.analysis.failureFindings.join("\n")
				: "- No tool failures or sandbox blocks detected.";
		markdown += `#### ❌ Tool Failures & Stuck States\n${failuresAnalysisText}\n\n`;
	});

	markdown += `### ⚠️ Bash Command Misuse & Unnecessary Sandbox Bypass\n`;
	markdown += `> Add any observations of bash command misuse (e.g., using \`ls\` instead of \`make list-files\`) or unnecessary sandbox bypass (e.g., bypassing the sandbox to read a file that could have been accessed with a standard tool). This is important for ensuring agents use standardized commands and only bypass the sandbox when strictly necessary.\n\n`;

	return markdown;
}

function shouldSkipStep(step) {
	if (step.type === "RUN_COMMAND") {
		const content = step.content || "";
		const errorMatch =
			content.match(/failed with exit code: (\d+)/) || content.match(/blocked by sandbox/);
		const stdoutMatch =
			content.match(/Output:\n([\s\S]*)/) || content.match(/Log output:\n([\s\S]*)/);
		const hasOutput = stdoutMatch?.[1]?.trim()?.length > 0;
		if (!errorMatch && !hasOutput) {
			return true;
		}
	}
	if (step.type === "GENERIC" && step.content?.includes("defined successfully")) {
		return true;
	}
	return false;
}

function getActorName(step) {
	if (step.source === "USER_EXPLICIT") return "👤 User";
	if (step.source === "SYSTEM") return "🖥️ System";
	if (step.source === "MODEL" && step.type !== "PLANNER_RESPONSE") return "🔧 Tool Output";
	return "🤖 Agent";
}

function formatChronologyRow(step) {
	if (shouldSkipStep(step)) return null;

	const actor = getActorName(step);
	const stepIdx = step.step_index;
	const actionType = step.type;
	const details = formatStepDetails(step);

	return `- **Step ${stepIdx}** · **${actor}** · \`${actionType}\`\n${details}`;
}

// Compile Section 3: Chronology
function compileChronologySection(conversations) {
	let markdown = "";
	conversations.forEach((conv, index) => {
		const prefix = index === 0 ? "🤖 Main Agent" : `⚓ Subagent: ${conv.role}`;
		markdown += `### ${prefix} (\`${conv.id}\`)\n\n`;

		const chronologyRows = [];
		conv.steps.forEach((step) => {
			const row = formatChronologyRow(step);
			if (row) {
				chronologyRows.push(row);
			}
		});

		markdown += `${chronologyRows.join("\n\n")}\n\n`;
	});

	return markdown;
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
	const dbPath = path.join(conversationsDir, `${targetId}.db`);
	if (fs.existsSync(dbPath)) {
		targetTitle = getTitleFromDb(dbPath) || `Conversation ${targetId}`;
	} else {
		targetTitle = `Conversation ${targetId}`;
	}
} else {
	console.log(`Searching for conversation matching: "${query}"...`);
	const candidates = [];

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

	if (candidates.length === 0 && fs.existsSync(historyFile)) {
		const lines = fs.readFileSync(historyFile, "utf8").split("\n");
		lines.forEach((line) => {
			if (!line.trim()) return;
			try {
				const entry = JSON.parse(line);
				if (entry.conversationId && entry.display?.toLowerCase().includes(query.toLowerCase())) {
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

	candidates.sort((a, b) => b.mtime - a.mtime);
	console.log("Found matching conversations:");
	candidates.forEach((c, idx) => {
		console.log(
			`  [${idx + 1}] ID: ${c.id} | Title: "${truncateText(c.title, 60)}" | Last modified: ${c.mtime.toISOString()}`,
		);
	});

	const selected = candidates[0];
	targetId = selected.id;
	targetTitle = selected.title;
	console.log(`Selecting the most recent match: "${truncateText(targetTitle, 60)}" (${targetId})`);
}

// Recursively load all conversation logs
console.log(`Recursively loading transcripts starting from ${targetId}...`);
const conversations = getConversationDataRecursive(targetId, new Set(), targetTitle);

if (conversations.length === 0) {
	console.error("Error: No conversations loaded.");
	process.exit(1);
}

console.log(`Successfully loaded ${conversations.length} conversation(s).`);

// Read template
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

// Clean title
const firstNonEmptyLine =
	targetTitle
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)[0] || "Untitled Conversation";
const titleClean = firstNonEmptyLine.replace(/<\/?[A-Z_]+>/g, "").trim();

// Compile sections
const metadataSection = compileMetadataSection(conversations);
const analysisSection = compileAnalysisSection(conversations);
const chronologySection = compileChronologySection(conversations);

// Replace placeholders
templateContent = templateContent
	.replace(/\{\{TITLE\}\}/g, titleClean)
	.replace(/\{\{METADATA_SECTION\}\}/g, metadataSection)
	.replace(/\{\{ANALYSIS_SECTION\}\}/g, analysisSection)
	.replace(/\{\{CHRONOLOGY_SECTION\}\}/g, chronologySection);

// Write to specs/conversation-reviews/review-<id>.md
const outputDir = path.join(process.cwd(), "specs", "conversation-reviews");
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

const defaultOutputPath = path.join(outputDir, `review-${targetId}.md`);
const outputPath = args[1] ? path.resolve(args[1]) : defaultOutputPath;

fs.writeFileSync(outputPath, templateContent);
console.log(`\nSuccessfully extracted review to: ${outputPath}`);
