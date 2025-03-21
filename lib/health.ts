import { isWeaviateReady } from './weaviate-client';
import { isOllamaReady } from './ollama-client';
import { SCHEMA_CLASSES } from './weaviate-schema';

/**
 * Interface for service health status
 */
export interface ServiceHealth {
  weaviate: boolean;
  ollama: boolean;
  schema: {
    initialized: boolean;
    textDocumentExists: boolean;
    imageDocumentExists: boolean;
  };
  allHealthy: boolean;
}

/**
 * Check health status of all required services
 * @returns Promise<ServiceHealth> Object containing health status of each service
 */
export async function checkServicesHealth(): Promise<ServiceHealth> {
  const weaviateHealth = await isWeaviateReady();
  const ollamaHealth = await isOllamaReady();
  
  let schemaStatus = {
    initialized: false,
    textDocumentExists: false,
    imageDocumentExists: false
  };
  
  // Check schema status if Weaviate is healthy
  if (weaviateHealth) {
    try {
      const client = (await import('./weaviate-client')).getWeaviateClient();
      const schema = await client.schema.getter().do();
      const existingClasses = schema.classes?.map(c => c.class) || [];
      
      schemaStatus.textDocumentExists = existingClasses.includes(SCHEMA_CLASSES.TEXT_DOCUMENT);
      schemaStatus.imageDocumentExists = existingClasses.includes(SCHEMA_CLASSES.IMAGE_DOCUMENT);
      schemaStatus.initialized = 
        schemaStatus.textDocumentExists && 
        schemaStatus.imageDocumentExists;
    } catch (error) {
      console.error('Error checking schema health:', error);
    }
  }
  
  // Consider services healthy if both Weaviate and Ollama are available
  // Not requiring schema initialization allows for first-time use
  return {
    weaviate: weaviateHealth,
    ollama: ollamaHealth,
    schema: schemaStatus,
    allHealthy: weaviateHealth && ollamaHealth // Schema can be initialized later if needed
  };
}