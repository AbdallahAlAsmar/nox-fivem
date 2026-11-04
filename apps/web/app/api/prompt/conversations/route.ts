import { proxyPrompt } from '@/lib/prompt-proxy';
export const runtime = 'nodejs';
export async function GET() { return proxyPrompt('/api/prompt/conversations', {}, true); }
