import type { Buffer } from "node:buffer";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorageService } from "./storage-service.js";

function findWorkspaceRoot(): string {
	let currentDir = path.dirname(fileURLToPath(import.meta.url));
	while (currentDir !== path.parse(currentDir).root) {
		if (fs.existsSync(path.join(currentDir, "pnpm-workspace.yaml"))) {
			return currentDir;
		}
		currentDir = path.dirname(currentDir);
	}
	return process.cwd();
}

const rootDir = findWorkspaceRoot();
const storageDir = path.join(rootDir, ".data", "storage");

if (!fs.existsSync(storageDir)) {
	fs.mkdirSync(storageDir, { recursive: true });
}

export class LocalFileSystemStorage implements StorageService {
	async uploadFile(filePath: string, file: Buffer): Promise<string> {
		const fullPath = path.join(storageDir, filePath);
		const parentDir = path.dirname(fullPath);
		await fs.promises.mkdir(parentDir, { recursive: true });
		await fs.promises.writeFile(fullPath, file);
		return filePath;
	}

	async getFile(filePath: string): Promise<Buffer> {
		const fullPath = path.join(storageDir, filePath);
		return await fs.promises.readFile(fullPath);
	}

	async deleteFile(filePath: string): Promise<void> {
		const fullPath = path.join(storageDir, filePath);
		await fs.promises.unlink(fullPath);
	}

	async getFileUrl(filePath: string): Promise<string> {
		return `/api/documents/view?path=${filePath}`;
	}
}
