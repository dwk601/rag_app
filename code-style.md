# RAG-based AI Chat Application with Ollama and Weaviate

## Planning Steps
- [✅] Configure environment variables for Ollama and Weaviate connections
- [✅] Create Weaviate client setup for vector database interaction
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

## Project Structure
C:\Users\dongo\Documents\windows_code\rag_app\app               
C:\Users\dongo\Documents\windows_code\rag_app\lib               
C:\Users\dongo\Documents\windows_code\rag_app\public            
C:\Users\dongo\Documents\windows_code\rag_app\code-style.md     
C:\Users\dongo\Documents\windows_code\rag_app\components.json   
C:\Users\dongo\Documents\windows_code\rag_app\docker-compose.yml
C:\Users\dongo\Documents\windows_code\rag_app\eslint.config.mjs 
C:\Users\dongo\Documents\windows_code\rag_app\next-env.d.ts     
C:\Users\dongo\Documents\windows_code\rag_app\next.config.ts    
C:\Users\dongo\Documents\windows_code\rag_app\package-lock.json 
C:\Users\dongo\Documents\windows_code\rag_app\package.json      
C:\Users\dongo\Documents\windows_code\rag_app\postcss.config.mjs
C:\Users\dongo\Documents\windows_code\rag_app\README.md         
C:\Users\dongo\Documents\windows_code\rag_app\tailwind.config.ts
C:\Users\dongo\Documents\windows_code\rag_app\tsconfig.json     
C:\Users\dongo\Documents\windows_code\rag_app\app\favicon.ico   
C:\Users\dongo\Documents\windows_code\rag_app\app\globals.css   
C:\Users\dongo\Documents\windows_code\rag_app\app\layout.tsx    
C:\Users\dongo\Documents\windows_code\rag_app\app\page.tsx      
C:\Users\dongo\Documents\windows_code\rag_app\lib\utils.ts      
C:\Users\dongo\Documents\windows_code\rag_app\public\file.svg   
C:\Users\dongo\Documents\windows_code\rag_app\public\globe.svg  
C:\Users\dongo\Documents\windows_code\rag_app\public\next.svg   
C:\Users\dongo\Documents\windows_code\rag_app\public\vercel.svg 
C:\Users\dongo\Documents\windows_code\rag_app\public\window.svg