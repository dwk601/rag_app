import { useState, FormEvent, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import FileUpload, { FileWithPreview } from "./FileUpload";

type MessageInputProps = {
  onSendMessage: (content: string, files?: File[]) => void;
  isLoading?: boolean;
};

const MessageInput = ({ onSendMessage, isLoading = false }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle");

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

  const handleFileSelect = useCallback((selectedFiles: File[]) => {
    const filesWithPreview = selectedFiles.map(file => {
      let preview: string | undefined;
      
      // Create preview URLs for images
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }
      
      return Object.assign(file, { 
        preview, 
        id: uuidv4() 
      }) as FileWithPreview;
    });
    
    setFiles(prev => [...prev, ...filesWithPreview]);
  }, []);

  const handleFileRemove = useCallback((fileToRemove: FileWithPreview) => {
    setFiles(prev => prev.filter(file => file.id !== fileToRemove.id));
    
    // Release object URL for previews to prevent memory leaks
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
  }, []);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
      <FileUpload 
        files={files}
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
        isUploading={isLoading || uploadStatus === "uploading"}
      />
      
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
        
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || (message.trim() === "" && files.length === 0)}
          className="rounded-full h-10 w-10"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default MessageInput;