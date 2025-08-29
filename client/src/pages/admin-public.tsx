import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Store, Plus, Edit, Trash2, DollarSign, Settings, Wrench, Save, Copy, Search, Upload, Image } from "lucide-react";

import PublicEquipmentAdditionalManager from "@/components/public-equipment-additional-manager";
import { PublicServiceCostsManager } from "@/components/public-service-costs-manager";

// Types
interface PublicEquipmentCategory {
  id: number;
  name: string;
  description?: string;
}

interface PublicEquipmentPricing {
  id?: number;
  equipmentId: number;
  periodStart: number;
  periodEnd: number | null;
  pricePerDay: string;
  discountPercent: string;
}

interface PublicEquipmentAdditional {
  id?: number;
  equipmentId: number;
  type: string;
  position: number;
  name: string;
  description?: string;
  pricePerDay: string;
  isOptional: boolean;
}

interface PublicEquipment {
  id: number;
  name: string;
  categoryId: number;
  description?: string;
  model?: string;
  power?: string;
  fuelConsumption75?: string;
  dimensions?: string;
  weight?: string;
  engine?: string;
  alternator?: string;
  fuelTankCapacity?: number;
  imageUrl?: string;
  quantity: number;
  availableQuantity: number;
  isActive: boolean;
  category: PublicEquipmentCategory;
  pricing: PublicEquipmentPricing[];
  additionalEquipment: PublicEquipmentAdditional[];
}

// Form schemas
const categorySchema = z.object({
  name: z.string().min(1, "Nazwa kategorii jest wymagana"),
  description: z.string().optional(),
});

const equipmentSchema = z.object({
  name: z.string().min(1, "Nazwa sprzętu jest wymagana"),
  categoryId: z.number().min(1, "Kategoria jest wymagana"),
  description: z.string().optional(),
  model: z.string().optional(),
  power: z.string().optional(),
  fuelConsumption75: z.union([z.string(), z.null()]).optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  engine: z.string().optional(),
  alternator: z.string().optional(),
  fuelTankCapacity: z.union([z.number(), z.null()]).optional(),
  imageUrl: z.string().optional(),
  quantity: z.number().min(0, "Ilość nie może być ujemna"),
  availableQuantity: z.number().min(0, "Dostępna ilość nie może być ujemna"),
  isActive: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type EquipmentFormData = z.infer<typeof equipmentSchema>;

export default function AdminPublic() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect non-authorized users
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'public_manager'))) {
      toast({
        title: "Brak uprawnień",
        description: "Dostęp do administracji wynajmu publicznego jest dostępny tylko dla administratorów i kierowników wynajmu publicznego.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, user, authLoading, toast]);
  
  // State
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showAdditionalDialog, setShowAdditionalDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<PublicEquipment | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<PublicEquipment | null>(null);
  const [additionalEquipment, setAdditionalEquipment] = useState<PublicEquipmentAdditional[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PublicEquipmentPricing[]>([]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");
  const [showServiceCosts, setShowServiceCosts] = useState(false);
  const [showAdditionalManager, setShowAdditionalManager] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Forms
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" }
  });

  const equipmentForm = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: "",
      categoryId: 0,
      description: "",
      model: "",
      power: "",
      fuelConsumption75: "",
      dimensions: "",
      weight: "",
      engine: "",
      alternator: "",
      fuelTankCapacity: 0,
      imageUrl: "",
      quantity: 1,
      availableQuantity: 1,
      isActive: true,
    }
  });

  // Queries
  const { data: categories = [], refetch: refetchCategories } = useQuery<PublicEquipmentCategory[]>({
    queryKey: ["/api/public-equipment-categories"],
  });

  const { data: equipment = [], refetch: refetchEquipment } = useQuery<PublicEquipment[]>({
    queryKey: ["/api/public-equipment"],
  });

  // Filter equipment based on search term
  const filteredEquipment = equipment.filter(equip =>
    equip.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equip.description?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equip.model?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equip.category.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
  );

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return apiRequest("/api/public-equipment-categories", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-equipment-categories"] });
      setShowCategoryDialog(false);
      categoryForm.reset();
      toast({ title: "Sukces", description: "Kategoria została utworzona" });
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      return apiRequest(`/api/public-equipment-categories/${categoryId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-equipment-categories"] });
      toast({ title: "Sukces", description: "Kategoria została usunięta" });
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      console.log('Creating equipment with data:', data);
      const response = await apiRequest("/api/public-equipment", "POST", data);
      const result = await response.json();
      console.log('Equipment created:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Equipment creation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["/api/public-equipment"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public-equipment-categories"] });
      setShowEquipmentDialog(false);
      setEditingEquipment(null);
      equipmentForm.reset();
      toast({ title: "Sukces", description: "Sprzęt został utworzony" });
    },
    onError: (error: any) => {
      console.error('Equipment creation error:', error);
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EquipmentFormData }) => {
      return apiRequest(`/api/public-equipment/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-equipment"] });
      setShowEquipmentDialog(false);
      setEditingEquipment(null);
      equipmentForm.reset();
      toast({ title: "Sukces", description: "Sprzęt został zaktualizowany" });
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (equipmentId: number) => {
      return apiRequest(`/api/public-equipment/${equipmentId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-equipment"] });
      toast({ title: "Sukces", description: "Sprzęt został usunięty" });
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  // Event handlers
  const onCreateCategory = (data: CategoryFormData) => {
    createCategoryMutation.mutate(data);
  };

  const onCreateEquipment = (data: EquipmentFormData) => {
    console.log('onCreateEquipment called with:', data);
    
    // Transform empty strings to null for numeric fields
    const processedData = {
      ...data,
      fuelConsumption75: data.fuelConsumption75 || null,
      fuelTankCapacity: data.fuelTankCapacity || null,
      quantity: Number(data.quantity) || 0,
      availableQuantity: Number(data.availableQuantity) || 0,
    };
    
    console.log('Processed data:', processedData);
    
    if (editingEquipment) {
      console.log('Updating equipment:', editingEquipment.id);
      updateEquipmentMutation.mutate({ id: editingEquipment.id, data: processedData });
    } else {
      console.log('Creating new equipment');
      createEquipmentMutation.mutate(processedData);
    }
  };

  const handleEditEquipment = (equipment: PublicEquipment) => {
    setEditingEquipment(equipment);
    equipmentForm.reset({
      name: equipment.name,
      categoryId: equipment.categoryId,
      description: equipment.description || "",
      model: equipment.model || "",
      power: equipment.power || "",
      fuelConsumption75: equipment.fuelConsumption75 || "",
      dimensions: equipment.dimensions || "",
      weight: equipment.weight || "",
      engine: equipment.engine || "",
      alternator: equipment.alternator || "",
      fuelTankCapacity: equipment.fuelTankCapacity || 0,
      imageUrl: equipment.imageUrl || "",
      quantity: equipment.quantity,
      availableQuantity: equipment.availableQuantity,
      isActive: equipment.isActive,
    });
    setShowEquipmentDialog(true);
  };

  const handleDeleteEquipment = (equipmentId: number) => {
    if (confirm("Czy na pewno chcesz usunąć ten sprzęt?")) {
      deleteEquipmentMutation.mutate(equipmentId);
    }
  };

  const handleDeleteCategory = (categoryId: number) => {
    const categoryEquipment = equipment.filter(eq => eq.categoryId === categoryId);
    if (categoryEquipment.length > 0) {
      toast({
        title: "Błąd",
        description: "Nie można usunąć kategorii, która zawiera sprzęt. Najpierw usuń lub przenieś sprzęt.",
        variant: "destructive"
      });
      return;
    }
    
    if (confirm("Czy na pewno chcesz usunąć tę kategorię?")) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Store className="w-8 h-8 text-blue-600" />
              Administracja - Wynajem Publiczny
            </h1>
            <p className="text-muted-foreground mt-2">
              Zarządzanie sprzętem wynajmu publicznego, kategoriami i cenami
            </p>
          </div>
        </div>

        <Tabs defaultValue="equipment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="equipment">Sprzęt</TabsTrigger>
            <TabsTrigger value="categories">Kategorie</TabsTrigger>
          </TabsList>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Sprzęt Wynajmu Publicznego</h2>
              <Dialog open={showEquipmentDialog} onOpenChange={setShowEquipmentDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingEquipment(null); equipmentForm.reset(); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj sprzęt
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingEquipment ? "Edytuj sprzęt" : "Dodaj nowy sprzęt"}</DialogTitle>
                  </DialogHeader>
                  <Form {...equipmentForm}>
                    <form onSubmit={equipmentForm.handleSubmit(onCreateEquipment)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={equipmentForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nazwa sprzętu *</FormLabel>
                              <FormControl>
                                <Input placeholder="Nazwa sprzętu..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={equipmentForm.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kategoria *</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Wybierz kategorię" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={equipmentForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Opis</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Opis sprzętu..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={equipmentForm.control}
                          name="model"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model</FormLabel>
                              <FormControl>
                                <Input placeholder="Model..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={equipmentForm.control}
                          name="power"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Moc</FormLabel>
                              <FormControl>
                                <Input placeholder="np. 90.18 kW" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={equipmentForm.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ilość całkowita</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={equipmentForm.control}
                          name="availableQuantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ilość dostępna</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={equipmentForm.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zdjęcie sprzętu</FormLabel>
                            <FormControl>
                              <div className="space-y-4">
                                <Input placeholder="URL zdjęcia lub wgraj plik..." {...field} />
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={async () => {
                                      console.log('Simple upload button clicked');
                                      // Create a simple file input
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'image/*';
                                      input.onchange = async (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) {
                                          try {
                                            console.log('File selected:', file.name);
                                            // Get upload URL
                                            const responseRaw = await apiRequest("/api/objects/upload", "POST");
                                            const response = await responseRaw.json();
                                            console.log('Upload URL response:', response);
                                            
                                            if (!response.uploadURL) {
                                              console.error('No uploadURL in response:', response);
                                              throw new Error('Brak upload URL w odpowiedzi serwera');
                                            }
                                            
                                            // Upload file directly
                                            const uploadResponse = await fetch(response.uploadURL, {
                                              method: 'PUT',
                                              body: file,
                                              headers: {
                                                'Content-Type': file.type,
                                              },
                                            });
                                            
                                            if (uploadResponse.ok) {
                                              // Extract file ID from upload URL
                                              const urlParts = response.uploadURL.split('/');
                                              const fileId = urlParts[urlParts.length - 1].split('?')[0];
                                              const imageUrl = `/objects/uploads/${fileId}`;
                                              
                                              field.onChange(imageUrl);
                                              toast({ 
                                                title: "Sukces", 
                                                description: "Zdjęcie zostało wgrane" 
                                              });
                                            } else {
                                              throw new Error('Upload failed');
                                            }
                                          } catch (error) {
                                            console.error('Upload error:', error);
                                            toast({ 
                                              title: "Błąd", 
                                              description: "Nie udało się wgrać zdjęcia",
                                              variant: "destructive"
                                            });
                                          }
                                        }
                                      };
                                      input.click();
                                    }}
                                    className="flex-1"
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Wgraj zdjęcie
                                  </Button>
                                  {field.value && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => field.onChange("")}
                                      className="flex-shrink-0"
                                    >
                                      Usuń
                                    </Button>
                                  )}
                                </div>
                                {field.value && (
                                  <div className="mt-2">
                                    <img
                                      src={field.value}
                                      alt="Podgląd"
                                      className="w-32 h-24 object-cover rounded border"
                                      onError={(e) => {
                                        console.error('Image failed to load:', field.value);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowEquipmentDialog(false)}>
                          Anuluj
                        </Button>
                        <Button type="submit" disabled={createEquipmentMutation.isPending || updateEquipmentMutation.isPending}>
                          {editingEquipment ? "Aktualizuj" : "Dodaj sprzęt"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj sprzętu (nazwa, opis, model, kategoria)..."
                value={equipmentSearchTerm}
                onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEquipment.map((item) => (
                <Card key={item.id} className="relative">
                  {/* Equipment Image */}
                  {item.imageUrl && item.imageUrl.trim() !== "" && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{item.category.name}</p>
                      </div>
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? "Aktywny" : "Nieaktywny"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm space-y-1">
                      {item.model && <p><span className="font-medium">Model:</span> {item.model}</p>}
                      {item.power && <p><span className="font-medium">Moc:</span> {item.power}</p>}
                      <p><span className="font-medium">Ilość:</span> {item.quantity}</p>
                      <p><span className="font-medium">Dostępne:</span> {item.availableQuantity}</p>
                    </div>
                    
                    <div className="flex gap-2 mt-4 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handleEditEquipment(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEquipment(item);
                          setShowPricingDialog(true);
                        }}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Ceny
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEquipment(item);
                          setShowServiceCosts(true);
                        }}
                      >
                        <Wrench className="w-4 h-4 mr-1" />
                        Serwis
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEquipment(item);
                          setShowAdditionalManager(true);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Dodatki
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteEquipment(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Kategorie Wynajmu Publicznego</h2>
              <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj kategorię
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dodaj nową kategorię</DialogTitle>
                  </DialogHeader>
                  <Form {...categoryForm}>
                    <form onSubmit={categoryForm.handleSubmit(onCreateCategory)} className="space-y-4">
                      <FormField
                        control={categoryForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nazwa kategorii</FormLabel>
                            <FormControl>
                              <Input placeholder="Nazwa kategorii..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={categoryForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Opis (opcjonalny)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Opis kategorii..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
                          Anuluj
                        </Button>
                        <Button type="submit" disabled={createCategoryMutation.isPending}>
                          {createCategoryMutation.isPending ? "Dodawanie..." : "Dodaj kategorię"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Service Costs Manager */}
        {showServiceCosts && selectedEquipment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <PublicServiceCostsManager
                  equipment={selectedEquipment as any}
                  onClose={() => {
                    setShowServiceCosts(false);
                    setSelectedEquipment(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Additional Equipment Manager */}
        {showAdditionalManager && selectedEquipment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <PublicEquipmentAdditionalManager
                  equipmentId={selectedEquipment.id}
                  equipmentName={selectedEquipment.name}
                />
                <div className="flex justify-end mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAdditionalManager(false);
                      setSelectedEquipment(null);
                    }}
                  >
                    Zamknij
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Dialog */}
        {showPricingDialog && selectedEquipment && (
          <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Cennik - {selectedEquipment.name}</DialogTitle>
              </DialogHeader>
              <PricingManager 
                equipmentId={selectedEquipment.id}
                onClose={() => {
                  setShowPricingDialog(false);
                  setSelectedEquipment(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

// Pricing Manager Component
function PricingManager({ equipmentId, onClose }: { equipmentId: number; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pricingTiers, setPricingTiers] = useState<PublicEquipmentPricing[]>([
    { id: 0, equipmentId, periodStart: 1, periodEnd: 2, pricePerDay: "0", discountPercent: "0" },
    { id: 0, equipmentId, periodStart: 3, periodEnd: 7, pricePerDay: "0", discountPercent: "14.29" },
    { id: 0, equipmentId, periodStart: 8, periodEnd: 18, pricePerDay: "0", discountPercent: "28.57" },
    { id: 0, equipmentId, periodStart: 19, periodEnd: 29, pricePerDay: "0", discountPercent: "42.86" },
    { id: 0, equipmentId, periodStart: 30, periodEnd: null, pricePerDay: "0", discountPercent: "57.14" },
  ]);

  // Fetch existing pricing
  const { data: existingPricing } = useQuery({
    queryKey: [`/api/public-equipment/${equipmentId}/pricing`],
    enabled: !!equipmentId,
  });

  useEffect(() => {
    if (existingPricing && Array.isArray(existingPricing) && existingPricing.length > 0) {
      setPricingTiers(existingPricing);
    }
  }, [existingPricing]);

  const savePricingMutation = useMutation({
    mutationFn: async (pricing: PublicEquipmentPricing[]) => {
      // Clean up data for API - remove id and createdAt for new records
      const cleanedPricing = pricing.map(tier => ({
        periodStart: tier.periodStart,
        periodEnd: tier.periodEnd,
        pricePerDay: tier.pricePerDay,
        discountPercent: tier.discountPercent,
      }));
      return apiRequest(`/api/public-equipment/${equipmentId}/pricing`, "POST", cleanedPricing);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public-equipment/${equipmentId}/pricing`] });
      toast({ title: "Sukces", description: "Cennik został zaktualizowany" });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const updatePricingTier = (index: number, field: string, value: string) => {
    const updated = [...pricingTiers];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate pricing based on first tier (base price)
    if (index === 0 && field === 'pricePerDay') {
      const basePrice = parseFloat(value) || 0;
      if (basePrice > 0) {
        // Apply standard discounts to other tiers
        updated[1] = { ...updated[1], pricePerDay: (basePrice * (1 - 0.1429)).toFixed(2) };
        updated[2] = { ...updated[2], pricePerDay: (basePrice * (1 - 0.2857)).toFixed(2) };
        updated[3] = { ...updated[3], pricePerDay: (basePrice * (1 - 0.4286)).toFixed(2) };
        updated[4] = { ...updated[4], pricePerDay: (basePrice * (1 - 0.5714)).toFixed(2) };
      }
    }

    // Auto-calculate discount percentage when price changes (except for first tier)
    if (index > 0 && field === 'pricePerDay') {
      const basePrice = parseFloat(updated[0].pricePerDay) || 0;
      const currentPrice = parseFloat(value) || 0;
      if (basePrice > 0 && currentPrice >= 0) {
        const discountPercent = ((basePrice - currentPrice) / basePrice * 100).toFixed(2);
        updated[index] = { ...updated[index], discountPercent };
      }
    }

    // Auto-calculate price when discount changes
    if (field === 'discountPercent' && index > 0) {
      const basePrice = parseFloat(updated[0].pricePerDay) || 0;
      const discount = parseFloat(value) || 0;
      if (basePrice > 0) {
        const newPrice = (basePrice * (1 - discount / 100)).toFixed(2);
        updated[index] = { ...updated[index], pricePerDay: newPrice };
      }
    }

    setPricingTiers(updated);
  };

  const formatPeriod = (start: number, end: number | null) => {
    if (end === null) return `${start}+ dni`;
    return `${start}-${end} dni`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 font-medium text-sm bg-muted p-3 rounded">
        <div>Okres (dni)</div>
        <div>Cena za dzień (zł)</div>
        <div>Rabat (%)</div>
      </div>
      
      {pricingTiers.map((tier, index) => (
        <div key={index} className="grid grid-cols-3 gap-4 items-center p-3 border rounded">
          <div className="text-sm font-medium">
            {formatPeriod(tier.periodStart, tier.periodEnd)}
          </div>
          <Input
            type="number"
            step="0.01"
            value={tier.pricePerDay}
            onChange={(e) => updatePricingTier(index, 'pricePerDay', e.target.value)}
            placeholder="0.00"
          />
          <Input
            type="number"
            step="0.01"
            value={tier.discountPercent}
            onChange={(e) => updatePricingTier(index, 'discountPercent', e.target.value)}
            placeholder="0.00"
          />
        </div>
      ))}

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Anuluj
        </Button>
        <Button 
          onClick={() => savePricingMutation.mutate(pricingTiers)}
          disabled={savePricingMutation.isPending}
        >
          {savePricingMutation.isPending ? "Zapisywanie..." : "Zapisz cennik"}
        </Button>
      </div>
    </div>
  );
}