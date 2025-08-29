import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Zap, Package, Plus, Minus, Calculator, ArrowLeft, Search } from "lucide-react";

// Types for electrical equipment
interface ElectricalEquipmentCategory {
  id: number;
  name: string;
  description?: string;
}

interface ElectricalEquipmentPricing {
  id: number;
  equipmentId: number;
  periodStart: number;
  periodEnd: number | null;
  pricePerDay: string;
  discountPercent: string;
}

interface ElectricalEquipmentAdditional {
  id: number;
  equipmentId: number;
  type: string;
  name: string;
  description?: string;
  pricePerDay: string;
  position: number;
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

interface Client {
  id?: number;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  nip?: string;
}

interface QuoteItem {
  equipmentId: number;
  quantity: number;
  rentalPeriodDays: number;
  pricePerDay: string;
  discountPercent: string;
  totalPrice: string;
  notes?: string;
  selectedAdditionalEquipment?: SelectedAdditionalEquipment[];
}

interface SelectedAdditionalEquipment {
  id: number;
  name: string;
  pricePerDay: string;
  quantity: number;
}

// Form schemas
const clientSchema = z.object({
  companyName: z.string().min(1, "Nazwa firmy jest wymagana"),
  contactPerson: z.string().optional(),
  email: z.string().email("Nieprawidłowy format email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  nip: z.string().optional(),
});

const quoteSchema = z.object({
  client: clientSchema,
  notes: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

export default function CreateElectricalQuote() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedItems, setSelectedItems] = useState<Record<number, QuoteItem>>({});
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");

  const { data: electricalEquipment = [], isLoading: equipmentLoading } = useQuery<ElectricalEquipment[]>({
    queryKey: ["/api/electrical-equipment"],
  });

  // Filter equipment based on search term
  const filteredElectricalEquipment = electricalEquipment.filter(equipment =>
    equipment.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equipment.description?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equipment.model?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equipment.category.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
  );

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      client: {
        companyName: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        nip: "",
      },
      items: [],
      notes: "",
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      const totalNet = Object.values(selectedItems).reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
      const vatRate = 23;
      const totalGross = totalNet * (1 + vatRate / 100);

      return apiRequest("/api/electrical-quotes", "POST", {
        ...data,
        totalNet: totalNet.toFixed(2),
        vatRate: vatRate.toString(),
        totalGross: totalGross.toFixed(2),
        status: "draft",
        isGuestQuote: false,
        guestEmail: null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sukces",
        description: "Wycena sprzętu elektrycznego została utworzona",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/electrical-quotes"] });
      navigate("/electrical-quotes");
    },
    onError: (error: any) => {
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się utworzyć wyceny sprzętu elektrycznego",
        variant: "destructive",
      });
    },
  });

  const calculatePrice = (equipment: ElectricalEquipment, quantity: number, rentalPeriod: number, additionalEquipment?: SelectedAdditionalEquipment[]) => {
    const pricing = equipment.pricing.find(p => 
      rentalPeriod >= p.periodStart && 
      (p.periodEnd === null || rentalPeriod <= p.periodEnd)
    );
    
    let pricePerDay = 0;
    let discountPercent = 0;
    let totalPrice = 0;
    
    // Calculate base equipment price if pricing exists
    if (pricing) {
      pricePerDay = parseFloat(pricing.pricePerDay);
      discountPercent = parseFloat(pricing.discountPercent);
      const discountedPrice = pricePerDay * (1 - discountPercent / 100);
      totalPrice = discountedPrice * quantity * rentalPeriod;
    }
    
    // Add additional equipment costs (even if main equipment has no pricing)
    if (additionalEquipment && additionalEquipment.length > 0) {
      const additionalCost = additionalEquipment.reduce((sum, item) => {
        const itemCost = item.quantity * rentalPeriod * parseFloat(item.pricePerDay);
        console.log(`Additional equipment ${item.name}: ${item.quantity} x ${rentalPeriod} x ${item.pricePerDay} = ${itemCost}`);
        return sum + itemCost;
      }, 0);
      console.log('Total additional cost:', additionalCost);
      totalPrice += additionalCost;
    }
    
    return {
      pricePerDay: pricePerDay.toFixed(2),
      discountPercent: discountPercent.toFixed(2),
      totalPrice: totalPrice.toFixed(2)
    };
  };

  const addEquipmentToQuote = (equipment: ElectricalEquipment, quantity: number, rentalPeriod: number) => {
    const pricing = calculatePrice(equipment, quantity, rentalPeriod);
    
    const item: QuoteItem = {
      equipmentId: equipment.id,
      quantity,
      rentalPeriodDays: rentalPeriod,
      pricePerDay: pricing.pricePerDay,
      discountPercent: pricing.discountPercent,
      totalPrice: pricing.totalPrice,
      notes: "",
      selectedAdditionalEquipment: [],
    };

    setSelectedItems(prev => ({
      ...prev,
      [equipment.id]: item
    }));
  };

  const removeEquipmentFromQuote = (equipmentId: number) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      delete newItems[equipmentId];
      return newItems;
    });
  };

  const updateItemQuantity = (equipmentId: number, quantity: number) => {
    const equipment = electricalEquipment.find(e => e.id === equipmentId);
    if (!equipment) return;

    const item = selectedItems[equipmentId];
    if (!item) return;

    const pricing = calculatePrice(equipment, quantity, item.rentalPeriodDays, item.selectedAdditionalEquipment);
    
    setSelectedItems(prev => ({
      ...prev,
      [equipmentId]: {
        ...item,
        quantity,
        pricePerDay: pricing.pricePerDay,
        totalPrice: pricing.totalPrice,
      }
    }));
  };

  const updateItemPeriod = (equipmentId: number, rentalPeriod: number) => {
    const equipment = electricalEquipment.find(e => e.id === equipmentId);
    if (!equipment) return;

    const item = selectedItems[equipmentId];
    if (!item) return;

    const pricing = calculatePrice(equipment, item.quantity, rentalPeriod, item.selectedAdditionalEquipment);
    
    setSelectedItems(prev => ({
      ...prev,
      [equipmentId]: {
        ...item,
        rentalPeriodDays: rentalPeriod,
        pricePerDay: pricing.pricePerDay,
        discountPercent: pricing.discountPercent,
        totalPrice: pricing.totalPrice,
      }
    }));
  };

  const updateAdditionalEquipment = (equipmentId: number, additionalEquipment: SelectedAdditionalEquipment[]) => {
    const equipment = electricalEquipment.find(e => e.id === equipmentId);
    if (!equipment) return;

    const item = selectedItems[equipmentId];
    if (!item) return;

    console.log('updateAdditionalEquipment called:', {
      equipmentId,
      additionalEquipment,
      itemQuantity: item.quantity,
      itemPeriod: item.rentalPeriodDays
    });

    const pricing = calculatePrice(equipment, item.quantity, item.rentalPeriodDays, additionalEquipment);
    
    console.log('Calculated pricing:', pricing);
    
    setSelectedItems(prev => {
      const newState = {
        ...prev,
        [equipmentId]: {
          ...item,
          selectedAdditionalEquipment: additionalEquipment,
          totalPrice: pricing.totalPrice,
        }
      };
      console.log('Updated selectedItems state:', newState[equipmentId]);
      return newState;
    });
  };

  const onSubmit = (data: QuoteFormData) => {
    console.log('onSubmit called with data:', data);
    const items = Object.values(selectedItems);
    console.log('Items to submit:', items);
    createQuoteMutation.mutate({
      ...data,
      items,
    });
  };

  // Group filtered equipment by category
  const equipmentByCategory = filteredElectricalEquipment.reduce((acc, item) => {
    const categoryName = item.category.name;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, ElectricalEquipment[]>);

  const totalNet = Object.values(selectedItems).reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
  const vatRate = 23;
  const totalGross = totalNet * (1 + vatRate / 100);

  if (equipmentLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót do dashboardu
        </Button>
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          <h1 className="text-2xl font-bold">Nowa wycena sprzętu elektrycznego</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Equipment Selection */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Dostępny sprzęt elektryczny
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj sprzętu (nazwa, opis, model, kategoria)..."
                  value={equipmentSearchTerm}
                  onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(equipmentByCategory).map(([categoryName, items]) => (
                <div key={categoryName}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {categoryName}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((equipment) => (
                      <EquipmentCard
                        key={equipment.id}
                        equipment={equipment}
                        isSelected={equipment.id in selectedItems}
                        selectedItem={selectedItems[equipment.id]}
                        onAdd={addEquipmentToQuote}
                        onRemove={removeEquipmentFromQuote}
                        onUpdateQuantity={updateItemQuantity}
                        onUpdatePeriod={updateItemPeriod}
                        onUpdateAdditionalEquipment={updateAdditionalEquipment}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quote Summary and Client Form */}
        <div className="space-y-6">
          {/* Selected Items Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Podsumowanie wyceny
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(selectedItems).length === 0 ? (
                <p className="text-muted-foreground">Nie wybrano jeszcze żadnego sprzętu</p>
              ) : (
                <div className="space-y-4">
                  {Object.values(selectedItems).map((item) => {
                    const equipment = electricalEquipment.find(e => e.id === item.equipmentId);
                    if (!equipment) return null;
                    
                    return (
                      <div key={item.equipmentId} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{equipment.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} szt. × {item.rentalPeriodDays} dni
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEquipmentFromQuote(item.equipmentId)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-sm">
                          <p>Cena za dzień: {item.pricePerDay} PLN</p>
                          {parseFloat(item.discountPercent) > 0 && (
                            <p>Rabat: {item.discountPercent}%</p>
                          )}
                          <p className="font-medium">Razem: {item.totalPrice} PLN</p>
                        </div>
                      </div>
                    );
                  })}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Wartość netto:</span>
                      <span className="font-medium">{totalNet.toFixed(2)} PLN</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT ({vatRate}%):</span>
                      <span className="font-medium">{(totalGross - totalNet).toFixed(2)} PLN</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Wartość brutto:</span>
                      <span>{totalGross.toFixed(2)} PLN</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Form */}
          <Card>
            <CardHeader>
              <CardTitle>Dane klienta</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="client.companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nazwa firmy *</FormLabel>
                        <FormControl>
                          <Input placeholder="Wprowadź nazwę firmy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client.contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Osoba kontaktowa</FormLabel>
                        <FormControl>
                          <Input placeholder="Imię i nazwisko" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input placeholder="+48 123 456 789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client.address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adres</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Adres siedziby firmy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client.nip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIP</FormLabel>
                        <FormControl>
                          <Input placeholder="NIP firmy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Uwagi do wyceny</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Dodatkowe informacje..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={Object.keys(selectedItems).length === 0 || createQuoteMutation.isPending}
                    onClick={() => {
                      console.log('Submit button clicked');
                      console.log('Form errors:', form.formState.errors);
                      console.log('Selected items:', selectedItems);
                      console.log('Form is valid:', form.formState.isValid);
                    }}
                  >
                    {createQuoteMutation.isPending ? "Tworzenie..." : "Utwórz wycenę"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Equipment Card Component
interface EquipmentCardProps {
  equipment: ElectricalEquipment;
  isSelected: boolean;
  selectedItem?: QuoteItem;
  onAdd: (equipment: ElectricalEquipment, quantity: number, rentalPeriod: number) => void;
  onRemove: (equipmentId: number) => void;
  onUpdateQuantity: (equipmentId: number, quantity: number) => void;
  onUpdatePeriod: (equipmentId: number, rentalPeriod: number) => void;
  onUpdateAdditionalEquipment?: (equipmentId: number, additionalEquipment: SelectedAdditionalEquipment[]) => void;
}

function EquipmentCard({ 
  equipment, 
  isSelected, 
  selectedItem, 
  onAdd, 
  onRemove, 
  onUpdateQuantity, 
  onUpdatePeriod,
  onUpdateAdditionalEquipment
}: EquipmentCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [rentalPeriod, setRentalPeriod] = useState(1);

  const handleAdd = () => {
    onAdd(equipment, quantity, rentalPeriod);
  };

  const getPriceDisplay = () => {
    const pricing = equipment.pricing.find(p => 
      rentalPeriod >= p.periodStart && 
      (p.periodEnd === null || rentalPeriod <= p.periodEnd)
    );
    
    if (!pricing) return "Brak ceny";
    
    const discountPercent = parseFloat(pricing.discountPercent);
    const originalPrice = parseFloat(pricing.pricePerDay);
    const discountedPrice = originalPrice * (1 - discountPercent / 100);
    
    return (
      <div className="text-sm">
        {discountPercent > 0 ? (
          <>
            <span className="line-through text-gray-500">{originalPrice.toFixed(2)} PLN</span>
            <span className="ml-2 font-medium">{discountedPrice.toFixed(2)} PLN/dzień</span>
            <Badge variant="secondary" className="ml-2">-{discountPercent}%</Badge>
          </>
        ) : (
          <span className="font-medium">{originalPrice.toFixed(2)} PLN/dzień</span>
        )}
      </div>
    );
  };

  return (
    <Card className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4 space-y-3">
        <div>
          <h4 className="font-medium">{equipment.name}</h4>
          {equipment.model && (
            <p className="text-sm text-muted-foreground">Model: {equipment.model}</p>
          )}
          {equipment.power && (
            <p className="text-sm text-muted-foreground">Moc: {equipment.power}</p>
          )}
          {equipment.description && (
            <p className="text-sm text-muted-foreground mt-1">{equipment.description}</p>
          )}
        </div>

        {!isSelected ? (
          <div className="space-y-3">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label htmlFor={`quantity-${equipment.id}`} className="text-xs">Ilość</Label>
                <Input
                  id={`quantity-${equipment.id}`}
                  type="number"
                  min="1"
                  max={equipment.availableQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor={`period-${equipment.id}`} className="text-xs">Dni</Label>
                <Input
                  id={`period-${equipment.id}`}
                  type="number"
                  min="1"
                  value={rentalPeriod}
                  onChange={(e) => setRentalPeriod(parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
            </div>

            {getPriceDisplay()}

            <Button
              onClick={handleAdd}
              className="w-full h-8"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Dodaj
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex space-x-2">
              <div className="flex-1">
                <Label className="text-xs">Ilość</Label>
                <Input
                  type="number"
                  min="1"
                  max={equipment.availableQuantity}
                  value={selectedItem?.quantity || 1}
                  onChange={(e) => onUpdateQuantity(equipment.id, parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Dni</Label>
                <Input
                  type="number"
                  min="1"
                  value={selectedItem?.rentalPeriodDays || 1}
                  onChange={(e) => onUpdatePeriod(equipment.id, parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
            </div>

            {/* Additional Equipment Section */}
            {equipment.additionalEquipment && equipment.additionalEquipment.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Dodatkowe wyposażenie</Label>
                <div className="space-y-1 p-2 bg-gray-50 rounded border">
                  {equipment.additionalEquipment.map((additional) => {
                    const isSelected = selectedItem?.selectedAdditionalEquipment?.some(sel => sel.id === additional.id) || false;
                    const selectedAdditional = selectedItem?.selectedAdditionalEquipment?.find(sel => sel.id === additional.id);
                    
                    return (
                      <div key={additional.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (!onUpdateAdditionalEquipment) return;
                              const currentAdditional = selectedItem?.selectedAdditionalEquipment || [];
                              if (checked) {
                                console.log('Adding additional equipment:', additional);
                                const newAdditional = [...currentAdditional, {
                                  id: additional.id,
                                  name: additional.name,
                                  pricePerDay: additional.pricePerDay || "0",
                                  quantity: 1
                                }];
                                console.log('New additional array:', newAdditional);
                                onUpdateAdditionalEquipment(equipment.id, newAdditional);
                              } else {
                                const newAdditional = currentAdditional.filter(a => a.id !== additional.id);
                                onUpdateAdditionalEquipment(equipment.id, newAdditional);
                              }
                            }}
                          />
                          <span>{additional.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {isSelected && (
                            <Input
                              type="number"
                              min="1"
                              className="w-12 h-6 text-xs"
                              value={selectedAdditional?.quantity || 1}
                              onChange={(e) => {
                                if (!onUpdateAdditionalEquipment) return;
                                const newQuantity = parseInt(e.target.value) || 1;
                                const currentAdditional = selectedItem?.selectedAdditionalEquipment || [];
                                const updatedAdditional = currentAdditional.map(a => 
                                  a.id === additional.id ? { ...a, quantity: newQuantity } : a
                                );
                                onUpdateAdditionalEquipment(equipment.id, updatedAdditional);
                              }}
                            />
                          )}
                          <span className="text-xs">{additional.pricePerDay} PLN/dzień</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-sm">
              <p>Cena: {selectedItem?.pricePerDay} PLN/dzień</p>
              <p className="font-medium">Razem: {selectedItem?.totalPrice} PLN</p>
            </div>

            <Button
              onClick={() => onRemove(equipment.id)}
              variant="destructive"
              className="w-full h-8"
              size="sm"
            >
              <Minus className="w-4 h-4 mr-1" />
              Usuń
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Dostępne: {equipment.availableQuantity} szt.
        </div>
      </CardContent>
    </Card>
  );
}