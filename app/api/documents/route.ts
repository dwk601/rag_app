// filepath: c:\Users\dongo\Documents\windows_code\rag_app\app\api\documents\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processTextFile, extractTextFromFile } from '@/lib/rag-utils';

/**
 * Maximum file size (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Process and store a document in Weaviate
 * POST /api/documents
 */
export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart form data
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Request must be multipart/form-data' },
        { status: 400 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }
    
    // Get additional metadata
    const title = formData.get('title') as string || file.name;
    const description = formData.get('description') as string || '';
    
    // Extract file content
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const text = extractTextFromFile(fileBuffer, file.name, file.type);
    
    if (!text) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }
    
    // Process and store the text
    const success = await processTextFile(text, title, {
      description,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Document processed successfully',
        documentTitle: title,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to process document' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Get list of documents or search documents
 * GET /api/documents
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const title = searchParams.get('title');
    
    // If source is provided, use findDocumentsBySource
    if (source) {
      const { findDocumentsBySource } = await import('@/lib/rag-utils');
      const documents = await findDocumentsBySource(source, title || undefined);
      
      return NextResponse.json({
        success: true,
        documents,
        count: documents.length,
      });
    }
    
    // Otherwise return error (for now)
    return NextResponse.json(
      { error: 'Search parameters required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error retrieving documents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve documents',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Delete documents by source
 * DELETE /api/documents?source=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    
    if (!source) {
      return NextResponse.json(
        { error: 'Source parameter is required' },
        { status: 400 }
      );
    }
    
    const { deleteDocumentsBySource } = await import('@/lib/rag-utils');
    const success = await deleteDocumentsBySource(source);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: `Documents with source '${source}' deleted successfully`,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete documents' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting documents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete documents',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}