'use client';

import { useState } from 'react';
import {
  Download,
  Loader2,
  AlertCircle,
  LogIn,
  FolderOpen,
  Link2,
} from 'lucide-react';

interface DesktopConnectGuideProps {
  serverName?: string;
}

/**
 * Shown when a server exists in the dashboard but has never had a live
 * desktop-agent WebSocket (status is still `paired` / `unpaired`).
 * Matches the Tauri flow: same Clerk account → Connect → pick server-data dir.
 */
export function DesktopConnectGuide({ serverName }: DesktopConnectGuideProps) {
  const [downloading, setDownloading] = useState(false);
  const [installerMissing, setInstallerMissing] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/dist/NOXES-Setup.exe', { method: 'HEAD' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const a = document.createElement('a');
      a.href = '/dist/NOXES-Setup.exe';
      a.download = 'NOXES-Setup.exe';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setInstallerMissing(true);
    } finally {
      setDownloading(false);
    }
  };

  const steps = [
    {
      n: 1,
      icon: Download,
      title: 'Download the desktop app',
      body: 'Install NOXES on the Windows PC that has your FiveM server files.',
      accent: '#3DFFA2',
      action: (
        installerMissing ? (
          <div className="flex items-start gap-2 p-3 border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)]">
            <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-[#ef4444]">
                Installer not available
              </p>
              <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] mt-1 leading-[1.6]">
                Contact support or grab the desktop app from GitHub releases.
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3DFFA2] hover:bg-[#36d98c] text-[#0F0F14] font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {downloading ? 'Checking…' : 'Download NOXES'}
          </button>
        )
      ),
    },
    {
      n: 2,
      icon: LogIn,
      title: 'Sign in with the same account',
      body: 'Open the app and sign in with the same account you use on this website. Your servers will show up automatically.',
      accent: '#f59e0b',
    },
    {
      n: 3,
      icon: FolderOpen,
      title: serverName ? `Connect “${serverName}”` : 'Connect this server',
      body: 'Click Connect on this server, then choose your FiveM server-data folder (the one that contains server.cfg).',
      accent: '#60a5fa',
    },
    {
      n: 4,
      icon: Link2,
      title: 'You’re done',
      body: 'Once the folder is set, this page and the desktop app both show Connected — chat, players, and file tools unlock automatically.',
      accent: '#22c55e',
    },
  ] as const;

  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <div
            key={step.n}
            className="border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center border"
                style={{
                  borderColor: `${step.accent}4d`,
                  backgroundColor: `${step.accent}0f`,
                }}
              >
                <span
                  className="font-mono text-[10px] font-medium"
                  style={{ color: step.accent }}
                >
                  {step.n}
                </span>
              </div>
              <Icon className="w-3.5 h-3.5" style={{ color: step.accent }} />
              <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-white">
                {step.title}
              </h3>
            </div>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-[1.6] mb-0">
              {step.body}
            </p>
            {'action' in step && step.action ? (
              <div className="mt-3">{step.action}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
