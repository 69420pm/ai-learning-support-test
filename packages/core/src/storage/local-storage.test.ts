import { describe, expect, it } from "vitest";
import { LocalFileSystemStorage } from "./local-storage.js";

describe("LocalFileSystemStorage", () => {
	const storage = new LocalFileSystemStorage();

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
});
