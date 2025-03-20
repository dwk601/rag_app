// filepath: c:\Users\dongo\Documents\windows_code\rag_app\app\api\documents\images\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { storeImage, getImageById, deleteImageById } from '@/lib/image-processing';

/**
 * Maximum image size (5MB)
 */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Allowed image MIME types
 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Process and store an image in Weaviate
 * POST /api/documents/images
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
    const imageFile = formData.get('image') as File | null;
    
    // Validate file
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }
    
    // Check file size
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Image size exceeds the ${MAX_IMAGE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }
    
    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${imageFile.type}. Supported types: ${ALLOWED_IMAGE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Get additional metadata
    const caption = formData.get('caption') as string || '';
    const description = formData.get('description') as string || '';
    
    // Extract file content
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // Process and store the image
    const success = await storeImage({
      buffer: imageBuffer,
      filename: imageFile.name,
      mimeType: imageFile.type,
      caption,
      metadata: {
        description,
        fileSize: imageFile.size,
      },
    });
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Image processed successfully',
        imageName: imageFile.name,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to process image' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Get an image by ID
 * GET /api/documents/images/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }
    
    const imageData = await getImageById(id);
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }
    
    // Return the image with proper content type
    return new NextResponse(imageData.buffer, {
      headers: {
        'Content-Type': imageData.mimeType,
        'Content-Disposition': `inline; filename="${imageData.filename}"`,
      },
    });
  } catch (error) {
    console.error('Error retrieving image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve image',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Delete image by ID
 * DELETE /api/documents/images/:id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }
    
    const success = await deleteImageById(id);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete image',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}