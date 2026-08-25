/**
 * Subscription Pricing Configuration
 * 
 * All AI usage is INCLUDED in the monthly subscription.
 * OmniRoute is free for you, so there's no per-token cost.
 * 
 * To change plan prices, edit the PLANS config below.
 */

export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  servers: number;
  actions: number;
  color: string;
  border: string;
  bg: string;
  highlighted?: boolean;
  features: Feature[];
}

export interface Feature {
  name: string;
  included: boolean;
}

// ─── Subscription Plans ───────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    period: '/month',
    description: 'Perfect for trying out NOX',
    servers: 1,
    actions: 100,
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
    id: 'pro',
    name: 'Pro',
    price: 19,
    period: '/month',
    description: 'For serious FiveM developers',
    servers: 5,
    actions: 1000,
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
    id: 'enterprise',
    name: 'Enterprise',
    price: 49,
    period: '/month',
    description: 'For teams and agencies',
    servers: Infinity,
    actions: Infinity,
    color: 'text-[#22c55e]',
    border: 'border-[rgba(34,197,94,0.5)]',
    bg: 'bg-[rgba(34,197,94,0.08)]',
    features: [
      { name: 'Unlimited Servers', included: true },
      { name: 'Unlimited AI actions', included: true },
      { name: 'All AI models', included: true },
      { name: '24/7 support', included: true },
      { name: 'Custom AI models', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Team collaboration', included: true },
      { name: 'Dedicated account manager', included: true },
    ],
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Get plan by ID
 */
export function getPlan(planId: string): Plan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId);
}

/**
 * Get all plans
 */
export function getAllPlans(): Plan[] {
  return SUBSCRIPTION_PLANS;
}

/**
 * Check if plan has unlimited servers
 */
export function isUnlimitedServers(planId: string): boolean {
  const plan = getPlan(planId);
  return plan?.servers === Infinity;
}

/**
 * Check if plan has unlimited actions
 */
export function isUnlimitedActions(planId: string): boolean {
  const plan = getPlan(planId);
  return plan?.actions === Infinity;
}

// ─── Token Cost Estimation ────────────────────────────────────────────────────
//
// Subscription plans bundle AI usage, but the platform still enforces org-level
// cost caps (Organization.monthly_cost_cap_usd / conversation_cost_cap_usd), so
// every usage row needs a real dollar estimate derived from token counts.

interface ModelRate {
  /** USD per 1M input tokens. */
  inUsdPerMTok: number;
  /** USD per 1M output tokens. */
  outUsdPerMTok: number;
}

/**
 * Static rates for well-known upstream models (USD per 1M tokens). Models not
 * listed here — including the platform's 'Noxes AI' OmniRoute entry — fall
 * back to {@link getDefaultModelRate}.
 */
const STATIC_MODEL_RATES: Record<string, ModelRate> = {
  'gpt-4o': { inUsdPerMTok: 2.5, outUsdPerMTok: 10 },
  'gpt-4o-mini': { inUsdPerMTok: 0.15, outUsdPerMTok: 0.6 },
  'claude-3-5-sonnet': { inUsdPerMTok: 3, outUsdPerMTok: 15 },
  'claude-3-5-haiku': { inUsdPerMTok: 0.8, outUsdPerMTok: 4 },
};

/**
 * Conservative placeholder rate for the 'Noxes AI' default model and any other
 * unmapped model. Env-tunable so ops can true it up against the actual
 * OmniRoute backend without a deploy:
 *   AI_COST_PER_MTOK_IN  (default 3.00)
 *   AI_COST_PER_MTOK_OUT (default 15.00)
 * Read at call time (not import time) so tests and runtime toggles see fresh
 * values.
 */
export function getDefaultModelRate(): ModelRate {
  const parse = (raw: string | undefined, fallback: number): number => {
    const n = parseFloat(raw || '');
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return {
    inUsdPerMTok: parse(process.env.AI_COST_PER_MTOK_IN, 3.0),
    outUsdPerMTok: parse(process.env.AI_COST_PER_MTOK_OUT, 15.0),
  };
}

export function getModelRate(model: string): ModelRate {
  return STATIC_MODEL_RATES[String(model || '').toLowerCase()] ?? getDefaultModelRate();
}

/**
 * Estimate the USD cost of one LLM call from token counts. Rounded to 6
 * decimal places — matches the precision stored in Usage.costUsd.
 */
export function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const rate = getModelRate(model);
  const inTok = Number.isFinite(tokensIn) && tokensIn > 0 ? tokensIn : 0;
  const outTok = Number.isFinite(tokensOut) && tokensOut > 0 ? tokensOut : 0;
  const usd = (inTok / 1_000_000) * rate.inUsdPerMTok + (outTok / 1_000_000) * rate.outUsdPerMTok;
  return Math.round(usd * 1e6) / 1e6;
}
