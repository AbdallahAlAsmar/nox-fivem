'use client'

import { useState, useEffect } from 'react'
import { CreditCard, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchOrg } from '../api'

const PLANS = [
  { tier: 'starter', name: 'Starter', price: '$0', period: '/month', actions: 100, servers: 1, color: 'text-white', border: 'border-[rgba(255,255,255,0.15)]', bg: 'bg-[rgba(255,255,255,0.04)]' },
  { tier: 'pro', name: 'Pro', price: '$19', period: '/month', actions: 1000, servers: 5, color: 'text-[#3DFFA2]', border: 'border-[rgba(61,255,162,0.5)]', bg: 'bg-[rgba(94,106,210,0.1)]', highlighted: true },
  { tier: 'enterprise', name: 'Enterprise', price: '$49', period: '/month', actions: Infinity, servers: Infinity, color: 'text-white', border: 'border-[rgba(255,255,255,0.15)]', bg: 'bg-[rgba(255,255,255,0.04)]' },
]

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

export default function BillingPage() {
  const [org, setOrg] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchOrg()
      .then(d => { if (!cancelled) setOrg(d) })
      .catch(() => { if (!cancelled) setOrg(null) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const currentPlan = PLANS.find((p) => p.tier === org?.planTier) ?? PLANS[0]
  const usagePercent = org?.monthlyActionLimit ? Math.min(100, Math.round((org.monthlyActionCount / org.monthlyActionLimit) * 100)) : 0
  const isNearLimit = usagePercent >= 80

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F0F14] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Billing</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">Manage your plan and usage</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] h-24 animate-pulse" />)}
          </div>
        ) : org ? (
          <>
            {/* Current plan card */}
            <div className={`bg-[#16161E] border ${currentPlan.border} p-6`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono text-xs uppercase tracking-wider ${currentPlan.color}`}>{currentPlan.name}</span>
                    {currentPlan.highlighted && (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[rgba(94,106,210,0.2)] border border-[rgba(94,106,210,0.4)] text-[#3DFFA2]">Current</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="font-mono text-3xl font-medium text-white">{currentPlan.price}</span>
                    <span className="font-mono text-sm text-[rgba(255,255,255,0.4)]">{currentPlan.period}</span>
                  </div>
                  <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-2">
                    {currentPlan.servers === Infinity ? 'Unlimited servers' : `${currentPlan.servers} server${currentPlan.servers > 1 ? 's' : ''} included`}
                    {' · '}
                    {currentPlan.actions === Infinity ? 'Unlimited AI actions' : `${formatNumber(currentPlan.actions)} AI actions/month`}
                  </p>
                </div>
                <CreditCard className="w-5 h-5 text-[rgba(255,255,255,0.3)]" />
              </div>
            </div>

            {/* Usage */}
            <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[rgba(255,255,255,0.4)]" />
                  <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)]">Monthly Usage</span>
                </div>
                <span className={`font-mono text-sm ${isNearLimit ? 'text-[#f59e0b]' : 'text-white'}`}>
                  {org.monthlyActionCount} / {org.monthlyActionLimit ?? '∞'}
                </span>
              </div>
              <div className="h-2 bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full ${isNearLimit ? 'bg-[#f59e0b]' : 'bg-[#3DFFA2]'}`}
                />
              </div>
              {isNearLimit && (
                <div className="flex items-center gap-2 mt-3">
                  <AlertCircle className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
                  <p className="font-sans text-xs text-[rgba(255,255,255,0.5)]">You are approaching your action limit. Upgrade to Pro or Enterprise to continue.</p>
                </div>
              )}
            </div>

            {/* Plan comparison */}
            <div>
              <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[rgba(255,255,255,0.4)] mb-3">All Plans</h2>
              <div className="grid gap-3">
                {PLANS.map((plan) => (
                  <div key={plan.tier} className={`bg-[#16161E] border p-5 ${plan.highlighted ? plan.border : 'border-[rgba(255,255,255,0.08)]'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-xs uppercase tracking-wider ${plan.color}`}>{plan.name}</span>
                        {plan.highlighted && (
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[rgba(94,106,210,0.2)] border border-[rgba(94,106,210,0.4)] text-[#3DFFA2]">Recommended</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-xl font-medium text-white">{plan.price}</span>
                        <span className="font-mono text-xs text-[rgba(255,255,255,0.4)]">{plan.period}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Servers', value: plan.servers === Infinity ? 'Unlimited' : `${plan.servers}` },
                        { label: 'AI Actions', value: plan.actions === Infinity ? 'Unlimited' : formatNumber(plan.actions) },
                        { label: 'Support', value: plan.tier === 'enterprise' ? '24/7' : plan.tier === 'pro' ? 'Priority' : 'Community' },
                      ].map((feat) => (
                        <div key={feat.label} className="flex items-center justify-between">
                          <span className="font-sans text-xs text-[rgba(255,255,255,0.5)]">{feat.label}</span>
                          <span className="font-mono text-xs text-white">{feat.value}</span>
                        </div>
                      ))}
                    </div>
                    {plan.tier !== org.planTier && (
                      <button className="mt-4 w-full py-2 font-mono text-xs uppercase tracking-wider border border-[rgba(255,255,255,0.15)] text-white hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100">
                        {plan.tier === 'starter' ? 'Downgrade' : 'Upgrade'}
                      </button>
                    )}
                    {plan.tier === org.planTier && (
                      <div className="mt-4 flex items-center gap-2 font-mono text-xs text-[#22c55e]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Current plan</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-[#16161E] border border-[rgba(255,255,255,0.08)]">
            <AlertCircle className="w-10 h-10 text-[rgba(255,255,255,0.2)] mx-auto mb-4" />
            <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-2">No billing data</h3>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">Contact support to set up your billing account.</p>
          </div>
        )}
      </div>
    </div>
  )
}
