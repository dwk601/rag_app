# RAG-based AI Chat Application with Ollama and Weaviate

## Planning Steps
- [ ] Configure environment variables for Ollama and Weaviate connections
- [ ] Create Weaviate client setup for vector database interaction
- [ ] Design schema for text and image data in Weaviate
- [ ] Implement API routes for Ollama chat completion
- [ ] Create RAG utilities for text retrieval and embedding
- [ ] Build image processing and embedding capabilities
- [ ] Develop the chat UI components with Shadcn
- [ ] Implement chat history and message state management
- [ ] Create file upload functionality for text and images
- [ ] Connect the frontend to backend services
- [ ] Add streaming response functionality
- [ ] Implement error handling and loading states

### After Implementation
- after implementation check the checkbox when completed

## High-Level Architecture

1. **Frontend Layer**:
   - Chat interface with message history
   - File upload component for text/images
   - Response streaming display

2. **API Layer**:
   - Endpoints for chat completion
   - File processing routes
   - Weaviate interaction endpoints

3. **Integration Layer**:
   - Ollama client for LLM access
   - Weaviate client for vector storage
   - RAG utilities for context retrieval

4. **Data Flow**:
   - User uploads files → processed and stored in Weaviate
   - User sends message → relevant context retrieved from Weaviate
   - Context + user message sent to Ollama → response streamed back to UI