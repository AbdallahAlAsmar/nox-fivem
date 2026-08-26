'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser, useClerk } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Calendar,
  Key,
  Shield,
  Bell,
  Lock,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  Upload,
  RefreshCw,
  Server,
  Copy,
} from 'lucide-react';

type Tab = 'profile' | 'security' | 'api_keys' | 'activity';

interface ApiKey {
  id: string;
  name: string;
  prefix?: string | null;
  key?: string; // plaintext — present ONLY in the creation response
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'api_key_created' | 'api_key_deleted';
  message: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

function getProviderColor(provider: string): string {
  switch (provider) {
    case 'oauth_google': return '#ea4335';
    case 'oauth_discord': return '#5865f2';
    case 'oauth_github': return '#6e5494';
    default: return '#3DFFA2';
  }
}

function getProviderLabel(provider: string): string {
  switch (provider) {
    case 'oauth_google': return 'Google';
    case 'oauth_discord': return 'Discord';
    case 'oauth_github': return 'GitHub';
    default: return provider;
  }
}

const PROVIDER_ICONS: Record<string, string> = {
  google: 'G',
  discord: 'D',
  github: 'GH',
};

/**
 * Clerk reports providers as "oauth_google" etc. while the icon table is
 * keyed by the bare name — strip the prefix before lookup.
 */
function providerIconKey(provider: string): string {
  return provider.replace(/^oauth_/, '').toLowerCase();
}

export default function AccountPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAvatar, setHasAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    if (user?.fullName) {
      setDisplayName(user.fullName);
    }
    setHasAvatar(!!user?.imageUrl);
  }, [user]);

  useEffect(() => {
    fetchApiKeys();
    fetchSecurityEvents();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/account/api-keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch {
      // Ignore
    }
  };

  const fetchSecurityEvents = async () => {
    try {
      const res = await fetch('/api/account/security-events');
      if (res.ok) {
        const data = await res.json();
        setSecurityEvents(data.events || []);
      }
    } catch {
      // Ignore
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: displayName }),
      });
      if (res.ok) {
        toast.success('Profile updated');
        setIsEditing(false);
        // Pull the fresh name back into the Clerk client cache.
        await user?.reload();
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/account/avatar', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        toast.success('Avatar updated');
        setHasAvatar(true);
        // Force refresh user data
        window.location.reload();
      } else {
        toast.error('Failed to update avatar');
      }
    } catch {
      toast.error('Failed to update avatar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/account/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (res.ok) {
        const data = await res.json();
        // The plaintext token appears exactly once, in this response.
        if (data.key?.key) {
          setCreatedKey(data.key.key);
          copyToClipboard(data.key.key);
        }
        setApiKeys((prev) => [{ ...data.key, key: undefined }, ...prev]);
        setNewKeyName('');
        toast.success('API key created');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to create API key');
      }
    } catch {
      toast.error('Failed to create API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const res = await fetch(`/api/account/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
        toast.success('API key deleted');
      } else {
        toast.error('Failed to delete API key');
      }
    } catch {
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleLogout = async () => {
    await signOut({ redirectUrl: '/' });
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      // Clerk handles account deletion
      user?.delete();
      toast.success('Account deleted');
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api_keys', label: 'API Keys', icon: Key },
    { id: 'activity', label: 'Activity', icon: Clock },
  ];

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? '';
  const createdAt = user?.createdAt?.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const externalAccounts = user?.externalAccounts ?? [];
  const linkedProviders = externalAccounts.map((ea) => ({
    provider: ea.provider,
    identifier: ea.emailAddress ?? ea.providerUserId ?? '',
  }));

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14]">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Account</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            Your profile and authentication details
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#16161E] p-1 rounded-lg border border-[rgba(255,255,255,0.08)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-wider rounded transition-all duration-100 ${
                activeTab === tab.id
                  ? 'bg-[#3DFFA2] text-white'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Profile Card */}
            <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  {hasAvatar ? (
                    <img
                      src={user?.imageUrl}
                      alt={user?.fullName ?? 'User'}
                      className="w-20 h-20 ring-2 ring-[rgba(255,255,255,0.1)] rounded object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 ring-2 ring-[rgba(255,255,255,0.1)] rounded bg-[rgba(61,255,162,0.2)] flex items-center justify-center">
                      <span className="font-mono text-2xl text-[#3DFFA2]">
                        {(user?.fullName ?? 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-6 h-6 bg-[#3DFFA2] rounded-full flex items-center justify-center hover:bg-[#7c8aff] transition-colors"
                  >
                    <Upload className="w-3 h-3 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadAvatar}
                  />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-mono text-base text-white font-medium">
                      {user?.fullName ?? 'Unnamed User'}
                    </h2>
                    {isEditing && (
                      <button
                        onClick={handleUpdateProfile}
                        disabled={isLoading}
                        className="px-2 py-1 bg-[#3DFFA2] text-white text-xs font-mono rounded hover:bg-[#7c8aff] transition-colors disabled:opacity-50"
                      >
                        Save
                      </button>
                    )}
                  </div>
                  <p className="font-sans text-sm text-[rgba(255,255,255,0.4)] mt-0.5 truncate">
                    {primaryEmail}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {linkedProviders.map((acct) => (
                      <span
                        key={acct.provider}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded text-[10px] font-mono uppercase tracking-wider text-[rgba(255,255,255,0.6)]"
                      >
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ background: getProviderColor(acct.provider) }}
                        />
                        {getProviderLabel(acct.provider)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#3DFFA2]" />
                  <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">
                    Profile Details
                  </h2>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-mono text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-2.5">
                    <User className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" />
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                      Display Name
                    </span>
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="font-sans text-sm text-white bg-transparent border-b border-[rgba(255,255,255,0.2)] focus:border-[#3DFFA2] outline-none w-40"
                    />
                  ) : (
                    <span className="font-sans text-sm text-white">
                      {user?.fullName ?? <span className="text-[rgba(255,255,255,0.3)]">Not set</span>}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" />
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                      Email
                    </span>
                  </div>
                  <span className="font-sans text-sm text-white truncate max-w-[200px]">{primaryEmail}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" />
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                      Joined
                    </span>
                  </div>
                  <span className="font-sans text-sm text-[rgba(255,255,255,0.6)]">{createdAt}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2.5">
                    <Key className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" />
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                      User ID
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[rgba(255,255,255,0.3)] truncate max-w-[160px]" title={user?.id}>
                    {user?.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Accounts */}
            <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-[#3DFFA2]" />
                <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">
                  Linked Accounts
                </h2>
              </div>
              {linkedProviders.length === 0 ? (
                <p className="font-sans text-xs text-[rgba(255,255,255,0.3)]">
                  No external accounts linked.
                </p>
              ) : (
                <div className="space-y-2">
                  {linkedProviders.map((acct) => (
                    <div
                      key={acct.provider}
                      className="flex items-center gap-3 p-3 bg-[#0A0A0F] border border-[rgba(255,255,255,0.06)]"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: getProviderColor(acct.provider) + '22', color: getProviderColor(acct.provider) }}
                      >
                        {PROVIDER_ICONS[providerIconKey(acct.provider)] ?? providerIconKey(acct.provider)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs uppercase tracking-wider text-white">
                          {getProviderLabel(acct.provider)}
                        </p>
                        <p className="font-sans text-[11px] text-[rgba(255,255,255,0.35)] truncate">
                          {acct.identifier}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-[#3DFFA2] flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Password — managed by Clerk */}
            <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-[#3DFFA2]" />
                <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">
                  Password
                </h2>
              </div>
              <p className="font-sans text-xs text-[rgba(255,255,255,0.35)] leading-[1.7]">
                Password changes are handled securely by your sign-in provider.
                Use the &ldquo;Forgot password?&rdquo; link on the sign-in screen to reset it,
                or sign in with a linked account (Google, Discord, GitHub) and manage
                credentials from that provider.
              </p>
            </div>

            {/* Danger Zone */}
            <div className="bg-[#16161E] border border-[rgba(255,80,80,0.15)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-[#ff5050]" />
                <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[#ff5050]">
                  Danger Zone
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.7)]">
                      Sign Out
                    </p>
                    <p className="font-sans text-xs text-[rgba(255,255,255,0.35)] mt-0.5">
                      Log out of your NOXES account on this device
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,80,80,0.4)] hover:text-white transition-colors duration-100"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[rgba(255,80,80,0.1)]">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wider text-[#ff5050]">
                      Delete Account
                    </p>
                    <p className="font-sans text-xs text-[rgba(255,255,255,0.35)] mt-0.5">
                      Permanently remove your account and all associated data
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[#ff5050] border border-[rgba(255,80,80,0.3)] hover:bg-[rgba(255,80,80,0.1)] transition-colors duration-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api_keys' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-4 h-4 text-[#3DFFA2]" />
                <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">
                  API Keys
                </h2>
              </div>

              {/* Create New Key */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g., 'Production Server')"
                  className="flex-1 bg-[#0A0A0F] border border-[rgba(255,255,255,0.1)] rounded px-3 py-2 font-sans text-sm text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#3DFFA2] outline-none"
                />
                <button
                  onClick={handleCreateApiKey}
                  disabled={isLoading || !newKeyName.trim()}
                  className="px-4 py-2 bg-[#3DFFA2] text-white font-mono text-xs uppercase tracking-wider rounded hover:bg-[#7c8aff] transition-colors disabled:opacity-50"
                >
                  Create
                </button>
              </div>

              {/* Keys List */}
              {apiKeys.length === 0 ? (
                <p className="font-sans text-xs text-[rgba(255,255,255,0.3)]">
                  No API keys yet. Create one to access the API programmatically.
                </p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center gap-3 p-3 bg-[#0A0A0F] border border-[rgba(255,255,255,0.06)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs text-white truncate">{key.name}</p>
                          {key.revokedAt && (
                            <span className="px-1.5 py-0.5 bg-[rgba(239,68,68,0.1)] text-[#ef4444] font-mono text-[9px] uppercase tracking-wider rounded">
                              Revoked
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-[rgba(255,255,255,0.4)] mt-0.5">
                          {key.prefix ?? 'nox_'}••••••••
                        </p>
                        <p className="font-mono text-[10px] text-[rgba(255,255,255,0.25)] mt-0.5">
                          Created {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteApiKey(key.id)}
                        disabled={!!key.revokedAt}
                        className="p-2 text-[rgba(255,255,255,0.4)] hover:text-[#ff5050] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {createdKey && (
              <div className="bg-[rgba(61,255,162,0.1)] border border-[rgba(61,255,162,0.3)] p-4">
                <p className="font-mono text-xs uppercase tracking-wider text-[#3DFFA2] mb-2">
                  Your new API key (save it now — you won't see it again)
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm text-white break-all bg-[#0A0A0F] p-2 rounded">
                    {createdKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdKey)}
                    className="p-2 text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#3DFFA2]" />
                  <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">
                    Security Activity
                  </h2>
                </div>
                <button
                  onClick={fetchSecurityEvents}
                  className="p-2 text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              {securityEvents.length === 0 ? (
                <p className="font-sans text-xs text-[rgba(255,255,255,0.3)]">
                  No security events recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {securityEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 bg-[#0A0A0F] border border-[rgba(255,255,255,0.06)]"
                    >
                      <div className={`mt-0.5 ${
                        event.type === 'login' ? 'text-[#22c55e]' :
                        event.type === 'logout' ? 'text-[rgba(255,255,255,0.4)]' :
                        event.type === 'password_change' ? 'text-[#f59e0b]' :
                        event.type === 'api_key_created' ? 'text-[#3DFFA2]' :
                        'text-[#ef4444]'
                      }`}>
                        {event.type === 'login' && <CheckCircle2 className="w-4 h-4" />}
                        {event.type === 'logout' && <LogOut className="w-4 h-4" />}
                        {event.type === 'password_change' && <Lock className="w-4 h-4" />}
                        {event.type === 'api_key_created' && <Key className="w-4 h-4" />}
                        {event.type === 'api_key_deleted' && <Trash2 className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-white">{event.message}</p>
                        <p className="font-sans text-[11px] text-[rgba(255,255,255,0.4)] mt-0.5">
                          {event.ipAddress && <span className="mr-2">IP: {event.ipAddress}</span>}
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
