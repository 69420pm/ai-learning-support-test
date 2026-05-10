import { execSync } from "node:child_process";

const BRANCH = process.argv[2] || execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
const RUN_ID_OVERRIDE = process.argv[3];

let Repo = "google-gemini/gemini-cli";
try {
	Repo = execSync("git remote get-url origin")
		.toString()
		.replace(/.*github\.com[/:]/, "")
		.replace(/\.git$/, "")
		.trim();
} catch (_e) {
	Repo = "google-gemini/gemini-cli";
}

function runGh(args) {
	try {
		return execSync(`gh ${args}`, {
			stdio: ["ignore", "pipe", "ignore"],
		}).toString();
	} catch (_e) {
		return null;
	}
}

function fetchFailuresViaApi(jobId) {
	try {
		return execSync(`gh api repos/${Repo}/actions/jobs/${jobId}/logs`, {
			maxBuffer: 10 * 1024 * 1024,
		}).toString();
	} catch (_e) {
		return "";
	}
}

function isNoise(line) {
	const noisePatterns = [
		/^\d+ info/,
		/^\d+ warn/,
		/^\s*at\s+/,
		/node_modules/,
		/^\s*Done in/,
		/^\s*npm/,
		/^\s*yarn/,
	];
	return noisePatterns.some((p) => p.test(line));
}

function extractTestFile(line) {
	const match = line.match(/([a-zA-Z0-9_\-./]+\.(test|spec)\.(ts|js|tsx|jsx))/);
	return match ? match[1] : null;
}

function generateTestCommand(failedFilesMap) {
	const workspaceToFiles = new Map();
	for (const [file, _info] of failedFilesMap.entries()) {
		if (["Job Error", "Unknown File", "Build Error", "Lint Error"].includes(file)) continue;
		let workspace = "@google/gemini-cli";
		if (file.includes("packages/")) {
			workspace = `@google/gemini-${file.split("/")[1]}`;
		}
		if (!workspaceToFiles.has(workspace)) workspaceToFiles.set(workspace, new Set());
		workspaceToFiles.get(workspace).add(file);
	}
	if (workspaceToFiles.size === 0) return null;
	const commands = [];
	for (const [workspace, files] of workspaceToFiles.entries()) {
		commands.push(`npm test -w ${workspace} -- ${Array.from(files).join(" ")}`);
	}
	return commands.join(" && ");
}

function getRunsFromBranch() {
	const runListOutput = runGh(
		`run list --branch "${BRANCH}" --limit 10 --json databaseId,status,workflowName,createdAt`,
	);
	if (!runListOutput) return [];

	const runs = JSON.parse(runListOutput);
	const activeRuns = runs.filter((r) => r.status !== "completed");
	if (activeRuns.length > 0) {
		return activeRuns.map((r) => r.databaseId);
	}
	if (runs.length > 0) {
		const latestTime = new Date(runs[0].createdAt).getTime();
		return runs
			.filter((r) => latestTime - new Date(r.createdAt).getTime() < 60000)
			.map((r) => r.databaseId);
	}
	return [];
}

function getRunsFromStatuses() {
	try {
		const headSha = execSync(`git rev-parse "${BRANCH}"`).toString().trim();
		const statusOutput = runGh(
			`api repos/${Repo}/commits/${headSha}/status -q '.statuses[] | select(.target_url | contains("actions/runs/")) | .target_url'`,
		);
		if (statusOutput) {
			return statusOutput
				.split("\n")
				.filter(Boolean)
				.map((url) => {
					const match = url.match(/actions\/runs\/(\d+)/);
					return match ? parseInt(match[1], 10) : null;
				})
				.filter(Boolean);
		}
	} catch (_e) {
		// Ignore
	}
	return [];
}

function findTargetRunIds() {
	if (RUN_ID_OVERRIDE) return [RUN_ID_OVERRIDE];

	const targetRunIds = getRunsFromBranch();
	const statusRunIds = getRunsFromStatuses();

	for (const runId of statusRunIds) {
		if (!targetRunIds.includes(runId)) {
			targetRunIds.push(runId);
		}
	}
	return targetRunIds;
}

function parseFailureLine(line, fileToTests) {
	if (!line.trim() || isNoise(line)) return;
	const file = extractTestFile(line);
	const filePath =
		file ||
		(line.toLowerCase().includes("lint")
			? "Lint Error"
			: line.toLowerCase().includes("build")
				? "Build Error"
				: "Unknown File");
	let testName = line;
	if (line.includes(" > ")) {
		testName = line.split(" > ").slice(1).join(" > ").trim();
	}
	if (!fileToTests.has(filePath)) fileToTests.set(filePath, new Set());
	fileToTests.get(filePath).add(testName);
}

function processFailedJob(job, fileToTests) {
	const failures = fetchFailuresViaApi(job.databaseId);
	if (failures.trim()) {
		for (const line of failures.split("\n")) {
			parseFailureLine(line, fileToTests);
		}
	} else {
		const step = job.steps?.find((s) => s.conclusion === "failure")?.name || "unknown";
		const category = step.toLowerCase().includes("lint")
			? "Lint Error"
			: step.toLowerCase().includes("build")
				? "Build Error"
				: "Job Error";
		if (!fileToTests.has(category)) fileToTests.set(category, new Set());
		fileToTests.get(category).add(`${job.name}: Failed at step "${step}"`);
	}
}

function updateJobStats(job, stats, state) {
	if (job.status === "in_progress") {
		stats.allRunning++;
	} else if (job.status === "queued") {
		stats.allQueued++;
	} else if (job.conclusion === "success") {
		stats.allPassed++;
	} else if (job.conclusion === "failure") {
		stats.allFailed++;
		state.failuresFoundInLoop = true;
		processFailedJob(job, state.fileToTests);
	}
}

function aggregateRunJobs(runId, stats, state) {
	const runOutput = runGh(`run view "${runId}" --json databaseId,status,conclusion,workflowName`);
	if (!runOutput) return;
	const run = JSON.parse(runOutput);
	if (run.status !== "completed") state.anyRunInProgress = true;

	const jobsOutput = runGh(`run view "${runId}" --json jobs`);
	if (jobsOutput) {
		const { jobs } = JSON.parse(jobsOutput);
		stats.totalJobs += jobs.length;
		for (const job of jobs) {
			updateJobStats(job, stats, state);
		}
	}
}

function printFailureReport(fileToTests, allFailed) {
	console.log(`\n\n❌ Failures detected across ${allFailed} job(s). Stopping monitor...`);
	console.log("\n--- Structured Failure Report (Noise Filtered) ---");
	for (const [file, tests] of fileToTests.entries()) {
		console.log(`\nCategory/File: ${file}`);
		const testsArr = Array.from(tests).map((t) =>
			t.length > 500 ? `${t.substring(0, 500)}... [TRUNCATED]` : t,
		);
		for (const t of testsArr.slice(0, 10)) {
			console.log(`  - ${t}`);
		}
		if (testsArr.length > 10) console.log(`  ... and ${testsArr.length - 10} more`);
	}
	const testCmd = generateTestCommand(fileToTests);
	if (testCmd) {
		console.log("\n🚀 Run this to verify fixes:");
		console.log(testCmd);
	} else if (Array.from(fileToTests.keys()).some((k) => k.includes("Lint"))) {
		console.log("\n🚀 Run this to verify lint fixes:\nmake lint");
	}
	console.log("---------------------------------");
}

async function monitor() {
	const targetRunIds = findTargetRunIds();

	if (targetRunIds.length > 0 && !RUN_ID_OVERRIDE) {
		const runNames = [];
		for (const runId of targetRunIds) {
			const runInfo = runGh(`run view "${runId}" --json workflowName`);
			if (runInfo) {
				runNames.push(JSON.parse(runInfo).workflowName);
			}
		}
		console.log(`Monitoring workflows: ${[...new Set(runNames)].join(", ")}`);
	}

	if (targetRunIds.length === 0) {
		console.log(`No runs found for branch ${BRANCH}.`);
		process.exit(0);
	}

	while (true) {
		const stats = { allPassed: 0, allFailed: 0, allRunning: 0, allQueued: 0, totalJobs: 0 };
		const state = { anyRunInProgress: false, failuresFoundInLoop: false, fileToTests: new Map() };

		for (const runId of targetRunIds) {
			aggregateRunJobs(runId, stats, state);
		}

		if (state.failuresFoundInLoop) {
			printFailureReport(state.fileToTests, stats.allFailed);
			process.exit(1);
		}

		const completed = stats.allPassed + stats.allFailed;
		process.stdout.write(
			`\r⏳ Monitoring ${targetRunIds.length} runs... ${completed}/${stats.totalJobs} jobs (${stats.allPassed} passed, ${stats.allFailed} failed, ${stats.allRunning} running, ${stats.allQueued} queued)          `,
		);
		if (!state.anyRunInProgress) {
			console.log("\n✅ All workflows passed!");
			process.exit(0);
		}
		await new Promise((r) => setTimeout(r, 15000));
	}
}

monitor().catch((err) => {
	console.error("\nMonitor error:", err.message);
	process.exit(1);
});
