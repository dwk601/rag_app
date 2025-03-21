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
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content type must be application/json' },
        { status: 415 }
      );
    }

    // Safely parse JSON
    let body: TextProcessRequest;
    try {
      const text = await request.text();
      body = JSON.parse(text) as TextProcessRequest;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : String(parseError)
        },
        { status: 400 }
      );
    }

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