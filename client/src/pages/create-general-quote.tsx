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
import { Package, Plus, Minus, Calculator, ArrowLeft, Search } from "lucide-react";

// Types for general equipment
interface GeneralEquipmentCategory {
  id: number;
  name: string;
  description?: string;
}

interface GeneralEquipmentPricing {
  id: number;
  equipmentId: number;
  periodStart: number;
  periodEnd: number | null;
  pricePerDay: string;
  discountPercent: string;
}

interface GeneralEquipmentAdditional {
  id: number;
  equipmentId: number;
  type: string;
  name: string;
  description?: string;
  pricePerDay: string;
  position: number;
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
  email: z.string().email("Nieprawidłowy email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  nip: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function CreateGeneralQuote() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);
  const [notes, setNotes] = useState("");
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");

  // Form
  const clientForm = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      nip: "",
    }
  });

  // Queries
  const { data: equipment = [] } = useQuery<GeneralEquipment[]>({
    queryKey: ["/api/general-equipment"],
  });

  const { data: categories = [] } = useQuery<GeneralEquipmentCategory[]>({
    queryKey: ["/api/general-equipment-categories"],
  });

  // Filter equipment based on search term
  const filteredEquipment = equipment.filter(equip =>
    equip.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equip.description?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equip.model?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    equip.category.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
  );

  // Mutations
  const createQuoteMutation = useMutation({
    mutationFn: async (data: { 
      client: ClientFormData; 
      items: QuoteItem[]; 
      notes: string;
      status: string;
      totalNet: string;
      totalGross: string;
      vatRate: string;
    }) => {
      return apiRequest("/api/general-quotes", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "Sukces", description: "Wycena została utworzona" });
      navigate("/general-quotes");
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  // Helper functions
  const addEquipmentToQuote = (equipment: GeneralEquipment) => {
    const existingItem = selectedItems.find(item => item.equipmentId === equipment.id);
    
    if (existingItem) {
      toast({ title: "Informacja", description: "Ten sprzęt jest już dodany do wyceny" });
      return;
    }

    const defaultPricing = equipment.pricing.find(p => p.periodStart === 1) || equipment.pricing[0];
    
    const newItem: QuoteItem = {
      equipmentId: equipment.id,
      quantity: 1,
      rentalPeriodDays: 7,
      pricePerDay: defaultPricing?.pricePerDay || "100",
      discountPercent: defaultPricing?.discountPercent || "0",
      totalPrice: calculateItemTotal(1, 7, parseFloat(defaultPricing?.pricePerDay || "100"), parseFloat(defaultPricing?.discountPercent || "0")),
      notes: "",
      selectedAdditionalEquipment: [],
    };

    setSelectedItems([...selectedItems, newItem]);
  };

  const removeEquipmentFromQuote = (equipmentId: number) => {
    setSelectedItems(selectedItems.filter(item => item.equipmentId !== equipmentId));
  };

  const updateQuoteItem = (equipmentId: number, field: keyof QuoteItem, value: any) => {
    setSelectedItems(items => 
      items.map(item => {
        if (item.equipmentId === equipmentId) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate total when quantity, period, price, or additional equipment changes
          if (field === 'quantity' || field === 'rentalPeriodDays' || field === 'pricePerDay' || field === 'selectedAdditionalEquipment') {
            const equipment = getEquipmentById(equipmentId);
            const pricing = getPricingForPeriod(equipment, updatedItem.rentalPeriodDays);
            updatedItem.pricePerDay = pricing.pricePerDay;
            updatedItem.discountPercent = pricing.discountPercent;
            updatedItem.totalPrice = calculateItemTotal(
              updatedItem.quantity,
              updatedItem.rentalPeriodDays,
              parseFloat(pricing.pricePerDay),
              parseFloat(pricing.discountPercent),
              updatedItem.selectedAdditionalEquipment
            );
          }
          
          return updatedItem;
        }
        return item;
      })
    );
  };

  const getEquipmentById = (id: number) => {
    return equipment.find(eq => eq.id === id)!;
  };

  const getPricingForPeriod = (equipment: GeneralEquipment, days: number) => {
    const pricing = equipment.pricing
      .sort((a, b) => a.periodStart - b.periodStart)
      .find(p => days >= p.periodStart && (p.periodEnd === null || days <= p.periodEnd));
    
    return pricing || equipment.pricing[0] || { pricePerDay: "100", discountPercent: "0" };
  };

  const calculateItemTotal = (quantity: number, days: number, pricePerDay: number, discountPercent: number, additionalEquipment?: SelectedAdditionalEquipment[]) => {
    const subtotal = quantity * days * pricePerDay;
    const discount = subtotal * (discountPercent / 100);
    
    // Add additional equipment costs
    let additionalCost = 0;
    if (additionalEquipment) {
      additionalCost = additionalEquipment.reduce((sum, item) => {
        return sum + (item.quantity * days * parseFloat(item.pricePerDay));
      }, 0);
    }
    
    return ((subtotal - discount) + additionalCost).toFixed(2);
  };

  const getTotalNet = () => {
    return selectedItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
  };

  const getTotalGross = () => {
    return getTotalNet() * 1.23; // 23% VAT
  };

  const onSubmit = (clientData: ClientFormData) => {
    if (selectedItems.length === 0) {
      toast({ title: "Błąd", description: "Dodaj przynajmniej jeden element do wyceny", variant: "destructive" });
      return;
    }

    createQuoteMutation.mutate({
      client: clientData,
      items: selectedItems,
      notes,
      status: "draft",
      totalNet: getTotalNet().toString(),
      totalGross: getTotalGross().toString(),
      vatRate: "23",
    });
  };

  const renderPriceWithDiscount = (pricePerDay: string, discountPercent: string, days: number, quantity: number) => {
    const price = parseFloat(pricePerDay);
    const discount = parseFloat(discountPercent);
    const originalPrice = price * days * quantity;
    const discountedPrice = originalPrice * (1 - discount / 100);

    return (
      <div className="text-right">
        {discount > 0 ? (
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

  // Group filtered equipment by category
  const equipmentByCategory = categories.map(category => ({
    ...category,
    equipment: filteredEquipment.filter(eq => eq.categoryId === category.id && eq.isActive)
  })).filter(category => category.equipment.length > 0);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/")} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót do dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-8 h-8 text-green-600" />
              Nowa Wycena - Wynajem Ogólny
            </h1>
            <p className="text-muted-foreground mt-2">
              Utwórz wycenę sprzętu wynajmu ogólnego
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Equipment Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Wybierz sprzęt</CardTitle>
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
              <CardContent className="space-y-4">
                {equipmentByCategory.map(category => (
                  <div key={category.id}>
                    <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
                    <div className="grid gap-2">
                      {category.equipment.map(item => {
                        const isSelected = selectedItems.some(selected => selected.equipmentId === item.id);
                        return (
                          <div
                            key={item.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => addEquipmentToQuote(item)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{item.name}</h4>
                                {item.model && <p className="text-sm text-muted-foreground">Model: {item.model}</p>}
                                {item.power && <p className="text-sm text-muted-foreground">Moc: {item.power}</p>}
                                <p className="text-sm text-muted-foreground">
                                  Dostępne: {item.availableQuantity} / {item.quantity}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {item.pricing[0]?.pricePerDay || "100"} PLN/dzień
                                </p>
                                {isSelected && (
                                  <Badge variant="secondary" className="mt-1">Dodano</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quote Details */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informacje o kliencie</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...clientForm}>
                  <form className="space-y-4">
                    <FormField
                      control={clientForm.control}
                      name="companyName"
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={clientForm.control}
                        name="contactPerson"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Osoba kontaktowa</FormLabel>
                            <FormControl>
                              <Input placeholder="Jan Kowalski" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={clientForm.control}
                        name="nip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NIP</FormLabel>
                            <FormControl>
                              <Input placeholder="1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={clientForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="kontakt@firma.pl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={clientForm.control}
                        name="phone"
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
                    </div>
                    
                    <FormField
                      control={clientForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adres</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Adres firmy" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Selected Equipment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Wybrane pozycje ({selectedItems.length})
                  <Calculator className="w-5 h-5" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nie wybrano jeszcze żadnego sprzętu</p>
                    <p className="text-sm">Kliknij na sprzęt z lewej strony, aby go dodać</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedItems.map((item) => {
                      const equipmentItem = getEquipmentById(item.equipmentId);
                      const pricing = getPricingForPeriod(equipmentItem, item.rentalPeriodDays);
                      
                      return (
                        <div key={item.equipmentId} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium">{equipmentItem.name}</h4>
                              <p className="text-sm text-muted-foreground">{equipmentItem.category.name}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeEquipmentFromQuote(item.equipmentId)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Ilość</Label>
                              <Input
                                type="number"
                                min="1"
                                max={equipmentItem.availableQuantity}
                                value={item.quantity}
                                onChange={(e) => updateQuoteItem(item.equipmentId, 'quantity', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div>
                              <Label>Okres wynajmu (dni)</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.rentalPeriodDays}
                                onChange={(e) => updateQuoteItem(item.equipmentId, 'rentalPeriodDays', parseInt(e.target.value) || 1)}
                              />
                            </div>
                          </div>
                          
                          {/* Additional Equipment Section */}
                          {equipmentItem.additionalEquipment && equipmentItem.additionalEquipment.length > 0 && (
                            <div className="mt-3">
                              <Label className="text-sm font-medium">Dodatkowe wyposażenie</Label>
                              <div className="mt-2 space-y-2 p-3 bg-gray-50 rounded-lg">
                                {equipmentItem.additionalEquipment.map((additional) => {
                                  const isSelected = item.selectedAdditionalEquipment?.some(sel => sel.id === additional.id) || false;
                                  const selectedItem = item.selectedAdditionalEquipment?.find(sel => sel.id === additional.id);
                                  
                                  return (
                                    <div key={additional.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                      <div className="flex items-center space-x-3">
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={(checked) => {
                                            const currentAdditional = item.selectedAdditionalEquipment || [];
                                            if (checked) {
                                              const newAdditional = [...currentAdditional, {
                                                id: additional.id,
                                                name: additional.name,
                                                pricePerDay: additional.pricePerDay,
                                                quantity: 1
                                              }];
                                              updateQuoteItem(item.equipmentId, 'selectedAdditionalEquipment', newAdditional);
                                            } else {
                                              const newAdditional = currentAdditional.filter(a => a.id !== additional.id);
                                              updateQuoteItem(item.equipmentId, 'selectedAdditionalEquipment', newAdditional);
                                            }
                                          }}
                                        />
                                        <div>
                                          <span className="text-sm font-medium">{additional.name}</span>
                                          {additional.description && (
                                            <p className="text-xs text-muted-foreground">{additional.description}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {isSelected && (
                                          <Input
                                            type="number"
                                            min="1"
                                            className="w-16 h-8"
                                            value={selectedItem?.quantity || 1}
                                            onChange={(e) => {
                                              const newQuantity = parseInt(e.target.value) || 1;
                                              const currentAdditional = item.selectedAdditionalEquipment || [];
                                              const updatedAdditional = currentAdditional.map(a => 
                                                a.id === additional.id ? { ...a, quantity: newQuantity } : a
                                              );
                                              updateQuoteItem(item.equipmentId, 'selectedAdditionalEquipment', updatedAdditional);
                                            }}
                                          />
                                        )}
                                        <span className="text-sm font-medium">{additional.pricePerDay} PLN/dzień</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="mt-3">
                            <Label>Notatki</Label>
                            <Input
                              placeholder="Dodatkowe informacje"
                              value={item.notes || ""}
                              onChange={(e) => updateQuoteItem(item.equipmentId, 'notes', e.target.value)}
                            />
                          </div>
                          
                          <div className="mt-3 pt-3 border-t">
                            {renderPriceWithDiscount(pricing.pricePerDay, pricing.discountPercent, item.rentalPeriodDays, item.quantity)}
                            <p className="text-right font-bold text-lg">
                              Razem: {item.totalPrice} PLN
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quote Summary */}
            {selectedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Podsumowanie wyceny</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Wartość netto:</span>
                      <span className="font-medium">{getTotalNet().toFixed(2)} PLN</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (23%):</span>
                      <span className="font-medium">{(getTotalGross() - getTotalNet()).toFixed(2)} PLN</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Wartość brutto:</span>
                      <span>{getTotalGross().toFixed(2)} PLN</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label>Dodatkowe uwagi</Label>
                    <Textarea
                      placeholder="Dodatkowe informacje do wyceny"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <Button
                    onClick={clientForm.handleSubmit(onSubmit)}
                    className="w-full mt-4"
                    disabled={createQuoteMutation.isPending}
                  >
                    {createQuoteMutation.isPending ? "Tworzenie wyceny..." : "Utwórz wycenę"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}