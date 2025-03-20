// filepath: c:\Users\dongo\Documents\windows_code\rag_app\app\api\documents\text\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processTextFile } from '@/lib/rag-utils';

/**
 * Maximum text length (100K characters)
 */
const MAX_TEXT_LENGTH = 100000;

interface TextProcessRequest {
  text: string;
  title: string;
  description?: string;
}

/**
 * Process and store raw text in Weaviate
 * POST /api/documents/text
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TextProcessRequest;
    const { text, title, description } = body;
    
    // Validate input
    if (!text || !title) {
      return NextResponse.json(
        { error: 'Text and title are required' },
        { status: 400 }
      );
    }
    
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text exceeds the ${MAX_TEXT_LENGTH} character limit` },
        { status: 400 }
      );
    }
    
    // Process and store the text
    const success = await processTextFile(text, title, {
      description,
      inputType: 'direct-input',
    });
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Text processed successfully',
        documentTitle: title,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to process text' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing text:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process text',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}