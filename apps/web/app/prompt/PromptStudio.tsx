'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { ArrowUp, Check, Copy, Download, FileText, LoaderCircle, MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';

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

  const keyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <main className="flex h-[100dvh] overflow-hidden bg-[#0a0a0f] text-white">
      <aside className={`${sidebarOpen ? 'w-[272px]' : 'w-0'} shrink-0 overflow-hidden border-r border-white/[0.08] bg-[#0d0d12] transition-[width] duration-200 max-md:absolute max-md:inset-y-0 max-md:z-20 ${sidebarOpen ? 'max-md:w-[272px]' : 'max-md:w-0'}`}>
        <div className="flex h-full w-[272px] flex-col">
          <div className="flex h-[72px] items-center justify-between border-b border-white/[0.07] px-5">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Noxes Studio home">
              <span className="h-2.5 w-2.5 bg-[#3DFFA2]" />
              <span className="font-mono text-sm font-semibold tracking-[0.15em]">NOXES<span className="text-[#3DFFA2]">.</span></span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="p-2 text-white/40 hover:text-white" aria-label="Close history sidebar"><PanelLeftClose size={17} /></button>
          </div>
          <button onClick={startNew} className="mx-4 mt-5 flex h-11 items-center gap-3 border border-white/15 px-3 text-sm text-white/80 hover:border-[#3DFFA2]/60 hover:text-white">
            <MessageSquarePlus size={16} className="text-[#3DFFA2]" /> New prompt
          </button>
          <div className="px-5 pb-2 pt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">Your prompts</div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            {isSignedIn ? conversations.length ? conversations.map((conversation) => (
              <button key={conversation.id} onClick={() => void openConversation(conversation.id)} className={`mb-1 w-full truncate px-3 py-2.5 text-left text-sm ${conversation.id === conversationId ? 'bg-white/[0.08] text-white' : 'text-white/55 hover:bg-white/[0.04] hover:text-white/85'}`}>
                {conversation.title}
              </button>
            )) : <p className="px-3 py-2 text-xs leading-5 text-white/35">Your saved prompt chats will appear here.</p>
              : <div className="mx-2 border-t border-white/[0.07] px-3 py-4 text-xs leading-5 text-white/40">Sign in to keep a searchable history of your prompt projects.</div>}
          </div>
          <div className="border-t border-white/[0.07] p-4">
            {isSignedIn ? (
              <div className="flex items-center gap-3 text-xs text-white/45"><UserButton /> <span>Signed in · history is saved</span></div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/40">Your chat stays in this session.</span>
                <SignInButton mode="modal"><button className="shrink-0 text-xs text-[#3DFFA2] hover:text-white">Sign in</button></SignInButton>
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.08] px-5 md:px-8">
          <div className="flex items-center gap-4">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-2 text-white/45 hover:text-white" aria-label="Open history sidebar"><PanelLeftOpen size={18} /></button>}
            <div>
              <p className="text-sm font-medium">Prompt Studio</p>
              <p className="mt-0.5 font-mono text-[10px] text-white/35">Structured prompts, made clear.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLoaded && !isSignedIn && <SignInButton mode="modal"><button className="border border-white/15 px-3 py-2 text-xs text-white/65 hover:border-[#3DFFA2]/50 hover:text-white">Sign in</button></SignInButton>}
            {isLoaded && isSignedIn && <UserButton />}
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-6 pb-28 pt-12 md:px-12">
              <div className="mb-7 flex h-11 w-11 items-center justify-center border border-[#3DFFA2]/40 bg-[#3DFFA2]/[0.07] text-[#3DFFA2]"><Sparkles size={19} /></div>
              <h1 className="max-w-2xl text-3xl font-medium leading-tight tracking-[-0.04em] md:text-[42px]">Turn a rough thought into a <span className="text-white/45">working prompt.</span></h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/45">Tell Lyra what you want to make. Refine it together, then get a structured prompt ready for your target AI.</p>
              <div className="mt-10 grid max-w-2xl gap-2 sm:grid-cols-3">
                {suggestions.map((suggestion) => <button key={suggestion} onClick={() => void submit(suggestion)} className="min-h-[86px] border border-white/[0.1] p-4 text-left text-xs leading-5 text-white/55 hover:border-[#3DFFA2]/45 hover:text-white/85">{suggestion}</button>)}
              </div>
              {!isSignedIn && <p className="mt-6 font-mono text-[10px] text-white/30">{remaining === null ? '5 guest generations each day' : `${remaining} guest generations left today`} · Sign in to save history and download project files</p>}
            </div>
          ) : (
            <div className="mx-auto max-w-4xl px-5 pb-44 pt-8 md:px-12 md:pt-12">
              {messages.map((message) => (
                <article key={message.id} className="mb-9">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-white/35">
                    <span className={`h-1.5 w-1.5 ${message.role === 'assistant' ? 'bg-[#3DFFA2]' : 'bg-white/35'}`} />
                    {message.role === 'assistant' ? 'Lyra' : 'You'}
                  </div>
                  <div className="whitespace-pre-wrap text-[14px] leading-7 text-white/80">{message.content}</div>
                  {message.result && <PromptOutput result={message.result} signedIn={Boolean(isSignedIn)} conversationId={conversationId} activeFile={activeFile} setActiveFile={setActiveFile} onCopy={copyPrompt} copied={copied} onGenerateFiles={() => void submit('Please create the relevant project documentation files for the prompt we just made. Keep the optimized prompt intact and return any useful files for download.')} />}
                </article>
              ))}
              {busy && <div className="mb-8 flex items-center gap-3 text-sm text-white/45"><LoaderCircle size={16} className="animate-spin text-[#3DFFA2]" /> Lyra is shaping your prompt…</div>}
              {error && <div role="alert" className="mb-6 border-l-2 border-red-400 px-4 py-2 text-sm leading-6 text-red-200">{error}{error.includes('Sign in') && <SignInButton mode="modal"><button className="ml-2 underline underline-offset-4">Sign in</button></SignInButton>}</div>}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/[0.08] bg-[#0a0a0f] px-4 pb-3 pt-4 md:px-8 md:pb-5">
          {error && !hasMessages && <p role="alert" className="mx-auto mb-2 max-w-4xl text-xs text-red-200">{error}</p>}
          <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="mx-auto max-w-4xl">
            <div className="relative border border-white/15 bg-[#111117] focus-within:border-[#3DFFA2]/60">
              <textarea ref={inputRef} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={keyDown} maxLength={12_000} rows={2} placeholder="Describe the prompt you want to create…" aria-label="Describe the prompt you want to create" className="block max-h-48 min-h-[86px] w-full resize-y bg-transparent px-4 pb-12 pt-4 text-sm leading-6 text-white outline-none placeholder:text-white/30" />
              <div className="absolute bottom-3 left-4 font-mono text-[9px] text-white/25">Enter to send · Shift + Enter for a new line</div>
              <button type="submit" disabled={!text.trim() || busy} aria-label="Send message" className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center bg-[#3DFFA2] text-[#07120c] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/25"><ArrowUp size={18} /></button>
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-white/25"><span>{!isSignedIn && `Guest chats are not saved. ${remaining === null ? '5 free turns per day.' : `${remaining} left today.`}`}</span><span>AI can make mistakes. Review the prompt before using it.</span></div>
          </form>
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
      <section className="border border-[#3DFFA2]/30 bg-[#101712]">
        <div className="flex items-center justify-between border-b border-[#3DFFA2]/15 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-white/80"><span className="h-1.5 w-1.5 bg-[#3DFFA2]" />Your optimized prompt</div>
          <button onClick={() => void onCopy(result.prompt)} className="flex items-center gap-1.5 text-xs text-white/45 hover:text-[#3DFFA2]">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words px-4 py-4 font-sans text-[13px] leading-6 text-white/80">{result.prompt}</pre>
      </section>

      {result.notes && <p className="text-xs leading-5 text-white/45">{result.notes}</p>}
      {!signedIn && <div className="flex flex-wrap items-center justify-between gap-3 border border-white/[0.1] px-4 py-4"><div><p className="text-xs text-white/75">Need project files for this prompt?</p><p className="mt-1 text-[11px] text-white/40">Sign in to generate documentation, keep prompt history, and download a ZIP.</p></div><SignInButton mode="modal"><button className="shrink-0 border border-[#3DFFA2]/35 px-3 py-2 text-xs text-[#3DFFA2] hover:bg-[#3DFFA2]/[0.08]">Sign in</button></SignInButton></div>}
      {signedIn && result.files.length === 0 && <button onClick={onGenerateFiles} className="border border-white/[0.12] px-3 py-2 text-xs text-white/55 hover:border-[#3DFFA2]/40 hover:text-white">Generate supporting files</button>}
      {result.files.length > 0 && (
        <section className="border border-white/[0.1]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
            <div><h2 className="text-sm font-medium">Project files <span className="ml-1 font-mono text-[10px] text-white/35">{result.files.length}</span></h2><p className="mt-1 text-[11px] text-white/40">Markdown documents for your target AI.</p></div>
            {signedIn && conversationId ? <a href={`/api/prompt/conversations/${encodeURIComponent(conversationId)}/download`} className="flex items-center gap-2 border border-white/15 px-3 py-2 text-xs text-white/75 hover:border-[#3DFFA2]/45 hover:text-white"><Download size={14} /> Download ZIP</a>
              : <SignInButton mode="modal"><button className="border border-[#3DFFA2]/35 px-3 py-2 text-xs text-[#3DFFA2] hover:bg-[#3DFFA2]/[0.08]">Sign in to view files</button></SignInButton>}
          </div>
          {signedIn && <div className="divide-y divide-white/[0.06]">
            {result.files.map((file) => <div key={file.path}>
              <button onClick={() => setActiveFile(activeFile === file.path ? null : file.path)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-white/60 hover:bg-white/[0.025] hover:text-white"><FileText size={14} className="text-[#3DFFA2]/70" />{file.path}</button>
              {activeFile === file.path && <pre className="max-h-80 overflow-auto border-t border-white/[0.06] bg-[#0b0b10] p-4 text-[11px] leading-5 text-white/60">{file.content}</pre>}
            </div>)}
          </div>}
        </section>
      )}
    </div>
  );
}
