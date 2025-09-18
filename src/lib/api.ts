// Centralized API base and fetch helper
// Configure a production API host by setting VITE_API_BASE (without trailing slash), e.g.
// VITE_API_BASE=https://smart-sanitation-backend.example.com

export const API_BASE = (import.meta as any)?.env?.VITE_API_BASE?.replace(/\/$/, '') || '';

export function apiUrl(path: string) {
  if (!path.startsWith('/')) path = '/' + path;
  // If API_BASE provided, prefix it. Otherwise return the path for dev proxy.
  return `${API_BASE}${path}`;
}

export async function apiFetch(input: string, init?: RequestInit) {
  const url = apiUrl(input);
  return fetch(url, init);
}
