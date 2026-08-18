'use client';

import { useUser, useClerk, useSession } from '@clerk/nextjs';
import {
  User,
  Mail,
  Calendar,
  LogOut,
  Shield,
  Key,
  ExternalLink,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';

const PROVIDER_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  discord: { icon: '🎮', label: 'Discord', color: '#5865F2' },
  google: { icon: 'G', label: 'Google', color: '#DB4437' },
  github: { icon: '⌨', label: 'GitHub', color: '#6e40c9' },
};

function getProviderLabel(externalAccount: { provider: string }) {
  const key = externalAccount.provider.toLowerCase();
  return PROVIDER_ICONS[key]?.label ?? externalAccount.provider;
}

function getProviderColor(externalAccount: { provider: string }) {
  const key = externalAccount.provider.toLowerCase();
  return PROVIDER_ICONS[key]?.color ?? '#5E6AD2';
}

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { session } = useSession();

  const handleLogout = async () => {
    await signOut({ redirectUrl: '/' });
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[rgba(255,255,255,0.3)]">
          <Clock className="w-4 h-4 animate-spin" />
          <span className="font-mono text-xs uppercase tracking-wider">Loading…</span>
        </div>
      </div>
    );
  }

  const primaryEmail = user.primaryEmailAddress?.emailAddress ?? '';
  const createdAt = user.createdAt?.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const externalAccounts = user.externalAccounts ?? [];
  const linkedProviders = externalAccounts.map((ea) => ({
    provider: ea.provider,
    identifier: ea.emailAddress ?? ea.providerUserId ?? '',
  }));

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      // Clerk handles account deletion via the Clerk Dashboard or by prompting
      user.delete();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14]">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Account</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">
            Your profile and authentication details
          </p>
        </div>

        {/* Profile Card */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <img
              src={user.imageUrl}
              alt={user.fullName ?? 'User'}
              className="w-16 h-16 ring-2 ring-[rgba(255,255,255,0.1)] flex-shrink-0 object-cover"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.src = '/nox-avatar.svg';
                img.className = 'w-16 h-16 flex-shrink-0 opacity-80';
              }}
            />
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="font-mono text-base text-white font-medium truncate">
                {user.fullName ?? 'Unnamed User'}
              </h2>
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
                      style={{ background: getProviderColor(acct) }}
                    />
                    {getProviderLabel(acct)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Details */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Details</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2.5">
                <User className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                  Display Name
                </span>
              </div>
              <span className="font-sans text-sm text-white">
                {user.fullName ?? <span className="text-[rgba(255,255,255,0.3)]">Not set</span>}
              </span>
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
              <span className="font-mono text-[11px] text-[rgba(255,255,255,0.3)] truncate max-w-[160px]" title={user.id}>
                {user.id}
              </span>
            </div>
          </div>
        </motion.section>

        {/* Linked Accounts */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#5E6AD2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Linked Accounts</h2>
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
                    style={{ background: getProviderColor(acct) + '22', color: getProviderColor(acct) }}
                  >
                    {PROVIDER_ICONS[acct.provider.toLowerCase()]?.icon ?? acct.provider[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs uppercase tracking-wider text-white">
                      {getProviderLabel(acct)}
                    </p>
                    <p className="font-sans text-[11px] text-[rgba(255,255,255,0.35)] truncate">
                      {acct.identifier}
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#5E6AD2] flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Danger Zone */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#16161E] border border-[rgba(255,80,80,0.15)] p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#ff5050]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[#ff5050]">Danger Zone</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.7)]">
                  Sign Out
                </p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.35)] mt-0.5">
                  Log out of your NOX account on this device
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
        </motion.section>
      </div>
    </div>
  );
}
