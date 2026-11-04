'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { ArrowRight, Check, Copy, Download, FileText, LoaderCircle, MessageSquarePlus, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { PromptInput } from '@/components/ui/ai-chat-input';

type FileEntry = { path: string; content: string };
type Result = { prompt: string; files: FileEntry[]; notes?: string };
type Message = { id: string; role: 'user' | 'assistant'; content: string; result?: Result | null };
type Conversation = { id: string; title: string; updatedAt?: string };

const suggestions = [
  'Build a personal portfolio site that feels editorial and minimal',
  'Create a study plan to learn conversational Japanese in 90 days',
  'Design an onboarding email sequence for a small SaaS launch',
];

export default function PromptStudio() {
  const { isLoaded, isSignedIn } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshConversations = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const response = await fetch('/api/prompt/conversations', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // The chat remains usable if history cannot be loaded.
    }
  }, [isSignedIn]);

  useEffect(() => { void refreshConversations(); }, [refreshConversations]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const startNew = () => {
    setMessages([]);
    setConversationId(null);
    setError('');
    setText('');
    setActiveFile(null);
    inputRef.current?.focus();
  };

  const openConversation = async (id: string) => {
    setError('');
    try {
      const response = await fetch(`/api/prompt/conversations/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not open this conversation.');
      const data = await response.json();
      setConversationId(data.conversation.id);
      setMessages((data.messages || []).map((message: any) => ({
        id: message.id,
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
        result: message.result || null,
      })));
      setActiveFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this conversation.');
    }
  };

  const submit = async (value = text) => {
    const message = value.trim();
    if (!message || busy) return;
    setError('');
    setText('');
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: message };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setBusy(true);
    try {
      const response = await fetch('/api/prompt/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId,
          history: conversationId ? undefined : messages.map(({ role, content, result }) => ({ role, content, result })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Prompt generation failed. Please try again.');
      if (data.conversationId) setConversationId(data.conversationId);
      if (typeof data.remaining === 'number') setRemaining(data.remaining);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || 'Your prompt is ready.',
        result: data.result || null,
      };
      setMessages((current) => [...current, assistantMessage]);
      setActiveFile(null);
      if (isSignedIn) void refreshConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prompt generation failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const copyPrompt = async (prompt: string) => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const hasMessages = messages.length > 0;

  return (
    <main className="flex h-[100dvh] overflow-hidden bg-[#111315] text-[#F4F1E9]">
      <aside className={`${sidebarOpen ? 'w-[272px]' : 'w-0'} shrink-0 overflow-hidden border-r border-[#414548] bg-[#181A1D] transition-[width] duration-200 max-md:absolute max-md:inset-y-0 max-md:z-20 ${sidebarOpen ? 'max-md:w-[272px]' : 'max-md:w-0'}`}>
        <div className="flex h-full w-[272px] flex-col">
          <div className="flex h-[72px] items-center justify-between border-b border-[#414548] px-5">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Noxes Studio home">
              <Image src="/brand/noxes-lockup.png" width={140} height={45} alt="NOXES · Worlds in Motion" priority />
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="flex h-10 w-10 items-center justify-center text-[#B6B0A4] hover:bg-white/[0.05] hover:text-[#F4F1E9]" aria-label="Close history sidebar"><PanelLeftClose size={17} /></button>
          </div>
          <button onClick={startNew} className="brand-button-primary mx-4 mt-5 h-11 justify-start px-3 text-sm">
            <MessageSquarePlus size={16} /> New prompt
          </button>
          <div className="px-5 pb-2 pt-8 text-xs font-medium text-[#B6B0A4]">Your prompts</div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            {isSignedIn ? conversations.length ? conversations.map((conversation) => (
              <button key={conversation.id} onClick={() => void openConversation(conversation.id)} className={`mb-1 min-h-10 w-full truncate px-3 py-2.5 text-left text-sm ${conversation.id === conversationId ? 'bg-white/[0.08] text-[#F4F1E9]' : 'text-[#B6B0A4] hover:bg-white/[0.04] hover:text-[#F4F1E9]'}`}>
                {conversation.title}
              </button>
            )) : <p className="px-3 py-2 text-xs leading-5 text-[#B6B0A4]">Your saved prompt chats will appear here.</p>
              : <div className="mx-2 border-t border-[#414548] px-3 py-4 text-xs leading-5 text-[#B6B0A4]">Sign in to keep a searchable history of your prompt projects.</div>}
          </div>
          <div className="border-t border-[#414548] p-4">
            {isSignedIn ? (
              <div className="flex items-center gap-3 text-xs text-[#B6B0A4]"><UserButton /> <span>Signed in · history is saved</span></div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[#B6B0A4]">Your chat stays in this session.</span>
                <SignInButton mode="modal"><button className="brand-button-secondary min-h-10 shrink-0 px-3 text-xs">Sign in</button></SignInButton>
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#414548] px-5 md:px-8">
          <div className="flex items-center gap-4">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="flex h-10 w-10 items-center justify-center text-[#B6B0A4] hover:bg-white/[0.05] hover:text-[#F4F1E9]" aria-label="Open history sidebar"><PanelLeftOpen size={18} /></button>}
            <div>
              <p className="text-sm font-medium">Prompt Studio</p>
              <p className="mt-0.5 text-xs text-[#B6B0A4]">Shape a clear prompt from your idea.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLoaded && !isSignedIn && <SignInButton mode="modal"><button className="brand-button-secondary min-h-10 px-3 text-xs">Sign in</button></SignInButton>}
            {isLoaded && isSignedIn && <UserButton />}
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-6 pb-28 pt-12 md:px-12">
              <div className="mb-5 h-1 w-12 bg-[#E83708]" />
              <h1 className="brand-display max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.025em] md:text-6xl">Give your idea structure.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#B6B0A4]">Describe what you want to create. Lyra will shape it into a practical prompt you can refine and take to your AI.</p>
              <div className="mt-9 max-w-3xl">
                <p className="mb-3 text-sm font-medium text-[#F4F1E9]">Start with an idea</p>
                <div className="divide-y divide-[#414548] border-y border-[#414548]">
                  {suggestions.map((suggestion) => <button key={suggestion} onClick={() => void submit(suggestion)} className="group flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left text-sm leading-6 text-[#B6B0A4] hover:text-[#F4F1E9]"><span>{suggestion}</span><ArrowRight size={16} className="shrink-0 text-[#68665F] group-hover:text-[#E83708]" /></button>)}
                </div>
              </div>
              {!isSignedIn && <p className="mt-6 text-xs leading-5 text-[#B6B0A4]">{remaining === null ? '5 guest generations each day' : `${remaining} guest generations left today`} <span aria-hidden="true">·</span> Sign in to save history and download project files</p>}
            </div>
          ) : (
            <div className="mx-auto max-w-4xl px-5 pb-44 pt-8 md:px-12 md:pt-12">
              {messages.map((message) => (
                <article key={message.id} className="mb-9">
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#B6B0A4]">
                    <span className={`h-2 w-2 ${message.role === 'assistant' ? 'bg-[#E83708]' : 'bg-[#68665F]'}`} />
                    {message.role === 'assistant' ? 'Lyra' : 'You'}
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-7 text-[#F4F1E9]">{message.content}</div>
                  {message.result && <PromptOutput result={message.result} signedIn={Boolean(isSignedIn)} conversationId={conversationId} activeFile={activeFile} setActiveFile={setActiveFile} onCopy={copyPrompt} copied={copied} onGenerateFiles={() => void submit('Please create the relevant project documentation files for the prompt we just made. Keep the optimized prompt intact and return any useful files for download.')} />}
                </article>
              ))}
              {busy && <div className="mb-8 flex items-center gap-3 text-sm text-[#B6B0A4]"><LoaderCircle size={16} className="animate-spin text-[#E83708]" /> Lyra is shaping your prompt…</div>}
              {error && <div role="alert" className="mb-6 border-l-2 border-[#E83708] px-4 py-2 text-sm leading-6 text-[#F4F1E9]">{error}{error.includes('Sign in') && <SignInButton mode="modal"><button className="ml-2 underline underline-offset-4">Sign in</button></SignInButton>}</div>}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#414548] bg-[#111315] px-4 pb-3 pt-4 md:px-8 md:pb-5">
          {error && !hasMessages && <p role="alert" className="mx-auto mb-2 max-w-4xl text-xs text-[#F4F1E9]">{error}</p>}
          <div className="mx-auto max-w-4xl">
            <PromptInput
              ref={inputRef}
              value={text}
              onChange={setText}
              onSubmit={(message) => void submit(message)}
              disabled={busy}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs leading-5 text-[#B6B0A4]"><span>{!isSignedIn && `Guest chats are not saved. ${remaining === null ? '5 free turns per day.' : `${remaining} left today.`}`}</span><span>Review the prompt before using it.</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PromptOutput({ result, signedIn, conversationId, activeFile, setActiveFile, onCopy, onGenerateFiles, copied }: {
  result: Result;
  signedIn: boolean;
  conversationId: string | null;
  activeFile: string | null;
  setActiveFile: (path: string | null) => void;
  onCopy: (prompt: string) => void;
  onGenerateFiles: () => void;
  copied: boolean;
}) {
  return (
    <div className="mt-7 space-y-5">
      <section className="border border-[#68665F] bg-[#181A1D]">
        <div className="flex min-h-14 items-center justify-between border-b border-[#414548] px-4 py-2">
          <div className="flex items-center gap-2 text-sm font-medium text-[#F4F1E9]"><span className="h-2 w-2 bg-[#E83708]" />Your optimized prompt</div>
          <button onClick={() => void onCopy(result.prompt)} className="flex min-h-10 items-center gap-1.5 px-2 text-xs text-[#B6B0A4] hover:text-[#F4F1E9]">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words px-4 py-5 font-sans text-sm leading-7 text-[#F4F1E9]">{result.prompt}</pre>
      </section>

      {result.notes && <p className="text-sm leading-6 text-[#B6B0A4]">{result.notes}</p>}
      {!signedIn && <div className="flex flex-wrap items-center justify-between gap-3 border border-[#414548] px-4 py-4"><div><p className="text-sm text-[#F4F1E9]">Need project files for this prompt?</p><p className="mt-1 text-xs leading-5 text-[#B6B0A4]">Sign in to generate documentation, keep prompt history, and download a ZIP.</p></div><SignInButton mode="modal"><button className="brand-button-secondary min-h-11 shrink-0 px-4 text-xs">Sign in</button></SignInButton></div>}
      {signedIn && result.files.length === 0 && <button onClick={onGenerateFiles} className="brand-button-secondary min-h-11 px-4 text-xs">Generate supporting files</button>}
      {result.files.length > 0 && (
        <section className="border border-[#414548]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#414548] px-4 py-3">
            <div><h2 className="text-sm font-medium text-[#F4F1E9]">Project files <span className="ml-1 text-xs text-[#B6B0A4]">{result.files.length}</span></h2><p className="mt-1 text-xs text-[#B6B0A4]">Markdown documents for your target AI.</p></div>
            {signedIn && conversationId ? <a href={`/api/prompt/conversations/${encodeURIComponent(conversationId)}/download`} className="brand-button-secondary min-h-11 px-3 text-xs"><Download size={14} /> Download ZIP</a>
              : <SignInButton mode="modal"><button className="brand-button-secondary min-h-11 px-3 text-xs">Sign in to view files</button></SignInButton>}
          </div>
          {signedIn && <div className="divide-y divide-[#414548]">
            {result.files.map((file) => <div key={file.path}>
              <button onClick={() => setActiveFile(activeFile === file.path ? null : file.path)} className="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#B6B0A4] hover:bg-white/[0.025] hover:text-[#F4F1E9]"><FileText size={14} className="text-[#E83708]" />{file.path}</button>
              {activeFile === file.path && <pre className="max-h-80 overflow-auto border-t border-[#414548] bg-[#111315] p-4 text-xs leading-6 text-[#B6B0A4]">{file.content}</pre>}
            </div>)}
          </div>}
        </section>
      )}
    </div>
  );
}
