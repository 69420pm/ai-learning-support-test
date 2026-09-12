import { describe, expect, it } from 'vitest';
import { AppError, ChatbotError, getMessageByErrorCode, getStatusCode } from './errors';

describe('Domain Errors (ChatbotError / AppError)', () => {
  it('instantiates with typed error code and default message', () => {
    const error = new ChatbotError('unauthorized:auth');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ChatbotError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.type).toBe('unauthorized');
    expect(error.surface).toBe('auth');
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('You need to sign in before continuing.');
  });

  it('preserves custom cause string when supplied', () => {
    const error = new ChatbotError('bad_request:api', 'Invalid email format');
    expect(error.cause).toBe('Invalid email format');
    expect(error.message).toBe('Invalid email format');
    expect(error.type).toBe('bad_request');
    expect(error.surface).toBe('api');
    expect(error.statusCode).toBe(400);
  });

  it('preserves cause option object when supplied', () => {
    const innerError = new Error('Connection refused');
    const error = new ChatbotError('bad_request:database', { cause: innerError });
    expect(error.cause).toBe(innerError);
    expect(error.message).toBe('An error occurred while executing a database query.');
    expect(error.statusCode).toBe(400);
  });

  it('resolves correct HTTP status codes for all error types', () => {
    expect(getStatusCode('bad_request:api')).toBe(400);
    expect(getStatusCode('unauthorized:auth')).toBe(401);
    expect(getStatusCode('forbidden:chat')).toBe(403);
    expect(getStatusCode('not_found:document')).toBe(404);
    expect(getStatusCode('rate_limit:chat')).toBe(429);
    expect(getStatusCode('offline:chat')).toBe(503);
  });

  it('provides actionable default messages for domain surfaces', () => {
    expect(getMessageByErrorCode('not_found:document')).toContain(
      'requested document was not found',
    );
    expect(getMessageByErrorCode('forbidden:chat')).toContain('belongs to another user');
    expect(getMessageByErrorCode('rate_limit:chat')).toContain('message limit');
  });

  describe('toResponse', () => {
    it('returns a typed, actionable JSON response for response-visible errors', async () => {
      const error = new ChatbotError('not_found:document', 'Material chunk missing');
      const response = error.toResponse();

      expect(response.status).toBe(404);
      const json = await response.json();

      // Typed domain failure schema: { type, surface, statusCode, message, code, cause }
      expect(json).toMatchObject({
        type: 'not_found',
        surface: 'document',
        statusCode: 404,
        code: 'not_found:document',
        cause: 'Material chunk missing',
      });
      expect(json.message).toBe(
        'The requested document was not found. Please check the document ID and try again.',
      );
    });

    it('sanitizes log-only surfaces like database in HTTP responses', async () => {
      const error = new ChatbotError('bad_request:database', 'Sensitive internal query failure');
      const response = error.toResponse();

      expect(response.status).toBe(400);
      const json = await response.json();

      expect(json.type).toBe('bad_request');
      expect(json.surface).toBe('database');
      expect(json.statusCode).toBe(400);
      expect(json.message).toBe('Something went wrong. Please try again later.');
      expect(json.code).toBe('');
      expect(json.cause).toBeUndefined();
    });
  });
});
