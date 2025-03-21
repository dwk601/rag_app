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
 * Check if Ollama server is accessible, regardless of model availability
 * @returns {Promise<boolean>} True if Ollama server is accessible
 */
async function isOllamaServerReady(): Promise<boolean> {
  try {
    // Make a direct fetch to the Ollama API to check if it's running
    const response = await fetch(`${config.ollama.baseUrl}/api/tags`, {
      method: 'GET',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Ollama server not accessible:', error);
    return false;
  }
}

/**
 * Check if the configured model is available in Ollama
 * @returns {Promise<boolean>} True if the model is available
 */
async function isOllamaModelAvailable(): Promise<boolean> {
  try {
    // Check if the model exists in the list of models
    const response = await fetch(`${config.ollama.baseUrl}/api/tags`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    const models = data.models || [];
    
    // Check if our configured model is in the list
    return models.some((model: any) => model.name === config.ollama.model);
  } catch (error) {
    console.error('Failed to check Ollama model availability:', error);
    return false;
  }
}

/**
 * Check if Ollama is ready and accessible
 * @returns {Promise<boolean>} True if Ollama is ready
 */
export async function isOllamaReady(): Promise<boolean> {
  try {
    // First check if the server is accessible
    const serverReady = await isOllamaServerReady();
    if (!serverReady) {
      return false;
    }
    
    // For now, consider Ollama ready if the server is accessible
    // We can skip the specific model check to make the app more resilient
    return true;
    
    // Uncomment this section if you want to strictly check for model availability
    /*
    // Then check if the model is available
    const modelAvailable = await isOllamaModelAvailable();
    if (!modelAvailable) {
      console.warn(`Ollama model '${config.ollama.model}' not found, but server is accessible`);
    }
    return modelAvailable;
    */
  } catch (error) {
    console.error('Error checking Ollama readiness:', error);
    return false;
  }
}

/**
 * Reset the client (useful for testing)
 */
export function resetOllamaClient(): void {
  client = null;
}