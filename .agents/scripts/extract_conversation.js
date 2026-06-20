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

function formatToolCallName(name) {
	switch (name) {
		case "run_command":
			return "Bash";
		case "view_file":
			return "Read";
		case "list_dir":
			return "List";
		case "write_to_file":
			return "Create";
		case "replace_file_content":
		case "multi_replace_file_content":
			return "Edit";
		case "define_subagent":
			return "Define";
		case "invoke_subagent":
			return "Invoke";
		case "ask_question":
			return "Ask";
		case "ask_permission":
			return "Permission";
		default:
			return name;
	}
}

function getSubagentParam(tc) {
	try {
		const subs =
			typeof tc.args.Subagents === "string" ? JSON.parse(tc.args.Subagents) : tc.args.Subagents;
		return subs.map((s) => s.Role || s.TypeName).join(", ");
	} catch {
		return "subagent";
	}
}

function getToolCallParam(tc) {
	if (tc.name === "run_command" && tc.args.CommandLine) {
		return cleanArgValue(tc.args.CommandLine);
	}
	if (
		["view_file", "write_to_file", "replace_file_content", "multi_replace_file_content"].includes(
			tc.name,
		)
	) {
		const fp = tc.args.TargetFile || tc.args.AbsolutePath;
		return fp ? path.relative(process.cwd(), cleanArgValue(fp)) : "";
	}
	if (tc.name === "list_dir" && tc.args.DirectoryPath) {
		return path.relative(process.cwd(), cleanArgValue(tc.args.DirectoryPath));
	}
	if (tc.name === "invoke_subagent" && tc.args.Subagents) {
		return getSubagentParam(tc);
	}
	if (tc.name === "define_subagent" && tc.args.name) {
		return cleanArgValue(tc.args.name);
	}
	return Object.values(tc.args)
		.map((v) => (typeof v === "string" ? cleanArgValue(v) : JSON.stringify(v)))
		.join(", ");
}

function formatPlannerResponseStep(step) {
	let details = "";
	const content = step.content || "";
	let cleanThoughts = content.trim();
	if (cleanThoughts.length > 150) {
		cleanThoughts = `${cleanThoughts.substring(0, 150)}...`;
	}

	if (step.tool_calls && step.tool_calls.length > 0) {
		step.tool_calls.forEach((tc) => {
			const toolName = formatToolCallName(tc.name);
			const param = getToolCallParam(tc);
			details += `● ${toolName}(${param})\n`;
			if (cleanThoughts) {
				details += `  ${cleanThoughts.replace(/\r?\n/g, "\n  ")}\n`;
			}
		});
	} else if (cleanThoughts) {
		details += `▸ Thought\n  ${cleanThoughts.replace(/\r?\n/g, "\n  ")}\n`;
	}
	return details.trimEnd();
}

function formatUserInput(step) {
	const content = step.content || "";
	let requestText = content.replace(/<\/?[A-Z_]+>/g, "").trim();
	if (requestText.length > 200) {
		requestText = `${requestText.substring(0, 200)}...`;
	}
	return `👤 **User**\n  ${requestText.replace(/\r?\n/g, "\n  ")}`;
}

function formatRunCommandStep(step) {
	const content = step.content || "";
	const errorMatch =
		content.match(/failed with exit code: (\d+)/) || content.match(/blocked by sandbox/);
	const stdoutMatch =
		content.match(/Output:\n([\s\S]*)/) || content.match(/Log output:\n([\s\S]*)/);

	if (errorMatch) {
		const errorSnippet = errorMatch[0];
		let outText = "";
		if (stdoutMatch?.[1]) {
			outText = `${stdoutMatch[1].trim().substring(0, 150)}...`;
		}
		return `❌ **Error**: ${errorSnippet}${
			outText ? `\n  ${outText.replace(/\r?\n/g, "\n  ")}` : ""
		}`;
	}

	if (stdoutMatch?.[1]?.trim()?.length > 0) {
		const cleanStdout = stdoutMatch[1].trim();
		return `  *Output snippet*:\n  \`\`\`\n  ${cleanStdout
			.substring(0, 150)
			.replace(/\r?\n/g, "\n  ")}\n  \`\`\``;
	}
	return null;
}

function formatStepLine(step) {
	if (step.type === "USER_INPUT") {
		return formatUserInput(step);
	}
	if (step.type === "PLANNER_RESPONSE") {
		return formatPlannerResponseStep(step);
	}
	if (step.status === "ERROR") {
		return "❌ **Error**: Tool execution failed.";
	}
	if (step.type === "RUN_COMMAND") {
		return formatRunCommandStep(step);
	}
	return null;
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

function isSandboxedCommand(tc) {
	return (
		tc.name === "run_command" &&
		(!tc.args.BypassSandbox || tc.args.BypassSandbox === "false" || tc.args.BypassSandbox === false)
	);
}

function isBypassedCommand(tc) {
	return (
		tc.name === "run_command" &&
		(tc.args.BypassSandbox === "true" || tc.args.BypassSandbox === true)
	);
}

function findBypassRerun(steps, startIndex, cmd) {
	const endLimit = Math.min(startIndex + 7, steps.length);
	for (let j = startIndex + 1; j < endLimit; j++) {
		const nextStep = steps[j];
		if (nextStep.type !== "PLANNER_RESPONSE" || !nextStep.tool_calls) continue;
		for (const nextTc of nextStep.tool_calls) {
			if (isBypassedCommand(nextTc) && cleanArgValue(nextTc.args.CommandLine) === cmd) {
				return nextStep.step_index;
			}
		}
	}
	return null;
}

function detectSandboxReruns(steps, ctx) {
	steps.forEach((step, i) => {
		if (step.type !== "PLANNER_RESPONSE" || !step.tool_calls) return;
		step.tool_calls.forEach((tc) => {
			if (!isSandboxedCommand(tc)) return;
			const cmd = cleanArgValue(tc.args.CommandLine);
			const rerunStepIndex = findBypassRerun(steps, i, cmd);
			if (rerunStepIndex !== null) {
				ctx.sandboxRerunFindings.push(
					`- Step ${rerunStepIndex}: Command \`${cmd}\` failed under sandbox and was rerun with bypass.`,
				);
			}
		});
	});
}

function detectNonSequentialLoops(steps, ctx) {
	const commandRuns = {};
	steps.forEach((step) => {
		if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
			step.tool_calls.forEach((tc) => {
				if (tc.name === "run_command" && tc.args.CommandLine) {
					const cmd = cleanArgValue(tc.args.CommandLine);
					if (!commandRuns[cmd]) commandRuns[cmd] = [];
					commandRuns[cmd].push(step.step_index);
				}
			});
		}
	});
	Object.entries(commandRuns).forEach(([cmd, stepIndexes]) => {
		if (stepIndexes.length > 2) {
			ctx.loopFindings.push(
				`- Command \`${cmd}\` was repeated ${stepIndexes.length} times across steps: ${stepIndexes.join(", ")}.`,
			);
		}
	});
}

function processStateVerificationTc(tc, stepIndex, readFiles, findings) {
	if (tc.name === "view_file" && tc.args.AbsolutePath) {
		readFiles.add(path.resolve(cleanArgValue(tc.args.AbsolutePath)));
	} else if (tc.name === "grep_search" && tc.args.SearchPath) {
		readFiles.add(path.resolve(cleanArgValue(tc.args.SearchPath)));
	} else if (
		["replace_file_content", "multi_replace_file_content"].includes(tc.name) &&
		tc.args.TargetFile
	) {
		const file = path.resolve(cleanArgValue(tc.args.TargetFile));
		if (!readFiles.has(file)) {
			const relativePath = path.relative(process.cwd(), file);
			findings.push(
				`- Step ${stepIndex}: Blindly modified file \`${relativePath}\` without viewing its content first.`,
			);
		}
	}
}

function detectStateVerification(steps, ctx) {
	const readFiles = new Set();
	steps.forEach((step) => {
		if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
			step.tool_calls.forEach((tc) => {
				processStateVerificationTc(tc, step.step_index, readFiles, ctx.stateVerificationFindings);
			});
		}
	});
}

function checkShortcutsFinalResponse(finalStep, findings) {
	if (finalStep.type === "PLANNER_RESPONSE" && finalStep.content) {
		const text = finalStep.content.toLowerCase();
		const lazyPhrases = [
			"implement the rest",
			"left for you",
			"you should implement",
			"you can implement",
			"cannot complete",
			"unable to finish",
			"skipped the implementation",
		];
		lazyPhrases.forEach((phrase) => {
			if (text.includes(phrase)) {
				findings.push(
					`- Laziness Warning: Final response contains potential corner-cutting phrase: "${phrase}".`,
				);
			}
		});
	}
}

function detectShortcutsAndLaziness(steps, ctx) {
	let ranTests = false;
	steps.forEach((step) => {
		if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
			step.tool_calls.forEach((tc) => {
				if (tc.name === "run_command" && tc.args.CommandLine) {
					const cmd = cleanArgValue(tc.args.CommandLine);
					if (cmd.includes("test") || cmd.includes("check") || cmd.includes("vitest")) {
						ranTests = true;
					}
				}
			});
		}
	});
	if (!ranTests) {
		ctx.shortcutsFindings.push(
			"- Verification: Task completed without running any test or verification command (e.g., `make test`, `make check`, or `vitest`).",
		);
	}

	if (steps.length > 0) {
		checkShortcutsFinalResponse(steps[steps.length - 1], ctx.shortcutsFindings);
	}

	if (steps.length > 1) {
		const lastTwo = steps.slice(-2);
		const hasLastFailed = lastTwo.some(
			(s) =>
				s.status === "ERROR" ||
				(s.type === "RUN_COMMAND" &&
					(s.content?.includes("failed with exit") || s.content?.includes("blocked by sandbox"))),
		);
		if (hasLastFailed) {
			ctx.shortcutsFindings.push(
				"- Premature Termination: Conversation ended abruptly immediately following a tool or command failure.",
			);
		}
	}
}

function detectOvercomplexity(steps, ctx) {
	if (steps.length > 35) {
		ctx.overcomplexityFindings.push(
			`- Step Count: High step count (${steps.length} steps), indicating structural complexity or a lengthy execution path.`,
		);
	}

	let subagentCount = 0;
	steps.forEach((step) => {
		if (step.type === "INVOKE_SUBAGENT") {
			const content = step.content || "";
			const regex = /"conversationId":\s*"([^"]+)"/g;
			let match = regex.exec(content);
			while (match !== null) {
				subagentCount++;
				match = regex.exec(content);
			}
		}
	});
	if (subagentCount > 2) {
		ctx.overcomplexityFindings.push(
			`- Subagents: Spawned a high number of subagents (${subagentCount}), which introduces scheduling and coordination overhead.`,
		);
	}

	const fileEdits = {};
	steps.forEach((step) => {
		if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
			step.tool_calls.forEach((tc) => {
				if (
					["replace_file_content", "multi_replace_file_content", "write_to_file"].includes(tc.name)
				) {
					const file = cleanArgValue(tc.args.TargetFile || tc.args.AbsolutePath);
					if (file) {
						fileEdits[file] = (fileEdits[file] || 0) + 1;
					}
				}
			});
		}
	});
	Object.entries(fileEdits).forEach(([file, count]) => {
		if (count > 3) {
			const relativePath = path.relative(process.cwd(), file);
			ctx.overcomplexityFindings.push(
				`- File Churning: Edited file \`${relativePath}\` ${count} times, indicating repetitive iterations or lack of a clear first-pass design.`,
			);
		}
	});
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

function detectThoughtsVerbosity(step, ctx) {
	if (step.type === "PLANNER_RESPONSE" && step.content) {
		const thoughtsLen = step.content.trim().length;
		if (thoughtsLen > 800) {
			ctx.verbosityFindings.push(
				`- Step ${step.step_index}: Thoughts block is highly verbose (${thoughtsLen} characters).`,
			);
		}
	}
}

function detectLazyFileRetrieval(step, tc, ctx) {
	if (tc.name === "view_file" && tc.args.AbsolutePath) {
		const fp = cleanArgValue(tc.args.AbsolutePath);
		if (fs.existsSync(fp)) {
			try {
				const fileContent = fs.readFileSync(fp, "utf8");
				const totalLines = fileContent.split("\n").length;
				if (totalLines > 300 && !tc.args.StartLine && !tc.args.EndLine) {
					const relativePath = path.relative(process.cwd(), fp);
					ctx.lazyFileRetrievalFindings.push(
						`- Step ${step.step_index}: Read full file \`${relativePath}\` (${totalLines} lines) without specifying StartLine/EndLine line ranges.`,
					);
				}
			} catch {}
		}
	}
}

function detectLowModificationEfficiency(step, tc, ctx) {
	if (tc.name === "replace_file_content" && tc.args.TargetFile) {
		const fp = cleanArgValue(tc.args.TargetFile);
		if (fs.existsSync(fp)) {
			try {
				const fileContent = fs.readFileSync(fp, "utf8");
				const totalLines = fileContent.split("\n").length;
				if (totalLines > 100 && tc.args.StartLine === 1 && tc.args.EndLine >= totalLines - 5) {
					const relativePath = path.relative(process.cwd(), fp);
					ctx.lowModEfficiencyFindings.push(
						`- Step ${step.step_index}: Overwrote the entire file \`${relativePath}\` (${totalLines} lines) instead of replacing a targeted chunk.`,
					);
				}
			} catch {}
		}
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

		sandboxRerunFindings: [],
		lazyFileRetrievalFindings: [],
		lowModEfficiencyFindings: [],
		verbosityFindings: [],
		stateVerificationFindings: [],
		shortcutsFindings: [],
		overcomplexityFindings: [],
	};

	detectSandboxReruns(steps, ctx);
	detectNonSequentialLoops(steps, ctx);
	detectStateVerification(steps, ctx);
	detectShortcutsAndLaziness(steps, ctx);
	detectOvercomplexity(steps, ctx);

	steps.forEach((step) => {
		detectLoops(step, ctx);
		countToolsUsage(step, ctx);
		detectFailures(step, ctx);
		detectDeviations(step, ctx);
		detectThoughtsVerbosity(step, ctx);

		if (step.type === "PLANNER_RESPONSE" && step.tool_calls) {
			step.tool_calls.forEach((tc) => {
				detectLazyFileRetrieval(step, tc, ctx);
				detectLowModificationEfficiency(step, tc, ctx);
			});
		}
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

		sandboxRerunFindings: ctx.sandboxRerunFindings,
		lazyFileRetrievalFindings: ctx.lazyFileRetrievalFindings,
		lowModEfficiencyFindings: ctx.lowModEfficiencyFindings,
		verbosityFindings: ctx.verbosityFindings,
		stateVerificationFindings: ctx.stateVerificationFindings,
		shortcutsFindings: ctx.shortcutsFindings,
		overcomplexityFindings: ctx.overcomplexityFindings,
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
	markdown += "### Main Agent Metadata\n\n";
	markdown += "| Field | Value |\n";
	markdown += "|---|---|\n";
	markdown += `| **Conversation ID** | \`${main.id}\` |\n`;
	markdown += `| **Title / Objective** | ${main.role} |\n`;
	markdown += `| **Total Steps** | ${main.steps.length} |\n`;

	const mainToolSummary =
		Object.entries(main.analysis.toolCounts)
			.map(([tool, count]) => `\`${tool}\`: ${count}`)
			.join(", ") || "No tools executed";
	markdown += `| **Tool Execution Summary** | ${mainToolSummary} |\n\n`;

	if (conversations.length > 1) {
		markdown += "### Subagents Metadata\n\n";
		markdown += "| Conversation ID | Role / Title | Steps | Tool Execution Summary |\n";
		markdown += "|---|---|---|---|\n";
		for (let i = 1; i < conversations.length; i++) {
			const sub = conversations[i];
			const subToolSummary =
				Object.entries(sub.analysis.toolCounts)
					.map(([tool, count]) => `\`${tool}\`: ${count}`)
					.join(", ") || "No tools executed";
			markdown += `| \`${sub.id}\` | ${sub.role} | ${sub.steps.length} | ${subToolSummary} |\n`;
		}
		markdown += "\n";
	}

	return markdown;
}

function compileAgentAnalysis(conv, index) {
	const prefix = index === 0 ? "🤖 Main Agent" : `⚓ Subagent: ${conv.role}`;
	let markdown = `### ${prefix} (\`${conv.id}\`)\n\n`;

	const contextSections = [
		conv.analysis.lazyFileRetrievalFindings,
		conv.analysis.lowModEfficiencyFindings,
		conv.analysis.verbosityFindings,
		conv.analysis.stateVerificationFindings,
		conv.analysis.excessiveFindings,
	];
	const contextSection = contextSections
		.filter((x) => x && x.length > 0)
		.map((x) => x.join("\n"))
		.join("\n");
	if (contextSection) {
		markdown += `#### 📦 Context Management & Token Efficiency\n${contextSection}\n\n`;
	}

	const toolingSections = [
		conv.analysis.sandboxRerunFindings,
		conv.analysis.loopFindings,
		conv.analysis.failureFindings,
		conv.analysis.deviationFindings,
	];
	const toolingSection = toolingSections
		.filter((x) => x && x.length > 0)
		.map((x) => x.join("\n"))
		.join("\n");
	if (toolingSection) {
		markdown += `#### 🛠️ Execution Strategy & Tooling\n${toolingSection}\n\n`;
	}

	const shortcutsSections = [conv.analysis.shortcutsFindings, conv.analysis.overcomplexityFindings];
	const shortcutsSection = shortcutsSections
		.filter((x) => x && x.length > 0)
		.map((x) => x.join("\n"))
		.join("\n");
	if (shortcutsSection) {
		markdown += `#### 🧬 Shortcuts & Overcomplexity\n${shortcutsSection}\n\n`;
	}

	if (!contextSection && !toolingSection && !shortcutsSection) {
		markdown += "*No automated warnings triggered for this agent.*\n\n";
	}
	return markdown;
}

// Compile Section 2: Programmatic Analysis
function compileAnalysisSection(conversations) {
	let markdown = "";

	conversations.forEach((conv, index) => {
		markdown += compileAgentAnalysis(conv, index);
	});

	markdown += "### ⚠️ Qualitative Review (Agent Critiques)\n";
	markdown += "> [!IMPORTANT]\n";
	markdown +=
		"> This section is written by the reviewer agent after analyzing the chronology. It describes cognitive errors, task procrastination, and structural mistakes.\n\n";
	markdown +=
		"* **Misunderstandings & Assumptions**: [Reviewer agent will fill this in based on chronology]\n";
	markdown +=
		"* **Shortcuts & Laziness (Agent finished prematurely, oversimplified problems, or behaved lazy)**: [Reviewer agent will fill this in based on whether the agent took shortcuts, finished prematurely, oversimplified the problems, or behaved lazy/cut corners]\n";
	markdown +=
		"* **Overcomplexity**: [Reviewer agent will fill this in based on whether the agent chose unnecessarily complex patterns, over-engineered code, or spawned unnecessary subagents when a simpler native solution exists]\n";
	markdown += "* **Cognitive Surrender & Stuck States**: [Reviewer agent will fill this in]\n\n";

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
	const row = formatStepLine(step);
	return row;
}

// Compile Section 3: Chronology
function compileChronologySection(conversations) {
	let markdown = "";
	conversations.forEach((conv, index) => {
		const prefix = index === 0 ? "🤖 Main Agent" : `⚓ Subagent: ${conv.role}`;
		markdown += `### ${prefix} (\`${conv.id}\`)\n\n`;

		const chronologyRows = [];
		conv.steps.forEach((step) => {
			if (shouldSkipStep(step)) return;
			const actor = getActorName(step);
			const row = formatChronologyRow(step);
			if (row) {
				chronologyRows.push(
					`- **Step ${step.step_index}** · **${actor}**\n${row.replace(/\n/g, "\n  ")}`,
				);
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
