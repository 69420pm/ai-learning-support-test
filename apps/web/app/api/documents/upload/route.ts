import { DocumentService, LocalFileSystemStorage } from "@ai-learning-support/core";
import { NextResponse } from "next/server";

const MOCK_USER_ID = "user_local_dev_123";

export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const file = formData.get("file");

		if (!file || !(file instanceof File)) {
			return NextResponse.json({ error: "Missing or invalid file input" }, { status: 400 });
		}

		const maxFileSize = 10 * 1024 * 1024; // 10 MB limit
		if (file.size > maxFileSize) {
			return NextResponse.json({ error: "File size exceeds the 10MB limit" }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const storage = new LocalFileSystemStorage();
		const documentService = new DocumentService(storage);

		const document = await documentService.uploadDocument(MOCK_USER_ID, file.name, buffer);

		return NextResponse.json({ success: true, data: document });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Internal Server Error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
