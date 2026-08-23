'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { CreditCard, TrendingUp, Zap, AlertCircle, CheckCircle2, XCircle, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchOrg, fetchUsage } from '@/lib/api';

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

function formatCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(2)}`;
}

export default function BillingPage() {
  const { data: org, isLoading: orgLoading } = useSWR('org', fetchOrg, { revalidateOnFocus: false });
  const { data: usage, isLoading: usageLoading } = useSWR('usage', fetchUsage, { revalidateOnFocus: false });

  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'trend'>('overview');

  const currentPlan = PLANS.find((p) => p.tier === org?.planTier) ?? PLANS[0];
  const usagePercent = org?.monthlyActionLimit
    ? Math.min(100, Math.round((org.monthlyActionCount / org.monthlyActionLimit) * 100))
    : 0;
  const isNearLimit = usagePercent >= 80;
  const costPercent = usage?.limits?.monthlyCostCap
    ? Math.min(100, Math.round((usage.totalCostUsd / usage.limits.monthlyCostCap) * 100))
    : 0;
  const isNearCostCap = costPercent >= 80;
  const totalTokens = (usage?.totalTokensIn || 0) + (usage?.totalTokensOut || 0);

  const maxDailyCost = usage?.dailyTrend?.length
    ? Math.max(...usage.dailyTrend.map((d: any) => d.costUsd), 0.01)
    : 1;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0F0F14] dark:bg-[#0F0F14] light:bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-white dark:text-white light:text-gray-900">Billing</h1>
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-1">
              Manage your plan, usage, and costs
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.3)] rounded-full">
            <Zap className="w-3 h-3 text-[#5E6AD2]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#5E6AD2]">
              {usage?.plan === 'starter' || usage?.plan === 'free' ? 'Starter Plan' : `${usage?.plan?.toUpperCase()} Plan`}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 p-1 w-fit">
          {(['overview', 'breakdown', 'trend'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider rounded transition-colors ${
                activeTab === tab
                  ? 'bg-[#5E6AD2] text-white'
                  : 'text-[rgba(255,255,255,0.4)] hover:text-white/70'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {orgLoading || usageLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {/* ─── Overview Tab ─── */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        label: 'Total Spend',
                        value: formatCost(usage?.totalCostUsd || 0),
                        sub: 'last 30 days',
                        icon: CreditCard,
                        color: 'text-[#5E6AD2]',
                        bg: 'bg-[rgba(94,106,210,0.08)]',
                      },
                      {
                        label: 'Tokens Used',
                        value: formatNumber(totalTokens),
                        sub: `${formatNumber(usage?.totalTokensOut || 0)} out`,
                        icon: Hash,
                        color: 'text-[#22c55e]',
                        bg: 'bg-[rgba(34,197,94,0.08)]',
                      },
                      {
                        label: 'Messages',
                        value: formatNumber(usage?.totalMessages || 0),
                        sub: `${usage?.messagesLast7Days || 0} this week`,
                        icon: TrendingUp,
                        color: 'text-[#f59e0b]',
                        bg: 'bg-[rgba(245,158,11,0.08)]',
                      },
                      {
                        label: 'Conversations',
                        value: usage?.activeConversations || 0,
                        sub: 'active threads',
                        icon: Zap,
                        color: 'text-[#ec4899]',
                        bg: 'bg-[rgba(236,72,153,0.08)]',
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className={`bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-4`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                          <card.icon className={`w-4 h-4 ${card.color}`} />
                        </div>
                        <p className={`font-mono text-lg font-medium text-white dark:text-white light:text-gray-900`}>{card.value}</p>
                        <p className="font-sans text-[10px] text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mt-0.5">{card.label}</p>
                        <p className="font-mono text-[9px] text-[rgba(255,255,255,0.2)] dark:text-[rgba(255,255,255,0.2)] light:text-gray-400 mt-1">{card.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Cost Cap Progress */}
                  <div className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-400" />
                        <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)] dark:text-[rgba(255,255,255,0.6)] light:text-gray-600">
                          Monthly Cost Cap
                        </span>
                      </div>
                      <span className={`font-mono text-sm ${costPercent >= 100 ? 'text-[#ef4444]' : costPercent >= 80 ? 'text-[#f59e0b]' : 'text-white dark:text-white light:text-gray-900'}`}>
                        {formatCost(usage?.totalCostUsd || 0)} / {formatCost(usage?.limits?.monthlyCostCap || 20)}
                      </span>
                    </div>
                    <div className="h-2 bg-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.06)] light:bg-gray-200 overflow-hidden rounded-full">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(costPercent, 100)}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className={`h-full rounded-full ${
                          costPercent >= 100 ? 'bg-[#ef4444]' : costPercent >= 80 ? 'bg-[#f59e0b]' : 'bg-[#5E6AD2]'
                        }`}
                      />
                    </div>
                    {isNearCostCap && (
                      <div className="flex items-center gap-2 mt-3">
                        <AlertCircle className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
                        <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] dark:text-[rgba(255,255,255,0.5)] light:text-gray-600">
                          You are approaching your monthly cost cap. Upgrade to continue.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Limit Progress */}
                  <div className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-400" />
                        <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)] dark:text-[rgba(255,255,255,0.6)] light:text-gray-600">
                          Monthly Actions
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
                          Approaching action limit. Upgrade to continue.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Current Plan Card */}
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
                          {' \u00b7 '}
                          {currentPlan.actions === Infinity ? 'Unlimited AI actions' : `${formatNumber(currentPlan.actions)} AI actions/month`}
                        </p>
                      </div>
                      <CreditCard className="w-5 h-5 text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-400" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── Breakdown Tab ─── */}
              {activeTab === 'breakdown' && (
                <motion.div
                  key="breakdown"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  {/* Model Breakdown */}
                  <div className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-5">
                    <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mb-4">
                      Usage by Model
                    </h2>
                    {(usage?.modelBreakdown?.length || 0) > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[rgba(255,255,255,0.06)] dark:border-[rgba(255,255,255,0.06)] light:border-gray-200">
                              <th className="text-left font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-400 py-2 pr-4">Model</th>
                              <th className="text-right font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-400 py-2 px-4">Tokens In</th>
                              <th className="text-right font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-400 py-2 px-4">Tokens Out</th>
                              <th className="text-right font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-400 py-2 pl-4">Calls</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usage.modelBreakdown.map((m: any, i: number) => (
                              <tr key={m.model} className="border-b border-[rgba(255,255,255,0.04)] dark:border-[rgba(255,255,255,0.04)] light:border-gray-100 hover:bg-[rgba(255,255,255,0.02)] dark:hover:bg-[rgba(255,255,255,0.02)] light:hover:bg-gray-50 transition-colors">
                                <td className="py-3 pr-4">
                                  <span className="font-mono text-xs text-white dark:text-white light:text-gray-900">{m.model}</span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="font-mono text-xs text-[rgba(255,255,255,0.5)] dark:text-[rgba(255,255,255,0.5)] light:text-gray-500">{formatNumber(m.tokensIn)}</span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="font-mono text-xs text-[rgba(255,255,255,0.5)] dark:text-[rgba(255,255,255,0.5)] light:text-gray-500">{formatNumber(m.tokensOut)}</span>
                                </td>
                                <td className="py-3 pl-4 text-right">
                                  <span className="font-mono text-xs text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-400">{m.entries}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-[rgba(255,255,255,0.08)] dark:border-[rgba(255,255,255,0.08)] light:border-gray-200">
                              <td className="py-3 pr-4">
                                <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)] dark:text-[rgba(255,255,255,0.6)] light:text-gray-600">Total</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="font-mono text-xs text-white dark:text-white light:text-gray-900">{formatNumber(usage?.totalTokensIn || 0)}</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="font-mono text-xs text-white dark:text-white light:text-gray-900">{formatNumber(usage?.totalTokensOut || 0)}</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="font-mono text-xs text-[rgba(255,255,255,0.5)] dark:text-[rgba(255,255,255,0.5)] light:text-gray-500">
                                  {usage?.totalTokensOut || 0}
                                </span>
                              </td>
                              <td className="py-3 pl-4 text-right">
                                <span className="font-mono text-xs text-[rgba(255,255,255,0.5)] dark:text-[rgba(255,255,255,0.5)] light:text-gray-500">
                                  {usage?.modelBreakdown?.reduce((sum: number, m: any) => sum + m.entries, 0) || 0}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Hash className="w-8 h-8 text-[rgba(255,255,255,0.15)] dark:text-[rgba(255,255,255,0.15)] light:text-gray-300 mx-auto mb-3" />
                        <p className="font-mono text-xs text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-500">No usage data yet</p>
                        <p className="font-sans text-xs text-[rgba(255,255,255,0.2)] dark:text-[rgba(255,255,255,0.2)] light:text-gray-400 mt-1">Send a message to start tracking usage</p>
                      </div>
                    )}
                  </div>

                  {/* Cost Details */}
                  <div className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-5">
                    <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mb-4">
                      Usage Summary
                    </h2>
                    <div className="space-y-3">
                      {[
                        { label: 'Total Messages (30d)', value: usage?.totalMessages || 0 },
                        { label: 'Avg Per Conversation', value: formatNumber(
                          (usage?.activeConversations || 1) > 0
                            ? (usage?.totalMessages || 0) / (usage?.activeConversations || 1)
                            : 0
                        )},
                        { label: 'Tokens In', value: formatNumber(usage?.totalTokensIn || 0) },
                        { label: 'Tokens Out', value: formatNumber(usage?.totalTokensOut || 0) },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)] dark:border-[rgba(255,255,255,0.04)] light:border-gray-100 last:border-0">
                          <span className="font-sans text-xs text-[rgba(255,255,255,0.5)] dark:text-[rgba(255,255,255,0.5)] light:text-gray-500">{item.label}</span>
                          <span className="font-mono text-xs text-white dark:text-white light:text-gray-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="font-sans text-[10px] text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-500 mt-3">
                      All AI usage included in your subscription
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ─── Trend Tab ─── */}
              {activeTab === 'trend' && (
                <motion.div
                  key="trend"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  {/* Daily Spending Chart */}
                  <div className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500">
                        Daily Spending (30 Days)
                      </h2>
                      <span className="font-mono text-xs text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-400">
                        Max: {formatCost(maxDailyCost)}
                      </span>
                    </div>
                    {(usage?.dailyTrend?.length || 0) > 0 ? (
                      <div className="flex items-end gap-1 h-40">
                        {usage.dailyTrend.map((d: any, i: number) => {
                          const height = Math.max(4, (d.costUsd / maxDailyCost) * 100);
                          const isToday = d.day === new Date().toISOString().split('T')[0];
                          return (
                            <div
                              key={d.day}
                              className="flex-1 flex flex-col items-center gap-1 group relative"
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                <div className="bg-[#1e1e2e] dark:bg-[#1e1e2e] light:bg-gray-800 border border-[rgba(255,255,255,0.1)] dark:border-[rgba(255,255,255,0.1)] light:border-gray-600 rounded px-2 py-1.5 whitespace-nowrap">
                                  <p className="font-mono text-[10px] text-[rgba(255,255,255,0.6)] dark:text-[rgba(255,255,255,0.6)] light:text-gray-300">{d.day}</p>
                                  <p className="font-mono text-[10px] text-[#5E6AD2]">{formatCost(d.costUsd)}</p>
                                  <p className="font-mono text-[9px] text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-500">{formatNumber(d.tokensOut)} tokens</p>
                                </div>
                              </div>
                              <div
                                className={`w-full rounded-t transition-all duration-200 ${
                                  isToday
                                    ? 'bg-[#5E6AD2]'
                                    : d.costUsd > 0
                                    ? 'bg-[rgba(94,106,210,0.6)] hover:bg-[rgba(94,106,210,0.8)]'
                                    : 'bg-[rgba(255,255,255,0.05)] dark:bg-[rgba(255,255,255,0.05)] light:bg-gray-200'
                                }`}
                                style={{ height: `${height}%`, minHeight: '2px' }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-40">
                        <div className="text-center">
                          <TrendingUp className="w-8 h-8 text-[rgba(255,255,255,0.15)] dark:text-[rgba(255,255,255,0.15)] light:text-gray-300 mx-auto mb-3" />
                          <p className="font-mono text-xs text-[rgba(255,255,255,0.3)] dark:text-[rgba(255,255,255,0.3)] light:text-gray-500">No spending data yet</p>
                          <p className="font-sans text-xs text-[rgba(255,255,255,0.2)] dark:text-[rgba(255,255,255,0.2)] light:text-gray-400 mt-1">Usage will appear here after your first conversation</p>
                        </div>
                      </div>
                    )}
                    {/* X-axis labels */}
                    <div className="flex justify-between mt-2">
                      <span className="font-mono text-[9px] text-[rgba(255,255,255,0.2)] dark:text-[rgba(255,255,255,0.2)] light:text-gray-400">30d ago</span>
                      <span className="font-mono text-[9px] text-[rgba(255,255,255,0.2)] dark:text-[rgba(255,255,255,0.2)] light:text-gray-400">Today</span>
                    </div>
                  </div>

                  {/* Token Trend */}
                  <div className="bg-[#16161E] dark:bg-[#16161E] light:bg-white light:border light:border-gray-200 border border-[rgba(255,255,255,0.08)] p-5">
                    <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-[rgba(255,255,255,0.4)] dark:text-[rgba(255,255,255,0.4)] light:text-gray-500 mb-4">
                      Daily Token Output
                    </h2>
                    {(usage?.dailyTrend?.length || 0) > 0 ? (
                      <div className="flex items-end gap-1 h-32">
                        {usage.dailyTrend.map((d: any) => {
                          const maxTokens = Math.max(...usage.dailyTrend.map((t: any) => t.tokensOut || 1), 1);
                          const height = Math.max(4, (d.tokensOut / maxTokens) * 100);
                          return (
                            <div key={`tok-${d.day}`} className="flex-1 group relative">
                              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                <div className="bg-[#1e1e2e] dark:bg-[#1e1e2e] light:bg-gray-800 border border-[rgba(255,255,255,0.1)] dark:border-[rgba(255,255,255,0.1)] light:border-gray-600 rounded px-2 py-1.5 whitespace-nowrap">
                                  <p className="font-mono text-[10px] text-[rgba(255,255,255,0.6)] dark:text-[rgba(255,255,255,0.6)] light:text-gray-300">{d.day}</p>
                                  <p className="font-mono text-[10px] text-[#22c55e]">{formatNumber(d.tokensOut)} out</p>
                                </div>
                              </div>
                              <div
                                className="w-full bg-[rgba(34,197,94,0.4)] hover:bg-[rgba(34,197,94,0.7)] rounded-t transition-all duration-200"
                                style={{ height: `${height}%`, minHeight: '2px' }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32">
                        <p className="font-mono text-xs text-[rgba(255,255,255,0.2)] dark:text-[rgba(255,255,255,0.2)] light:text-gray-400">No token data yet</p>
                      </div>
                    )}
                    <div className="flex justify-between mt-2">
                      <span className="font-mono text-[9px] text-[rgba(255,255,255,0.2)] dark:text-[rgba(255,255,255,0.2)] light:text-gray-400">30d ago</span>
                      <span className="font-mono text-[9px] text-[rgba(255,255,255,0.2)] dark:text-[rgba(255,255,255,0.2)] light:text-gray-400">Today</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                        {plan.tier === 'starter' ? 'Downgrade' : 'Upgrade'}
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
