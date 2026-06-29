import * as fs from "node:fs";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { LocalFileSystemStorage } from "./local-storage.js";

function findWorkspaceRoot(): string {
	let currentDir = process.cwd();
	while (currentDir !== path.parse(currentDir).root) {
		if (fs.existsSync(path.join(currentDir, "pnpm-workspace.yaml"))) {
			return currentDir;
		}
		currentDir = path.dirname(currentDir);
	}
	return process.cwd();
}

describe("LocalFileSystemStorage", () => {
	const storage = new LocalFileSystemStorage();
	const rootDir = findWorkspaceRoot();
	const testFolder = path.join(rootDir, ".data", "storage", "test-folder");

	afterAll(async () => {
		try {
			await fs.promises.rm(testFolder, { recursive: true, force: true });
		} catch (error) {
			console.error("Failed to clean up test folder:", error);
		}
	});

	it("should write file to disk", async () => {
		const filePath = "test-folder/test-file.txt";
		const content = Buffer.from("hello world");

		const returnedPath = await storage.uploadFile(filePath, content);
		expect(returnedPath).toBe(filePath);
	});

	it("should read file from disk", async () => {
		const filePath = "test-folder/read-test.txt";
		const content = Buffer.from("read me");

		await storage.uploadFile(filePath, content);
		const readContent = await storage.getFile(filePath);
		expect(readContent.toString()).toBe("read me");
	});

	it("should delete file from disk", async () => {
		const filePath = "test-folder/delete-test.txt";
		const content = Buffer.from("delete me");

		await storage.uploadFile(filePath, content);
		await storage.deleteFile(filePath);

		await expect(storage.getFile(filePath)).rejects.toThrow();
	});

	it("should get file URL", async () => {
		const filePath = "test-folder/url-test.txt";
		const url = await storage.getFileUrl(filePath);
		expect(url).toBe(`/api/documents/view?path=${filePath}`);
	});

	it("should reject path traversal attempts", async () => {
		const traversalPaths = [
			"../outside.txt",
			"test-folder/../../outside.txt",
			"/absolute/path/outside.txt",
		];
		const content = Buffer.from("traversal");

		for (const badPath of traversalPaths) {
			await expect(storage.uploadFile(badPath, content)).rejects.toThrow(
				"Access denied: path traversal attempt",
			);
			await expect(storage.getFile(badPath)).rejects.toThrow(
				"Access denied: path traversal attempt",
			);
			await expect(storage.deleteFile(badPath)).rejects.toThrow(
				"Access denied: path traversal attempt",
			);
			await expect(storage.getFileUrl(badPath)).rejects.toThrow(
				"Access denied: path traversal attempt",
			);
		}
	});
});
