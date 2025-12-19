// src/lib/api.ts

// Centralized API base and fetch helper
// Configure a production API host by setting VITE_API_BASE (without trailing slash), e.g.
// VITE_API_BASE=https://smart-sanitation-backend.example.com

// In Docker/Prod, we use relative paths so Nginx can proxy to /api.
// In dev (Vite), we might target localhost:3001 if not proxying.
export const API_BASE = (import.meta as any)?.env?.VITE_API_BASE?.replace(/\/$/, '') || ''; // Empty string = relative path

/**
 * Constructs the full API URL by prepending the base URL if it exists.
 * @param path The relative API endpoint path (e.g., '/api/units').
 * @returns The complete URL string.
 */
export function apiUrl(path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  return `${API_BASE}${path}`;
}

// Interface to extend the standard RequestInit options
interface FetchOptions extends RequestInit {
  /** Optional object to be automatically stringified and used as the request body. */
  data?: object;
  /** Optional explicit token (e.g., JWT) to override the one in local storage. */
  token?: string;
}

/**
 * A standardized fetch utility for the Smart Sanitation Platform.
 * Automatically handles API base path, JSON headers, and authentication.
 * @param input The API endpoint path (e.g., '/api/fleet/units')
 * @param options Standard RequestInit options, plus optional 'data' for JSON body.
 * @returns A promise that resolves to the standard Fetch Response object.
 */
export async function apiFetch(input: string, options: FetchOptions = {}): Promise<Response> {
  const url = apiUrl(input);
  // Destructure custom options and gather the rest into 'init'
  const { data, token, headers, ...init } = options;

  // 1. Build common headers (merge defaults with any provided custom headers)
  const finalHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(headers as object), // Cast headers to object for spreading
  };

  // 2. Add Authentication (Mocking local storage retrieval for the JWT)
  // In a real app, you would retrieve this securely after login.
  const authToken = token || localStorage.getItem('authToken');
  if (authToken) {
    finalHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  // 3. Process the JSON body
  const body = data ? JSON.stringify(data) : init.body;

  // 4. Execute the fetch request
  return fetch(url, {
    ...init,
    headers: finalHeaders,
    body: body,
  });
}