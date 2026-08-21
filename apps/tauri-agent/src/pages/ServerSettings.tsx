import { useState, useEffect } from 'react'
import { Trash2, Settings as SettingsIcon, FolderOpen, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface ServerSettingsProps {
  serverId?: string
}

export default function ServerSettings({ serverId }: ServerSettingsProps) {
  const [name, setName] = useState('')
  const [serverDir, setServerDir] = useState('')
  const [framework, setFramework] = useState('unknown')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [serverName, setServerName] = useState('')
  const ORCH = import.meta.env?.VITE_ORCHESTRATOR_URL || 'http://158.101.167.118:3001'

  useEffect(() => {
    if (!serverId) return
    loadSettings()
  }, [serverId])

  const loadSettings = async () => {
    if (!serverId) return
    setLoading(true)
    try {
      const res = await fetch(`${ORCH}/api/servers/${serverId}`)
      if (!res.ok) return
      const data = await res.json()
      setName(data.name || '')
      setServerDir(data.settings?.serverDir || data.rootLabel || '')
      setFramework(data.framework || 'unknown')
      setServerName(data.name || '')
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
          settings: { name, serverDir },
          serverDir,
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
        setServerDir(result)
      }
    } catch (e) {
      console.error('Failed to open folder:', e)
    }
  }

  const handleDelete = async () => {
    if (!serverId) return
    const confirmName = prompt('Type the server name to confirm deletion:')
    if (!confirmName || confirmName.trim() !== serverName) {
      if (confirmName) {
        setMessage({ type: 'error', text: 'Server name does not match. Deletion cancelled.' })
      }
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`${ORCH}/api/servers/${serverId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: serverName }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to delete')
      }
      setMessage({ type: 'success', text: 'Server deleted successfully' })
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to delete server' })
    } finally {
      setDeleting(false)
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
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">Configure this server</p>
        </div>
        <button
          onClick={loadSettings}
          className="flex items-center gap-1 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors border border-[rgba(255,255,255,0.08)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 text-[rgba(255,255,255,0.3)] font-mono text-xs uppercase tracking-wider">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading...
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {/* Server Name */}
          <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="w-4 h-4 text-[#5E6AD2]" />
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Server Name</h3>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-white font-mono text-sm placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors"
              placeholder="My FiveM Server"
            />
          </div>

          {/* Server Directory */}
          <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="w-4 h-4 text-[#5E6AD2]" />
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Server Directory</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverDir}
                onChange={(e) => setServerDir(e.target.value)}
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

          {/* Framework (read-only) */}
          <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-4">
            <div className="flex items-center gap-2 mb-4">
              <SettingsIcon className="w-4 h-4 text-[#5E6AD2]" />
              <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Framework</h3>
            </div>
            <div className="px-4 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white font-mono text-sm">
              {framework}
            </div>
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
          <div className="flex justify-end gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-white text-[#0F0F14] font-mono text-xs uppercase tracking-[1.4px] font-medium hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-100 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Delete Section */}
          <div className="border-t border-[rgba(239,68,68,0.2)] pt-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-[#ef4444]">Delete Server</h3>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.3)] mt-1">This action cannot be undone</p>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.2)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Deleting...' : 'Delete Server'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
