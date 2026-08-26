'use client';

import { useState, useMemo } from 'react';
import { BookOpen, Terminal, Shield, AlertCircle, HelpCircle, FileText, Plus, RefreshCw, Settings as SettingsIcon, Package, Users, Search, ChevronDown, ChevronUp, ExternalLink, ArrowUpRight, ArrowUpCircle, Bug, Zap, Server, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SECTIONS = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: BookOpen,
    content: [
      {
        title: '1. Create a Server',
        body: 'Click "Add Server" on the dashboard. Enter your server name and choose a framework (QBCore, ESX, or Custom). You will receive a pairing code.',
      },
      {
        title: '2. Install the Agent',
        body: 'Download the NOXES agent for your platform (Windows/Linux). Run the pair command and enter the pairing code from the dashboard. Point the agent to your server-data folder.',
      },
      {
        title: '3. Connect & Start',
        body: 'Once paired, the agent will connect to the orchestrator. Your server will show as online. You can now chat with AI and make changes safely.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    icon: AlertCircle,
    content: [
      {
        title: 'Agent not connecting',
        body: 'Check that the orchestrator URL is correct (default: http://localhost:3001). Ensure the pairing code has not expired (10-minute window). Verify your server-data folder path is accessible.',
        steps: [
          'Verify orchestrator URL in agent config',
          'Generate new pairing code from dashboard',
          'Check server-data folder exists and is accessible',
          'Restart agent after fixing path',
        ],
      },
      {
        title: 'Changes not applying',
        body: 'Make sure the agent is online (green dot in dashboard). Check that the agent has git initialized in your server-data folder. If the diff looks wrong, request an edit before applying.',
        steps: [
          'Check agent status in dashboard',
          'Verify git is initialized in server-data',
          'Review the diff before applying',
          'Use "Request Edit" if diff is incorrect',
        ],
      },
      {
        title: 'Server shows offline',
        body: 'The server goes offline when the agent disconnects. Restart the agent process. Check that the agent has not been killed by a system sleep/hibernate cycle.',
        steps: [
          'Restart the NOXES agent application',
          'Check system power settings (disable sleep)',
          'Verify network connectivity',
          'Re-pair if connection is lost',
        ],
      },
      {
        title: 'Scan returns no resources',
        body: 'The scan looks for fxserver.conf, resource manifest files, and folder structures. Ensure your server-data folder contains properly structured resources with valid manifests.',
        steps: [
          'Verify resources are in server-data/resources/',
          'Check fxserver.conf has start <resource> commands',
          'Ensure each resource has a valid fxmanifest.lua',
          'Run scan again after fixing structure',
        ],
      },
      {
        title: 'Failed to fetch players',
        body: 'Ensure the agent is connected and the server is online. Players are only available when the agent has active communication with the FiveM server.',
        steps: [
          'Check server is online in dashboard',
          'Verify agent is connected (green indicator)',
          'Restart server if needed',
          'Check FiveM server console for errors',
        ],
      },
      {
        title: 'Resource install fails',
        body: 'Resource installation goes through a simulated async process. If it fails, check the install history tab for error details. Common issues include invalid server selection or network timeouts.',
        steps: [
          'Check install history for error message',
          'Verify server is online and paired',
          'Try installing a different resource',
          'Contact support if issue persists',
        ],
      },
    ],
  },
  {
    id: 'api-reference',
    label: 'API Reference',
    icon: Terminal,
    content: [
      {
        title: 'GET /api/servers',
        body: 'Lists all servers for the current organization. Returns id, name, framework, status, lastSeenAt, resourceCount, hasAgent, playerCount, fps.',
      },
      {
        title: 'POST /api/servers',
        body: 'Creates a new server. Returns { server: { id, name, status }, pairing: { code, token } }. The pairing code is valid for 10 minutes.',
      },
      {
        title: 'GET /api/servers/:id/resources',
        body: 'Returns indexed resources for a server. Each resource includes resourceName, relativePath, dependencies, provides, files.',
      },
      {
        title: 'POST /api/servers/:id/scan',
        body: 'Triggers a resource scan. Returns { status, framework, resourceCount }.',
      },
      {
        title: 'GET /api/changes',
        body: 'Lists all changes across servers. Query params: serverId, status (pending/applied/failed/rolled_back), limit.',
      },
      {
        title: 'POST /api/changes/:id/apply',
        body: 'Applies a pending change. Sends the patch to the agent for filesystem write.',
      },
      {
        title: 'POST /api/servers/:id/restart',
        body: 'Sends a restart command to the agent. Requires txAdmin configuration for actual server restart.',
      },
      {
        title: 'GET /api/org',
        body: 'Returns organization billing info: planTier, monthlyActionLimit, monthlyActionCount, monthlyCostCap.',
      },
      {
        title: 'GET /api/servers/:id/players',
        body: 'Returns list of online players for a server. Requires active agent connection.',
      },
      {
        title: 'GET /api/resources/catalog',
        body: 'Returns public resource catalog. Query params: category, search, type, page, limit.',
      },
      {
        title: 'POST /api/resources/install',
        body: 'Installs a resource to a server. Returns install object with status tracking. Body: { serverId, slug }.',
      },
      {
        title: 'GET /api/resources/installs/:serverId',
        body: 'Returns install history for a server. Shows status, progress, errors, and timestamps.',
      },
      {
        title: 'POST /api/resources/installs/:id/rollback',
        body: 'Initiates rollback of an installed resource. Returns confirmation with new status.',
      },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    content: [
      {
        title: 'Local-First Architecture',
        body: 'Your server files never leave your machine. The NOXES agent runs locally and only sends file diffs (text patches) to the orchestrator for review.',
      },
      {
        title: 'Git Checkpoints',
        body: 'Every change is preceded by a git commit. If anything goes wrong, one-click rollback restores the previous state instantly.',
      },
      {
        title: 'Path Validation',
        body: 'The agent validates all file paths against your server-data root directory, preventing directory traversal attacks.',
      },
      {
        title: 'Clerk Authentication',
        body: 'All API requests are authenticated via Clerk. Server access is scoped to your organization — you can only see and modify your own servers.',
      },
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: Package,
    content: [
      {
        title: 'Installing Resources',
        body: 'Browse the resource catalog, select a server, and click Install. The install process shows real-time progress and logs in the Install History section.',
      },
      {
        title: 'Resource Categories',
        body: 'Resources are categorized as Frameworks, Jobs, Admin Tools, Inventory, Dependencies, Maps, and Config. Use the category tabs to filter.',
      },
      {
        title: 'Rolling Back',
        body: 'If a resource causes issues, go to Install History and click Rollback. The rollback restores the server to its state before the resource was installed.',
      },
      {
        title: 'Popular Resources',
        body: 'ox_lib, ox_target, ox_inventory are essential dependencies. QB and ESX frameworks are the most popular RP frameworks.',
      },
    ],
  },
] as const;

type SectionContent = typeof SECTIONS[number]['content'][number];

const QUICK_LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Add Server', href: '/dashboard/servers/new' },
  { label: 'Resources', href: '/dashboard/resources' },
  { label: 'Changes', href: '/dashboard/changes' },
  { label: 'API Status', href: '/api/health' },
  { label: 'Support', href: 'https://github.com/nousresearch/nox-fivem/issues' },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const section = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];
  const Icon = section.icon;

  // Filter content based on search
  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) return section.content;
    const q = searchQuery.toLowerCase();
    return section.content.filter(
      (item: SectionContent) =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        ((item as SectionContent & { steps?: string[] }).steps?.some((s) => s.toLowerCase().includes(q)) ?? false)
    );
  }, [section.content, searchQuery]);

  // Search across all sections
  const allResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: Array<{ section: string; item: { title: string; body: string } }> = [];
    for (const sec of SECTIONS) {
      for (const item of sec.content) {
        if (
          item.title.toLowerCase().includes(q) ||
          item.body.toLowerCase().includes(q)
        ) {
          results.push({ section: sec.label, item: { title: item.title, body: item.body } });
        }
      }
    }
    return results;
  }, [searchQuery]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F0F14] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Help & Docs</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            Setup guides, troubleshooting, and API reference
          </p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-[#16161E] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#3DFFA2] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            >
              X
            </button>
          )}
        </div>

        {/* Search results overlay */}
        <AnimatePresence>
          {searchQuery && allResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-[#16161E] border border-white/10 rounded-lg overflow-hidden"
            >
              <div className="p-3 border-b border-white/10">
                <span className="font-mono text-xs text-white/50">
                  {allResults.length} result{allResults.length !== 1 ? 's' : ''} found
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {allResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveSection(SECTIONS.find((s) => s.label === result.section)?.id ?? 'getting-started');
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-[#3DFFA2] uppercase">{result.section}</span>
                      <span className="font-mono text-xs text-white">{result.item.title}</span>
                    </div>
                    <p className="font-sans text-xs text-white/50 line-clamp-1">
                      {result.item.body}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          {searchQuery && allResults.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 bg-[#16161E] border border-white/10 rounded-lg"
            >
              <Search className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="font-mono text-xs text-white/40">No results for "{searchQuery}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {SECTIONS.map((s) => {
            const SIcon = s.icon;
            const isActive = s.id === activeSection;
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider border transition-colors duration-100 whitespace-nowrap ${
                  isActive
                    ? 'bg-[rgba(61,255,162,0.15)] border-[rgba(61,255,162,0.4)] text-[#3DFFA2]'
                    : 'border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)] hover:text-white hover:border-[rgba(255,255,255,0.2)]'
                }`}
              >
                <SIcon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {filteredContent.length === 0 ? (
              <div className="text-center py-12 bg-[#16161E] border border-white/10 rounded-lg">
                <Search className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="font-mono text-xs text-white/40">No results in this section</p>
              </div>
            ) : (
              filteredContent.map((item, i) => (
                <div
                  key={i}
                  className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCard(expandedCard === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors text-left"
                  >
                    <h3 className="font-mono text-sm font-medium text-white">
                      {item.title}
                    </h3>
                    {(item as any).steps && (
                      expandedCard === i ? (
                        <ChevronUp className="w-4 h-4 text-white/40" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-white/40" />
                      )
                    )}
                  </button>
                  <div className="px-5 pb-4">
                    <p className="font-sans text-sm text-[rgba(255,255,255,0.5)] leading-[1.7]">
                      {item.body}
                    </p>
                    {(item as any).steps && (
                      <AnimatePresence>
                        {expandedCard === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 pt-4 border-t border-white/10"
                          >
                            <p className="font-mono text-[10px] uppercase tracking-wider text-white/40 mb-3">
                              Resolution Steps
                            </p>
                            <ol className="space-y-2">
                              {(item as any).steps.map((step: string, si: number) => (
                                <li key={si} className="flex items-start gap-3">
                                  <span className="w-5 h-5 rounded-full bg-[#3DFFA2]/20 text-[#3DFFA2] font-mono text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {si + 1}
                                  </span>
                                  <span className="font-sans text-xs text-white/60">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* Quick links */}
        <div className="border-t border-[rgba(255,255,255,0.08)] pt-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-[rgba(255,255,255,0.3)]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
              Quick Links
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="font-mono text-xs text-[rgba(255,255,255,0.4)] hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] px-3 py-2 transition-colors duration-100 flex items-center gap-2"
              >
                {link.href.startsWith('http') && <ExternalLink className="w-3 h-3" />}
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Need help section */}
        <div className="bg-[rgba(61,255,162,0.1)] border border-[rgba(61,255,162,0.2)] rounded-lg p-5">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-[#3DFFA2] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-mono text-sm font-medium text-white mb-1">Need Help?</h3>
              <p className="font-sans text-xs text-white/50 leading-[1.6]">
                If you cannot find what you are looking for, check the GitHub repository for issues and documentation, or reach out to the Noxes team for support.
              </p>
              <div className="flex gap-2 mt-3">
                <a
                  href="https://github.com/nousresearch/nox-fivem/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3DFFA2]/15 border border-[#3DFFA2]/30 text-[#3DFFA2] font-mono text-[10px] uppercase tracking-wider hover:bg-[#3DFFA2]/25 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  GitHub Issues
                </a>
                <a
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 font-mono text-[10px] uppercase tracking-wider hover:bg-white/10 transition-colors"
                >
                  <ArrowUpCircle className="w-3 h-3" />
                  Back to Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
