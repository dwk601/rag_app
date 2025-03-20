import { NextRequest, NextResponse } from 'next/server';
import { checkServicesHealth } from '@/lib/health';

/**
 * Health check endpoint for the application services
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  try {
    const health = await checkServicesHealth();
    
    return NextResponse.json({
      status: health.allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        weaviate: health.weaviate ? 'healthy' : 'unavailable',
        ollama: health.ollama ? 'healthy' : 'unavailable',
        schema: health.schema.initialized ? 'initialized' : 'not initialized',
      },
      schemaDetails: {
        textDocumentExists: health.schema.textDocumentExists,
        imageDocumentExists: health.schema.imageDocumentExists
      }
    }, {
      status: health.allHealthy ? 200 : 503
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Failed to check service health',
    }, { 
      status: 500 
    });
  }
}