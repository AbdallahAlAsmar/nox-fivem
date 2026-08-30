'use client'

import { useState, useEffect } from 'react'
import {
  User, Mail, Calendar, LogOut, Shield, Key,
  CreditCard,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useClerk as useClerkCore, useUser } from '@clerk/clerk-react'
import * as api from '../api'

export default function AccountPage() {
  // Real Clerk hooks: signOut actually terminates the session (the old local
  // ClerkContext provider was never mounted, making Sign Out a no-op).
  const { signOut } = useClerkCore()
  const { user: clerkUser, isLoaded } = useUser()
  const [org, setOrg] = useState<any>(null)
  const [orgLoading, setOrgLoading] = useState(true)

  useEffect(() => {
    api.fetchOrg()
      .then(d => setOrg(d))
      .catch(() => setOrg(null))
      .finally(() => setOrgLoading(false))
  }, [])

  const handleLogout = () => {
    signOut()
  }

  const user = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
    name: clerkUser.fullName ?? clerkUser.username ?? clerkUser.id,
  } : null

  const primaryEmail = user?.email || ''
  const createdAt = '—'

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F14]">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Account</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">Your profile and authentication details</p>
        </div>

        {/* Profile Card */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 flex-shrink-0 bg-[rgba(61,255,162,0.15)] border border-[rgba(61,255,162,0.3)] flex items-center justify-center">
              <User className="w-7 h-7 text-[#3DFFA2]" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="font-mono text-base text-white font-medium truncate">{user?.name || (isLoaded ? 'Unnamed User' : 'Loading…')}</h2>
              <p className="font-sans text-sm text-[rgba(255,255,255,0.4)] mt-0.5 truncate">{primaryEmail || (isLoaded ? '' : '…')}</p>
            </div>
          </div>
        </motion.section>

        {/* Details */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#3DFFA2]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Details</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2.5">
                <User className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Display Name</span>
              </div>
              <span className="font-sans text-sm text-white">{user?.name || <span className="text-[rgba(255,255,255,0.3)]">Not set</span>}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Email</span>
              </div>
              <span className="font-sans text-sm text-white truncate max-w-[200px]">{primaryEmail}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Joined</span>
              </div>
              <span className="font-sans text-sm text-[rgba(255,255,255,0.6)]">{createdAt}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5">
                <Key className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">User ID</span>
              </div>
              <span className="font-mono text-[11px] text-[rgba(255,255,255,0.3)] truncate max-w-[160px]" title={clerkUser?.id || ''}>{clerkUser?.id || '—'}</span>
            </div>
          </div>
        </motion.section>

        {/* Billing Summary */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#3DFFA2]" />
              <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white">Billing</h2>
            </div>
            <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
              {orgLoading ? 'loading…' : 'Free Plan'}
            </span>
          </div>
          {orgLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-3 bg-[rgba(255,255,255,0.06)] animate-pulse rounded" />)}
            </div>
          ) : org ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Current Plan</span>
                <span className="font-mono text-sm text-white capitalize">{org.planTier || 'starter'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Monthly Usage</span>
                <span className="font-mono text-sm text-white">{org.monthlyActionCount || 0} / {org.monthlyActionLimit || '∞'} actions</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Servers</span>
                <span className="font-mono text-sm text-white">{org.serverCount || 0} / 1</span>
              </div>
            </div>
          ) : (
            <p className="font-sans text-xs text-[rgba(255,255,255,0.3)]">No billing data available</p>
          )}
        </motion.section>

        {/* Danger Zone */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#16161E] border border-[rgba(255,80,80,0.15)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#ff5050]" />
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[#ff5050]">Danger Zone</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.7)]">Sign Out</p>
                <p className="font-sans text-xs text-[rgba(255,255,255,0.35)] mt-0.5">Log out of your NOX account on this device</p>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,80,80,0.4)] hover:text-white transition-colors duration-100">
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
