// filepath: c:\Users\dongo\Documents\windows_code\rag_app\lib\rag-utils.ts
import { getWeaviateClient } from './weaviate-client';
import { SCHEMA_CLASSES } from './weaviate-schema';
import { v4 as uuidv4 } from 'uuid';

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
 * Interface for document info before storage
 */
export interface DocumentInput {
  content: string;
  title?: string;
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * Options for text chunking
 */
export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  preserveParagraphs?: boolean;
}

/**
 * Default retrieval options
 */
const DEFAULT_RETRIEVAL_OPTIONS: RetrievalOptions = {
  limit: 5,
  minScore: 0.7,
};

/**
 * Default chunking options
 */
const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSize: 500,
  chunkOverlap: 100,
  preserveParagraphs: true,
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

/**
 * Split text into chunks for processing and storage
 * 
 * @param text The full text to split into chunks
 * @param options Chunking configuration options
 * @returns Array of text chunks
 */
export function chunkText(text: string, options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS): string[] {
  const { chunkSize = 500, chunkOverlap = 100, preserveParagraphs = true } = options;
  
  if (!text || text.length === 0) return [];

  // Basic approach: If preserving paragraphs, split by paragraphs first
  if (preserveParagraphs) {
    // Split by paragraphs (double newline)
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed chunk size, store current chunk and start new one
      if (currentChunk && (currentChunk.length + paragraph.length > chunkSize)) {
        chunks.push(currentChunk.trim());
        // Start new chunk with overlap from previous chunk if possible
        const lastWords = currentChunk.split(' ');
        const overlapWordCount = Math.floor(chunkOverlap / 7); // Approximate words in overlap
        currentChunk = lastWords.slice(-overlapWordCount).join(' ') + ' ';
      }
      
      currentChunk += paragraph + '\n\n';
    }
    
    // Add the last chunk if not empty
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  } 
  
  // If not preserving paragraphs, use sliding window approach
  const chunks: string[] = [];
  let i = 0;
  
  while (i < text.length) {
    // Extract chunk of specified size
    const chunk = text.substring(i, i + chunkSize);
    chunks.push(chunk);
    
    // Move forward by chunk size minus overlap
    i += (chunkSize - chunkOverlap);
  }
  
  return chunks;
}

/**
 * Store document chunks in Weaviate
 * 
 * @param document Document information to store
 * @param options Chunking options for processing
 * @returns Promise<boolean> indicating success
 */
export async function storeDocument(
  document: DocumentInput,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): Promise<boolean> {
  try {
    const client = getWeaviateClient();
    const chunks = chunkText(document.content, options);
    
    // Store each chunk as a separate document
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      await client.data
        .creator()
        .withClassName(SCHEMA_CLASSES.TEXT_DOCUMENT)
        .withProperties({
          content: chunk,
          title: document.title || 'Untitled Document',
          source: document.source || 'Unknown',
          metadata: {
            ...(document.metadata || {}),
            chunkIndex: i,
            totalChunks: chunks.length,
            chunkId: uuidv4(),
          },
          created: new Date().toISOString(),
        })
        .do();
    }
    
    console.log(`Stored ${chunks.length} chunks for document "${document.title || 'Untitled'}"`);
    return true;
  } catch (error) {
    console.error('Error storing document:', error);
    return false;
  }
}

/**
 * Process and store text from a file
 * 
 * @param content The text content to process
 * @param filename The original filename
 * @param metadata Any additional metadata
 * @returns Promise<boolean> indicating success
 */
export async function processTextFile(
  content: string, 
  filename: string, 
  metadata?: Record<string, any>
): Promise<boolean> {
  return storeDocument({
    content,
    title: filename,
    source: `File: ${filename}`,
    metadata: {
      ...metadata,
      fileType: 'text',
      processedAt: new Date().toISOString(),
    },
  });
}

/**
 * Parse and extract text from common file types
 * 
 * @param buffer Binary file content
 * @param filename Original filename
 * @param mimeType MIME type of the file
 * @returns Extracted text content or null if unsupported
 */
export function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): string | null {
  // Basic text extraction based on file type
  // In a production app, use specialized libraries for each file type
  
  // Handle plain text files
  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8');
  }
  
  // Handle markdown
  if (mimeType === 'text/markdown') {
    return buffer.toString('utf-8');
  }
  
  // For PDF, DOCX, etc. you would use specialized libraries
  // like pdf-parse, mammoth, etc.
  
  console.warn(`File type ${mimeType} not directly supported for text extraction`);
  return null;
}

/**
 * Retrieve documents by source or title for management purposes
 * 
 * @param source Source identifier to search for
 * @param title Optional title to search for
 * @returns Array of document objects
 */
export async function findDocumentsBySource(
  source: string,
  title?: string
): Promise<RetrievalResult[]> {
  try {
    const client = getWeaviateClient();
    const filter: any = {
      path: ['source'],
      operator: 'Equal',
      valueString: source
    };
    
    if (title) {
      filter.operands = [
        filter,
        {
          path: ['title'],
          operator: 'Equal',
          valueString: title
        }
      ];
      filter.operator = 'And';
    }
    
    const result = await client.graphql
      .get()
      .withClassName(SCHEMA_CLASSES.TEXT_DOCUMENT)
      .withFields('content title source metadata')
      .withWhere(filter)
      .do();
      
    const documents = result?.data?.Get?.[SCHEMA_CLASSES.TEXT_DOCUMENT] || [];
    
    return documents.map((doc: any) => ({
      content: doc.content,
      title: doc.title,
      source: doc.source,
      metadata: doc.metadata,
    }));
  } catch (error) {
    console.error('Error finding documents by source:', error);
    return [];
  }
}

/**
 * Delete documents by source
 * 
 * @param source Source identifier to delete
 * @returns Promise<boolean> indicating success
 */
export async function deleteDocumentsBySource(source: string): Promise<boolean> {
  try {
    const client = getWeaviateClient();
    
    await client.batch
      .objectsBatchDeleter()
      .withClassName(SCHEMA_CLASSES.TEXT_DOCUMENT)
      .withWhere({
        path: ['source'],
        operator: 'Equal',
        valueString: source
      })
      .do();
    
    console.log(`Deleted documents with source: ${source}`);
    return true;
  } catch (error) {
    console.error('Error deleting documents:', error);
    return false;
  }
}