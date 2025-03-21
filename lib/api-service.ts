// API service for frontend-backend communication
import { ServiceHealth } from './health';
import { MessageType } from '@/components/chat/ChatMessage';

/**
 * Interface for streaming response event
 */
interface StreamingResponseEvent {
  text?: string;
  error?: string;
}

/**
 * Parse the server-sent event data
 * @param data Raw SSE data from the stream
 * @returns Parsed event data
 */
const parseSSEData = (data: string): StreamingResponseEvent | null => {
  if (data === '[DONE]') return null;
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Error parsing SSE data:', error);
    return { error: 'Failed to parse streaming data' };
  }
};

/**
 * Retry a function multiple times with exponential backoff
 * @param fn Function to retry
 * @param retries Number of retries
 * @param delay Initial delay in milliseconds
 * @returns Result of the function
 */
const retry = async <T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 300
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    // Wait with exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry with one fewer retry and doubled delay
    return retry(fn, retries - 1, delay * 2);
  }
};

/**
 * Make a fetch request with timeout
 * @param url URL to fetch
 * @param options Fetch options
 * @param timeoutMs Timeout in milliseconds
 * @returns Response object
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<Response> => {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([
    fetch(url, { ...options, signal }),
    timeoutPromise
  ]) as Promise<Response>;
};

/**
 * Check the health of backend services
 * @returns Health status of all services
 */
export const checkServicesHealth = async (): Promise<ServiceHealth> => {
  try {
    return await retry(async () => {
      const response = await fetchWithTimeout('/api/health', {}, 3000);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        throw new Error(`Health check failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return {
        weaviate: data.services.weaviate === 'healthy',
        ollama: data.services.ollama === 'healthy',
        schema: {
          initialized: data.services.schema === 'initialized',
          textDocumentExists: data.schemaDetails?.textDocumentExists || false,
          imageDocumentExists: data.schemaDetails?.imageDocumentExists || false,
        },
        allHealthy: data.status === 'ok',
      };
    }, 2);
  } catch (error) {
    console.error('Health check error after retries:', error);
    
    // Create a degraded service report that allows basic functionality
    return {
      weaviate: false,
      ollama: false,
      schema: {
        initialized: false,
        textDocumentExists: false,
        imageDocumentExists: false,
      },
      allHealthy: false,
    };
  }
};

/**
 * Check individual service health without relying on the API
 * Useful as a fallback when the health API is unavailable
 */
export const checkDirectServiceHealth = async (): Promise<Partial<ServiceHealth>> => {
  const results: Partial<ServiceHealth> = {
    ollama: false,
    weaviate: false,
  };
  
  // Try direct Ollama check
  try {
    const response = await fetchWithTimeout('/api/chat/streaming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ping', useRag: false }),
    }, 2000);
    results.ollama = response.ok;
  } catch (error) {
    console.error('Direct Ollama check failed:', error);
  }
  
  // Return whatever information we could gather
  return results;
};

/**
 * Initialize Weaviate schema if not already present
 * @returns Success status
 */
export const initializeSchema = async (): Promise<boolean> => {
  try {
    return await retry(async () => {
      const response = await fetchWithTimeout('/api/schema', {
        method: 'POST',
      }, 5000);
      return response.ok;
    }, 2);
  } catch (error) {
    console.error('Failed to initialize schema:', error);
    return false;
  }
};

/**
 * Send a chat message with streaming response
 * @param message The message content
 * @param previousMessages Previous messages in the conversation
 * @param useRag Whether to use RAG for context enhancement
 * @param onChunk Callback for each received text chunk
 */
export const sendStreamingChatMessage = async (
  message: string,
  previousMessages: MessageType[] = [],
  useRag: boolean = true,
  onChunk: (text: string) => void,
): Promise<void> => {
  const apiMessages = previousMessages.map(msg => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content
  }));

  try {
    const response = await fetchWithTimeout('/api/chat/streaming', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        messages: apiMessages,
        useRag,
      }),
    }, 10000);

    if (!response.ok || !response.body) {
      throw new Error(`Streaming request failed with status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    // Process the stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the chunk and process event data
      const chunk = decoder.decode(value, { stream: true });
      
      // Process all events in this chunk
      const events = chunk
        .split('\n\n')
        .filter(line => line.trim().startsWith('data: '));
      
      for (const event of events) {
        const data = event.replace(/^data: /, '').trim();
        if (!data) continue;
        
        const parsedEvent = parseSSEData(data);
        if (parsedEvent === null) {
          // End of stream
          break;
        } else if (parsedEvent.text) {
          onChunk(parsedEvent.text);
        } else if (parsedEvent.error) {
          throw new Error(parsedEvent.error);
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    throw error;
  }
};

/**
 * Upload a file to the server for processing
 * @param file The file to upload
 * @returns The processed file data
 */
export const uploadFile = async (file: File): Promise<{ url?: string; id: string }> => {
  const isImage = file.type.startsWith('image/');
  const endpoint = isImage ? '/api/documents/images' : '/api/documents/text';
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      body: formData,
    }, 15000); // Longer timeout for file uploads
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to upload ${file.name}: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`File upload error for ${file.name}:`, error);
    throw error;
  }
};