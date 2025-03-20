import { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { MessageType } from "./ChatMessage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ChatContainerProps = {
  initialMessages?: MessageType[];
};

const ChatContainer = ({ initialMessages = [] }: ChatContainerProps) => {
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "files">("chat");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; type: string; url: string }>>([]);

  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    // Create user message
    const userMessageId = uuidv4();
    const userMessage: MessageType = {
      id: userMessageId,
      content,
      role: "user",
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Handle file uploads if any
      if (files && files.length > 0) {
        for (const file of files) {
          const isImage = file.type.startsWith("image/");
          const endpoint = isImage
            ? "/api/documents/images"
            : "/api/documents/text";

          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const data = await response.json();
          
          // Add to uploaded files list
          setUploadedFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            url: data.url || ""
          }]);
          
          // Add upload confirmation to chat
          setMessages(prev => [
            ...prev,
            {
              id: uuidv4(),
              content: `File "${file.name}" uploaded and processed successfully.`,
              role: "assistant",
              createdAt: new Date()
            }
          ]);
        }
      }

      // Only proceed with chat completion if there's a message
      if (content.trim()) {
        // Create AI response by calling the streaming endpoint
        const response = await fetch("/api/chat/streaming", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Failed to get streaming response");
        }

        // Setup for streaming
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = "";
        const responseId = uuidv4();

        // Add initial empty message for streaming
        setMessages((prev) => [
          ...prev,
          {
            id: responseId,
            content: "",
            role: "assistant",
            createdAt: new Date(),
          },
        ]);

        // Process the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode chunk and append to response text
          const chunk = decoder.decode(value, { stream: true });
          responseText += chunk;

          // Update the message with the current accumulated text
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === responseId
                ? { ...msg, content: responseText }
                : msg
            )
          );
        }
      }
    } catch (error) {
      console.error("Error in chat:", error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          content: "Sorry, an error occurred while processing your request.",
          role: "assistant",
          createdAt: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "chat" | "files")}
        className="flex flex-col h-full"
      >
        <div className="border-b">
          <TabsList className="flex">
            <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
            <TabsTrigger value="files" className="flex-1">Files ({uploadedFiles.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent 
          value="chat" 
          className="flex-1 overflow-hidden flex flex-col p-4 h-[calc(100%-48px)]"
        >
          <div className="flex-1 overflow-y-auto mb-4">
            <MessageList messages={messages} loading={isLoading} />
          </div>
          <div>
            <MessageInput onSendMessage={sendMessage} isLoading={isLoading} />
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
              {uploadedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
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
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChatContainer;