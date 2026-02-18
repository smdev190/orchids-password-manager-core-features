import { BACKEND_URL } from './api';
import { AuthSession } from './types';
import { getSession, saveSession } from './storage';

async function refreshIfNeeded(session: AuthSession): Promise<AuthSession> {
  const now = Math.floor(Date.now() / 1000);
  // Refresh if expires within 60 seconds
  if (session.expires_at && session.expires_at - now < 60) {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (res.ok) {
        const data = await res.json();
        const newSession: AuthSession = data.session;
        await saveSession(newSession);
        return newSession;
      }
    } catch {}
  }
  return session;
}

export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  let session = await getSession();
  if (!session) throw new Error('Not authenticated');

  session = await refreshIfNeeded(session);

  return fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });
}

export async function authJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await authFetch(endpoint, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}
