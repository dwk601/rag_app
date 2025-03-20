// filepath: c:\Users\dongo\Documents\windows_code\rag_app\lib\image-processing.ts
import { getWeaviateClient } from './weaviate-client';
import { SCHEMA_CLASSES } from './weaviate-schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for image input before storage
 */
export interface ImageInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  caption?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for image retrieval results
 */
export interface ImageRetrievalResult {
  id: string;
  caption?: string;
  filename: string;
  mimeType: string;
  metadata?: Record<string, any>;
  score?: number;
}

/**
 * Interface for image retrieval options
 */
export interface ImageRetrievalOptions {
  limit?: number;
  minScore?: number;
}

/**
 * Default image retrieval options
 */
const DEFAULT_IMAGE_RETRIEVAL_OPTIONS: ImageRetrievalOptions = {
  limit: 5,
  minScore: 0.7,
};

/**
 * Process and store an image in Weaviate
 * 
 * @param imageInput Image data to store
 * @returns Promise<boolean> indicating success
 */
export async function storeImage(imageInput: ImageInput): Promise<boolean> {
  try {
    const client = getWeaviateClient();
    
    // Base64 encode the image buffer
    const base64Image = imageInput.buffer.toString('base64');
    
    // Store the image in Weaviate
    await client.data
      .creator()
      .withClassName(SCHEMA_CLASSES.IMAGE_DOCUMENT)
      .withProperties({
        image: base64Image,
        caption: imageInput.caption || '',
        filename: imageInput.filename,
        mimeType: imageInput.mimeType,
        metadata: {
          ...(imageInput.metadata || {}),
          imageId: uuidv4(),
        },
        created: new Date().toISOString(),
      })
      .do();
    
    console.log(`Stored image "${imageInput.filename}"`);
    return true;
  } catch (error) {
    console.error('Error storing image:', error);
    return false;
  }
}

/**
 * Retrieve images similar to a query image
 * 
 * @param imageBuffer Binary image data
 * @param options Retrieval configuration
 * @returns Promise<ImageRetrievalResult[]> Array of similar images
 */
export async function retrieveSimilarImages(
  imageBuffer: Buffer,
  options: ImageRetrievalOptions = DEFAULT_IMAGE_RETRIEVAL_OPTIONS
): Promise<ImageRetrievalResult[]> {
  const { limit = 5, minScore = 0.7 } = options;
  const client = getWeaviateClient();

  try {
    const base64Image = imageBuffer.toString('base64');
    
    const result = await client.graphql
      .get()
      .withClassName(SCHEMA_CLASSES.IMAGE_DOCUMENT)
      .withFields('filename caption mimeType metadata _additional { id certainty }')
      .withNearImage({ image: base64Image })
      .withLimit(limit)
      .do();

    const images = result?.data?.Get?.[SCHEMA_CLASSES.IMAGE_DOCUMENT] || [];
    
    // Filter by minimum score and format results
    return images
      .filter((img: any) => img._additional.certainty >= minScore)
      .map((img: any) => ({
        id: img._additional.id,
        caption: img.caption,
        filename: img.filename,
        mimeType: img.mimeType,
        metadata: img.metadata,
        score: img._additional.certainty,
      }));
  } catch (error) {
    console.error('Error retrieving similar images:', error);
    return [];
  }
}

/**
 * Retrieve images by text query using multimodal search
 * 
 * @param query Text query to match against images
 * @param options Retrieval configuration
 * @returns Promise<ImageRetrievalResult[]> Array of matching images
 */
export async function retrieveImagesByText(
  query: string,
  options: ImageRetrievalOptions = DEFAULT_IMAGE_RETRIEVAL_OPTIONS
): Promise<ImageRetrievalResult[]> {
  const { limit = 5, minScore = 0.7 } = options;
  const client = getWeaviateClient();

  try {
    // Weaviate can search for images by caption/text content
    const result = await client.graphql
      .get()
      .withClassName(SCHEMA_CLASSES.IMAGE_DOCUMENT)
      .withFields('filename caption mimeType metadata _additional { id certainty }')
      .withNearText({ concepts: [query] })
      .withLimit(limit)
      .do();

    const images = result?.data?.Get?.[SCHEMA_CLASSES.IMAGE_DOCUMENT] || [];
    
    // Filter by minimum score and format results
    return images
      .filter((img: any) => img._additional.certainty >= minScore)
      .map((img: any) => ({
        id: img._additional.id,
        caption: img.caption,
        filename: img.filename,
        mimeType: img.mimeType,
        metadata: img.metadata,
        score: img._additional.certainty,
      }));
  } catch (error) {
    console.error('Error retrieving images by text:', error);
    return [];
  }
}

/**
 * Get image data by ID
 * 
 * @param id The image ID in Weaviate
 * @returns Promise<{ buffer: Buffer, filename: string, mimeType: string } | null>
 */
export async function getImageById(
  id: string
): Promise<{ buffer: Buffer, filename: string, mimeType: string } | null> {
  try {
    const client = getWeaviateClient();
    
    const result = await client.data
      .getterById()
      .withClassName(SCHEMA_CLASSES.IMAGE_DOCUMENT)
      .withId(id)
      .do();
    if (!result || !result.properties) {
      return null;
    }
    
    const base64Image = result.properties.image as string;
    const buffer = Buffer.from(base64Image, 'base64');
    
    return {
      buffer,
      filename: result.properties.filename as string,
      mimeType: result.properties.mimeType as string,
    };
  } catch (error) {
    console.error('Error getting image by ID:', error);
    return null;
  }
}

/**
 * Delete image by ID
 * 
 * @param id The image ID in Weaviate
 * @returns Promise<boolean> indicating success
 */
export async function deleteImageById(id: string): Promise<boolean> {
  try {
    const client = getWeaviateClient();
    
    await client.data
      .deleter()
      .withClassName(SCHEMA_CLASSES.IMAGE_DOCUMENT)
      .withId(id)
      .do();
    
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}