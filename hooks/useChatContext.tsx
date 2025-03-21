'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MessageType } from '@/components/chat/ChatMessage';
import * as apiService from '@/lib/api-service';
import { toast } from 'sonner';

// Define uploaded file type
export type UploadedFileType = {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
};

// Define chat state
export interface ChatState {
  messages: MessageType[];
  isLoading: boolean;
  uploadedFiles: UploadedFileType[];
  activeConversationId: string | null;
  conversations: {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    messageIds: string[];
  }[];
  isInitialized: boolean;
  servicesReady: boolean;
}

// Define context actions
export interface ChatContextActions {
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  clearConversation: () => void;
  startNewConversation: () => void;
  switchConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, newTitle: string) => void;
  checkServices: () => Promise<boolean>;
}

// Create the context with an empty default value
const ChatContext = createContext<{
  state: ChatState;
  actions: ChatContextActions;
} | undefined>(undefined);

// Local storage keys
const STORAGE_KEYS = {
  MESSAGES: 'rag-app-messages',
  CONVERSATIONS: 'rag-app-conversations',
  ACTIVE_CONVERSATION: 'rag-app-active-conversation',
  UPLOADED_FILES: 'rag-app-uploaded-files',
};

export interface ChatProviderProps {
  children: ReactNode;
}

// Helper to check if we're on the client side
const isClient = typeof window !== 'undefined';

export const ChatProvider = ({ children }: ChatProviderProps) => {
  // Initialize state with empty values to avoid hydration issues
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    uploadedFiles: [],
    activeConversationId: null,
    conversations: [],
    isInitialized: false,
    servicesReady: false
  });

  // Check the health of services
  const checkServices = useCallback(async () => {
    try {
      // First try the primary health check
      const health = await apiService.checkServicesHealth();
      
      setState(prev => ({ 
        ...prev, 
        servicesReady: health.allHealthy 
      }));

      // If primary health check fails completely, try direct service checks
      if (!health.allHealthy) {
        const directHealth = await apiService.checkDirectServiceHealth();
        
        // If direct checks indicate services are actually running, consider them ready
        if (directHealth.ollama) {
          setState(prev => ({ ...prev, servicesReady: true }));
          return true;
        }
      }

      // If schema is not initialized but services are available, try to initialize it
      if (health.weaviate && health.ollama && !health.schema.initialized) {
        const initialized = await apiService.initializeSchema();
        if (initialized) {
          toast.success("Schema initialized successfully");
          setState(prev => ({ ...prev, servicesReady: true }));
          return true;
        } else {
          toast.error("Failed to initialize schema");
        }
      }
      
      return health.allHealthy;
    } catch (error) {
      console.error('Error checking services:', error);
      
      // Last resort: try direct checks when the main health check throws an error
      try {
        const directHealth = await apiService.checkDirectServiceHealth();
        if (directHealth.ollama) {
          setState(prev => ({ ...prev, servicesReady: true }));
          return true;
        }
      } catch (fallbackError) {
        console.error('Fallback health check also failed:', fallbackError);
      }
      
      setState(prev => ({ ...prev, servicesReady: false }));
      return false;
    }
  }, []);

  // Load data from local storage on mount, but only on client side
  useEffect(() => {
    if (!isClient) return;

    try {
      // Load conversations
      const savedConversations = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      const conversations = savedConversations 
        ? JSON.parse(savedConversations).map((conv: any) => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
          }))
        : [];
      
      // Load active conversation ID
      const activeConversationId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION) || null;
      
      // Load messages
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      const messages = savedMessages 
        ? JSON.parse(savedMessages).map((msg: any) => ({
            ...msg,
            createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
          }))
        : [];
      
      // Load uploaded files
      const savedFiles = localStorage.getItem(STORAGE_KEYS.UPLOADED_FILES);
      const uploadedFiles = savedFiles 
        ? JSON.parse(savedFiles).map((file: any) => ({
            ...file,
            uploadedAt: new Date(file.uploadedAt),
          }))
        : [];
      
      // Start a new conversation if none exists
      if (conversations.length === 0) {
        const newConversation = {
          id: uuidv4(),
          title: 'New Conversation',
          createdAt: new Date(),
          updatedAt: new Date(),
          messageIds: [],
        };
        
        setState({
          messages,
          isLoading: false,
          uploadedFiles,
          activeConversationId: newConversation.id,
          conversations: [newConversation],
          isInitialized: true,
          servicesReady: false
        });
      } else {
        // Use saved data
        setState({
          messages,
          isLoading: false,
          uploadedFiles,
          activeConversationId: activeConversationId || conversations[0].id,
          conversations,
          isInitialized: true,
          servicesReady: false
        });
      }
      
      // Check services health on startup
      checkServices();
    } catch (error) {
      console.error('Error loading chat state from localStorage:', error);
      // Start with a fresh state if there's an error
      const newConversation = {
        id: uuidv4(),
        title: 'New Conversation',
        createdAt: new Date(),
        updatedAt: new Date(),
        messageIds: [],
      };
      
      setState({
        messages: [],
        isLoading: false,
        uploadedFiles: [],
        activeConversationId: newConversation.id,
        conversations: [newConversation],
        isInitialized: true,
        servicesReady: false
      });
    }
  }, [checkServices]);

  // Save state to localStorage whenever it changes, but only on client side
  useEffect(() => {
    if (!isClient || !state.isInitialized) return;
    
    if (state.conversations.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(state.conversations));
    }
    
    if (state.activeConversationId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION, state.activeConversationId);
    }
    
    if (state.messages.length > 0) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(state.messages));
    }
    
    if (state.uploadedFiles.length > 0) {
      localStorage.setItem(STORAGE_KEYS.UPLOADED_FILES, JSON.stringify(state.uploadedFiles));
    }
  }, [state]);

  // Functions to manipulate state
  const sendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!state.activeConversationId) return;
    
    // Check services health before proceeding
    if (!state.servicesReady) {
      const servicesOk = await checkServices();
      if (!servicesOk) {
        toast.error("Services are not ready. Please try again later.");
        return;
      }
    }
    
    // Create user message
    const userMessageId = uuidv4();
    const userMessage: MessageType = {
      id: userMessageId,
      content,
      role: "user",
      createdAt: new Date(),
    };

    // Update state with user message
    setState(prev => {
      const updatedConversations = prev.conversations.map(conv => {
        if (conv.id === prev.activeConversationId) {
          // Update conversation
          return {
            ...conv,
            messageIds: [...conv.messageIds, userMessageId],
            updatedAt: new Date(),
            // If first message, use it as conversation title (truncated)
            title: conv.messageIds.length === 0 
              ? content.slice(0, 30) + (content.length > 30 ? '...' : '') 
              : conv.title
          };
        }
        return conv;
      });

      return {
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        conversations: updatedConversations,
      };
    });

    try {
      // Handle file uploads if any
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const fileData = await apiService.uploadFile(file);
            
            // Generate unique file ID
            const fileId = uuidv4();
            
            // Add to uploaded files list
            setState(prev => {
              const newFile: UploadedFileType = {
                id: fileId,
                name: file.name,
                type: file.type,
                url: fileData.url || "",
                uploadedAt: new Date()
              };
              
              return {
                ...prev,
                uploadedFiles: [...prev.uploadedFiles, newFile]
              };
            });
            
            // Add upload confirmation to chat
            const confirmationId = uuidv4();
            const confirmationMessage: MessageType = {
              id: confirmationId,
              content: `File "${file.name}" uploaded and processed successfully.`,
              role: "assistant",
              createdAt: new Date()
            };
            
            setState(prev => {
              const updatedConversations = prev.conversations.map(conv => {
                if (conv.id === prev.activeConversationId) {
                  return {
                    ...conv,
                    messageIds: [...conv.messageIds, confirmationId],
                    updatedAt: new Date(),
                  };
                }
                return conv;
              });
              
              return {
                ...prev,
                messages: [...prev.messages, confirmationMessage],
                conversations: updatedConversations,
              };
            });
          } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }

      // Only proceed with chat completion if there's a message
      if (content.trim()) {
        // Prepare for streaming response
        const responseId = uuidv4();
        let responseText = "";

        // Add initial empty message for streaming
        setState(prev => {
          const assistantMessage: MessageType = {
            id: responseId,
            content: "",
            role: "assistant",
            createdAt: new Date(),
          };
          
          const updatedConversations = prev.conversations.map(conv => {
            if (conv.id === prev.activeConversationId) {
              return {
                ...conv,
                messageIds: [...conv.messageIds, responseId],
                updatedAt: new Date(),
              };
            }
            return conv;
          });
          
          return {
            ...prev,
            messages: [...prev.messages, assistantMessage],
            conversations: updatedConversations,
          };
        });

        // Get previous messages for context
        const activeConversation = state.conversations.find(conv => conv.id === state.activeConversationId);
        const conversationMessages = activeConversation 
          ? state.messages.filter(msg => activeConversation.messageIds.includes(msg.id)) 
          : [];
        
        // Send message and process streaming response
        await apiService.sendStreamingChatMessage(
          content, 
          conversationMessages,
          true, // useRAG
          (chunk) => {
            // Update the response text with each chunk
            responseText += chunk;
            
            // Update message in state
            setState(prev => ({
              ...prev,
              messages: prev.messages.map(msg =>
                msg.id === responseId
                  ? { ...msg, content: responseText }
                  : msg
              )
            }));
          }
        );
      }
    } catch (error) {
      console.error("Error in chat:", error);
      
      // Show error toast
      toast.error("An error occurred while processing your request");
      
      // Add error message to chat
      const errorId = uuidv4();
      const errorMessage: MessageType = {
        id: errorId,
        content: "Sorry, an error occurred while processing your request.",
        role: "assistant",
        createdAt: new Date(),
      };
      
      setState(prev => {
        const updatedConversations = prev.conversations.map(conv => {
          if (conv.id === prev.activeConversationId) {
            return {
              ...conv,
              messageIds: [...conv.messageIds, errorId],
              updatedAt: new Date(),
            };
          }
          return conv;
        });
        
        return {
          ...prev,
          messages: [...prev.messages, errorMessage],
          conversations: updatedConversations,
        };
      });
    } finally {
      // Set loading to false
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [state.activeConversationId, state.conversations, state.messages, state.servicesReady, checkServices]);

  // Clear the current conversation
  const clearConversation = useCallback(() => {
    if (!state.activeConversationId) return;
    
    setState(prev => {
      // Find current conversation and clear its messages
      const updatedConversations = prev.conversations.map(conv => {
        if (conv.id === prev.activeConversationId) {
          return {
            ...conv,
            messageIds: [],
            title: 'New Conversation',
            updatedAt: new Date(),
          };
        }
        return conv;
      });
      
      // Remove messages that are no longer referenced by any conversation
      const allMessageIds = new Set<string>();
      updatedConversations.forEach(conv => {
        conv.messageIds.forEach(id => allMessageIds.add(id));
      });
      
      const activeMessages = prev.messages.filter(msg => allMessageIds.has(msg.id));
      
      return {
        ...prev,
        messages: activeMessages,
        conversations: updatedConversations,
      };
    });
  }, [state.activeConversationId]);

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    const newConversation = {
      id: uuidv4(),
      title: 'New Conversation',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageIds: [],
    };
    
    setState(prev => ({
      ...prev,
      activeConversationId: newConversation.id,
      conversations: [...prev.conversations, newConversation],
    }));
  }, []);

  // Switch to another conversation
  const switchConversation = useCallback((conversationId: string) => {
    setState(prev => ({
      ...prev,
      activeConversationId: conversationId,
    }));
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback((conversationId: string) => {
    setState(prev => {
      const updatedConversations = prev.conversations.filter(
        conv => conv.id !== conversationId
      );
      
      // Create a new conversation if we're deleting the last one
      if (updatedConversations.length === 0) {
        const newConversation = {
          id: uuidv4(),
          title: 'New Conversation',
          createdAt: new Date(),
          updatedAt: new Date(),
          messageIds: [],
        };
        updatedConversations.push(newConversation);
      }
      
      // If the active conversation was deleted, switch to the first one
      const activeConversationId = 
        prev.activeConversationId === conversationId
          ? updatedConversations[0].id
          : prev.activeConversationId;
      
      // Remove messages that are no longer referenced by any conversation
      const allMessageIds = new Set<string>();
      updatedConversations.forEach(conv => {
        conv.messageIds.forEach(id => allMessageIds.add(id));
      });
      
      const activeMessages = prev.messages.filter(msg => allMessageIds.has(msg.id));
      
      return {
        ...prev,
        activeConversationId,
        conversations: updatedConversations,
        messages: activeMessages,
      };
    });
  }, []);

  // Rename a conversation
  const renameConversation = useCallback((conversationId: string, newTitle: string) => {
    setState(prev => ({
      ...prev,
      conversations: prev.conversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            title: newTitle,
            updatedAt: new Date(),
          };
        }
        return conv;
      }),
    }));
  }, []);

  // Create the actions object
  const actions: ChatContextActions = {
    sendMessage,
    clearConversation,
    startNewConversation,
    switchConversation,
    deleteConversation,
    renameConversation,
    checkServices,
  };

  return (
    <ChatContext.Provider value={{ state, actions }}>
      {children}
    </ChatContext.Provider>
  );
};

// Hook for using the chat context
export const useChatContext = () => {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  
  return context;
};

// Utility hook to get active conversation messages
export const useActiveConversation = () => {
  const { state } = useChatContext();
  const { activeConversationId, conversations, messages, isLoading } = state;
  
  // Get the active conversation
  const activeConversation = conversations.find(conv => conv.id === activeConversationId);
  
  // Get messages for the active conversation
  const activeMessages = activeConversation
    ? messages.filter(msg => activeConversation.messageIds.includes(msg.id))
    : [];
  
  return {
    conversation: activeConversation,
    messages: activeMessages,
    isLoading,
  };
};