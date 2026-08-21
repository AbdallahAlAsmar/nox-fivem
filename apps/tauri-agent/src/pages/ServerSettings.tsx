import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, FolderOpen, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface ServerSettingsProps {
  serverId?: string
}

export default function ServerSettings({ serverId }: ServerSettingsProps) {
  const [settings, setSettings] = useState({
    serverDir: '',
    name: '',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [settingsState, setSettingsState] = useState<Record<string, any>>({})

  const ORCH = import.meta.env?.VITE_ORCHESTRATOR_URL || 'http://158.101.167.118:3001'

  useEffect(() => {
    if (!serverId) return
    loadSettings()
  }, [serverId])

  const loadSettings = async () => {
    if (!serverId) return
    setLoading(true)
    try {
      const res = await fetch(`${ORCH}/api/servers/${serverId}/settings`)
      if (!res.ok) return
      const data = await res.json()
      setSettings({
        serverDir: data.serverDir || '',
        name: data.name || '',
      })
      setSettingsState(data.settings || {})
    } catch (e) {
      console.error('Failed to load settings:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!serverId) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`${ORCH}/api/servers/${serverId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: settingsState,
          serverDir: settings.serverDir,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleBrowseDir = async () => {
    try {
      const result = await (window as any).invoke('open_folder_cmd')
      if (result) {
        setSettings(s => ({ ...s, serverDir: result }))
      }
    } catch (e) {
      console.error('Failed to open folder:', e)
    }
  }

  if (!serverId) {
    return (
      <div className="flex items-center justify-center h-64 text-[rgba(255,255,255,0.3)] font-mono text-xs uppercase tracking-wider">
        No server selected
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Server Settings</h2>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">Configure settings for this server</p>
        </div>
        <button
          onClick={loadSettings}
          className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.08)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-32 text-[rgba(255,255,255,0.3)] font-mono text-xs uppercase tracking-wider">
          Loading settings...
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {/* Server Directory */}
          <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="w-4 h-4 text-[#5E6AD2]" />
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Server Directory</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.serverDir}
                onChange={(e) => setSettings(s => ({ ...s, serverDir: e.target.value }))}
                placeholder="C:/FXServer/server-data"
                className="flex-1 px-4 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-white font-mono text-sm placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors"
              />
              <button
                onClick={handleBrowseDir}
                className="px-4 py-2.5 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] hover:text-white font-mono text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Browse
              </button>
            </div>
          </div>

          {/* Custom Settings */}
          <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="w-4 h-4 text-[#5E6AD2]" />
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Custom Settings</h3>
            </div>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mb-4">
              Configure server-specific settings. Add key-value pairs as needed.
            </p>
            <div className="space-y-2">
              {Object.entries(settingsState).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => {
                      const newKey = e.target.value
                      const newState = { ...settingsState }
                      delete newState[key]
                      newState[newKey] = value
                      setSettingsState(newState)
                    }}
                    className="flex-1 px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white font-mono text-xs placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                    placeholder="Key"
                  />
                  <input
                    type="text"
                    value={String(value)}
                    onChange={(e) => {
                      setSettingsState(s => ({ ...s, [key]: e.target.value }))
                    }}
                    className="flex-1 px-3 py-2 bg-transparent border border-[rgba(255,255,255,0.1)] text-white font-mono text-xs placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors"
                    placeholder="Value"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const key = prompt('Setting key:')
                if (key) {
                  const value = prompt('Setting value:')
                  if (value !== null) {
                    setSettingsState(s => ({ ...s, [key]: value }))
                  }
                }
              }}
              className="mt-3 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.08)]"
            >
              + Add Setting
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`flex items-center gap-2 p-3 font-mono text-xs ${
              message.type === 'success'
                ? 'border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] text-[#22c55e]'
                : 'border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] text-[#ef4444]'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-white text-[#0F0F14] font-mono text-xs uppercase tracking-[1.4px] font-medium hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-100 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
