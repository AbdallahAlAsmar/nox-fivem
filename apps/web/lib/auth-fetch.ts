let tokenProvider: (() => Promise<string | null>) | null = null;

export function configureAuthFetch(p: (() => Promise<string | null>) | null) {
  tokenProvider = p;
}

export class AuthError extends Error {}

export async function authedFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = tokenProvider ? await tokenProvider() : null;
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let res = await fetch(url, { ...init, headers });
  if (res.status === 401 && tokenProvider) {
    const fresh = await tokenProvider(); // Clerk refreshes near-expiry automatically
    if (fresh && fresh !== token) {
      headers.set('Authorization', `Bearer ${fresh}`);
      res = await fetch(url, { ...init, headers });
    }
  }
  if (res.status === 401) throw new AuthError('Session expired');
  return res;
}
