// filepath: c:\Users\dongo\Documents\windows_code\rag_app\app\api\chat\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOllamaClient } from '@/lib/ollama-client';
import { 
  retrieveRelevantDocuments,
  formatContextFromDocuments,
  formatSystemPrompt,
  DEFAULT_SYSTEM_PROMPT 
} from '@/lib/rag-utils';

// Define the expected request body structure
interface ChatRequestBody {
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  useRag?: boolean;
  systemPrompt?: string;
}

/**
 * POST /api/chat
 * Chat completion endpoint with optional RAG
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequestBody;
    const { messages, useRag = true, systemPrompt = DEFAULT_SYSTEM_PROMPT } = body;

    // Validate request body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Get the last user message for RAG context retrieval
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content;
    
    // Initialize Ollama client
    const ollama = getOllamaClient();
    
    // Prepare messages array for Ollama
    let ollamaMessages = [...messages];
    
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

    // Make the request to Ollama
    const completion = await ollama.invoke(ollamaMessages);

    return NextResponse.json({
      response: completion,
      success: true,
    });
  } catch (error) {
    console.error('Error in chat completion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate a response',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}