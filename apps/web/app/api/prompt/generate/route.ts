import { proxyPrompt } from '@/lib/prompt-proxy';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const body = await request.text();
  return proxyPrompt('/api/prompt/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
}
