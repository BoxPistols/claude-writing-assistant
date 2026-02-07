// 利用可能なモデル（料金: USD per 1M tokens）
// speed: 1-5 (5が最速), quality: 1-5 (5が最高品質)
export const PROVIDERS = {
  openai: { name: 'OpenAI', envKey: 'OPENAI_API_KEY' },
  anthropic: { name: 'Anthropic', envKey: 'ANTHROPIC_API_KEY' },
  gemini: { name: 'Google Gemini', envKey: 'GEMINI_API_KEY' },
};

export const AVAILABLE_MODELS = [
  // OpenAI — nano/mini を優先
  { id: 'gpt-4.1-nano', provider: 'openai', name: 'GPT-4.1 Nano', description: '最速・最安', inputPrice: 0.10, outputPrice: 0.40, speed: 5, quality: 2 },
  { id: 'gpt-4.1-mini', provider: 'openai', name: 'GPT-4.1 Mini', description: 'バランス型', inputPrice: 0.40, outputPrice: 1.60, speed: 4, quality: 3 },
  { id: 'gpt-4o-mini', provider: 'openai', name: 'GPT-4o Mini', description: '高速マルチモーダル', inputPrice: 0.15, outputPrice: 0.60, speed: 5, quality: 3 },

  // Anthropic
  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', name: 'Claude 4.5 Haiku', description: '最速・最安', inputPrice: 0.80, outputPrice: 4.00, speed: 5, quality: 3 },
  { id: 'claude-sonnet-4-5-20250929', provider: 'anthropic', name: 'Claude 4.5 Sonnet', description: 'バランス型', inputPrice: 3.00, outputPrice: 15.00, speed: 3, quality: 4 },

  // Google Gemini
  { id: 'gemini-2.5-flash-lite', provider: 'gemini', name: 'Gemini 2.5 Flash Lite', description: '最速・最安', inputPrice: 0.00, outputPrice: 0.00, speed: 5, quality: 2 },
  { id: 'gemini-2.5-flash', provider: 'gemini', name: 'Gemini 2.5 Flash', description: 'バランス型', inputPrice: 0.10, outputPrice: 0.40, speed: 4, quality: 3 },
];

export const DEFAULT_MODEL_ID = 'gpt-4.1-nano';

export const getModel = (id) => AVAILABLE_MODELS.find((m) => m.id === id);
export const getProvider = (id) => getModel(id)?.provider;
export const getModelsByProvider = (provider) => AVAILABLE_MODELS.filter((m) => m.provider === provider);
