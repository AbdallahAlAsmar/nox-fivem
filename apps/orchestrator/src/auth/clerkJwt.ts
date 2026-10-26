import { createPublicKey, verify, type KeyObject } from 'crypto';

/**
 * The on-disk CLERK_SECRET_KEY is sometimes a short placeholder. A real Clerk
 * secret is `sk_test_` / `sk_live_` plus a long token. Anything else cannot
 * call the Clerk Backend API, but session tokens can still be checked against
 * the instance's public JWKS.
 */
export function isUsableClerkSecret(value: string | undefined): boolean {
  return !!value && /^sk_(test|live)_[A-Za-z0-9]{20,}$/.test(value.trim());
}

function frontendApiHost(): string | null {
  const key =
    process.env.CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.VITE_CLERK_PUBLISHABLE_KEY ||
    '';
  const encoded = key.trim().replace(/^pk_(test|live)_/, '');
  if (!encoded || encoded === key.trim()) return null;
  try {
    const host = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '').trim();
    if (!/^[a-z0-9.-]+$/i.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

interface Jwk {
  kid?: string;
  kty?: string;
  n?: string;
  e?: string;
  alg?: string;
  use?: string;
}

let cached: { host: string; keys: Map<string, KeyObject>; fetchedAt: number } | null = null;

async function keysFor(host: string): Promise<Map<string, KeyObject>> {
  if (cached && cached.host === host && Date.now() - cached.fetchedAt < 10 * 60 * 1000) {
    return cached.keys;
  }
  const response = await fetch(`https://${host}/.well-known/jwks.json`);
  if (!response.ok) {
    throw new Error(`JWKS fetch failed (${response.status})`);
  }
  const body = (await response.json()) as { keys?: Jwk[] };
  const keys = new Map<string, KeyObject>();
  for (const jwk of body.keys ?? []) {
    if (!jwk.kid || jwk.kty !== 'RSA') continue;
    keys.set(jwk.kid, createPublicKey({ key: jwk as never, format: 'jwk' }));
  }
  cached = { host, keys, fetchedAt: Date.now() };
  return keys;
}

export interface VerifiedSession {
  sub: string;
  email: string | null;
}

/** Verify a Clerk session JWT using the instance publishable key's public JWKS. */
export async function verifySessionWithJwks(token: string): Promise<VerifiedSession | null> {
  const host = frontendApiHost();
  if (!host) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  if (header.alg !== 'RS256' || !header.kid) return null;
  const keys = await keysFor(host);
  const key = keys.get(header.kid);
  if (!key) return null;
  const valid = verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    key,
    Buffer.from(parts[2], 'base64url'),
  );
  if (!valid) return null;
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
    sub?: string;
    exp?: number;
    nbf?: number;
    iss?: string;
    email?: string;
  };
  const now = Math.floor(Date.now() / 1000);
  if (!payload.sub || !payload.exp || payload.exp < now) return null;
  if (payload.nbf && payload.nbf > now + 5) return null;
  if (payload.iss !== `https://${host}`) return null;
  return { sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : null };
}
