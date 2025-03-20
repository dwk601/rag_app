import { NextRequest, NextResponse } from 'next/server';
import { createSchema } from '@/lib/weaviate-schema';

/**
 * Initialize the Weaviate schema
 * POST /api/schema
 */
export async function POST(request: NextRequest) {
  try {
    const success = await createSchema();
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Schema initialized successfully',
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to initialize schema',
      }, { 
        status: 500 
      });
    }
  } catch (error) {
    console.error('Error initializing schema:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while initializing the schema',
      error: error instanceof Error ? error.message : String(error),
    }, { 
      status: 500 
    });
  }
}

/**
 * Get the current schema status
 * GET /api/schema
 */
export async function GET(request: NextRequest) {
  try {
    const client = (await import('@/lib/weaviate-client')).getWeaviateClient();
    const schema = await client.schema.getter().do();
    
    return NextResponse.json({
      success: true,
      schema: schema.classes || [],
    });
  } catch (error) {
    console.error('Error retrieving schema:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while retrieving the schema',
      error: error instanceof Error ? error.message : String(error),
    }, { 
      status: 500 
    });
  }
}