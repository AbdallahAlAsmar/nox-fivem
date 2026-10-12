import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Server, Shield } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

// The desktop app ships a single dark theme — there is no light-mode
// implementation to switch to, so no theme selector is rendered (honesty over
// dead controls). Display toggles that nothing reads were also removed.
//
// Auto-connect persists to the RUST config (auto_start) because that is what
// main.rs actually reads at startup; localStorage is only a dev-in-browser
// fallback where Tauri IPC is unavailable.
export default function Settings() {
  const [settings, setSettings] = useState({
    serverDirectory: '',
    autoConnect: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const cfg = await invoke<Record<string, unknown>>('get_config_cmd')
      setSettings({
        serverDirectory: (cfg.server_directory as string) || '',
        autoConnect: !!cfg.auto_start,
      })
      return
    } catch {
      // Not running inside Tauri (plain browser dev) — use localStorage.
    }
    try {
      const saved = localStorage.getItem('nox-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings(s => ({ ...s, serverDirectory: parsed.serverDirectory || '', autoConnect: !!parsed.autoStart }))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const cfg = await invoke<Record<string, unknown>>('get_config_cmd')
      cfg.server_directory = settings.serverDirectory
      cfg.auto_start = settings.autoConnect
      await invoke('update_config_cmd', { newConfig: cfg })
    } catch {
      // Fallback persistence for browser dev.
      try {
        localStorage.setItem('nox-settings', JSON.stringify({
          serverDirectory: settings.serverDirectory,
          autoStart: settings.autoConnect,
        }))
      } catch (error) {
        console.error('Failed to save settings:', error)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Settings</h2>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">Configure your NOXES // FiveM experience</p>
      </div>

      {/* Server */}
      <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-[#3DFFA2]" />
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Server</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">
              Default Server Directory
            </label>
            <input
              type="text"
              value={settings.serverDirectory}
              onChange={(e) => setSettings(s => ({ ...s, serverDirectory: e.target.value }))}
              placeholder="C:/FXServer/server-data"
              className="w-full px-3 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white focus:outline-none focus:border-[#3DFFA2] transition-colors duration-100"
            />
          </div>
          <p className="font-mono text-[10px] text-[rgba(255,255,255,0.35)] leading-relaxed">
            Used as the fallback server-data folder when connecting an agent.
          </p>
        </div>
      </div>

      {/* Behavior */}
      <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#3DFFA2]" />
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Behavior</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)]">Auto-connect on launch</span>
              <p className="font-sans text-xs text-[rgba(255,255,255,0.35)] mt-0.5">
                Connect the agent to your last paired server when NOXES starts.
              </p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, autoConnect: !s.autoConnect }))}
              aria-label="Toggle auto-connect on launch"
              className={`w-10 h-5 transition-colors duration-100 flex items-center ${settings.autoConnect ? 'bg-[#3DFFA2]' : 'bg-[rgba(61,255,162,0.15)]'}`}
            >
              <div className={`w-3 h-3 bg-white transition-transform duration-100 ${settings.autoConnect ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={{ opacity: 0.85 }}
          whileTap={{ scale: 0.98 }}
          className="font-mono text-xs uppercase tracking-[1.4px] px-6 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-100"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </motion.button>
      </div>
    </div>
  )
}
