'use client';

import { useActiveConversation, useChatContext } from "@/hooks/useChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import ConversationSidebar from "./ConversationSidebar";
import Image from "next/image";
import dynamic from 'next/dynamic';
import { toast } from "sonner";
import { Button } from "../ui/button";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

// Create a client-only wrapper for date-specific components
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  if (!hasMounted) {
    return null;
  }
  
  return <>{children}</>;
};

// The main component
const ChatContainer = () => {
  const { messages, isLoading } = useActiveConversation();
  const { state, actions } = useChatContext();
  const { uploadedFiles, servicesReady } = state;
  const [activeTab, setActiveTab] = useState<"chat" | "files">("chat");
  const [checkingServices, setCheckingServices] = useState(false);

  // Format date in a consistent way for client-side only
  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  // Handle file upload when new files come from MessageInput
  const handleSendMessage = async (content: string, files?: File[]) => {
    await actions.sendMessage(content, files);
    
    // Switch to chat tab after sending
    setActiveTab("chat");
  };

  // Handle service health check
  const handleCheckServices = async () => {
    setCheckingServices(true);
    try {
      const result = await actions.checkServices();
      if (result) {
        toast.success("All services are running properly");
      } else {
        toast.error("Some services are not available. Check the health indicator for details.");
      }
    } catch (error) {
      toast.error("Failed to check services");
    } finally {
      setCheckingServices(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Sidebar with conversation history */}
      <div className="w-64 h-full border-r hidden md:block">
        <ConversationSidebar />
      </div>

      {/* Main chat interface */}
      <div className="flex-1 flex flex-col h-full">
        {/* Service health indicator */}
        <div className="px-4 py-2 border-b flex justify-between items-center">
          <div className="flex items-center">
            <span className="mr-2">Services:</span>
            {servicesReady ? (
              <span className="flex items-center text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                <span>Ready</span>
              </span>
            ) : (
              <span className="flex items-center text-amber-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Not Ready</span>
              </span>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCheckServices} 
            disabled={checkingServices}
          >
            {checkingServices ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
        
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "chat" | "files")}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="files">
              Files {uploadedFiles.length > 0 && `(${uploadedFiles.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="chat"
            className="flex-1 flex flex-col h-[calc(100%-48px)]"
          >
            <div className="flex-1 overflow-hidden">
              <MessageList messages={messages} loading={isLoading} />
            </div>
            <div className="p-4 border-t">
              <MessageInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                isDisabled={!servicesReady}
              />
            </div>
          </TabsContent>

          <TabsContent
            value="files"
            className="h-[calc(100%-48px)] overflow-y-auto p-4"
          >
            {uploadedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-muted-foreground">
                  No files uploaded yet. Upload files in the chat tab.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="border rounded-lg p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-center h-32 bg-muted rounded">
                      {file.type.startsWith("image/") ? (
                        file.url ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={file.url}
                              alt={file.name}
                              fill
                              className="object-cover rounded"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Image preview unavailable</span>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-muted-foreground mb-1">{file.type || "Unknown type"}</span>
                          <span className="text-sm font-medium">{file.name}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <ClientOnly>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(file.uploadedAt)}
                      </p>
                    </ClientOnly>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Export as a dynamic component with SSR disabled
export default dynamic(() => Promise.resolve(ChatContainer), {
  ssr: false
});