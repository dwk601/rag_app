import { Ollama } from '@langchain/ollama';
import { config } from './config';

let client: Ollama | null = null;

/**
 * Get or create an Ollama client instance
 * @returns An Ollama client instance
 */
export function getOllamaClient(): Ollama {
  if (!client) {
    client = new Ollama({
      baseUrl: config.ollama.baseUrl,
      model: config.ollama.model,
    });
  }
  return client;
}

/**
 * Check if Ollama is ready and accessible
 * @returns {Promise<boolean>} True if Ollama is ready
 */
export async function isOllamaReady(): Promise<boolean> {
  try {
    const client = getOllamaClient();
    // This will throw an error if Ollama is not available
    await client.invoke("Test connection to Ollama");
    return true;
  } catch (error) {
    console.error('Ollama not ready:', error);
    return false;
  }
}

/**
 * Reset the client (useful for testing)
 */
export function resetOllamaClient(): void {
  client = null;
}