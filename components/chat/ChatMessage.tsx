import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { User, Bot } from "lucide-react";

export type MessageType = {
  id: string;
  content: string;
  role: "user" | "assistant";
  createdAt?: Date;
};

type ChatMessageProps = {
  message: MessageType;
};

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div 
      className={cn(
        "flex w-full items-start gap-4 py-4",
        isUser ? "flex-row" : "flex-row"
      )}
    >
      <Avatar className={cn(
        "h-8 w-8 flex items-center justify-center rounded-full",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </Avatar>
      
      <div className="flex flex-col gap-1 w-full max-w-[calc(100%-44px)]">
        <div className="text-sm font-medium">
          {isUser ? "You" : "AI Assistant"}
        </div>
        <div className="prose prose-sm dark:prose-invert w-full max-w-none break-words">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;