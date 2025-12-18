// Lightweight analytics helper gated by env flag
// Usage: import { track } from './analytics'; track('event_name', { key: 'value' })

const ENABLED = (import.meta as any)?.env?.VITE_ENABLE_ANALYTICS === 'true';
const API_BASE = (import.meta as any)?.env?.VITE_API_BASE?.replace(/\/$/, '') || '';

function post(path: string, body: any) {
  const url = `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

let buffer: Array<{ name: string; properties?: Record<string, any>; ts: number }> = [];
let flushTimer: number | undefined;
const FLUSH_INTERVAL_MS = 5000;

function scheduleFlush() {
  if (flushTimer) return;
  // @ts-ignore
  flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS) as unknown as number;
}

async function flush() {
  // @ts-ignore
  clearTimeout(flushTimer);
  flushTimer = undefined;
  if (!ENABLED) {
    buffer = [];
    return;
  }
  const batch = buffer.splice(0, buffer.length);
  if (!batch.length) return;
  try {
    await post('/api/analytics/events', { events: batch.map(e => ({ name: e.name, properties: e.properties || {}, ts: e.ts })) });
  } catch (e) {
    // swallow errors in UI
    console.warn('[analytics] flush failed', e);
  }
}

export function track(name: string, properties?: Record<string, any>) {
  if (!ENABLED) return;
  buffer.push({ name, properties, ts: Date.now() });
  if (buffer.length >= 10) {
    flush();
  } else {
    scheduleFlush();
  }
}

export function trackNow(name: string, properties?: Record<string, any>) {
  if (!ENABLED) return;
  buffer.push({ name, properties, ts: Date.now() });
  flush();
}

// Flush on page hide
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (!ENABLED) return;
    const batch = buffer.splice(0, buffer.length);
    if (!batch.length) return;
    try {
      navigator.sendBeacon(`${API_BASE}/api/analytics/events`, JSON.stringify({ events: batch }));
    } catch {}
  });
}
