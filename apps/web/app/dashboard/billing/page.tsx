'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { CreditCard, TrendingUp, Zap, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchOrg } from '@/lib/api';

const PLANS = [
  {
    tier: 'starter',
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'Perfect for trying out NOX',
    servers: 1,
    actions: 100,
    aiModels: 'Basic models',
    support: 'Community',
    color: 'text-white',
    border: 'border-[rgba(255,255,255,0.15)]',
    bg: 'bg-[rgba(255,255,255,0.02)]',
    features: [
      { name: '1 Server', included: true },
      { name: '100 AI actions/month', included: true },
      { name: 'Basic AI models', included: true },
      { name: 'Community support', included: true },
      { name: 'Unlimited servers', included: false },
      { name: 'Priority support', included: false },
      { name: 'Custom AI models', included: false },
      { name: '24/7 support', included: false },
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For serious FiveM developers',
    servers: 5,
    actions: 1000,
    aiModels: 'All models',
    support: 'Priority',
    color: 'text-[#5E6AD2]',
    border: 'border-[rgba(94,106,210,0.5)]',
    bg: 'bg-[rgba(94,106,210,0.08)]',
    highlighted: true,
    features: [
      { name: '5 Servers', included: true },
      { name: '1,000 AI actions/month', included: true },
      { name: 'All AI models', included: true },
      { name: 'Priority support', included: true },
      { name: 'Unlimited servers', included: false },
      { name: 'Custom AI models', included: false },
      { name: '24/7 support', included: false },
      { name: 'Advanced analytics', included: false },
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: '$49',
    period: '/month',
    description: 'For teams and agencies',
    servers: Infinity,
    actions: Infinity,
    aiModels: 'All + Custom',
    support: '24/7',
    color: 'text-white',
    border: 'border-[rgba(255,255,255,0.15)]',
    bg: 'bg-[rgba(255,255,255,0.02)]',
    features: [
      { name: 'Unlimited Servers', included: true },
      { name: 'Unlimited AI actions', included: true },
      { name: 'All AI models', included: true },
      { name: 'Custom AI models', included: true },
      { name: '24/7 Priority support', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Team collaboration', included: true },
      { name: 'Dedicated account manager', included: true },
    ],
  },
];

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default function BillingPage() {
  const { data: org, isLoading } = useSWR('org', fetchOrg, {
    revalidateOnFocus: false,
  });

  const currentPlan = PLANS.find((p) => p.tier === org?.planTier) ?? PLANS[0];
  const usagePercent = org?.monthlyActionLimit
    ? Math.min(100, Math.round((org.monthlyActionCount / org.monthlyActionLimit) * 100))
    : 0;
  const isNearLimit = usagePercent >= 80;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F0F14] dark:bg-[#0F0F14] light:bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white dark:text-white light:text-gray-900">Billing</h1>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-1">
            Manage your plan and usage
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Current plan card */}
            <div className={`bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border ${currentPlan.border} p-6`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono text-xs uppercase tracking-wider ${currentPlan.color}`}>
                      {currentPlan.name}
                    </span>
                    {currentPlan.highlighted && (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[rgba(94,106,210,0.2)] border border-[rgba(94,106,210,0.4)] text-[#5E6AD2]">
                        Recommended
                      </span>
                    )}
                    {org?.planTier === currentPlan.tier && (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[rgba(34,197,94,0.2)] border border-[rgba(34,197,94,0.4)] text-[#22c55e]">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="font-mono text-3xl font-medium text-white dark:text-white light:text-gray-900">{currentPlan.price}</span>
                    <span className="font-mono text-sm text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500">{currentPlan.period}</span>
                  </div>
                  <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-2">
                    {currentPlan.servers === Infinity ? 'Unlimited servers' : `${currentPlan.servers} server${currentPlan.servers > 1 ? 's' : ''} included`}
                    {' · '}
                    {currentPlan.actions === Infinity ? 'Unlimited AI actions' : `${formatNumber(currentPlan.actions)} AI actions/month`}
                  </p>
                </div>
                <CreditCard className="w-5 h-5 text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-400" />
              </div>
            </div>

            {/* Usage */}
            <div className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-400" />
                  <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)] dark:text-[rgba(255,255,255,0.6)] light:text-gray-600">
                    Monthly Usage
                  </span>
                </div>
                <span className={`font-mono text-sm ${isNearLimit ? 'text-[#f59e0b]' : 'text-white dark:text-white light:text-gray-900'}`}>
                  {org?.monthlyActionCount ?? 0} / {org?.monthlyActionLimit ?? '∞'}
                </span>
              </div>

              <div className="h-2 bg-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.06)] light:bg-gray-200 overflow-hidden rounded-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full ${isNearLimit ? 'bg-[#f59e0b]' : 'bg-[#5E6AD2]'}`}
                />
              </div>

              {isNearLimit && (
                <div className="flex items-center gap-2 mt-3">
                  <AlertCircle className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
                  <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] dark:text-[rgba(255,255,255,0.5)] light:text-gray-600">
                    You are approaching your action limit. Upgrade to continue.
                  </p>
                </div>
              )}
            </div>

            {/* Plan comparison */}
            <div>
              <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mb-4">
                Compare Plans
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {PLANS.map((plan) => (
                  <motion.div
                    key={plan.tier}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: PLANS.indexOf(plan) * 0.05 }}
                    className={`bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border p-5 flex flex-col ${
                      plan.highlighted
                        ? plan.border
                        : 'border-[rgba(255,255,255,0.08)] dark:border-[rgba(255,255,255,0.08)] light:border-gray-200'
                    }`}
                  >
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-mono text-xs uppercase tracking-wider ${plan.color}`}>
                          {plan.name}
                        </span>
                        {plan.highlighted && (
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[rgba(94,106,210,0.2)] border border-[rgba(94,106,210,0.4)] text-[#5E6AD2]">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-2xl font-medium text-white dark:text-white light:text-gray-900">{plan.price}</span>
                        <span className="font-mono text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500">{plan.period}</span>
                      </div>
                      <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-1">
                        {plan.description}
                      </p>
                    </div>

                    <div className="space-y-2 flex-1">
                      {plan.features.map((feat) => (
                        <div key={feat.name} className="flex items-center gap-2">
                          {feat.included ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-[rgba(255,255,255,0.2)] dark:text-[rgba(255,255,255,0.2)] light:text-gray-300 flex-shrink-0" />
                          )}
                          <span className={`font-sans text-xs ${feat.included ? 'text-white dark:text-white light:text-gray-900' : 'text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-400'}`}>
                            {feat.name}
                          </span>
                        </div>
                      ))}
                    </div>

                    {org?.planTier !== plan.tier && (
                      <button className="mt-4 w-full py-2 font-mono text-xs uppercase tracking-wider border border-[rgba(255,255,255,0.15)] dark:border-[rgba(255,255,255,0.15)] light:border-gray-300 text-white dark:text-white light:text-gray-900 hover:bg-[rgba(255,255,255,0.04)] dark:hover:bg-[rgba(255,255,255,0.04)] light:hover:bg-gray-100 transition-colors duration-100">
                        {plan.tier === 'starter' ? 'Downgrade' : plan.tier === 'pro' ? 'Upgrade' : 'Upgrade'}
                      </button>
                    )}
                    {org?.planTier === plan.tier && (
                      <div className="mt-4 flex items-center gap-2 font-mono text-xs text-[#22c55e]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Current plan</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
