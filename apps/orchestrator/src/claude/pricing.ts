/**
 * Model pricing configuration
 * Prices are per 1M tokens (input / output)
 * Auto-routed models from OmniRoute use these base rates
 */
export const MODEL_PRICING: Record<string, { input: number; output: number; name: string }> = {
  // GPT-5.4 series (default routing)
  'openai/gpt-5.4': { input: 7.5, output: 37.5, name: 'GPT-5.4' },
  'gpt-5.4': { input: 7.5, output: 37.5, name: 'GPT-5.4' },
  
  // GPT-4o series
  'openai/gpt-4o': { input: 2.5, output: 10.0, name: 'GPT-4o' },
  'gpt-4o': { input: 2.5, output: 10.0, name: 'GPT-4o' },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6, name: 'GPT-4o Mini' },
  'gpt-4o-mini': { input: 0.15, output: 0.6, name: 'GPT-4o Mini' },
  
  // Claude series
  'anthropic/claude-opus-4-6': { input: 15.0, output: 75.0, name: 'Claude Opus 4.6' },
  'claude-opus-4-6': { input: 15.0, output: 75.0, name: 'Claude Opus 4.6' },
  'anthropic/claude-sonnet-4-5': { input: 3.0, output: 15.0, name: 'Claude Sonnet 4.5' },
  'claude-sonnet-4-5': { input: 3.0, output: 15.0, name: 'Claude Sonnet 4.5' },
  'anthropic/claude-haiku-4-5': { input: 0.8, output: 4.0, name: 'Claude Haiku 4.5' },
  'claude-haiku-4-5': { input: 0.8, output: 4.0, name: 'Claude Haiku 4.5' },
  
  // Gemini series
  'google/gemini-2.5-pro': { input: 1.25, output: 7.5, name: 'Gemini 2.5 Pro' },
  'gemini-2.5-pro': { input: 1.25, output: 7.5, name: 'Gemini 2.5 Pro' },
  'google/gemini-2.5-flash': { input: 0.075, output: 0.3, name: 'Gemini 2.5 Flash' },
  'gemini-2.5-flash': { input: 0.075, output: 0.3, name: 'Gemini 2.5 Flash' },
  
  // DeepSeek series
  'deepseek/deepseek-chat': { input: 0.27, output: 1.1, name: 'DeepSeek Chat' },
  'deepseek-chat': { input: 0.27, output: 1.1, name: 'DeepSeek Chat' },
  'deepseek/deepseek-reasoner': { input: 0.55, output: 2.19, name: 'DeepSeek R1' },
  'deepseek-reasoner': { input: 0.55, output: 2.19, name: 'DeepSeek R1' },
  
  // Auto-routed fallback
  'auto/best-coding': { input: 2.5, output: 10.0, name: 'Auto (Best Coding)' },
  
  // Default fallback for unknown models
  '_default': { input: 1.0, output: 5.0, name: 'Unknown' },
};

/**
 * Get pricing for a model, with fallback to default
 */
export function getModelPricing(model: string): { input: number; output: number; name: string } {
  // Try exact match first
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }
  
  // Try matching prefix (e.g., "openai/gpt-5.4-turbo" matches "openai/gpt-5.4")
  for (const key of Object.keys(MODEL_PRICING)) {
    if (model.startsWith(key) && key !== '_default') {
      return MODEL_PRICING[key];
    }
  }
  
  // Fallback to default pricing
  return MODEL_PRICING['_default'];
}

/**
 * Calculate cost based on token counts and model
 */
export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  model: string
): number {
  const pricing = getModelPricing(model);
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return parseFloat((inputCost + outputCost).toFixed(6));
}

/**
 * Format cost as currency string
 */
export function formatCost(usd: number): string {
  if (usd < 0.001) {
    return `$${(usd * 100).toFixed(2)}¢`;
  }
  return `$${usd.toFixed(2)}`;
}

/**
 * Format token count with commas
 */
export function formatTokens(count: number): string {
  return count.toLocaleString();
}
