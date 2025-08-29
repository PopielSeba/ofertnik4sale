import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShopImageUploaderProps {
  value?: string;
  onChange?: (url: string) => void;
  label?: string;
  placeholder?: string;
}

/**
 * Komponent do wgrywania zdjęć produktów sklepu
 */
export function ShopImageUploader({
  value = "",
  onChange,
  label = "Zdjęcie",
  placeholder = "Kliknij aby wgrać zdjęcie"
}: ShopImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Błąd",
        description: "Można wgrywać tylko pliki graficzne",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Błąd", 
        description: "Plik jest za duży. Maksymalny rozmiar to 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get upload URL
      const uploadResponse = await fetch("/api/shop-images/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
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
        throw new Error("Failed to upload file");
      }

      // Extract the file path from upload URL
      const url = new URL(uploadURL);
      const filePath = url.pathname;
      
      // Extract just the filename (UUID) from the path
      const fileName = filePath.split('/').pop();
      const publicPath = `/public-objects/shop-images/${fileName}`;

      onChange?.(publicPath);
      
      toast({
        title: "Sukces",
        description: "Zdjęcie zostało wgrane"
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się wgrać zdjęcia",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleRemove = () => {
    onChange?.("");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      {value ? (
        <div className="relative">
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
              <img 
                src={value} 
                alt="Preview" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Show placeholder if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden absolute inset-0 flex items-center justify-center">
                <Image className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Zdjęcie wgrane</p>
              <p className="text-xs text-muted-foreground truncate">{value}</p>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Input
            type="file"
            accept="image/*"
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
                PNG, JPG, GIF do 10MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}