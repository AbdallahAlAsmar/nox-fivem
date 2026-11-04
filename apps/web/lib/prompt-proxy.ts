import { auth } from '@clerk/nextjs/server';

export async function proxyPrompt(path: string, init: RequestInit = {}, requireSignedIn = false) {
  const session = await auth();
  if (requireSignedIn && !session.userId) return Response.json({ error: 'Sign in to access your prompt history and files.' }, { status: 401 });
  const token = session.userId ? await session.getToken() : null;
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', 'Bearer ' + token);
  const base = process.env.PROMPT_BACKEND_URL || process.env.ORCHESTRATOR_BACKEND_URL || 'http://89.168.96.147:3001';
  try {
    const upstream = await fetch(base.replace(/\/$/, '') + path, { ...init, headers, cache: 'no-store', signal: AbortSignal.timeout(55_000) });
    const forwarded = new Headers();
    for (const name of ['content-type', 'content-disposition', 'cache-control']) {
      const value = upstream.headers.get(name);
      if (value) forwarded.set(name, value);
    }
    forwarded.set('cache-control', 'private, no-store');
    return new Response(upstream.body, { status: upstream.status, headers: forwarded });
  } catch {
    return Response.json({ error: 'Prompt service is temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }
}
