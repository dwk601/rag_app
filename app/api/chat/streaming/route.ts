// filepath: c:\Users\dongo\Documents\windows_code\rag_app\app\api\chat\streaming\route.ts
import { NextRequest } from 'next/server';
import { getOllamaClient } from '@/lib/ollama-client';
import { 
  retrieveRelevantDocuments,
  formatContextFromDocuments,
  formatSystemPrompt,
  DEFAULT_SYSTEM_PROMPT 
} from '@/lib/rag-utils';

// Define the expected request body structure
interface ChatStreamRequestBody {
  message: string;
  messages?: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  useRag?: boolean;
  systemPrompt?: string;
}

/**
 * POST /api/chat/streaming
 * Streaming chat completion endpoint with optional RAG
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatStreamRequestBody;
    const { 
      message, 
      messages = [], 
      useRag = true, 
      systemPrompt = DEFAULT_SYSTEM_PROMPT 
    } = body;

    // Validate request body
    if (!message && messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message or messages array is required' }), 
        { status: 400 }
      );
    }

    // Prepare messages array for Ollama
    // If messages array is provided, use it, otherwise create from single message
    let ollamaMessages = messages.length > 0 
      ? [...messages] 
      : [{ role: 'user', content: message }];
    
    // Get the last user message for RAG context retrieval
    const lastUserMessage = message || 
      [...ollamaMessages].reverse().find(m => m.role === 'user')?.content || '';
    
    // Initialize Ollama client
    const ollama = getOllamaClient();
    
    // Add RAG context if enabled
    if (useRag && lastUserMessage) {
      // Retrieve relevant documents for the query
      const relevantDocs = await retrieveRelevantDocuments(lastUserMessage);
      
      // Format the retrieved documents into context
      const context = formatContextFromDocuments(relevantDocs);
      
      // Format and add the system prompt with context
      const enhancedSystemPrompt = formatSystemPrompt(context, systemPrompt);
      
      // Add or update the system message
      const systemMessageIndex = ollamaMessages.findIndex(m => m.role === 'system');
      if (systemMessageIndex >= 0) {
        ollamaMessages[systemMessageIndex].content = enhancedSystemPrompt;
      } else {
        ollamaMessages.unshift({
          role: 'system',
          content: enhancedSystemPrompt
        });
      }
    }

    // Create a streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start streaming response from Ollama
    try {
      const ollamaStream = await ollama.stream(ollamaMessages);

      // Process each chunk as it comes in
      (async () => {
        try {
          for await (const chunk of ollamaStream) {
            // Encode and write the chunk to the response stream
            const text = chunk; // Chunk is already a string
            await writer.write(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
          // Send the end marker
          await writer.write(encoder.encode('data: [DONE]\n\n'));
          await writer.close();
        } catch (error) {
          console.error('Error in streaming response:', error);
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ error: 'Streaming error occurred' })}\n\n`)
          );
          await writer.close();
        }
      })();

      // Return the stream with proper headers for SSE
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error) {
      console.error('Failed to initialize stream:', error);
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: 'Failed to initialize stream' })}\n\n`)
      );
      await writer.close();
      
      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  } catch (error) {
    console.error('Error in streaming chat completion:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate a response',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}