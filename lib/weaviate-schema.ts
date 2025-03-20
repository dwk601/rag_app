import { getWeaviateClient } from './weaviate-client';
import weaviate from 'weaviate-ts-client';

/**
 * Schema class names used in the application
 */
export const SCHEMA_CLASSES = {
  TEXT_DOCUMENT: 'TextDocument',
  IMAGE_DOCUMENT: 'ImageDocument',
};

/**
 * Schema for the TextDocument class in Weaviate
 */
const textDocumentClass = {
  class: SCHEMA_CLASSES.TEXT_DOCUMENT,
  description: 'A text document for RAG retrieval',
  vectorizer: 'text2vec-transformers', // Using default text vectorizer in Weaviate
  properties: [
    {
      name: 'content',
      description: 'The content of the text document',
      dataType: ['text'],
    },
    {
      name: 'title',
      description: 'The title of the document',
      dataType: ['string'],
    },
    {
      name: 'source',
      description: 'Source of the document (e.g., file name, URL)',
      dataType: ['string'],
    },
    {
      name: 'metadata',
      description: 'Additional metadata for the document',
      dataType: ['object'],
    },
    {
      name: 'chunkIndex',
      description: 'The index of this chunk in the original document',
      dataType: ['int'],
    },
    {
      name: 'created',
      description: 'When this document was created',
      dataType: ['date'],
    }
  ],
};

/**
 * Schema for the ImageDocument class in Weaviate
 */
const imageDocumentClass = {
  class: SCHEMA_CLASSES.IMAGE_DOCUMENT,
  description: 'An image document for multimodal RAG retrieval',
  vectorizer: 'img2vec-neural', // Using image vectorizer in Weaviate
  properties: [
    {
      name: 'image',
      description: 'The image binary data',
      dataType: ['blob'],
    },
    {
      name: 'caption',
      description: 'An optional caption for the image',
      dataType: ['text'],
    },
    {
      name: 'filename',
      description: 'Original filename of the image',
      dataType: ['string'],
    },
    {
      name: 'mimeType',
      description: 'MIME type of the image',
      dataType: ['string'],
    },
    {
      name: 'metadata',
      description: 'Additional metadata for the image',
      dataType: ['object'],
    },
    {
      name: 'created',
      description: 'When this image was uploaded',
      dataType: ['date'],
    }
  ],
};

/**
 * Create the schema in Weaviate
 * @returns Promise<boolean> indicating if the schema was created successfully
 */
export async function createSchema(): Promise<boolean> {
  try {
    const client = getWeaviateClient();
    
    // Check if schema classes already exist
    const schemaExists = await client.schema.getter().do();
    const existingClasses = schemaExists.classes?.map(c => c.class) || [];
    
    // Create TextDocument class if it doesn't exist
    if (!existingClasses.includes(SCHEMA_CLASSES.TEXT_DOCUMENT)) {
      await client.schema.classCreator().withClass(textDocumentClass).do();
      console.log(`Created ${SCHEMA_CLASSES.TEXT_DOCUMENT} schema class`);
    }
    
    // Create ImageDocument class if it doesn't exist
    if (!existingClasses.includes(SCHEMA_CLASSES.IMAGE_DOCUMENT)) {
      await client.schema.classCreator().withClass(imageDocumentClass).do();
      console.log(`Created ${SCHEMA_CLASSES.IMAGE_DOCUMENT} schema class`);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating schema:', error);
    return false;
  }
}

/**
 * Delete the schema from Weaviate (useful for testing or resetting)
 * @returns Promise<boolean> indicating if the schema was deleted successfully
 */
export async function deleteSchema(): Promise<boolean> {
  try {
    const client = getWeaviateClient();
    
    // Delete classes if they exist
    for (const className of Object.values(SCHEMA_CLASSES)) {
      try {
        await client.schema.classDeleter().withClassName(className).do();
        console.log(`Deleted ${className} schema class`);
      } catch (error) {
        // Ignore errors if the class doesn't exist
        console.log(`Class ${className} might not exist, skipping deletion`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting schema:', error);
    return false;
  }
}