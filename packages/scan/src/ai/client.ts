import type { AiClientConfig } from './types.js';

const LOCALHOST_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function validateLocalhostUrl(url: string): void {
  const parsed = new URL(url);
  if (!LOCALHOST_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Security: AI endpoint must be localhost. Got "${parsed.hostname}". ` +
      'CVERiskPilot scanner only communicates with local LLM servers.'
    );
  }
}

export interface AiClient {
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
  provider: string;
  model: string;
}

export async function detectProvider(ollamaUrl: string, llamacppUrl: string): Promise<{ provider: 'ollama' | 'llamacpp'; baseUrl: string } | null> {
  // Try Ollama first
  try {
    validateLocalhostUrl(ollamaUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return { provider: 'ollama', baseUrl: ollamaUrl };
  } catch { /* not available */ }

  // Try llama.cpp
  try {
    validateLocalhostUrl(llamacppUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${llamacppUrl}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return { provider: 'llamacpp', baseUrl: llamacppUrl };
  } catch { /* not available */ }

  return null;
}

export function createAiClient(config: AiClientConfig): AiClient {
  validateLocalhostUrl(config.baseUrl);

  async function complete(systemPrompt: string, userPrompt: string): Promise<string> {
    // Re-validate before every request (defense in depth)
    validateLocalhostUrl(config.baseUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      if (config.provider === 'ollama') {
        const res = await fetch(`${config.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.model,
            system: systemPrompt,
            prompt: userPrompt,
            stream: false,
            options: { temperature: 0.2, num_predict: 2048 },
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          if (res.status === 404 || body.includes('not found')) {
            throw new Error(`Model '${config.model}' not found. Run: ollama pull ${config.model}`);
          }
          throw new Error(`Ollama error ${res.status}: ${body.slice(0, 200)}`);
        }

        const data = await res.json() as { response?: string };
        return data.response ?? '';
      } else {
        // llama.cpp
        const combinedPrompt = `<|system|>\n${systemPrompt}\n<|end|>\n<|user|>\n${userPrompt}\n<|end|>\n<|assistant|>`;
        const res = await fetch(`${config.baseUrl}/completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: combinedPrompt,
            n_predict: 2048,
            temperature: 0.2,
            stop: ['</s>', '<|end|>'],
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`llama.cpp error ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
        }

        const data = await res.json() as { content?: string };
        return data.content ?? '';
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return { complete, provider: config.provider, model: config.model };
}
