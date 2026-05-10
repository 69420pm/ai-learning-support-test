#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-env node */
/* global console, process */

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

async function run(cmd) {
	try {
		const { stdout } = await execAsync(cmd, {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "ignore"],
		});
		return stdout.trim();
	} catch {
		return null;
	}
}

const IGNORE_MESSAGES = [
	"thank you so much for your contribution to Gemini CLI!",
	"I'm currently reviewing this pull request and will post my feedback shortly.",
	"This pull request is being closed because it is not currently linked to an issue.",
];

const shouldIgnore = (body) => {
	if (!body) return false;
	return IGNORE_MESSAGES.some((msg) => body.includes(msg));
};

function formatFileInfo(c) {
	const start = c.startLine || c.originalStartLine;
	const end = c.line || c.originalLine;
	const range = start && end && start !== end ? `${start}-${end}` : end || "";
	return c.path ? `(${c.path}${range ? `:${range}` : ""}) ` : range ? `(Line ${range}) ` : "";
}

function printThread(parentId, filteredInlines, depth = 1) {
	const indent = "  ".repeat(depth);
	const replies = filteredInlines.filter((c) => c.replyTo?.id === parentId);
	for (const reply of replies) {
		const minimized = reply.isMinimized ? ` (Minimized: ${reply.minimizedReason})` : "";
		console.log(`${indent}↳ [${reply.createdAt}] ${reply.author.login}${minimized}: ${reply.body}`);
		printThread(reply.id, filteredInlines, depth + 1);
	}
}

async function getRepoInfo() {
	let repoOwner = "google-gemini";
	let repoName = "gemini-cli";
	const remoteUrl = await run("git remote get-url origin");
	if (remoteUrl) {
		const match = remoteUrl.match(/github\.com[/:]+([^/]+)\/([^.]+)/);
		if (match) {
			repoOwner = match[1];
			repoName = match[2];
		}
	}
	return { repoOwner, repoName };
}

async function fetchPrData(branch, repoOwner, repoName) {
	const gqlQuery = `query($branch:String!){repository(name:"${repoName}",owner:"${repoOwner}"){pullRequests(headRefName:$branch,first:100){nodes{id,number,state,comments(first:100){nodes{createdAt,isMinimized,minimizedReason,author{login},body,url,authorAssociation}},reviews(first:100){nodes{id,author{login},createdAt,isMinimized,minimizedReason,body,state,comments(first:30){nodes{id,replyTo{id},author{login},createdAt,body,isMinimized,minimizedReason,path,line,startLine,originalLine,originalStartLine}}}}}}}}`;

	return run(`gh api graphql -F branch="${branch}" -f query='${gqlQuery}'`);
}

function printGeneralComments(comments) {
	const general = comments.nodes.filter((c) => !shouldIgnore(c.body));
	if (general.length > 0) {
		console.log("\n💬 GENERAL COMMENTS:");
		for (const c of general) {
			const minimized = c.isMinimized ? ` (Minimized: ${c.minimizedReason})` : "";
			console.log(`[${c.createdAt}] [${c.author.login}]${minimized}: ${c.body}\n`);
		}
	}
}

function printReviewSummaries(reviews) {
	for (const review of reviews.nodes) {
		if (review.body && !shouldIgnore(review.body)) {
			const icon = review.state === "APPROVED" ? "✅" : "💬";
			const minimized = review.isMinimized ? ` (Minimized: ${review.minimizedReason})` : "";
			console.log(
				`\n${icon} ${review.state} by ${review.author.login} at ${review.createdAt}${minimized}: "${review.body}"`,
			);
		}
	}
}

function printInlineThreads(filteredInlines) {
	const topLevelThreads = filteredInlines.filter((c) => !c.replyTo);
	for (const c of topLevelThreads) {
		const fileInfo = formatFileInfo(c);
		const minimized = c.isMinimized ? ` (Minimized: ${c.minimizedReason})` : "";
		console.log(`\n💬 ${minimized}${c.author.login} | ${c.createdAt} ${fileInfo}\n${c.body}`);
		printThread(c.id, filteredInlines);
	}
}

function printPrFeedback(pr) {
	console.log("\n# PR Feedback\n");

	printGeneralComments(pr.comments);

	const allInlineComments = pr.reviews.nodes.flatMap((r) => r.comments.nodes);
	const filteredInlines = allInlineComments.filter((c) => !shouldIgnore(c.body));

	console.log("🔍 CODE REVIEWS & INLINE THREADS:");

	printReviewSummaries(pr.reviews);
	printInlineThreads(filteredInlines);
}

async function main() {
	const branch = await run("git branch --show-current");
	if (!branch) {
		console.error("❌ Could not determine current git branch.");
		process.exit(1);
	}

	const { repoOwner, repoName } = await getRepoInfo();

	const [authInfo, diff, commits, rawJson] = await Promise.all([
		run("gh auth status -a"),
		run("gh pr diff"),
		run("git fetch && git log origin/main..origin/$(git branch --show-current)"),
		fetchPrData(branch, repoOwner, repoName),
	]);

	if (!diff) {
		console.error(`⚠️ No active PR found for branch: ${branch}`);
		process.exit(1);
	}

	console.log(`\n# Current GitHub user info:\n\n${authInfo}\n`);
	console.log(`\n# PR diff for current branch: ${branch}\n\n\`\`\``);
	console.log(diff);
	console.log("```");
	console.log(`\n# Commit history (origin/main..origin/${branch})\n\n${commits}`);

	const data = JSON.parse(rawJson || "{}");
	const prs = data?.data?.repository?.pullRequests?.nodes || [];
	prs.sort((a, b) => b.number - a.number);
	const pr = prs.find((p) => p.state === "OPEN") || prs[0];

	if (!pr) {
		console.error("❌ No PR data found.");
		process.exit(1);
	}

	printPrFeedback(pr);
	console.log("\n");
}

main().catch((err) => {
	console.error("❌ Unexpected error:", err);
	process.exit(1);
});
