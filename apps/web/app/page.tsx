'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Server,
  MessageSquare,
  Shield,
  GitCommit,
  ArrowRight,
  CheckCircle2,
  Star,
  Zap,
  Crown,
  ChevronDown,
  Play,
  MonitorPlay,
  Layers,
  Database,
  Users,
  Settings,
  Code,
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import dynamic from 'next/dynamic';

const ParticleCanvas = dynamic(
  () => import('./ParticleCanvas').then((mod) => mod.ParticleCanvas),
  { ssr: false, loading: () => null },
);

function Section({
  children,
  className = '',
  delay = 0,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      id={id}
    >
      {children}
    </motion.section>
  );
}

// ─── Feature Comparison Data ───────────────────────────────────────────
const comparisonRows = [
  { feature: 'Connected Servers', starter: '1', pro: '5', enterprise: 'Unlimited' },
  { feature: 'AI Actions / Month', starter: '100', pro: '1,000', enterprise: 'Unlimited' },
  { feature: 'Framework Support', starter: 'QBCore & ESX', pro: 'All frameworks', enterprise: 'All + custom' },
  { feature: 'Team Seats', starter: '1', pro: '3', enterprise: '10' },
  { feature: 'Git Checkpoints', starter: '✓', pro: '✓', enterprise: '✓' },
  { feature: 'Auto Rollback', starter: '✓', pro: '✓', enterprise: '✓' },
  { feature: 'Custom Skills', starter: '—', pro: '—', enterprise: '✓' },
  { feature: 'Priority Support', starter: '—', pro: '✓', enterprise: '✓' },
  { feature: '24/7 Support', starter: '—', pro: '—', enterprise: '✓' },
];

// ─── Testimonial Data ──────────────────────────────────────────────────
const testimonials = [
  {
    quote: 'NOX cut our server dev time by half. Instead of manually editing 40+ config files, I just ask the AI and review the diff. Game changer.',
    author: 'Marcus V.',
    role: 'Owner, Shadow RP',
    servers: '120+ concurrent',
  },
  {
    quote: 'The rollback feature alone saved us twice. Bot broke our economy script on a live server — one click and we were back to the last checkpoint.',
    author: 'Jade K.',
    role: 'Lead Dev, Neon City',
    servers: '80+ concurrent',
  },
  {
    quote: 'I run three FiveM servers and NOX handles all of them from one dashboard. The multi-server support and team seats are exactly what we needed.',
    author: 'Derek T.',
    role: 'Network Admin, Varsity RP',
    servers: '3 servers, 200+ total',
  },
];

// ─── FAQ Data ──────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'Is NOX safe to use on a live server?',
    a: 'Yes. NOX never writes directly to your server. Every change is proposed as a diff inside a git checkpoint. You review and approve before anything is applied. If something goes wrong, one-click rollback restores the previous state instantly.',
  },
  {
    q: 'What FiveM frameworks do you support?',
    a: 'We support QBCore, ESX, and custom frameworks out of the box. Enterprise plans allow you to define custom skills and workflows tailored to your specific setup.',
  },
  {
    q: 'Do I need technical knowledge to use NOX?',
    a: 'No. NOX is designed for server owners and developers of all skill levels. The AI explains changes in plain language, shows you diffs before applying, and the UI is built for clarity — not terminal commands.',
  },
  {
    q: 'How does billing work? Can I switch plans anytime?',
    a: 'You can upgrade or downgrade at any time. Upgrades are prorated for the remainder of your billing cycle. Downgrades take effect at the start of your next cycle. No lock-in contracts.',
  },
  {
    q: 'Where is my server data stored?',
    a: 'Your data stays on your machine or VPS. NOX connects locally to your server-data folder and never uploads server files to any external storage. AI processing happens via our API — only the file paths and diffs are transmitted, never the full server content.',
  },
  {
    q: 'Can I use NOX with multiple servers?',
    a: 'Yes. Starter plans support 1 server, Pro supports up to 5, and Enterprise is unlimited. Each server gets its own isolated workspace and git history.',
  },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleFaq = (i: number) => {
    setOpenFaq(openFaq === i ? null : i);
  };

  return (
    <div className="min-h-screen bg-[#0F0F14] text-white">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-100 ${
          scrolled
            ? 'bg-[#0F0F14]/90 backdrop-blur-sm border-b border-[rgba(255,255,255,0.08)]'
            : 'border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link href="/" className="flex items-center gap-0 font-mono">
              <img src="/nox-avatar.svg" alt="NOX" className="w-6 h-6 opacity-90" />
              <span className="text-white font-mono text-lg font-medium tracking-widest ml-1.5">NOX<span className="font-normal opacity-60">.</span></span>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/sign-in">
                <button className="font-mono text-xs uppercase tracking-[1.4px] px-4 py-2 text-white border border-[rgba(255,255,255,0.2)] hover:border-[rgba(255,255,255,0.4)] transition-colors duration-100">
                  Sign In
                </button>
              </Link>
              <Link href="/sign-up">
                <button className="font-mono text-xs uppercase tracking-[1.4px] px-5 py-2 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
        <div className="absolute inset-0">
          <ParticleCanvas />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0F0F14_75%)]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center pb-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-xs uppercase tracking-[2px] text-white/40 mb-8 inline-block border border-[rgba(255,255,255,0.15)] px-3 py-1.5"
          >
            AI-Powered FiveM Development
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight leading-[1.0] mb-6"
          >
            Chat with your
            <br />
            <span className="text-[#5E6AD2]">FiveM server</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="font-sans text-base sm:text-lg text-[rgba(255,255,255,0.5)] mb-10 max-w-2xl mx-auto leading-[1.6]"
          >
            An AI developer that safely reads, modifies, and manages your
            server files. Preview every change before applying. Roll back with
            one click.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              href="/sign-up"
              className="font-mono text-xs uppercase tracking-[1.4px] px-6 py-3 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100 inline-flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="#demo"
              className="font-mono text-xs uppercase tracking-[1.4px] px-6 py-3 text-white border border-[rgba(255,255,255,0.2)] hover:border-[rgba(255,255,255,0.4)] transition-colors duration-100 inline-flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Watch Demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-16 flex flex-col items-center gap-2 text-[rgba(255,255,255,0.3)]"
          >
            <span className="font-mono text-xs uppercase tracking-[2px]">Scroll</span>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.1)]" />
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works — 4 Step Flow ────────────────────────────── */}
      <Section id="how-it-works" className="py-24 border-t border-[rgba(255,255,255,0.08)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-mono text-2xl sm:text-3xl font-medium mb-3 tracking-tight">
              How it works
            </h2>
            <p className="font-sans text-[rgba(255,255,255,0.5)] text-base max-w-xl mx-auto leading-[1.6]">
              Four steps from chat to deployed change
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {[
              {
                step: '01',
                icon: Server,
                title: 'Connect',
                desc: 'Install the NOX agent on your VPS. It scans your server-data folder and maps your resources.',
              },
              {
                step: '02',
                icon: MessageSquare,
                title: 'Describe',
                desc: 'Tell the AI what you need — new script, config tweak, vehicle spawn. Natural language, no commands.',
              },
              {
                step: '03',
                icon: Code,
                title: 'Review',
                desc: 'Every change appears as a diff. Inspect line by line. Request edits until it is right.',
              },
              {
                step: '04',
                icon: GitCommit,
                title: 'Deploy',
                desc: 'Click apply to write. Automatic git checkpoint. One-click rollback if anything breaks.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="relative bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6 lg:p-8"
              >
                {/* Step connector lines */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-0 w-8 h-px bg-[rgba(255,255,255,0.15)] z-10" />
                )}
                <div className="font-mono text-xs text-[rgba(94,106,210,0.6)] tracking-widest mb-4">
                  {item.step}
                </div>
                <div className="w-10 h-10 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.25)] flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-[#5E6AD2]" />
                </div>
                <h3 className="font-mono text-sm font-medium mb-2 tracking-wide">{item.title}</h3>
                <p className="font-sans text-sm text-[rgba(255,255,255,0.5)] leading-[1.6]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Live Demo ──────────────────────────────────────────────── */}
      <Section id="demo" className="py-24 border-t border-[rgba(255,255,255,0.08)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-mono text-2xl sm:text-3xl font-medium mb-3 tracking-tight">
              See it in action
            </h2>
            <p className="font-sans text-[rgba(255,255,255,0.5)] text-base max-w-xl mx-auto leading-[1.6]">
              Watch a real session: chat, review diff, and deploy to a FiveM server
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative bg-[#16161E] border border-[rgba(255,255,255,0.08)] aspect-video flex items-center justify-center overflow-hidden group cursor-pointer">
              {/* Simulated UI mockup */}
              <div className="absolute inset-0 flex flex-col">
                {/* Top bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0A0A0F] border-b border-[rgba(255,255,255,0.08)]">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 bg-[rgba(255,255,255,0.15)] rounded-full" />
                    <div className="w-2.5 h-2.5 bg-[rgba(255,255,255,0.15)] rounded-full" />
                    <div className="w-2.5 h-2.5 bg-[rgba(255,255,255,0.15)] rounded-full" />
                  </div>
                  <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] ml-3 uppercase tracking-wider">
                    NOX — Shadow RP
                  </span>
                </div>
                {/* Main area */}
                <div className="flex flex-1">
                  {/* Sidebar */}
                  <div className="w-48 bg-[#0A0A0F] border-r border-[rgba(255,255,255,0.08)] p-3 hidden sm:block">
                    <div className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] uppercase tracking-wider mb-3">
                      Resources
                    </div>
                    {['qb-core', 'mission-ui', 'andy-scripts', 'apartments', 'phones'].map((r, i) => (
                      <div key={i} className="font-mono text-[11px] text-[rgba(255,255,255,0.5)] py-1 px-2 border-l-2 border-transparent hover:border-[#5E6AD2] hover:text-white transition-colors cursor-pointer">
                        {r}
                      </div>
                    ))}
                  </div>
                  {/* Chat area */}
                  <div className="flex-1 p-4 flex flex-col gap-3">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 bg-[rgba(94,106,210,0.2)] border border-[rgba(94,106,210,0.4)] flex items-center justify-center flex-shrink-0">
                        <span className="font-mono text-[9px] text-[#5E6AD2]">AI</span>
                      </div>
                      <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] px-3 py-2">
                        <p className="font-sans text-xs text-[rgba(255,255,255,0.7)] leading-[1.5]">
                          I added a new vehicle spawn point at coords <span className="font-mono text-[#5E6AD2]">-320.5, 5892.3, 11.2</span>. Here is the diff:
                        </p>
                      </div>
                    </div>
                    {/* Diff preview */}
                    <div className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] p-3 font-mono text-[11px]">
                      <div className="text-[rgba(255,255,255,0.3)] mb-1"> spawns.lua</div>
                      <div className="text-[rgba(255,255,255,0.2)]">{'  local spawns = ' + '{' + '}'}</div>
                      <div className="text-[rgba(0,212,170,0.8)]">{'+ local spawn = ' + '{' + 'x = -320.5, y = 5892.3, z = 11.2' + '}'}</div>
                      <div className="text-[rgba(0,212,170,0.8)]">+ table.insert(spawns, spawn)</div>
                      <div className="text-[rgba(255,255,255,0.2)]">  return spawns</div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex gap-2 mt-auto">
                      <button className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 bg-white text-[#0F0F14] hover:opacity-85 transition-opacity">
                        Apply
                      </button>
                      <button className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.4)] transition-colors">
                        Request Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Play overlay */}
              <div className="absolute inset-0 bg-[rgba(15,15,20,0.6)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                <div className="w-14 h-14 bg-white flex items-center justify-center">
                  <Play className="w-6 h-6 text-[#0F0F14] ml-0.5" />
                </div>
              </div>
            </div>
            <p className="font-mono text-xs text-[rgba(255,255,255,0.3)] text-center mt-4 uppercase tracking-wider">
              Interactive demo — click to play
            </p>
          </div>
        </div>
      </Section>

      {/* ─── Features ─────────────────────────────────────────────────── */}
      <Section id="features" className="py-24 border-t border-[rgba(255,255,255,0.08)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-mono text-2xl sm:text-3xl font-medium mb-3 tracking-tight">
              Built for FiveM developers
            </h2>
            <p className="font-sans text-[rgba(255,255,255,0.5)] text-base max-w-xl mx-auto leading-[1.6]">
              Every feature designed around how you actually work
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Database, title: 'Resource Finder', desc: 'Instantly search 50+ FiveM resources. Find the right script, preview it, and deploy to your server.' },
              { icon: Layers, title: 'Enhanced Changes', desc: 'Split or unified diff view with timeline. See exactly what changed and when, across every session.' },
              { icon: GitCommit, title: 'Git History', desc: 'Every action is a commit. Browse your change history, branch off, and merge when ready.' },
              { icon: Users, title: 'Player Management', desc: 'AI-assisted player tools: ban management, permissions, whitelists — all through chat.' },
              { icon: Settings, title: 'Quick Actions', desc: 'Pre-built commands for common tasks: restart resources, flush caches, check server status.' },
              { icon: Shield, title: 'Path Validation', desc: 'Directory traversal protection built in. NOX only touches paths inside your server-data folder.' },
            ].map((feature, i) => (
              <FeatureCard key={i} {...feature} index={i} />
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Security ─────────────────────────────────────────────────── */}
      <Section className="py-24 border-t border-[rgba(255,255,255,0.08)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-8 sm:p-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="font-mono text-2xl sm:text-3xl font-medium mb-4 tracking-tight">
                  Built with security in mind
                </h2>
                <p className="font-sans text-[rgba(255,255,255,0.5)] mb-6 leading-[1.6]">
                  Your server data stays on your machine. The AI only proposes
                  changes — you approve everything.
                </p>
                <div className="space-y-3">
                  {[
                    'Git checkpoints before every change',
                    'Path validation prevents directory traversal',
                    'Automatic rollback capability',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-[#5E6AD2] flex-shrink-0" />
                      <span className="font-sans text-sm text-[rgba(255,255,255,0.7)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.3)] flex items-center justify-center">
                  <Shield className="w-12 h-12 text-[#5E6AD2]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Pricing ─────────────────────────────────────────────────── */}
      <Section id="pricing" className="py-24 border-t border-[rgba(255,255,255,0.08)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-mono text-2xl sm:text-3xl font-medium mb-3 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="font-sans text-[rgba(255,255,255,0.5)] text-base max-w-xl mx-auto leading-[1.6]">
              Start free, upgrade when you need more power
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-16">
            {[
              {
                name: 'Starter',
                price: 'Free',
                period: '',
                icon: Zap,
                features: ['1 Server', '100 AI actions/month', 'Basic support', 'QBCore & ESX'],
                highlighted: false,
              },
              {
                name: 'Pro',
                price: '$19',
                period: '/month',
                icon: Star,
                features: ['5 Servers', '1,000 AI actions/month', 'Priority support', 'All frameworks', 'Team seats (3)'],
                highlighted: true,
              },
              {
                name: 'Enterprise',
                price: '$49',
                period: '/month',
                icon: Crown,
                features: ['Unlimited Servers', 'Unlimited AI actions', '24/7 support', 'All frameworks', 'Team seats (10)', 'Custom skills'],
                highlighted: false,
              },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`bg-[#16161E] border p-6 ${
                  plan.highlighted
                    ? 'border-[#5E6AD2]'
                    : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]'
                } transition-colors duration-100`}
              >
                {plan.highlighted && (
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#5E6AD2] bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] px-2 py-1 inline-block mb-4">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 flex items-center justify-center ${plan.highlighted ? 'bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)]' : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]'}`}>
                    <plan.icon className={`w-5 h-5 ${plan.highlighted ? 'text-[#5E6AD2]' : 'text-[rgba(255,255,255,0.4)]'}`} />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-medium text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-2xl font-medium text-white">{plan.price}</span>
                      <span className="font-mono text-xs text-[rgba(255,255,255,0.4)]">{plan.period}</span>
                    </div>
                  </div>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#5E6AD2] flex-shrink-0" />
                      <span className="font-sans text-sm text-[rgba(255,255,255,0.6)]">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`w-full block text-center py-2.5 font-mono text-xs uppercase tracking-[1.4px] transition-opacity duration-100 ${
                    plan.highlighted
                      ? 'bg-white text-[#0F0F14] font-medium hover:opacity-85'
                      : 'border border-[rgba(255,255,255,0.15)] text-white hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
                >
                  {plan.price === 'Free' ? 'Get Started' : 'Subscribe'}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Feature Comparison Table */}
          <div className="max-w-3xl mx-auto">
            <div className="border border-[rgba(255,255,255,0.08)]">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] border-b border-[rgba(255,255,255,0.08)] bg-[#16161E]">
                <div className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                  Feature
                </div>
                <div className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] text-center">
                  Starter
                </div>
                <div className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-[#5E6AD2] text-center">
                  Pro
                </div>
                <div className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] text-center">
                  Enterprise
                </div>
              </div>
              {/* Table rows */}
              {comparisonRows.map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[1fr_1fr_1fr_1fr] ${
                    i < comparisonRows.length - 1
                      ? 'border-b border-[rgba(255,255,255,0.05)]'
                      : ''
                  }`}
                >
                  <div className="px-5 py-3 font-sans text-sm text-[rgba(255,255,255,0.7)]">
                    {row.feature}
                  </div>
                  <div className="px-5 py-3 font-mono text-sm text-[rgba(255,255,255,0.5)] text-center">
                    {row.starter}
                  </div>
                  <div className="px-5 py-3 font-mono text-sm text-white text-center bg-[rgba(94,106,210,0.05)]">
                    {row.pro}
                  </div>
                  <div className="px-5 py-3 font-mono text-sm text-[rgba(255,255,255,0.5)] text-center">
                    {row.enterprise}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Testimonials ────────────────────────────────────────────── */}
      <Section className="py-24 border-t border-[rgba(255,255,255,0.08)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-mono text-2xl sm:text-3xl font-medium mb-3 tracking-tight">
              Trusted by server owners
            </h2>
            <p className="font-sans text-[rgba(255,255,255,0.5)] text-base max-w-xl mx-auto leading-[1.6]">
              Real feedback from the FiveM community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6 hover:border-[rgba(255,255,255,0.18)] transition-colors duration-100"
              >
                {/* Quote marks */}
                <div className="font-mono text-4xl text-[rgba(94,106,210,0.3)] leading-none mb-4">
                  &ldquo;
                </div>
                <p className="font-sans text-sm text-[rgba(255,255,255,0.7)] leading-[1.7] mb-6">
                  {t.quote}
                </p>
                <div className="border-t border-[rgba(255,255,255,0.08)] pt-4">
                  <div className="font-mono text-sm text-white font-medium">{t.author}</div>
                  <div className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
                    {t.role}
                  </div>
                  <div className="font-mono text-[10px] text-[rgba(94,106,210,0.6)] mt-1 uppercase tracking-wider">
                    {t.servers}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── FAQ ─────────────────────────────────────────────────────── */}
      <Section id="faq" className="py-24 border-t border-[rgba(255,255,255,0.08)]">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-mono text-2xl sm:text-3xl font-medium mb-3 tracking-tight">
              Frequently asked questions
            </h2>
            <p className="font-sans text-[rgba(255,255,255,0.5)] text-base max-w-xl mx-auto leading-[1.6]">
              Everything you need to know before getting started
            </p>
          </div>

          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-[rgba(255,255,255,0.08)] border-t-0 first:border-t"
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-100"
                >
                  <span className="font-sans text-sm sm:text-base text-[rgba(255,255,255,0.85)] pr-4">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[rgba(255,255,255,0.3)] flex-shrink-0 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="font-sans text-sm text-[rgba(255,255,255,0.5)] leading-[1.7]">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── Final CTA ───────────────────────────────────────────────── */}
      <Section className="py-24 border-t border-[rgba(255,255,255,0.08)]">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="font-mono text-2xl sm:text-3xl font-medium mb-4 tracking-tight">
            Ready to transform your server?
          </h2>
          <p className="font-sans text-[rgba(255,255,255,0.5)] text-base mb-8 leading-[1.6]">
            Join server owners who ship changes faster with NOX.
            Start free — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sign-up"
              className="font-mono text-xs uppercase tracking-[1.4px] px-6 py-3 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100 inline-flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#pricing"
              className="font-mono text-xs uppercase tracking-[1.4px] px-6 py-3 text-white border border-[rgba(255,255,255,0.2)] hover:border-[rgba(255,255,255,0.4)] transition-colors duration-100 inline-flex items-center gap-2"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </Section>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[rgba(255,255,255,0.08)] py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-white font-bold text-base leading-none">|</span>
              <span className="text-white font-mono text-sm font-medium tracking-widest">NOX<span className="font-normal">.</span></span>
              <span className="text-[rgba(255,255,255,0.3)] text-xs ml-2">// Fivem</span>
            </div>
            <p className="font-mono text-xs text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
              &copy; 2026 NOX. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  index,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6 hover:border-[rgba(255,255,255,0.18)] transition-colors duration-100"
    >
      <div className="w-10 h-10 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[#5E6AD2]" />
      </div>
      <h3 className="font-mono text-sm font-medium mb-2 tracking-wide">{title}</h3>
      <p className="font-sans text-sm text-[rgba(255,255,255,0.5)] leading-[1.6]">{desc}</p>
    </motion.div>
  );
}
