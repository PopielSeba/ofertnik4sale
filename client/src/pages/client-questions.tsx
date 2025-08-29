import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Save, FileText, User, Building, ArrowLeft, ArrowRight, Paperclip, Upload, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";


interface NeedsAssessmentQuestion {
  id: number;
  category: string;
  question: string;
  type: string;
  options?: any;
  isRequired: boolean;
  position: number;
  isActive: boolean;
  categoryType?: string;
}

const mandatoryCategories = [
  "Informacje ogólne",
  "Warunki otoczenia", 
  "Logistyka i dodatkowe usługi",
  "Dodatkowe informacje"
];

export default function ClientQuestions() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  const [attachments, setAttachments] = useState<Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>>([]);
  const [clientData, setClientData] = useState({
    companyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: ""
  });

  // Query for getting questions
  const { data: questions = [], isLoading } = useQuery<NeedsAssessmentQuestion[]>({
    queryKey: ["/api/needs-assessment/questions"],
  });

  // Separate questions by category type  
  const generalQuestions = questions.filter(q => q.categoryType === 'general' || !q.categoryType);
  const equipmentQuestions = questions.filter(q => q.categoryType === 'equipment');

  // Build dynamic list of all categories with proper ordering
  const allCategories = useMemo(() => {
    // First get general categories
    const generalCats = Array.from(new Set(generalQuestions.map(q => q.category)));
    // Then get equipment categories
    const equipmentCats = Array.from(new Set(equipmentQuestions.map(q => q.category)));
    
    // Sort general categories to ensure mandatory categories appear first
    const sortedGeneralCats = generalCats.sort((a, b) => {
      const aIsMandatory = mandatoryCategories.includes(a);
      const bIsMandatory = mandatoryCategories.includes(b);
      
      if (aIsMandatory && !bIsMandatory) return -1;
      if (!aIsMandatory && bIsMandatory) return 1;
      
      if (aIsMandatory && bIsMandatory) {
        return mandatoryCategories.indexOf(a) - mandatoryCategories.indexOf(b);
      }
      
      return a.localeCompare(b);
    });
    
    // Sort equipment categories alphabetically
    const sortedEquipmentCats = equipmentCats.sort((a, b) => a.localeCompare(b));
    
    // Return general categories first, then equipment categories
    return [...sortedGeneralCats, ...sortedEquipmentCats];
  }, [generalQuestions, equipmentQuestions]);

  // Group questions by category with conditional equipment sections (use useMemo for reactivity)
  const questionsByCategory = useMemo(() => {
    const result = allCategories.map(category => {
      // Check if this is an equipment accessory category
      const isEquipmentAccessory = category.includes(' - wyposażenie');
      
      if (isEquipmentAccessory) {
        // Extract the base equipment category and handle name variations
        let baseCategory = category.replace(' - wyposażenie', '');
        
        // Handle the name mapping differences between database categories
        if (baseCategory === 'Maszty oświetleniowe') {
          baseCategory = 'Maszt oświetleniowy';
        } else if (baseCategory === 'Nagrzewnice') {
          baseCategory = 'Nagrzewnica';
        }
        
        // Only include this accessory category if the base equipment category is selected
        if (!selectedCategories[baseCategory]) {
          return null; // Don't show equipment accessories if base equipment not selected
        }
      }
      
      return {
        category,
        questions: questions.filter(q => q.category === category && q.isActive)
          .sort((a, b) => a.position - b.position)
      };
    }).filter(group => group !== null && group.questions.length > 0);
    
    return result;
  }, [questions, selectedCategories, allCategories]); // Re-calculate when questions or selectedCategories change

  const currentCategory = questionsByCategory[currentStep];

  // Effect to handle currentStep adjustment when categories change due to equipment selection
  useEffect(() => {
    // If current step is beyond available categories, adjust it
    if (currentStep >= questionsByCategory.length && questionsByCategory.length > 0) {
      setCurrentStep(questionsByCategory.length - 1);
    }
  }, [questionsByCategory.length, currentStep]);

  const handleResponseChange = (questionId: number, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: checked
    }));
    
    // If unchecking a category, clear all responses for that category AND its equipment accessories
    if (!checked) {
      const categoryQuestions = questions.filter(q => q.category === category);
      const equipmentAccessoryQuestions = questions.filter(q => q.category === `${category} - wyposażenie`);
      
      setResponses(prev => {
        const newResponses = { ...prev };
        // Clear main category questions
        categoryQuestions.forEach(q => {
          delete newResponses[q.id];
        });
        // Clear equipment accessory questions
        equipmentAccessoryQuestions.forEach(q => {
          delete newResponses[q.id];
        });
        return newResponses;
      });
    }
  };

  const isCategorySelected = (category: string) => {
    // Mandatory categories are always "selected"
    if (mandatoryCategories.includes(category)) {
      return true;
    }
    return selectedCategories[category] === true;
  };

  const isCategoryMandatory = (category: string) => {
    return mandatoryCategories.includes(category);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed max files limit
    if (attachments.length + files.length > 10) {
      toast({
        title: "Błąd",
        description: "Można dodać maksymalnie 10 załączników",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const newAttachments = [];

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
        setAttachments(prev => [...prev, ...newAttachments]);
        
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Submit mutation for client version
  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/client/needs-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to submit');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sukces!",
        description: "Twoje odpowiedzi zostały wysłane. Skontaktujemy się z Tobą w ciągu 24 godzin.",
        variant: "default"
      });
      setLocation("/client-portal");
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Wystąpił problem podczas wysyłania. Spróbuj ponownie.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    // Validate that at least one client field is filled
    if (!clientData.companyName && !clientData.contactPerson && !clientData.phone && !clientData.email) {
      toast({
        title: "Błąd",
        description: "Wypełnij przynajmniej jedno pole klienta",
        variant: "destructive",
      });
      return;
    }

    const assessmentData = {
      clientCompanyName: clientData.companyName,
      clientContactPerson: clientData.contactPerson,
      clientPhone: clientData.phone,
      clientEmail: clientData.email,
      clientAddress: clientData.address,
      responses: responses,
      attachments: attachments
    };

    submitMutation.mutate(assessmentData);
  };

  const canGoNext = () => {
    if (!currentCategory) return false;
    
    // If category is not selected, we can skip it
    if (!isCategorySelected(currentCategory.category)) {
      return true;
    }
    
    // If category is selected, check required questions are answered
    const requiredQuestions = currentCategory.questions.filter(q => q.isRequired);
    return requiredQuestions.every(q => responses[q.id]?.trim());
  };

  const canGoPrevious = () => currentStep > 0;


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-500 via-blue-400 to-gray-100 flex items-center justify-center">
        <div className="text-white text-xl">Ładowanie pytań...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 via-blue-400 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setLocation("/client-portal")}
              className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Powrót do portalu klienta
            </button>
            <div className="flex items-center space-x-3">
              <ClipboardList className="w-8 h-8 text-white" />
              <h1 className="text-3xl font-bold text-white">Badanie Potrzeb</h1>
            </div>
            <div></div>
          </div>
          <p className="text-white/90 text-center">
            Przeprowadź szczegółową analizę potrzeb aby otrzymać najlepszą ofertę
          </p>
        </div>

        {/* Client Information */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Informacje o kliencie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Nazwa firmy</Label>
                <Input
                  id="companyName"
                  value={clientData.companyName}
                  onChange={(e) => setClientData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="np. ABC Sp. z o.o."
                />
              </div>
              <div>
                <Label htmlFor="contactPerson">Osoba kontaktowa</Label>
                <Input
                  id="contactPerson"
                  value={clientData.contactPerson}
                  onChange={(e) => setClientData(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="np. Jan Kowalski"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={clientData.phone}
                  onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="np. +48 123 456 789"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={clientData.email}
                  onChange={(e) => setClientData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="np. kontakt@abc.pl"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                value={clientData.address}
                onChange={(e) => setClientData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Pełny adres lokalizacji..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Attachments Section */}
        <Card className="mb-6 bg-white/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Paperclip className="w-5 h-5 mr-2" />
              Załączniki (opcjonalne)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Możesz załączyć zdjęcia, dokumenty lub inne pliki pomocne w przygotowaniu oferty.
            </p>
            
            {/* File Upload */}
            {attachments.length < 10 && (
              <div className="relative">
                <Input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="*/*"
                />
                <Button
                  type="button"
                  variant="outline" 
                  className="w-full h-20 border-2 border-dashed hover:bg-muted/50"
                  disabled={isUploading}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="w-6 h-6" />
                    <span>{isUploading ? "Wgrywanie..." : "Kliknij aby dodać pliki"}</span>
                    <span className="text-xs text-muted-foreground">
                      Wszystkie typy plików do 50MB • Max 10 plików • {10 - attachments.length} pozostało
                    </span>
                  </div>
                </Button>
              </div>
            )}

            {/* List of uploaded files */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Załączone pliki:</h4>
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAttachments(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress indicator */}
        {questionsByCategory.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">
                Krok {currentStep + 1} z {questionsByCategory.length}
              </span>
              <span className="text-sm text-white/80">
                {Math.round(((currentStep + 1) / questionsByCategory.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / questionsByCategory.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Current Category Questions */}
        {currentCategory && (
          <Card className="mb-6 bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {!isCategoryMandatory(currentCategory.category) && (
                    <Checkbox
                      id={`category-${currentStep}`}
                      checked={isCategorySelected(currentCategory.category)}
                      onCheckedChange={(checked) => 
                        handleCategoryToggle(currentCategory.category, checked as boolean)
                      }
                    />
                  )}
                  <span>{currentCategory.category}</span>
                  {isCategoryMandatory(currentCategory.category) && (
                    <Badge variant="default" className="ml-2">Wymagane</Badge>
                  )}
                </div>
                <Badge variant="secondary">
                  {currentCategory.questions.length} pytań
                </Badge>
              </CardTitle>
              {!isCategoryMandatory(currentCategory.category) && (
                <p className="text-sm text-muted-foreground mt-2">
                  Zaznacz checkbox powyżej jeśli potrzebujesz tego typu urządzenia
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {currentCategory.questions.map((question) => (
                <div key={question.id} className={`space-y-2 ${question.type === 'equipment_option' ? 'ml-6' : ''}`}>
                  {/* Equipment option - render as inline checkbox */}
                  {question.type === 'equipment_option' ? (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`q-${question.id}`}
                        checked={responses[question.id] === 'true'}
                        onCheckedChange={(checked) => 
                          handleResponseChange(question.id, checked ? 'true' : 'false')
                        }
                        disabled={!isCategorySelected(currentCategory.category)}
                      />
                      <Label htmlFor={`q-${question.id}`} className="text-sm font-normal">
                        {question.question}
                      </Label>
                    </div>
                  ) : question.type === 'multiple_choice' ? (
                    /* Multiple choice header - just display as heading */
                    <div className="font-medium text-base text-gray-800 mb-2">
                      {question.question}
                    </div>
                  ) : question.type === 'radio' ? (
                    /* Radio buttons */
                    <div>
                      <Label className="text-base font-medium">
                        {question.question}
                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <RadioGroup
                        value={responses[question.id] || ''}
                        onValueChange={(value) => handleResponseChange(question.id, value)}
                        disabled={!isCategorySelected(currentCategory.category)}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="tak" id={`${question.id}-tak`} />
                          <Label htmlFor={`${question.id}-tak`}>Tak</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nie" id={`${question.id}-nie`} />
                          <Label htmlFor={`${question.id}-nie`}>Nie</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  ) : (
                    /* Text area for open-ended questions */
                    <div>
                      <Label className="text-base font-medium">
                        {question.question}
                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Textarea
                        value={responses[question.id] || ''}
                        onChange={(e) => handleResponseChange(question.id, e.target.value)}
                        placeholder="Wprowadź swoją odpowiedź..."
                        className="mt-2"
                        rows={3}
                        disabled={!isCategorySelected(currentCategory.category)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mb-6">
          <Button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={!canGoPrevious()}
            variant="outline"
            className="bg-white/90 hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Poprzedni
          </Button>

          {currentStep < questionsByCategory.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canGoNext()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Następny
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || !canGoNext()}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              {submitMutation.isPending ? (
                "Wysyłanie..."
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Wyślij badanie
                </>
              )}
            </Button>
          )}
        </div>

        <div className="text-center">
          <p className="text-white/80 text-sm">
            Skontaktujemy się z Tobą w ciągu 24 godzin z przygotowaną ofertą
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-white/70 text-xs">
          <p>System Wycen Ofertnik by PPP :: PROGRAM Sebastian Popiel, tel. +48 500 600 525</p>
        </div>
      </div>
    </div>
  );
}