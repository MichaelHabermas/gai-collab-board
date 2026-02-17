import OpenAI from 'openai';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';

export const createAIClient = (): OpenAI => {
  const apiKey = import.meta.env.VITE_NVIDIA_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_NVIDIA_API_KEY is not configured');
  }

  return new OpenAI({
    apiKey,
    baseURL: NVIDIA_API_BASE,
    dangerouslyAllowBrowser: true,
  });
};

export const aiClient = createAIClient();

export const AI_CONFIG = {
  model: 'moonshotai/kimi-k2.5',
  maxTokens: 4096,
  temperature: 0.7,
  topP: 0.9,
} as const;
