'use client';

import { useState } from 'react';
import { BookOpen, Terminal, Shield, AlertCircle, HelpCircle, FileText, Plus, RefreshCw, Settings as SettingsIcon, Package, Users } from 'lucide-react';
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
        body: 'Download the NOX agent for your platform (Windows/Linux). Run the pair command and enter the pairing code from the dashboard. Point the agent to your server-data folder.',
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
        body: 'Check that the orchestrator URL is correct (default: http://localhost:3001). Ensure the pairing code hasn\'t expired (10-minute window). Verify your server-data folder path is accessible.',
      },
      {
        title: 'Changes not applying',
        body: 'Make sure the agent is online (green dot in dashboard). Check that the agent has git initialized in your server-data folder. If the diff looks wrong, request an edit before applying.',
      },
      {
        title: 'Server shows offline',
        body: 'The server goes offline when the agent disconnects. Restart the agent process. Check that the agent hasn\'t been killed by a system sleep/hibernate cycle.',
      },
      {
        title: 'Scan returns no resources',
        body: 'The scan looks for fxserver.conf, resource manifest files, and folder structures. Ensure your server-data folder contains properly structured resources with valid manifests.',
      },
      {
        title: 'Failed to fetch players',
        body: 'Ensure the agent is connected and the server is online. Players are only available when the agent has active communication with the FiveM server.',
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
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    content: [
      {
        title: 'Local-First Architecture',
        body: 'Your server files never leave your machine. The NOX agent runs locally and only sends file diffs (text patches) to the orchestrator for review.',
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
] as const;

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const section = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];
  const Icon = section.icon;

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

        {/* Section tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {SECTIONS.map((s) => {
            const SIcon = s.icon;
            const isActive = s.id === activeSection;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider border transition-colors duration-100 whitespace-nowrap ${
                  isActive
                    ? 'bg-[rgba(94,106,210,0.15)] border-[rgba(94,106,210,0.4)] text-[#5E6AD2]'
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
            {section.content.map((item, i) => (
              <div
                key={i}
                className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5"
              >
                <h3 className="font-mono text-sm font-medium text-white mb-2">
                  {item.title}
                </h3>
                <p className="font-sans text-sm text-[rgba(255,255,255,0.5)] leading-[1.7]">
                  {item.body}
                </p>
              </div>
            ))}
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
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Add Server', href: '/dashboard/servers/new' },
              { label: 'API Docs', href: '#api-reference' },
              { label: 'Support', href: '#' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-xs text-[rgba(255,255,255,0.4)] hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] px-3 py-2 transition-colors duration-100"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
