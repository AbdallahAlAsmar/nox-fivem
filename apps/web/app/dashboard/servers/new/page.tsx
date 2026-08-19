'use client';

import {
  ArrowLeft,
  AlertCircle,
  Server,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NewServerPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14]">
      <div className="max-w-lg mx-auto">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors duration-100 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Servers</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center">
              <Server className="w-5 h-5 text-[#5E6AD2]" />
            </div>
            <div>
              <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Add a Server</h1>
              <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
                Server management is done in the desktop app
              </p>
            </div>
          </div>

          <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#f59e0b] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm text-[rgba(255,255,255,0.7)] leading-[1.6]">
                  Create and manage your FiveM servers from the <strong className="text-white">NOX desktop app</strong>.
                </p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-2 leading-[1.6]">
                  The desktop app lets you browse your server folder, validate the path automatically (checks for <code className="font-mono text-[rgba(94,106,210,0.8)]">server.cfg</code>), and pair the agent in one flow.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[rgba(255,255,255,0.06)]">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] mb-3">What the desktop app does:</p>
              <ul className="space-y-2">
                {[
                  'Name your server and pick its folder',
                  'Auto-validates the path — checks for server.cfg and resources/',
                  'Pairs the desktop agent to connect AI capabilities',
                  'Scans resources and enables file edits',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <div className="w-1 h-1 bg-[#5E6AD2] rounded-full flex-shrink-0" />
                    <span className="font-sans text-xs text-[rgba(255,255,255,0.5)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
