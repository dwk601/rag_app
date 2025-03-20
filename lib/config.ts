// Environment configuration for the application
export const config = {
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3',
  },
  weaviate: {
    scheme: process.env.WEAVIATE_SCHEME || 'http',
    host: process.env.WEAVIATE_HOST || 'localhost:8080',
  },
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'RAG Chat App',
  },
};