import type { Buffer } from "node:buffer";
import type { StorageService } from "./storage-service.js";

export class LocalFileSystemStorage implements StorageService {
	async uploadFile(_path: string, _file: Buffer): Promise<string> {
		throw new Error("Not implemented");
	}
	async getFile(_path: string): Promise<Buffer> {
		throw new Error("Not implemented");
	}
	async deleteFile(_path: string): Promise<void> {
		throw new Error("Not implemented");
	}
	async getFileUrl(_path: string): Promise<string> {
		throw new Error("Not implemented");
	}
}
