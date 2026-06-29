export interface DocumentEntity {
	id: string;
	userId: string;
	name: string;
	storagePath: string;
	fileSize: number;
	status: "pending" | "processing" | "completed" | "failed";
	createdAt: number;
	updatedAt: number;
}
