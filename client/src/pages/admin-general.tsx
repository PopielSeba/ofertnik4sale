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
import { Package, Plus, Edit, Trash2, DollarSign, Settings, Wrench, Save, Copy, Search, Upload, Image } from "lucide-react";



// Types
interface GeneralEquipmentCategory {
  id: number;
  name: string;
  description?: string;
}

interface GeneralEquipmentPricing {
  id?: number;
  equipmentId: number;
  periodStart: number;
  periodEnd: number | null;
  pricePerDay: string;
  discountPercent: string;
}

interface GeneralEquipmentAdditional {
  id?: number;
  equipmentId: number;
  type: string;
  position: number;
  name: string;
  description?: string;
  pricePerDay: string;
  isOptional: boolean;
}

interface GeneralEquipment {
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
  category: GeneralEquipmentCategory;
  pricing: GeneralEquipmentPricing[];
  additionalEquipment: GeneralEquipmentAdditional[];
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
  fuelConsumption75: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  engine: z.string().optional(),
  alternator: z.string().optional(),
  fuelTankCapacity: z.number().optional(),
  imageUrl: z.string().optional(),
  quantity: z.number().min(0, "Ilość nie może być ujemna"),
  availableQuantity: z.number().min(0, "Dostępna ilość nie może być ujemna"),
  isActive: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type EquipmentFormData = z.infer<typeof equipmentSchema>;

export default function AdminGeneral() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect non-authorized users
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'general_manager'))) {
      toast({
        title: "Brak uprawnień",
        description: "Dostęp do administracji wynajmu ogólnego jest dostępny tylko dla administratorów i kierowników wynajmu ogólnego.",
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
  const [editingEquipment, setEditingEquipment] = useState<GeneralEquipment | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<GeneralEquipment | null>(null);
  const [additionalEquipment, setAdditionalEquipment] = useState<GeneralEquipmentAdditional[]>([]);
  const [pricingTiers, setPricingTiers] = useState<GeneralEquipmentPricing[]>([]);
  const [fieldLabels, setFieldLabels] = useState({
    power: "Moc",
    engine: "Silnik", 
    alternator: "Alternator",
    fuelConsumption75: "Zużycie paliwa",
    fuelTankCapacity: "Pojemność zbiornika",
    dimensions: "Wymiary",
    weight: "Waga"
  });
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");

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
  const { data: categories = [], refetch: refetchCategories } = useQuery<GeneralEquipmentCategory[]>({
    queryKey: ["/api/general-equipment-categories"],
  });

  const { data: equipment = [], refetch: refetchEquipment } = useQuery<GeneralEquipment[]>({
    queryKey: ["/api/general-equipment"],
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
      return apiRequest("/api/general-equipment-categories", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/general-equipment-categories"] });
      setShowCategoryDialog(false);
      categoryForm.reset();
      toast({ title: "Sukces", description: "Kategoria została utworzona" });
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      return apiRequest("/api/general-equipment", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/general-equipment"] });
      setShowEquipmentDialog(false);
      setEditingEquipment(null);
      equipmentForm.reset();
      toast({ title: "Sukces", description: "Sprzęt został utworzony" });
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EquipmentFormData }) => {
      return apiRequest(`/api/general-equipment/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/general-equipment"] });
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
      return apiRequest(`/api/general-equipment/${equipmentId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/general-equipment"] });
      toast({ title: "Sukces", description: "Sprzęt został usunięty" });
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      return apiRequest(`/api/general-equipment-categories/${categoryId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/general-equipment-categories"] });
      toast({ title: "Sukces", description: "Kategoria została usunięta" });
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const saveAdditionalMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEquipment) throw new Error("Nie wybrano sprzętu");
      return apiRequest(`/api/general-equipment/${selectedEquipment.id}/additional`, "PUT", additionalEquipment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/general-equipment"] });
      setShowAdditionalDialog(false);
      setSelectedEquipment(null);
      setAdditionalEquipment([]);
      toast({ title: "Sukces", description: "Wyposażenie dodatkowe zostało zapisane" });
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const savePricingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEquipment) throw new Error("Nie wybrano sprzętu");
      return apiRequest(`/api/general-equipment/${selectedEquipment.id}/pricing`, "PUT", pricingTiers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/general-equipment"] });
      setShowPricingDialog(false);
      setSelectedEquipment(null);
      setPricingTiers([]);
      toast({ title: "Sukces", description: "Cennik został zaktualizowany" });
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
    if (editingEquipment) {
      updateEquipmentMutation.mutate({ id: editingEquipment.id, data });
    } else {
      createEquipmentMutation.mutate(data);
    }
  };

  const handleEditEquipment = (equipment: GeneralEquipment) => {
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

  const handleManageAdditional = (equipment: GeneralEquipment) => {
    setSelectedEquipment(equipment);
    setAdditionalEquipment(equipment.additionalEquipment || []);
    setShowAdditionalDialog(true);
  };

  const handleManagePricing = (equipment: GeneralEquipment) => {
    setSelectedEquipment(equipment);
    setPricingTiers(equipment.pricing || []);
    setShowPricingDialog(true);
  };

  const addPricingTier = () => {
    const newTier: GeneralEquipmentPricing = {
      equipmentId: selectedEquipment?.id || 0,
      periodStart: pricingTiers.length === 0 ? 1 : (pricingTiers[pricingTiers.length - 1].periodEnd || 0) + 1,
      periodEnd: null,
      pricePerDay: "0",
      discountPercent: pricingTiers.length === 0 ? "0" : "0", // Pierwszy tier zawsze ma 0% rabatu
    };
    setPricingTiers([...pricingTiers, newTier]);
  };

  const updatePricingTier = (index: number, field: keyof GeneralEquipmentPricing, value: any) => {
    const updated = [...pricingTiers];
    const currentTier = { ...updated[index] };
    
    if (field === 'pricePerDay') {
      // Gdy użytkownik zmienia cenę, przelicz procent rabatu
      currentTier.pricePerDay = value;
      
      // Znajdź pierwszy tier (cenę bazową)
      const baseTier = updated.find(tier => tier.periodStart === 1);
      if (baseTier && baseTier.pricePerDay && currentTier !== baseTier) {
        const basePrice = parseFloat(baseTier.pricePerDay);
        const currentPrice = parseFloat(value || "0");
        
        if (basePrice > 0 && currentPrice >= 0) {
          const discountPercent = Math.max(0, ((basePrice - currentPrice) / basePrice) * 100);
          currentTier.discountPercent = discountPercent.toFixed(2);
        }
      } else if (currentTier === baseTier) {
        // To jest tier bazowy, ustaw rabat na 0%
        currentTier.discountPercent = "0";
      }
    } else if (field === 'discountPercent') {
      // Gdy użytkownik zmienia procent rabatu, przelicz cenę
      currentTier.discountPercent = value;
      
      // Znajdź pierwszy tier (cenę bazową)
      const baseTier = updated.find(tier => tier.periodStart === 1);
      if (baseTier && baseTier.pricePerDay && currentTier !== baseTier) {
        const basePrice = parseFloat(baseTier.pricePerDay);
        const discountPercent = parseFloat(value || "0");
        
        if (basePrice > 0 && discountPercent >= 0 && discountPercent <= 100) {
          const discountedPrice = basePrice * (1 - discountPercent / 100);
          currentTier.pricePerDay = discountedPrice.toFixed(2);
        }
      }
    } else {
      currentTier[field] = value;
    }
    
    updated[index] = currentTier;
    setPricingTiers(updated);
  };

  const removePricingTier = (index: number) => {
    setPricingTiers(pricingTiers.filter((_, i) => i !== index));
  };

  const addAdditionalEquipment = () => {
    const newItem: GeneralEquipmentAdditional = {
      equipmentId: selectedEquipment?.id || 0,
      type: "accessory",
      position: additionalEquipment.length,
      name: "",
      description: "",
      pricePerDay: "0",
      isOptional: true
    };
    setAdditionalEquipment([...additionalEquipment, newItem]);
  };

  const updateAdditionalEquipment = (index: number, field: keyof GeneralEquipmentAdditional, value: any) => {
    const updated = [...additionalEquipment];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalEquipment(updated);
  };

  const removeAdditionalEquipment = (index: number) => {
    setAdditionalEquipment(additionalEquipment.filter((_, i) => i !== index));
  };

  const editFieldLabel = (field: string, currentLabel: string) => {
    const newLabel = prompt(`Edytuj etykietę dla pola "${currentLabel}":`, currentLabel);
    if (newLabel && newLabel !== currentLabel) {
      setFieldLabels(prev => ({ ...prev, [field]: newLabel }));
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
              <Package className="w-8 h-8 text-green-600" />
              Administracja - Wynajem Ogólny
            </h1>
            <p className="text-muted-foreground mt-2">
              Zarządzanie sprzętem wynajmu ogólnego, kategoriami i cenami
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
              <h2 className="text-2xl font-semibold">Sprzęt Wynajmu Ogólnego</h2>
              <Dialog open={showEquipmentDialog} onOpenChange={setShowEquipmentDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingEquipment(null); equipmentForm.reset(); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj sprzęt
                  </Button>
                </DialogTrigger>
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
                      {item.power && <p><span className="font-medium">{fieldLabels.power}:</span> {item.power}</p>}
                      <p><span className="font-medium">Ilość:</span> {item.quantity}</p>
                      <p><span className="font-medium">Dostępne:</span> {item.availableQuantity}</p>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => handleEditEquipment(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleManagePricing(item)}>
                        <DollarSign className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleManageAdditional(item)}>
                        <Settings className="w-4 h-4" />
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
              <h2 className="text-2xl font-semibold">Kategorie Wynajmu Ogólnego</h2>
              <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj kategorię
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => {
                const categoryEquipment = equipment.filter(eq => eq.categoryId === category.id);
                return (
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
                        <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                      )}
                      <p className="text-sm font-medium">
                        Sprzęt w kategorii: {categoryEquipment.length}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
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
                    <FormLabel>Nazwa kategorii *</FormLabel>
                    <FormControl>
                      <Input placeholder="Np. Narzędzia ręczne" {...field} />
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
                    <FormLabel>Opis</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Opcjonalny opis kategorii" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCategoryDialog(false)}
                  className="flex-1"
                >
                  Anuluj
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createCategoryMutation.isPending}
                >
                  {createCategoryMutation.isPending ? "Zapisywanie..." : "Zapisz"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Equipment Dialog */}
      <Dialog open={showEquipmentDialog} onOpenChange={setShowEquipmentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEquipment ? "Edytuj sprzęt" : "Dodaj nowy sprzęt wynajmu ogólnego"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Kliknij ikonę <Edit className="w-3 h-3 inline mx-1" /> obok etykiet pól, aby dostosować je do rodzaju sprzętu (np. "Silnik" → "Długość" dla przedłużaczy)
            </p>
          </DialogHeader>
          <Form {...equipmentForm}>
            <form onSubmit={equipmentForm.handleSubmit(onCreateEquipment)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={equipmentForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa sprzętu *</FormLabel>
                      <FormControl>
                        <Input placeholder="Np. Młotek udarowy" {...field} />
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
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
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

                <FormField
                  control={equipmentForm.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="Np. HDX-2000" {...field} />
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
                      <FormLabel className="flex items-center gap-1">
                        {fieldLabels.power}
                        <Edit 
                          className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary" 
                          onClick={() => editFieldLabel('power', fieldLabels.power)}
                        />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Np. 2000W" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={equipmentForm.control}
                  name="engine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        {fieldLabels.engine}
                        <Edit 
                          className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary" 
                          onClick={() => editFieldLabel('engine', fieldLabels.engine)}
                        />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Np. Honda GX160" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={equipmentForm.control}
                  name="alternator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        {fieldLabels.alternator}
                        <Edit 
                          className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary" 
                          onClick={() => editFieldLabel('alternator', fieldLabels.alternator)}
                        />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Np. Sincro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={equipmentForm.control}
                  name="fuelConsumption75"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        {fieldLabels.fuelConsumption75}
                        <Edit 
                          className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary" 
                          onClick={() => editFieldLabel('fuelConsumption75', fieldLabels.fuelConsumption75)}
                        />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Np. 1.2 l/h" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={equipmentForm.control}
                  name="fuelTankCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        {fieldLabels.fuelTankCapacity}
                        <Edit 
                          className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary" 
                          onClick={() => editFieldLabel('fuelTankCapacity', fieldLabels.fuelTankCapacity)}
                        />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Np. 15"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={equipmentForm.control}
                  name="dimensions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        {fieldLabels.dimensions}
                        <Edit 
                          className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary" 
                          onClick={() => editFieldLabel('dimensions', fieldLabels.dimensions)}
                        />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Np. 60x45x50 cm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={equipmentForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        {fieldLabels.weight}
                        <Edit 
                          className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary" 
                          onClick={() => editFieldLabel('weight', fieldLabels.weight)}
                        />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Np. 45 kg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={equipmentForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ilość całkowita *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
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
                      <FormLabel>Ilość dostępna *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
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
                      <Textarea placeholder="Dodatkowe informacje o sprzęcie" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={equipmentForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zdjęcie sprzętu</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {/* Current image preview */}
                        {field.value && field.value.trim() !== "" && (
                          <div className="flex items-center space-x-4 p-4 border rounded-lg bg-gray-50">
                            <div className="flex-shrink-0">
                              <img
                                src={field.value}
                                alt="Podgląd zdjęcia"
                                className="w-20 h-20 object-cover rounded-lg border"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Aktualne zdjęcie</p>
                              <p className="text-xs text-muted-foreground">
                                {field.value.split('/').pop()}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange("")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        
                        {/* Upload button - disabled for now */}
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Wgrywanie zdjęć chwilowo wyłączone
                        </Button>
                        
                        {/* Manual URL input as fallback */}
                        <div className="relative">
                          <Input
                            placeholder="Lub wklej URL zdjęcia"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="pr-10"
                          />
                          <Image className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEquipmentDialog(false)}
                  className="flex-1"
                >
                  Anuluj
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={createEquipmentMutation.isPending || updateEquipmentMutation.isPending}
                >
                  {createEquipmentMutation.isPending || updateEquipmentMutation.isPending ? "Zapisywanie..." : "Zapisz"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Additional Equipment Dialog */}
      <Dialog open={showAdditionalDialog} onOpenChange={setShowAdditionalDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Wyposażenie dodatkowe - {selectedEquipment?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Zarządzaj dodatkowym wyposażeniem dla tego sprzętu
              </p>
              <Button onClick={addAdditionalEquipment} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj pozycję
              </Button>
            </div>

            {additionalEquipment.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Brak dodatkowego wyposażenia</p>
                <p className="text-sm">Kliknij "Dodaj pozycję" aby rozpocząć</p>
              </div>
            ) : (
              <div className="space-y-4">
                {additionalEquipment.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <Label>Nazwa *</Label>
                        <Input
                          placeholder="Np. Przewód przedłużający"
                          value={item.name}
                          onChange={(e) => updateAdditionalEquipment(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Opis</Label>
                        <Input
                          placeholder="Opcjonalny opis"
                          value={item.description || ''}
                          onChange={(e) => updateAdditionalEquipment(index, 'description', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Cena za dzień (PLN)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.pricePerDay}
                          onChange={(e) => updateAdditionalEquipment(index, 'pricePerDay', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAdditionalEquipment(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowAdditionalDialog(false)}
              >
                Anuluj
              </Button>
              <Button 
                type="button" 
                className="flex-1"
                onClick={() => saveAdditionalMutation.mutate()}
                disabled={saveAdditionalMutation.isPending}
              >
                {saveAdditionalMutation.isPending ? "Zapisywanie..." : "Zapisz wyposażenie"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Zarządzanie cennikiem - {selectedEquipment?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Pierwszy okres (1+ dni) to cena bazowa (0% rabatu). Kolejne okresy automatycznie przeliczają rabat/cenę.
              </p>
              <Button onClick={addPricingTier} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Dodaj próg
              </Button>
            </div>

            {pricingTiers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Brak progów cenowych</p>
                <p className="text-sm">Kliknij "Dodaj próg" aby rozpocząć</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pricingTiers.map((tier, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div>
                        <Label>Okres od (dni) *</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={tier.periodStart}
                          onChange={(e) => updatePricingTier(index, 'periodStart', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Okres do (dni)</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="bez limitu"
                          value={tier.periodEnd || ''}
                          onChange={(e) => updatePricingTier(index, 'periodEnd', e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </div>
                      <div>
                        <Label>Cena za dzień (PLN) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={tier.pricePerDay}
                          onChange={(e) => updatePricingTier(index, 'pricePerDay', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Rabat (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={tier.discountPercent}
                          onChange={(e) => updatePricingTier(index, 'discountPercent', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePricingTier(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowPricingDialog(false)}
              >
                Anuluj
              </Button>
              <Button 
                type="button" 
                className="flex-1"
                onClick={() => savePricingMutation.mutate()}
                disabled={savePricingMutation.isPending}
              >
                {savePricingMutation.isPending ? "Zapisywanie..." : "Zapisz cennik"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}