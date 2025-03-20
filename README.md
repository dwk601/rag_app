# RAG-based AI Chat Application with Ollama and Weaviate

An intelligent chat application leveraging Retrieval-Augmented Generation (RAG) with Ollama for LLM capabilities and Weaviate as the vector database. Built with Next.js 15.1, TypeScript, and modern UI components.

## Features

- 🤖 AI-powered chat interface with context-aware responses
- 📚 Document and image upload capability with vector storage
- 🔍 Smart context retrieval using RAG architecture
- 🌊 Integration with Weaviate for efficient vector search
- 🔄 Real-time streaming responses
- 🎨 Modern UI with Shadcn components and TailwindCSS

## Tech Stack

- Next.js 15.1
- TypeScript
- TailwindCSS v3
- Shadcn UI v2.3.0
- Ollama for LLM
- Weaviate vector database

## Prerequisites

- Node.js 18.0 or later
- Ollama running locally or accessible endpoint
- Weaviate instance (local or cloud)
- Docker and Docker Compose (for running Weaviate locally)

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Configure the following variables:
- OLLAMA_API_URL
- WEAVIATE_URL
- WEAVIATE_API_KEY (if using cloud instance)

4. Start the development server:
```bash
npm run dev
```

5. Start Weaviate (if running locally):
```bash
docker-compose up -d
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
.
├── app/                  # Next.js app directory
│   ├── api/             # API routes
│   └── page.tsx         # Main chat interface
├── components/          # React components
│   └── ui/             # Shadcn UI components
├── lib/                 # Utility functions and clients
└── public/             # Static assets
```

## Architecture

1. **Frontend Layer**:
   - Chat interface with message history
   - File upload component for text/images
   - Response streaming display

2. **API Layer**:
   - Chat completion endpoints
   - File processing routes
   - Weaviate interaction endpoints

3. **Integration Layer**:
   - Ollama client for LLM access
   - Weaviate client for vector storage
   - RAG utilities for context retrieval

## Development

The application follows strict coding guidelines:
- TypeScript for type safety
- Tailwind CSS for styling
- Accessibility-first components
- DRY principles and clean code practices

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

MIT
