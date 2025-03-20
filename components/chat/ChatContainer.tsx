'use client';

import { useActiveConversation, useChatContext } from "@/hooks/useChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import ConversationSidebar from "./ConversationSidebar";

const ChatContainer = () => {
  const { messages, isLoading } = useActiveConversation();
  const { state, actions } = useChatContext();
  const { uploadedFiles } = state;
  const [activeTab, setActiveTab] = useState<"chat" | "files">("chat");
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true after component mounts to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Format date in a consistent way for both server and client
  const formatDate = (dateString: string) => {
    if (!isClient) return '';
    
    try {
      const date = new Date(dateString);
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

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* Sidebar with conversation history */}
      <div className="w-64 h-full border-r hidden md:block">
        <ConversationSidebar />
      </div>

      {/* Main chat interface */}
      <div className="flex-1 flex flex-col h-full">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "chat" | "files")}
          className="h-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
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
                onSendMessage={actions.sendMessage}
                isLoading={isLoading}
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
                    <div className="flex items-center gap-2">
                      {file.type.startsWith("image/") ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-32 object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted flex items-center justify-center rounded">
                          <span className="text-muted-foreground">{file.type}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {isClient && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(file.uploadedAt)}
                      </p>
                    )}
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

export default ChatContainer;