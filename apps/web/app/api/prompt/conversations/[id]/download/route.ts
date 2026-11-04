import { proxyPrompt } from '@/lib/prompt-proxy';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return proxyPrompt('/api/prompt/conversations/' + encodeURIComponent(params.id) + '/download', {}, true);
}
