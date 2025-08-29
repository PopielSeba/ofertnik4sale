import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, File, FileText, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AttachmentFile {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface NeedsAssessmentAttachmentUploaderProps {
  value?: AttachmentFile[];
  onChange?: (files: AttachmentFile[]) => void;
  label?: string;
  placeholder?: string;
  maxFiles?: number;
}

/**
 * Komponent do wgrywania załączników do badania potrzeb
 */
export function NeedsAssessmentAttachmentUploader({
  value = [],
  onChange,
  label = "Załączniki",
  placeholder = "Kliknij aby dodać załączniki",
  maxFiles = 10
}: NeedsAssessmentAttachmentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed max files limit
    if (value.length + files.length > maxFiles) {
      toast({
        title: "Błąd",
        description: `Można dodać maksymalnie ${maxFiles} załączników`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const newAttachments: AttachmentFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
          toast({
            title: "Błąd", 
            description: `Plik ${file.name} jest za duży. Maksymalny rozmiar to 50MB`,
            variant: "destructive"
          });
          continue;
        }

        // Get upload URL
        const uploadResponse = await fetch("/api/objects/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to get upload URL for ${file.name}`);
        }

        const { uploadURL } = await uploadResponse.json();

        // Upload file to storage
        const putResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type
          }
        });

        if (!putResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        // Extract the file path from upload URL
        const url = new URL(uploadURL);
        const filePath = url.pathname;
        
        // Extract just the filename (UUID) from the path
        const fileName = filePath.split('/').pop();
        const publicPath = `/objects/uploads/${fileName}`;

        newAttachments.push({
          url: publicPath,
          name: file.name,
          type: file.type,
          size: file.size
        });
      }

      if (newAttachments.length > 0) {
        onChange?.([...value, ...newAttachments]);
        
        toast({
          title: "Sukces",
          description: `Dodano ${newAttachments.length} załącznik${newAttachments.length > 1 ? 'i' : ''}`
        });
      }

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się wgrać niektórych plików",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange?.(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText;
    return File;
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">{label}</label>
      
      {/* Existing attachments */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((attachment, index) => {
            const IconComponent = getFileIcon(attachment.type);
            return (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <div className="flex-shrink-0">
                  <IconComponent className="w-8 h-8 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload area */}
      {value.length < maxFiles && (
        <div className="relative">
          <Input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex items-center gap-3 p-6 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isUploading ? "Wgrywanie..." : placeholder}
              </p>
              <p className="text-xs text-muted-foreground">
                Wszystkie typy plików do 50MB • Maksymalnie {maxFiles} plików • {maxFiles - value.length} pozostało
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}