import type { User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { proxy } from '@/proxy';
import { updateSession } from './proxy';

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: vi.fn(),
}));

describe('proxy route guards', () => {
  it('redirects unauthenticated user accessing protected route /dashboard to /login?redirectTo=/dashboard', async () => {
    const mockResponse = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue({
      supabaseResponse: mockResponse,
      user: null,
    });

    const request = new NextRequest('http://localhost:3000/dashboard');
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirectTo=%2Fdashboard',
    );
  });

  it('redirects unauthenticated user accessing sub-path of protected route /learn/123', async () => {
    const mockResponse = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue({
      supabaseResponse: mockResponse,
      user: null,
    });

    const request = new NextRequest('http://localhost:3000/learn/123');
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirectTo=%2Flearn%2F123',
    );
  });

  it('redirects authenticated user accessing auth route /login to /dashboard', async () => {
    const mockResponse = NextResponse.next();
    const mockUser = { id: 'user-123', email: 'test@example.com' } as User;
    vi.mocked(updateSession).mockResolvedValue({
      supabaseResponse: mockResponse,
      user: mockUser,
    });

    const request = new NextRequest('http://localhost:3000/login');
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('allows unauthenticated user to access auth route /login', async () => {
    const mockResponse = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue({
      supabaseResponse: mockResponse,
      user: null,
    });

    const request = new NextRequest('http://localhost:3000/login');
    const response = await proxy(request);

    expect(response).toBe(mockResponse);
  });

  it('allows authenticated user to access protected route /dashboard', async () => {
    const mockResponse = NextResponse.next();
    const mockUser = { id: 'user-123', email: 'test@example.com' } as User;
    vi.mocked(updateSession).mockResolvedValue({
      supabaseResponse: mockResponse,
      user: mockUser,
    });

    const request = new NextRequest('http://localhost:3000/dashboard');
    const response = await proxy(request);

    expect(response).toBe(mockResponse);
  });

  it('allows access to public landing page / for any user', async () => {
    const mockResponse = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue({
      supabaseResponse: mockResponse,
      user: null,
    });

    const request = new NextRequest('http://localhost:3000/');
    const response = await proxy(request);

    expect(response).toBe(mockResponse);
  });
});
