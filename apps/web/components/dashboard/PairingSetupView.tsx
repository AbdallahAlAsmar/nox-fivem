'use client';

import { useState } from 'react';
import {
  Download,
  Loader2,
  CheckCircle2,
  Rocket,
  MousePointerClick,
} from 'lucide-react';

export interface PairingSetupResult {
  id: string;
  pairingCode: string;
  expiresAt?: string | Date;
}

interface PairingSetupViewProps {
  pairing: PairingSetupResult;
  onDone: () => void;
  onRegenerate?: () => void;
}

export function PairingSetupView({
  pairing,
  onDone,
  onRegenerate,
}: PairingSetupViewProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(pairing.pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    setDownloading(true);
    const a = document.createElement('a');
    a.href = '/dist/NOX-Setup.exe';
    a.download = 'NOX-Setup.exe';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
        </div>
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">
            Connect Desktop App
          </h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
            Pair this server with the NOX desktop agent
          </p>
        </div>
      </div>

      <div className="border border-[rgba(94,106,210,0.3)] bg-[rgba(94,106,210,0.06)] p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-6 h-6 rounded-full bg-[rgba(94,106,210,0.06)] border border-[rgba(94,106,210,0.3)] flex items-center justify-center">
            <span className="font-mono text-[10px] font-medium text-[#5E6AD2]">1</span>
          </div>
          <Download className="w-3.5 h-3.5 text-[#5E6AD2]" />
          <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-white">
            Download the Desktop App
          </h3>
        </div>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-[1.6] mb-3">
          Install the NOX desktop app on your Windows PC. It manages your servers, validates paths,
          and runs the AI agent.
        </p>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5E6AD2] hover:bg-[#4f5bc0] text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {downloading ? 'Downloading…' : 'Download NOX-Setup.exe'}
        </button>
      </div>

      <div className="border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)] p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-6 h-6 rounded-full bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.3)] flex items-center justify-center">
            <span className="font-mono text-[10px] font-medium text-[#f59e0b]">2</span>
          </div>
          <Rocket className="w-3.5 h-3.5 text-[#f59e0b]" />
          <h3 className="font-mono text-xs uppercase tracking-[0.12em] text-white">
            Enter the Pairing Code
          </h3>
        </div>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] leading-[1.6] mb-3">
          Open the NOX desktop app, click Add Server, and enter the code below to link this server
          to the agent.
        </p>
        <div className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] p-3 flex items-center justify-between gap-3">
          <code className="font-mono text-sm text-[#5E6AD2] tracking-widest">
            {pairing.pairingCode}
          </code>
          <button
            onClick={copyCode}
            className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100 flex-shrink-0 px-2 py-1 border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <button
        onClick={onDone}
        className="w-full font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white py-3 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-colors duration-100"
      >
        I&apos;ll do this later — back to dashboard
      </button>

      {onRegenerate && (
        <div className="pt-1">
          <button
            onClick={onRegenerate}
            className="w-full font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] py-2 transition-colors duration-100"
          >
            Expired? Refresh pairing code
          </button>
        </div>
      )}
    </div>
  );
}
