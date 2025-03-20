// filepath: c:\Users\dongo\Documents\windows_code\rag_app\lib\rag-utils.ts
import { getWeaviateClient } from './weaviate-client';
import { SCHEMA_CLASSES } from './weaviate-schema';

/**
 * Interface for text retrieval results
 */
export interface RetrievalResult {
  content: string;
  title?: string;
  source?: string;
  metadata?: Record<string, any>;
  score?: number;
}

/**
 * Interface for retrieval options
 */
export interface RetrievalOptions {
  limit?: number;
  minScore?: number;
}

/**
 * Default retrieval options
 */
const DEFAULT_RETRIEVAL_OPTIONS: RetrievalOptions = {
  limit: 5,
  minScore: 0.7,
};

/**
 * Retrieve relevant text documents from Weaviate based on a query
 * 
 * @param query The search query text
 * @param options Optional retrieval configuration
 * @returns Array of retrieval results
 */
export async function retrieveRelevantDocuments(
  query: string,
  options: RetrievalOptions = DEFAULT_RETRIEVAL_OPTIONS
): Promise<RetrievalResult[]> {
  const { limit = 5, minScore = 0.7 } = options;
  const client = getWeaviateClient();

  try {
    const result = await client.graphql
      .get()
      .withClassName(SCHEMA_CLASSES.TEXT_DOCUMENT)
      .withFields('content title source metadata _additional { certainty }')
      .withNearText({ concepts: [query] })
      .withLimit(limit)
      .do();

    const documents = result?.data?.Get?.[SCHEMA_CLASSES.TEXT_DOCUMENT] || [];
    
    // Filter by minimum score and format results
    return documents
      .filter((doc: any) => doc._additional.certainty >= minScore)
      .map((doc: any) => ({
        content: doc.content,
        title: doc.title,
        source: doc.source,
        metadata: doc.metadata,
        score: doc._additional.certainty,
      }));
  } catch (error) {
    console.error('Error retrieving documents:', error);
    return [];
  }
}

/**
 * Generate context for the LLM from retrieved documents
 * 
 * @param documents Array of retrieved documents
 * @returns Formatted context string
 */
export function formatContextFromDocuments(documents: RetrievalResult[]): string {
  if (documents.length === 0) return '';
  
  return documents
    .map((doc, index) => {
      const title = doc.title ? `Title: ${doc.title}` : '';
      const source = doc.source ? `Source: ${doc.source}` : '';
      const header = [title, source].filter(Boolean).join(' | ');
      
      return `[Document ${index + 1}]${header ? '\n' + header : ''}\n${doc.content}`;
    })
    .join('\n\n');
}

/**
 * Format a system prompt with context for RAG
 * 
 * @param context The retrieved context
 * @param baseSystemPrompt The base system prompt to use
 * @returns Complete system prompt with context
 */
export function formatSystemPrompt(context: string, baseSystemPrompt: string): string {
  if (!context) return baseSystemPrompt;
  
  return `${baseSystemPrompt}\n\nContext information is below.\n${context}\n\nGiven the information above, please respond to the user's query.`;
}

/**
 * Default system prompt to use for chat completion
 */
export const DEFAULT_SYSTEM_PROMPT = 
  "You are an AI assistant that provides helpful, accurate, and concise information. " +
  "When you don't know something or if the context doesn't contain relevant information, " +
  "admit that you don't know rather than making up information.";