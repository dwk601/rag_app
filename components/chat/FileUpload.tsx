import React, { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FileWithPreview = File & {
  preview?: string;
  id: string;
};

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  onFileRemove: (file: FileWithPreview) => void;
  acceptedTypes?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  files: FileWithPreview[];
  isUploading?: boolean;
  disabled?: boolean;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ACCEPTED_TYPES = "text/*,image/*,.pdf,.doc,.docx,.txt";

const FileUpload = ({
  onFileSelect,
  onFileRemove,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSize = DEFAULT_MAX_SIZE,
  maxFiles = 10,
  files,
  isUploading = false,
  disabled = false
}: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setError(null);
    const newFiles = Array.from(e.target.files);
    
    // Validate file count
    if (files.length + newFiles.length > maxFiles) {
      setError(`You can upload a maximum of ${maxFiles} files`);
      return;
    }
    
    // Validate file sizes
    const oversizedFiles = newFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the maximum size of ${maxSize / (1024 * 1024)}MB`);
      return;
    }
    
    onFileSelect(newFiles);
    
    // Clear input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const getFileIcon = (file: FileWithPreview) => {
    const isImage = file.type.startsWith('image/');
    return isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
  };

  // Don't render the component when disabled and no files are selected
  if (disabled && files.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* File input element (hidden) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept={acceptedTypes}
        disabled={isUploading || disabled}
        aria-label="Upload files"
      />
      
      {/* File selector button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isUploading || disabled || files.length >= maxFiles}
        className="relative"
        aria-label="Select files to upload"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4 mr-2" />
        )}
        {files.length > 0 ? `${files.length} file(s) selected` : 'Attach files'}
      </Button>
      
      {/* Error message */}
      {error && (
        <p className="text-destructive text-sm mt-1">{error}</p>
      )}
      
      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs group"
            >
              {getFileIcon(file)}
              <span className="max-w-[100px] truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onFileRemove(file)}
                disabled={isUploading || disabled}
                aria-label={`Remove file ${file.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;