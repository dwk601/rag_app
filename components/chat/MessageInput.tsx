import { useState, useRef, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MessageInputProps = {
  onSendMessage: (content: string, files?: File[]) => void;
  isLoading?: boolean;
};

const MessageInput = ({ onSendMessage, isLoading = false }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() && files.length === 0) return;
    
    onSendMessage(message, files.length > 0 ? files : undefined);
    setMessage("");
    setFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const getFileIcon = (file: File) => {
    const isImage = file.type.startsWith("image/");
    return isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
          {files.map((file, index) => (
            <div 
              key={`${file.name}-${index}`} 
              className="flex items-center gap-1 bg-background rounded px-2 py-1 text-xs"
            >
              {getFileIcon(file)}
              <span className="max-w-[100px] truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-background"
                onClick={() => handleRemoveFile(file)}
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-end gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="min-h-[80px] resize-none flex-1"
          disabled={isLoading}
          rows={3}
        />
        
        <div className="flex flex-col gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept="text/*,image/*,.pdf,.doc,.docx,.txt"
          />
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "rounded-full",
              files.length > 0 && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            aria-label="Attach files"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || (message.trim() === "" && files.length === 0)}
            className="rounded-full"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
};

export default MessageInput;