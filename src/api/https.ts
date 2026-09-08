export interface RequestConfig extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
}

export class HttpError extends Error {
  public status: number;
  public data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Base HTTP fetch wrapper with typed responses, query params, and timeouts
 */
class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path.startsWith('http') ? path : `${this.baseUrl}${path}`, 'http://localhost');
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    // Return relative if original was relative
    if (!path.startsWith('http')) {
      return `${url.pathname}${url.search}`;
    }
    return url.toString();
  }

  public async request<T>(path: string, config: RequestConfig = {}): Promise<T> {
    const { timeoutMs = 25000, params, headers, ...restConfig } = config;
    const url = this.buildUrl(path, params);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...restConfig,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        let errorData: unknown;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }

        const message =
          (typeof errorData === 'object' && errorData && 'message' in errorData
            ? String((errorData as { message: unknown }).message)
            : response.statusText) || `Request failed with status ${response.status}`;

        throw new HttpError(message, response.status, errorData);
      }

      // If empty response
      const text = await response.text();
      return text ? (JSON.parse(text) as T) : ({} as T);
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof HttpError) {
        throw err;
      }
      if ((err as Error).name === 'AbortError') {
        throw new HttpError('Request timed out. Please try again.', 408);
      }
      throw new HttpError((err as Error).message || 'Network error occurred', 500);
    }
  }

  public get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  public post<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public put<T>(path: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: 'DELETE' });
  }
}

export const https = new HttpClient();
