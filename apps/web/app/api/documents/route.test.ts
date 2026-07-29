import { db, documents } from '@ai-learning-support/infrastructure';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET } from './route';
import { POST } from './upload/route';

describe('Documents API Routes', () => {
  beforeEach(async () => {
    await db.delete(documents);
  });

  it('should return empty list when no documents exist (GET)', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('should upload a file and return success (POST)', async () => {
    const fileContent = 'hello world';
    const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', file);

    const request = new Request('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.name).toBe('test.txt');
    expect(data.data.fileSize).toBe(fileContent.length);

    // Now verify GET returns this document
    const getResponse = await GET();
    expect(getResponse.status).toBe(200);
    const getList = await getResponse.json();
    expect(getList).toHaveLength(1);
    expect(getList[0].name).toBe('test.txt');
  });

  it('should return 400 if file is missing (POST)', async () => {
    const formData = new FormData();

    const request = new Request('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing or invalid file input');
  });
});
