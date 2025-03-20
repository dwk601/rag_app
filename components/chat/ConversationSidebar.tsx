'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/hooks/useChatContext";
import { PenLine, Trash2, MessageSquarePlus, Loader2 } from 'lucide-react';

export const ConversationSidebar = () => {
  const { state, actions } = useChatContext();
  const { conversations, activeConversationId, isLoading } = state;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true after component mounts to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Format relative time for the conversation using native JavaScript
  const formatRelativeTime = (date: Date) => {
    // Only format time on client side to avoid hydration issues
    if (!isClient) return '';
    
    try {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) {
        return 'just now';
      }
      
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      }
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      }
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      }
      
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) {
        return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
      }
      
      const diffInYears = Math.floor(diffInDays / 365);
      return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
    } catch (error) {
      return 'recently';
    }
  };
  
  // Start editing a conversation title
  const handleStartEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditedTitle(currentTitle);
  };
  
  // Save the edited title
  const handleSaveTitle = (id: string) => {
    if (editedTitle.trim()) {
      actions.renameConversation(id, editedTitle.trim());
    }
    setEditingId(null);
  };
  
  // Handle key presses during editing
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/40 border-r">
      <div className="p-3 border-b">
        <Button 
          variant="default" 
          className="w-full"
          onClick={actions.startNewConversation}
          disabled={isLoading}
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">No conversations yet</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {conversations
              .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) // Latest first
              .map(conversation => (
                <li 
                  key={conversation.id} 
                  className={`
                    group rounded-md transition-colors
                    ${activeConversationId === conversation.id 
                      ? "bg-primary/10 hover:bg-primary/20"
                      : "hover:bg-muted"
                    }
                  `}
                >
                  <div 
                    className="flex items-center justify-between p-2 cursor-pointer"
                    onClick={() => actions.switchConversation(conversation.id)}
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      {editingId === conversation.id ? (
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          onBlur={() => handleSaveTitle(conversation.id)}
                          onKeyDown={(e) => handleKeyDown(e, conversation.id)}
                          className="w-full px-1 py-0.5 bg-background border rounded text-sm"
                          autoFocus
                        />
                      ) : (
                        <>
                          <h3 className="text-sm font-medium truncate">
                            {conversation.title || "New Conversation"}
                          </h3>
                          {isClient && (
                            <p className="text-xs text-muted-foreground truncate">
                              {formatRelativeTime(conversation.updatedAt)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    
                    {editingId !== conversation.id && (
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditing(conversation.id, conversation.title || "");
                          }}
                          aria-label="Edit conversation"
                        >
                          <PenLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            actions.deleteConversation(conversation.id);
                          }}
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
      
      {/* Clear conversation option at the bottom */}
      <div className="p-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={actions.clearConversation}
          disabled={isLoading || !activeConversationId}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Clear Conversation
        </Button>
      </div>
    </div>
  );
};

export default ConversationSidebar;