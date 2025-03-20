import { isWeaviateReady } from './weaviate-client';
import { isOllamaReady } from './ollama-client';

/**
 * Interface for service health status
 */
export interface ServiceHealth {
  weaviate: boolean;
  ollama: boolean;
  allHealthy: boolean;
}

/**
 * Check health status of all required services
 * @returns Promise<ServiceHealth> Object containing health status of each service
 */
export async function checkServicesHealth(): Promise<ServiceHealth> {
  const weaviateHealth = await isWeaviateReady();
  const ollamaHealth = await isOllamaReady();
  
  return {
    weaviate: weaviateHealth,
    ollama: ollamaHealth,
    allHealthy: weaviateHealth && ollamaHealth
  };
}