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
