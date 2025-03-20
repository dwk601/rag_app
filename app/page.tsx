'use client';

import ChatContainer from "@/components/chat/ChatContainer";
import { ChatProvider } from "@/hooks/useChatContext";

export default function Home() {
  return (
    <ChatProvider>
      <div className="flex flex-col min-h-screen">
        <header className="border-b p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">RAG Chat with Ollama & Weaviate</h1>
          </div>
        </header>
        
        <main className="flex-1 container mx-auto px-0">
          <ChatContainer />
        </main>
      </div>
    </ChatProvider>
  );
}
