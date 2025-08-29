import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Zap, Plus, Edit, Trash2, Package, DollarSign, Settings, Wrench, Save, Copy, Search } from "lucide-react";

// Types
interface ElectricalEquipmentCategory {
  id: number;
  name: string;
  description?: string;
}

interface ElectricalEquipmentPricing {
  id?: number;
  equipmentId: number;
  periodStart: number;
  periodEnd: number | null;
  pricePerDay: string;
  discountPercent: string;
}

interface ElectricalEquipmentAdditional {
  id?: number;
  equipmentId: number;
  type: string;
  position: number;
  name: string;
  description?: string;
  pricePerDay: string;
  isOptional: boolean;
}

interface ElectricalEquipment {
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
  category: ElectricalEquipmentCategory;
  pricing: ElectricalEquipmentPricing[];
  additionalEquipment: ElectricalEquipmentAdditional[];
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
  quantity: z.number().min(1, "Ilość musi być większa od 0"),
  availableQuantity: z.number().min(0, "Dostępna ilość nie może być ujemna"),
  isActive: z.boolean().default(true),
  createPricing: z.boolean().default(true),
  startingPrice: z.string().default("100"),
});

const pricingSchema = z.object({
  periodStart: z.number().min(1, "Początek okresu musi być większy od 0"),
  periodEnd: z.number().nullable(),
  pricePerDay: z.string().min(1, "Cena jest wymagana"),
  discountPercent: z.string().default("0"),
});

const additionalEquipmentSchema = z.object({
  type: z.string().min(1, "Typ jest wymagany"),
  position: z.number().min(1, "Pozycja musi być większa od 0"),
  name: z.string().min(1, "Nazwa jest wymagana"),
  description: z.string().optional(),
  pricePerDay: z.string().min(1, "Cena jest wymagana"),
  isOptional: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type EquipmentFormData = z.infer<typeof equipmentSchema>;
type PricingFormData = z.infer<typeof pricingSchema>;
type AdditionalEquipmentFormData = z.infer<typeof additionalEquipmentSchema>;

export default function AdminElectrical() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect non-authorized users
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'electrical_manager'))) {
      toast({
        title: "Brak uprawnień",
        description: "Dostęp do administracji sprzętu elektrycznego jest dostępny tylko dla administratorów i kierowników elektryki.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, user, authLoading, toast]);
  
  const [selectedEquipment, setSelectedEquipment] = useState<ElectricalEquipment | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showAdditionalDialog, setShowAdditionalDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ElectricalEquipmentCategory | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<ElectricalEquipment | null>(null);
  const [equipmentPricing, setEquipmentPricing] = useState<PricingFormData[]>([]);
  const [equipmentAdditional, setEquipmentAdditional] = useState<AdditionalEquipmentFormData[]>([]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");
  const [editingPricing, setEditingPricing] = useState<ElectricalEquipmentPricing | null>(null);
  const [editingAdditional, setEditingAdditional] = useState<ElectricalEquipmentAdditional | null>(null);
  const [customLabels, setCustomLabels] = useState({
    engine: "Silnik",
    alternator: "Alternator", 
    fuelConsumption75: "Zużycie paliwa (75%)",
    fuelTankCapacity: "Pojemność zbiornika",
    power: "Moc",
    weight: "Waga",
    dimensions: "Wymiary"
  });

  // Queries
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ElectricalEquipmentCategory[]>({
    queryKey: ["/api/electrical-equipment-categories"],
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery<ElectricalEquipment[]>({
    queryKey: ["/api/electrical-equipment"],
  });

  // Filter equipment based on search term
  const filteredEquipment = equipment.filter(equip =>
    equip.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equip.description?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equip.model?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equip.category.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
  );

  // Forms
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
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
    },
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await apiRequest("/api/electrical-equipment-categories", "POST", data);
      return response;
    },
    onSuccess: () => {
      toast({ title: "Sukces", description: "Kategoria została utworzona" });
      queryClient.invalidateQueries({ queryKey: ["/api/electrical-equipment-categories"] });
      setShowCategoryDialog(false);
      categoryForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się utworzyć kategorii",
        variant: "destructive",
      });
    },
  });

  const createEquipmentMutation = useMutation({
    mutationFn: async (data: EquipmentFormData & { createPricing?: boolean, startingPrice?: string }) => {
      const response = await apiRequest("/api/electrical-equipment", "POST", data);
      return response;
    },
    onSuccess: () => {
      toast({ title: "Sukces", description: "Sprzęt został utworzony" });
      queryClient.invalidateQueries({ queryKey: ["/api/electrical-equipment"] });
      setShowEquipmentDialog(false);
      equipmentForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się utworzyć sprzętu",
        variant: "destructive",
      });
    },
  });

  const savePricingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEquipment) throw new Error("Nie wybrano sprzętu");
      await apiRequest(`/api/electrical-equipment/${selectedEquipment.id}/pricing`, "PUT", equipmentPricing);
    },
    onSuccess: () => {
      toast({ title: "Sukces", description: "Ceny zostały zaktualizowane" });
      queryClient.invalidateQueries({ queryKey: ["/api/electrical-equipment"] });
      setShowPricingDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować cen",
        variant: "destructive",
      });
    },
  });

  const saveAdditionalMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEquipment) throw new Error("Nie wybrano sprzętu");
      await apiRequest(`/api/electrical-equipment/${selectedEquipment.id}/additional`, "PUT", equipmentAdditional);
    },
    onSuccess: () => {
      toast({ title: "Sukces", description: "Wyposażenie zostało zaktualizowane" });
      queryClient.invalidateQueries({ queryKey: ["/api/electrical-equipment"] });
      setShowAdditionalDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zaktualizować wyposażenia",
        variant: "destructive",
      });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (equipmentId: number) => {
      await apiRequest(`/api/electrical-equipment/${equipmentId}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Sukces", description: "Sprzęt został usunięty" });
      queryClient.invalidateQueries({ queryKey: ["/api/electrical-equipment"] });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się usunąć sprzętu",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      await apiRequest(`/api/electrical-equipment-categories/${categoryId}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Sukces", description: "Kategoria została usunięta" });
      queryClient.invalidateQueries({ queryKey: ["/api/electrical-equipment-categories"] });
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się usunąć kategorii",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const onCreateCategory = (data: CategoryFormData) => {
    createCategoryMutation.mutate(data);
  };

  const onCreateEquipment = (data: EquipmentFormData & { createPricing?: boolean, startingPrice?: string }) => {
    createEquipmentMutation.mutate(data);
  };

  const openCategoryDialog = (category?: ElectricalEquipmentCategory) => {
    if (category) {
      setEditingCategory(category);
      categoryForm.reset(category);
    } else {
      setEditingCategory(null);
      categoryForm.reset({ name: "", description: "" });
    }
    setShowCategoryDialog(true);
  };

  const openEquipmentDialog = (equip?: ElectricalEquipment) => {
    if (equip) {
      setEditingEquipment(equip);
      equipmentForm.reset(equip);
    } else {
      setEditingEquipment(null);
      equipmentForm.reset({
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
        createPricing: true,
        startingPrice: "100",
      });
    }
    setShowEquipmentDialog(true);
  };

  const openPricingDialog = (equip: ElectricalEquipment) => {
    setSelectedEquipment(equip);
    setEquipmentPricing(equip.pricing.map(p => ({
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      pricePerDay: p.pricePerDay,
      discountPercent: p.discountPercent,
    })));
    setShowPricingDialog(true);
  };

  const openAdditionalDialog = (equip: ElectricalEquipment) => {
    setSelectedEquipment(equip);
    setEquipmentAdditional(equip.additionalEquipment?.map(a => ({
      type: a.type,
      position: a.position,
      name: a.name,
      description: a.description || '',
      pricePerDay: a.pricePerDay,
      isOptional: a.isOptional,
    })) || []);
    setShowAdditionalDialog(true);
  };

  const addPricingTier = () => {
    setEquipmentPricing(prev => [
      ...prev,
      { periodStart: 1, periodEnd: null, pricePerDay: "0", discountPercent: "0" }
    ]);
  };

  const removePricingTier = (index: number) => {
    setEquipmentPricing(prev => prev.filter((_, i) => i !== index));
  };

  const updatePricingTier = (index: number, field: keyof PricingFormData, value: any) => {
    setEquipmentPricing(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addAdditionalItem = () => {
    setEquipmentAdditional(prev => [
      ...prev,
      { 
        type: "additional", 
        position: prev.length + 1, 
        name: "", 
        description: "", 
        pricePerDay: "0", 
        isOptional: true 
      }
    ]);
  };

  const removeAdditionalItem = (index: number) => {
    setEquipmentAdditional(prev => prev.filter((_, i) => i !== index));
  };

  const updateAdditionalItem = (index: number, field: keyof AdditionalEquipmentFormData, value: any) => {
    setEquipmentAdditional(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  if (categoriesLoading || equipmentLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold">Zarządzanie sprzętem elektrycznym</h1>
        </div>
      </div>

      <Tabs defaultValue="equipment" className="space-y-6">
        <TabsList>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Sprzęt elektryczny
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Kategorie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Sprzęt elektryczny</h2>
            <Button onClick={() => openEquipmentDialog()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Dodaj sprzęt
            </Button>
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
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Aktywny" : "Nieaktywny"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <p><strong>Kategoria:</strong> {item.category.name}</p>
                    {item.model && <p><strong>Model:</strong> {item.model}</p>}
                    {item.power && <p><strong>Moc:</strong> {item.power}</p>}
                    {item.engine && <p><strong>Silnik:</strong> {item.engine}</p>}
                    {item.alternator && <p><strong>Alternator:</strong> {item.alternator}</p>}
                    <p><strong>Ilość:</strong> {item.quantity}</p>
                    <p><strong>Dostępne:</strong> {item.availableQuantity}</p>
                    {item.description && (
                      <p><strong>Opis:</strong> {item.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEquipmentDialog(item)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edytuj
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPricingDialog(item)}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Ceny
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAdditionalDialog(item)}
                    >
                      <Wrench className="w-4 h-4 mr-1" />
                      Wyposażenie
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Czy na pewno chcesz usunąć sprzęt "${item.name}"?`)) {
                          deleteEquipmentMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Usuń
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Kategorie sprzętu elektrycznego</h2>
            <Button onClick={() => openCategoryDialog()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Dodaj kategorię
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle>{category.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {category.description && (
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCategoryDialog(category)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edytuj
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Czy na pewno chcesz usunąć kategorię "${category.name}"?`)) {
                          deleteCategoryMutation.mutate(category.id);
                        }
                      }}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Usuń
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edytuj kategorię" : "Dodaj nową kategorię"}
            </DialogTitle>
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
                      <Input placeholder="Np. Agregaty prądotwórcze" {...field} />
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
              {editingEquipment ? "Edytuj sprzęt" : "Dodaj nowy sprzęt elektryczny"}
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
                        <Input placeholder="Np. Agregat prądotwórczy Honda EU22i" {...field} />
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
                        <Input placeholder="Model sprzętu" {...field} />
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="flex-1">{customLabels.power}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newLabel = prompt("Wprowadź nową etykietę:", customLabels.power);
                            if (newLabel) setCustomLabels(prev => ({ ...prev, power: newLabel }));
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder="Np. 2,2 kW" {...field} />
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="flex-1">{customLabels.engine}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newLabel = prompt("Wprowadź nową etykietę:", customLabels.engine);
                            if (newLabel) setCustomLabels(prev => ({ ...prev, engine: newLabel }));
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder="Np. typ silnika / długość" {...field} />
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="flex-1">{customLabels.alternator}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newLabel = prompt("Wprowadź nową etykietę:", customLabels.alternator);
                            if (newLabel) setCustomLabels(prev => ({ ...prev, alternator: newLabel }));
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder="Typ alternatora" {...field} />
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="flex-1">{customLabels.fuelConsumption75}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newLabel = prompt("Wprowadź nową etykietę:", customLabels.fuelConsumption75);
                            if (newLabel) setCustomLabels(prev => ({ ...prev, fuelConsumption75: newLabel }));
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder="Np. 1,8 l/h" {...field} />
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="flex-1">{customLabels.fuelTankCapacity}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newLabel = prompt("Wprowadź nową etykietę:", customLabels.fuelTankCapacity);
                            if (newLabel) setCustomLabels(prev => ({ ...prev, fuelTankCapacity: newLabel }));
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Pojemność w litrach" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="flex-1">{customLabels.dimensions}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newLabel = prompt("Wprowadź nową etykietę:", customLabels.dimensions);
                            if (newLabel) setCustomLabels(prev => ({ ...prev, dimensions: newLabel }));
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder="Np. 512 x 290 x 425 mm" {...field} />
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="flex-1">{customLabels.weight}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newLabel = prompt("Wprowadź nową etykietę:", customLabels.weight);
                            if (newLabel) setCustomLabels(prev => ({ ...prev, weight: newLabel }));
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder="Np. 21,1 kg" {...field} />
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
                          min="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
                      <FormLabel>Dostępna ilość *</FormLabel>
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
                    <FormLabel>URL zdjęcia</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pricing section */}
              <div className="col-span-2 border-t pt-4">
                <h3 className="font-medium mb-3">Cennik startowy</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={equipmentForm.control}
                    name="createPricing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="rounded"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Utwórz domyślny cennik</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Automatycznie utworzy progi cenowe z rabatami
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={equipmentForm.control}
                    name="startingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cena startowa (PLN/dzień)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="100" 
                            {...field}
                            disabled={!equipmentForm.watch("createPricing")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Progi rabatowe: 1-2 dni (0%), 3-7 dni (14.29%), 8-18 dni (28.57%), 19-29 dni (42.86%), 30+ dni (57.14%)
                </p>
              </div>

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
                  disabled={createEquipmentMutation.isPending}
                >
                  {createEquipmentMutation.isPending ? "Zapisywanie..." : "Zapisz"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cennik dla: {selectedEquipment?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Przedziały cenowe</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPricingTier}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Dodaj przedział
              </Button>
            </div>

            {equipmentPricing.map((pricing, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Od (dni)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={pricing.periodStart}
                        onChange={(e) => updatePricingTier(index, 'periodStart', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Do (dni)</Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Bez limitu"
                        value={pricing.periodEnd || ""}
                        onChange={(e) => updatePricingTier(index, 'periodEnd', e.target.value ? parseInt(e.target.value) : null)}
                      />
                    </div>
                    <div>
                      <Label>Cena za dzień (PLN)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricing.pricePerDay}
                        onChange={(e) => updatePricingTier(index, 'pricePerDay', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label>Rabat (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={pricing.discountPercent}
                          onChange={(e) => updatePricingTier(index, 'discountPercent', e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removePricingTier(index)}
                        disabled={equipmentPricing.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPricingDialog(false)}
                className="flex-1"
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

      {/* Additional Equipment Dialog */}
      <Dialog open={showAdditionalDialog} onOpenChange={setShowAdditionalDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Wyposażenie dodatkowe - {selectedEquipment?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Wyposażenie dodatkowe i akcesoria</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAdditionalItem}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Dodaj pozycję
              </Button>
            </div>

            {equipmentAdditional.map((item, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div>
                      <Label>Typ</Label>
                      <Select
                        value={item.type}
                        onValueChange={(value) => updateAdditionalItem(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="additional">Wyposażenie dodatkowe</SelectItem>
                          <SelectItem value="accessories">Akcesoria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Pozycja</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.position}
                        onChange={(e) => updateAdditionalItem(index, 'position', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label>Nazwa</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateAdditionalItem(index, 'name', e.target.value)}
                        placeholder="Nazwa pozycji"
                      />
                    </div>
                    <div>
                      <Label>Opis</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateAdditionalItem(index, 'description', e.target.value)}
                        placeholder="Opcjonalny opis"
                      />
                    </div>
                    <div>
                      <Label>Cena/dzień (PLN)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.pricePerDay}
                        onChange={(e) => updateAdditionalItem(index, 'pricePerDay', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={item.isOptional}
                          onChange={(e) => updateAdditionalItem(index, 'isOptional', e.target.checked)}
                          className="rounded"
                        />
                        <Label className="text-sm">Opcjonalne</Label>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAdditionalItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdditionalDialog(false)}
                className="flex-1"
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
    </div>
  );
}