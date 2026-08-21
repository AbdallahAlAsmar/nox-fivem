import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sun, Server, Cpu, Shield } from 'lucide-react'

interface SettingsProps {
  onThemeChange: (theme: 'dark' | 'light') => void
}

export default function Settings({ onThemeChange }: SettingsProps) {
  const [settings, setSettings] = useState({
    theme: 'dark' as 'dark' | 'light',
    serverDirectory: '',
    showFileTree: true,
    showCodeChanges: true,
    autoStart: false,
    agentPort: 0,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const saved = localStorage.getItem('nox-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings(s => ({ ...s, ...parsed }))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem('nox-settings', JSON.stringify({
        theme: settings.theme,
        serverDirectory: settings.serverDirectory,
        showFileTree: settings.showFileTree,
        showCodeChanges: settings.showCodeChanges,
        autoStart: settings.autoStart,
      }))
      onThemeChange(settings.theme)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Settings</h2>
        <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">Configure your NOX // FiveM experience</p>
      </div>

      {/* Appearance */}
      <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-4 h-4 text-[#5E6AD2]" />
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Appearance</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSettings(s => ({ ...s, theme: 'dark' }))}
            className={`flex-1 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
              settings.theme === 'dark'
                ? 'bg-white text-[#0F0F14]'
                : 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => setSettings(s => ({ ...s, theme: 'light' }))}
            className={`flex-1 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors duration-100 ${
              settings.theme === 'light'
                ? 'bg-white text-[#0F0F14]'
                : 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.08)]'
            }`}
          >
            Light
          </button>
        </div>
      </div>

      {/* Server */}
      <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-[#5E6AD2]" />
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
              className="w-full px-3 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
            />
          </div>
        </div>
      </div>

      {/* Display */}
      <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#5E6AD2]" />
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Display</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)]">Show File Tree</span>
            <button
              onClick={() => setSettings(s => ({ ...s, showFileTree: !s.showFileTree }))}
              className={`w-10 h-5 transition-colors duration-100 flex items-center ${settings.showFileTree ? 'bg-[#5E6AD2]' : 'bg-[rgba(255,255,255,0.15)]'}`}
            >
              <div className={`w-3 h-3 bg-white transition-transform duration-100 ${settings.showFileTree ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)]">Show Code Changes</span>
            <button
              onClick={() => setSettings(s => ({ ...s, showCodeChanges: !s.showCodeChanges }))}
              className={`w-10 h-5 transition-colors duration-100 flex items-center ${settings.showCodeChanges ? 'bg-[#5E6AD2]' : 'bg-[rgba(255,255,255,0.15)]'}`}
            >
              <div className={`w-3 h-3 bg-white transition-transform duration-100 ${settings.showCodeChanges ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#5E6AD2]" />
          <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Keyboard Shortcuts</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Command Palette', key: 'Ctrl+K' },
            { label: 'New Chat', key: 'Ctrl+N' },
            { label: 'Refresh', key: 'Ctrl+R' },
            { label: 'Search', key: '/' },
          ].map((shortcut) => (
            <div key={shortcut.label} className="flex items-center justify-between p-2 bg-[#0A0A0F] border border-[rgba(255,255,255,0.06)]">
              <span className="font-sans text-xs text-[rgba(255,255,255,0.5)]">{shortcut.label}</span>
              <kbd className="font-mono text-[10px] text-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.06)] px-2 py-0.5 uppercase tracking-wider">{shortcut.key}</kbd>
            </div>
          ))}
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
