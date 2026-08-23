'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Server, MessageSquare, Settings, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Step = 'welcome' | 'config' | 'framework' | 'complete';

interface OnboardingData {
  name: string;
  framework: 'qbcore' | 'esx' | 'vRP' | 'other';
  hasServer: boolean;
  goal: string;
}

const ORCH_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:3001';

// ─── Steps ─────────────────────────────────────────────────────────────────────

const STEPS: { key: Step; title: string; subtitle: string }[] = [
  { key: 'welcome', title: 'Welcome', subtitle: "Let's set up NOX for your server" },
  { key: 'config', title: 'Server Name', subtitle: 'Give your workspace a name' },
  { key: 'framework', title: 'Framework', subtitle: 'Tell us what you run' },
  { key: 'complete', title: "You're Set", subtitle: 'Ready to go' },
];

const FRAMEWORKS = [
  {
    id: 'qbcore' as const,
    name: 'QBCore',
    desc: 'Popular FRP framework with jobs, inventory, and housing',
    color: 'from-[#5E6AD2] to-[#4f5bc0]',
  },
  {
    id: 'esx' as const,
    name: 'ESX',
    desc: 'Established framework with extensive resource ecosystem',
    color: 'from-[#22c55e] to-[#16a34a]',
  },
  {
    id: 'vRP' as const,
    name: 'vRP',
    desc: 'Performance-focused framework with virtual reality features',
    color: 'from-[#f59e0b] to-[#d97706]',
  },
  {
    id: 'other' as const,
    name: 'Other / Custom',
    desc: 'Custom framework or standalone server',
    color: 'from-[#ec4899] to-[#db2777]',
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [data, setData] = useState<OnboardingData>({
    name: '',
    framework: 'qbcore',
    hasServer: false,
    goal: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  const update = (patch: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...patch }));
    setError(null);
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${ORCH_URL}/api/onboarding/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStep('complete');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Welcome Step ────────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-0 mb-10">
            <span className="font-mono text-4xl font-bold tracking-[0.2em] text-white">
              NOX<span className="font-normal text-white/40">.</span>
            </span>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-[#5E6AD2]' : 'bg-white/15'}`} />
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10" />}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h1 className="font-mono text-xl font-medium text-white mb-3">
              Welcome to NOX
            </h1>
            <p className="font-sans text-sm text-white/40 leading-[1.7] max-w-sm mx-auto">
              AI-powered server management for FiveM. Let's configure your workspace in under a minute.
            </p>
          </div>

          {/* Feature previews */}
          <div className="space-y-2 mb-8">
            {[
              { icon: Server, label: 'Server Management', desc: 'Connect & monitor your FiveM instances' },
              { icon: MessageSquare, label: 'AI Chat', desc: 'Ask NOX to make changes to your server' },
              { icon: Settings, label: 'Change Approval', desc: 'Review AI proposals before they apply' },
            ].map(({ icon: Icon, label, desc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="flex items-center gap-3 px-4 py-3 bg-[#16161E] border border-[rgba(255,255,255,0.06)]"
              >
                <div className="w-8 h-8 rounded-lg bg-[rgba(94,106,210,0.12)] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#5E6AD2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-white">{label}</div>
                  <div className="font-sans text-[10px] text-white/35 mt-0.5">{desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => setStep('config')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-[#0F0F14] font-mono text-xs uppercase tracking-[1.4px] hover:opacity-85 transition-opacity"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Complete Step ───────────────────────────────────────────────────────────
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 rounded-full bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-[#22c55e]" />
          </div>

          <h1 className="font-mono text-xl font-medium text-white mb-2">
            You're all set
          </h1>
          <p className="font-sans text-sm text-white/40 mb-8">
            {data.name ? `"${data.name}" is ready` : 'Your workspace is configured'}
          </p>

          {/* Summary */}
          <div className="text-left space-y-2 mb-8">
            {[
              { label: 'Workspace', value: data.name },
              { label: 'Framework', value: FRAMEWORKS.find(f => f.id === data.framework)?.name },
              { label: 'Server', value: data.hasServer ? 'Connected' : 'Will connect later' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5 bg-[#16161E] border border-[rgba(255,255,255,0.06)]">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/35">{label}</span>
                <span className="font-mono text-xs text-white">{value}</span>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard"
            className="block w-full text-center px-4 py-3 bg-[#5E6AD2] text-white font-mono text-xs uppercase tracking-[1.4px] hover:bg-[#4f5bc0] transition-colors"
          >
            Go to Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Config Step (Server Name) ───────────────────────────────────────────────
  if (step === 'config') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Steps */}
          <div className="flex items-center gap-2 mb-10">
            {STEPS.map((s, i) => {
              const currentIdx = STEPS.findIndex(st => st.key === step);
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${i <= currentIdx ? 'bg-[#5E6AD2]' : 'bg-white/15'}`} />
                  {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10" />}
                </div>
              );
            })}
          </div>

          <h1 className="font-mono text-lg text-white mb-1">What's your workspace name?</h1>
          <p className="font-sans text-sm text-white/35 mb-8">This is how you'll identify it in NOX.</p>

          <input
            type="text"
            value={data.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. My RP Server"
            autoFocus
            className="w-full px-4 py-3 bg-[#16161E] border border-[rgba(255,255,255,0.08)] text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#5E6AD2] mb-6"
            onKeyDown={(e) => e.key === 'Enter' && setStep('framework')}
          />

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('welcome')}
              className="font-mono text-xs text-white/35 hover:text-white/60 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep('framework')}
              disabled={!data.name.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#5E6AD2] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#4f5bc0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Continue
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Framework Step ──────────────────────────────────────────────────────────
  if (step === 'framework') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Steps */}
          <div className="flex items-center gap-2 mb-10">
            {STEPS.map((s, i) => {
              const currentIdx = STEPS.findIndex(st => st.key === step);
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${i <= currentIdx ? 'bg-[#5E6AD2]' : 'bg-white/15'}`} />
                  {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10" />}
                </div>
              );
            })}
          </div>

          <h1 className="font-mono text-lg text-white mb-1">What framework do you run?</h1>
          <p className="font-sans text-sm text-white/35 mb-6">NOX tailors its suggestions to your setup.</p>

          <div className="space-y-2 mb-6">
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw.id}
                onClick={() => update({ framework: fw.id })}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  data.framework === fw.id
                    ? 'bg-[rgba(94,106,210,0.12)] border border-[rgba(94,106,210,0.4)]'
                    : 'bg-[#16161E] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${fw.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="font-mono text-xs font-bold text-white">{fw.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-white">{fw.name}</div>
                  <div className="font-sans text-[10px] text-white/35 mt-0.5">{fw.desc}</div>
                </div>
                {data.framework === fw.id && (
                  <CheckCircle2 className="w-4 h-4 text-[#5E6AD2] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Has server toggle */}
          <div className="mb-6">
            <button
              onClick={() => update({ hasServer: !data.hasServer })}
              className={`w-full flex items-center justify-between px-4 py-3 bg-[#16161E] border transition-colors ${
                data.hasServer
                  ? 'border-[rgba(94,106,210,0.4)]'
                  : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Server className={`w-4 h-4 ${data.hasServer ? 'text-[#22c55e]' : 'text-white/35'}`} />
                <div className="text-left">
                  <div className="font-mono text-xs text-white">I already have a server</div>
                  <div className="font-sans text-[10px] text-white/30 mt-0.5">Connect it now or later</div>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors ${data.hasServer ? 'bg-[#22c55e]' : 'bg-white/15'}`}>
                <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${data.hasServer ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>

          {/* Goal (optional) */}
          <input
            type="text"
            value={data.goal}
            onChange={(e) => update({ goal: e.target.value })}
            placeholder="What do you want to build? (optional)"
            className="w-full px-4 py-3 bg-[#16161E] border border-[rgba(255,255,255,0.06)] text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#5E6AD2] mb-6"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('config')}
              className="font-mono text-xs text-white/35 hover:text-white/60 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#5E6AD2] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#4f5bc0] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Finish Setup'}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 font-mono text-xs text-[#ef4444] text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return null;
}
