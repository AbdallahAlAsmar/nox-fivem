import type { Metadata } from 'next';
import PromptStudio from './PromptStudio';

export const metadata: Metadata = {
  title: 'Prompt Studio',
  description: 'Turn rough ideas into clear, structured prompts with Lyra.',
};

export default function PromptPage() {
  return <PromptStudio />;
}
