const API_BASE = import.meta.env.PROD
  ? 'https://nervous-crm.fly.dev/api/v1'
  : '/api/v1';

class ApiClient {
  private csrfToken: string | null = null;
  private csrfPromise: Promise<string | null> | null = null;

  private async getCsrfToken(): Promise<string | null> {
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // Prevent multiple simultaneous fetches
    if (this.csrfPromise) {
      return this.csrfPromise;
    }

    this.csrfPromise = fetch(`${API_BASE}/csrf-token`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        this.csrfToken = data.data.csrfToken;
        this.csrfPromise = null;
        return this.csrfToken;
      })
      .catch(() => {
        this.csrfPromise = null;
        return null;
      });

    return this.csrfPromise;
  }

  private async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    const headers: Record<string, string> = {};

    // Only set Content-Type if we have data to send
    if (data !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    // Add CSRF token for mutating requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = await this.getCsrfToken();
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Network error' } }));
      // Clear CSRF token on 403 (might be invalid)
      if (response.status === 403) {
        this.csrfToken = null;
      }
      throw new Error(error.error?.message || 'Request failed');
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>('POST', path, data);
  }

  put<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>('PUT', path, data);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();
