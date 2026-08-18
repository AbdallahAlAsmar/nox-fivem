'use client';

import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Server,
  Key,
  Bell,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [orchestratorUrl, setOrchestratorUrl] = useState('http://localhost:3001');
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14]">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Settings</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            Configure your NOX // FiveM experience
          </p>
        </div>

        {/* Orchestrator */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Orchestrator</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">
                API Endpoint
              </label>
              <input
                type="text"
                value={orchestratorUrl}
                onChange={(e) => setOrchestratorUrl(e.target.value)}
                className="w-full px-3 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white font-mono focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
              />
            </div>
            <p className="font-mono text-[11px] text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
              The address where your orchestrator is running. Default: localhost:3001
            </p>
          </div>
        </motion.section>

        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Appearance</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white">Dark mode</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-0.5">Always on — this theme is dark-only</p>
              </div>
              <div className="w-10 h-5 bg-[#5E6AD2] flex items-center justify-end px-1">
                <div className="w-3 h-3 bg-white" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Notifications</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white">Chat notifications</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-0.5">Show toast when AI responds</p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`w-10 h-5 transition-colors duration-100 flex items-center justify-end px-1 ${
                  notifications ? 'bg-[#5E6AD2]' : 'bg-[rgba(255,255,255,0.15)]'
                }`}
              >
                <div className={`w-3 h-3 bg-white transition-transform duration-100 ${notifications ? 'translate-x-0' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white">Auto-refresh servers</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-0.5">Poll orchestrator every 60s</p>
              </div>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-10 h-5 transition-colors duration-100 flex items-center justify-end px-1 ${
                  autoRefresh ? 'bg-[#5E6AD2]' : 'bg-[rgba(255,255,255,0.15)]'
                }`}
              >
                <div className="w-3 h-3 bg-white" />
              </button>
            </div>
          </div>
        </motion.section>

        {/* Security */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Security</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-[rgba(94,106,210,0.08)] border border-[rgba(94,106,210,0.2)]">
              <CheckCircle2 className="w-4 h-4 text-[#5E6AD2] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white">AI changes are sandboxed</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1 leading-[1.6]">
                  Every file change is staged and requires your approval before being written.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)]">
              <Key className="w-4 h-4 text-[rgba(255,255,255,0.3)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white">API keys never stored locally</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1 leading-[1.6]">
                  Your orchestrator handles all authentication. No secrets in the browser.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="font-mono text-xs uppercase tracking-wider text-[#5E6AD2] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Settings saved
            </span>
          )}
          <button
            onClick={handleSave}
            className="font-mono text-xs uppercase tracking-[1.4px] px-5 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
