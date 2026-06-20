import { DocumentService, LocalFileSystemStorage } from "@ai-learning-support/core";
import { NextResponse } from "next/server";

const MOCK_USER_ID = "user_local_dev_123";

export async function GET() {
	try {
		const storage = new LocalFileSystemStorage();
		const documentService = new DocumentService(storage);
		const documentsList = await documentService.listDocuments(MOCK_USER_ID);
		return NextResponse.json(documentsList);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Internal Server Error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
