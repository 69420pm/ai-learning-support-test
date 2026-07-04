import { createDocumentService } from '@ai-learning-support/core';
import { NextResponse } from 'next/server';

const MOCK_USER_ID = 'user_local_dev_123';

// biome-ignore lint/style/useNamingConvention: Next.js API route export
export async function GET() {
  try {
    const documentService = createDocumentService();
    const documentsList = await documentService.listDocuments(MOCK_USER_ID);
    return NextResponse.json(documentsList);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
