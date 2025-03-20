import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';
import { config } from './config';

let client: WeaviateClient | null = null;

/**
 * Get or create a Weaviate client instance
 * @returns A Weaviate client instance
 */
export function getWeaviateClient(): WeaviateClient {
  if (!client) {
    client = weaviate.client({
      scheme: config.weaviate.scheme,
      host: config.weaviate.host,
    });
  }
  return client;
}

/**
 * Check if Weaviate is ready and accessible
 * @returns {Promise<boolean>} True if Weaviate is ready
 */
export async function isWeaviateReady(): Promise<boolean> {
  try {
    const client = getWeaviateClient();
    const meta = await client.misc.metaGetter().do();
    return !!meta.version;
  } catch (error) {
    console.error('Weaviate not ready:', error);
    return false;
  }
}

/**
 * Reset the client (useful for testing)
 */
export function resetWeaviateClient(): void {
  client = null;
}