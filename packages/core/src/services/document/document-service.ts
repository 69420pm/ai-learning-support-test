import type { Buffer } from "node:buffer";
import type { StorageService } from "../../storage/storage-service.js";
import type { DocumentEntity } from "../../types/document.js";

export class DocumentService {
	constructor(private storageService: StorageService) {}

	async uploadDocument(
		_userId: string,
		_filename: string,
		_fileBuffer: Buffer,
	): Promise<DocumentEntity> {
		// Reference storageService to satisfy noUnusedLocals if needed
		this.storageService;
		throw new Error("Not implemented");
	}

	async listDocuments(_userId: string): Promise<DocumentEntity[]> {
		throw new Error("Not implemented");
	}
}
