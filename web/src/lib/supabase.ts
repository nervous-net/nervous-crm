// ABOUTME: API client for communicating with the Nervous System gateway.
// ABOUTME: Provides fetch wrappers with JWT auth and response handling.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7777';

// Token storage
export function getStoredToken(): string | null {
  return localStorage.getItem('ns_token');
}

export function getStoredUser(): {
  id: string;
  email: string;
  org_id: string;
  role: string;
} | null {
  const raw = localStorage.getItem('ns_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredAuth(
  token: string,
  user: { id: string; email: string; org_id: string; role: string }
): void {
  localStorage.setItem('ns_token', token);
  localStorage.setItem('ns_user', JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem('ns_token');
  localStorage.removeItem('ns_user');
}

// Fetch wrapper
async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearStoredAuth();
    window.location.replace('/login');
    throw new Error('Session expired');
  }

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Exported API methods
export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
