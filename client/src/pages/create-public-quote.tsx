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
import { Store, Plus, Minus, Calculator, ArrowLeft, Search } from "lucide-react";
import type { PublicEquipmentCategory, PublicEquipmentPricing, PublicEquipmentAdditional, PublicEquipment } from "@shared/schema";

// Extended PublicEquipment with relations for UI
interface PublicEquipmentWithRelations extends PublicEquipment {
  category: PublicEquipmentCategory;
  pricing: PublicEquipmentPricing[];
  additionalEquipment: PublicEquipmentAdditional[];
}

interface Client {
  id?: number;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

// UI-specific QuoteItem with additional UI fields
interface QuoteItem {
  equipmentId: number;
  equipment: PublicEquipmentWithRelations;
  quantity: number;
  rentalPeriodDays: number;
  pricePerDay: string;
  discountPercent: string;
  totalPrice: string;
  additionalCost: string;
  accessoriesCost: string;
  additionalItems: PublicEquipmentAdditional[];
  selectedAdditional: number[];
  notes?: string;
  // Fuel cost fields - matching schema
  fuelConsumptionLH?: string;
  fuelPricePerLiter?: string;
  hoursPerDay?: number;
  totalFuelCost?: string;
  includeFuelCost?: boolean;
  fuelConsumptionPer100km?: string;
  kilometersPerDay?: number;
  includeMaintenanceCost?: boolean;
  calculationType?: string;
  includeInstallationCost?: boolean;
}

// Form schemas
const clientSchema = z.object({
  companyName: z.string().min(1, "Nazwa firmy jest wymagana"),
  contactPerson: z.string().optional(),
  email: z.string().email("Nieprawidłowy format email").optional().or(z.literal("")),
  phone: z.string().min(1, "Numer telefonu jest wymagany"),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
});

const quoteSchema = z.object({
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;
type QuoteFormData = z.infer<typeof quoteSchema>;

export default function CreatePublicQuote() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");
  
  // Forms
  const clientForm = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
    }
  });

  const quoteForm = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      notes: "",
    }
  });

  // Queries
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: equipment = [] } = useQuery<PublicEquipmentWithRelations[]>({
    queryKey: ["/api/public-equipment"],
  });

  // Filter equipment
  const filteredEquipment = (equipment || []).filter(equip =>
    equip && equip.isActive && equip.category &&
    (equip.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
     equip.description?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
     equip.model?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
     equip.category?.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()))
  );

  // Mutations
  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: any) => {
      return apiRequest("/api/public-quotes", "POST", quoteData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-quotes"] });
      toast({ title: "Sukces", description: "Wycena została utworzona" });
      setLocation(`/public-quotes`);
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  // Helper functions
  const calculateItemTotal = (item: QuoteItem): string => {
    const basePrice = parseFloat(item.pricePerDay) * item.quantity * item.rentalPeriodDays;
    const additionalCost = parseFloat(item.additionalCost) || 0;
    const accessoriesCost = parseFloat(item.accessoriesCost) || 0;
    return (basePrice + additionalCost + accessoriesCost).toFixed(2);
  };

  const calculateQuoteTotal = (): { net: string; gross: string } => {
    const net = quoteItems.reduce((sum, item) => sum + parseFloat(calculateItemTotal(item)), 0);
    const gross = net * 1.23; // 23% VAT
    return { net: net.toFixed(2), gross: gross.toFixed(2) };
  };

  // Event handlers
  const addEquipmentToQuote = (equipment: PublicEquipmentWithRelations) => {
    // Find appropriate pricing tier for 1 day rental
    const pricing = (equipment.pricing || []).find(p => p.periodStart <= 1 && (p.periodEnd === null || p.periodEnd >= 1));
    if (!pricing) {
      toast({ title: "Błąd", description: "Brak ceny dla tego sprzętu", variant: "destructive" });
      return;
    }

    const newItem: QuoteItem = {
      equipmentId: equipment.id,
      equipment,
      quantity: 1,
      rentalPeriodDays: 1,
      pricePerDay: pricing.pricePerDay,
      discountPercent: pricing.discountPercent,
      totalPrice: pricing.pricePerDay,
      additionalCost: "0",
      accessoriesCost: "0",
      additionalItems: equipment.additionalEquipment || [],
      selectedAdditional: [],
      notes: "",
      // Initialize fuel cost fields with defaults
      fuelConsumptionLH: "0",
      fuelPricePerLiter: "6.50",
      hoursPerDay: 8,
      totalFuelCost: "0",
      includeFuelCost: false,
      fuelConsumptionPer100km: "0",
      kilometersPerDay: 0,
      includeMaintenanceCost: false,
      calculationType: "motohours",
      includeInstallationCost: false,
    };

    setQuoteItems([...quoteItems, newItem]);
  };

  const updateSelectedAdditional = (itemIndex: number, additionalId: number, checked: boolean) => {
    const updated = [...quoteItems];
    const item = updated[itemIndex];
    
    if (checked) {
      item.selectedAdditional = [...item.selectedAdditional, additionalId];
    } else {
      item.selectedAdditional = item.selectedAdditional.filter(id => id !== additionalId);
    }
    
    // Recalculate additional costs
    const additionalCost = item.selectedAdditional.reduce((sum, id) => {
      const additionalItem = item.additionalItems.find(a => a.id === id);
      return sum + (additionalItem ? parseFloat(additionalItem.price) * item.quantity * item.rentalPeriodDays : 0);
    }, 0);
    
    item.additionalCost = additionalCost.toFixed(2);
    item.totalPrice = calculateItemTotal(item);
    
    setQuoteItems(updated);
  };

  const updateQuoteItem = (index: number, field: keyof QuoteItem, value: any) => {
    const updated = [...quoteItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate pricing when quantity or rental period changes
    if (field === 'quantity' || field === 'rentalPeriodDays') {
      const item = updated[index];
      const equipment = item.equipment;
      const period = item.rentalPeriodDays;
      
      // Find appropriate pricing tier
      const pricing = (equipment.pricing || []).find(p => 
        p.periodStart <= period && (p.periodEnd === null || p.periodEnd >= period)
      );
      
      if (pricing) {
        item.pricePerDay = pricing.pricePerDay;
        item.discountPercent = pricing.discountPercent;
      }

      // Recalculate additional equipment costs
      const additionalCost = item.selectedAdditional.reduce((sum, id) => {
        const additionalItem = item.additionalItems.find(a => a.id === id);
        return sum + (additionalItem ? parseFloat(additionalItem.price) * item.quantity * item.rentalPeriodDays : 0);
      }, 0);
      
      item.additionalCost = additionalCost.toFixed(2);
    }

    updated[index].totalPrice = calculateItemTotal(updated[index]);
    setQuoteItems(updated);
  };

  const removeQuoteItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };


  const handleSubmitQuote = (data: QuoteFormData) => {
    const clientData = clientForm.getValues();
    
    if (!clientData.companyName.trim()) {
      toast({ title: "Błąd", description: "Wprowadź nazwę firmy", variant: "destructive" });
      return;
    }

    if (!clientData.phone.trim()) {
      toast({ title: "Błąd", description: "Wprowadź numer telefonu", variant: "destructive" });
      return;
    }

    if (quoteItems.length === 0) {
      toast({ title: "Błąd", description: "Dodaj przynajmniej jeden element do wyceny", variant: "destructive" });
      return;
    }

    const totals = calculateQuoteTotal();
    const quoteData = {
      clientName: clientData.companyName.trim(),
      phone: clientData.phone.trim(),
      contactPerson: clientData.contactPerson?.trim() || "",
      email: clientData.email?.trim() || "",
      address: clientData.address?.trim() || "",
      city: clientData.city?.trim() || "",
      postalCode: clientData.postalCode?.trim() || "",
      items: quoteItems.map(item => ({
        equipmentId: item.equipmentId,
        quantity: item.quantity,
        rentalPeriodDays: item.rentalPeriodDays,
        pricePerDay: item.pricePerDay,
        discountPercent: item.discountPercent,
        totalPrice: item.totalPrice,
        additionalCost: item.additionalCost,
        accessoriesCost: item.accessoriesCost,
        selectedAdditional: item.selectedAdditional,
        notes: item.notes,
      })),
      totalNet: totals.net,
      totalGross: totals.gross,
      vatRate: "23",
      status: "draft",
      notes: data.notes,
    };

    createQuoteMutation.mutate(quoteData);
  };

  const totals = calculateQuoteTotal();

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setLocation("/public-quotes")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Store className="w-8 h-8 text-blue-600" />
                Nowa Wycena Publiczna
              </h1>
              <p className="text-muted-foreground mt-2">
                Utwórz nową wycenę dla wynajmu publicznego
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Klient</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Nowy klient</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...clientForm}>
                      <div className="space-y-4">
                          <FormField
                            control={clientForm.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nazwa firmy *</FormLabel>
                                <FormControl>
                                  <Input {...field} />
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
                                <FormLabel>Telefon *</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Numer telefonu" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={clientForm.control}
                            name="contactPerson"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Osoba kontaktowa</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Opcjonalne" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={clientForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} placeholder="Opcjonalne" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      </div>
                    </Form>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>

          {/* Equipment Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Sprzęt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj sprzętu..."
                    value={equipmentSearchTerm}
                    onChange={(e) => setEquipmentSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredEquipment.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-accent flex gap-3"
                      onClick={() => addEquipmentToQuote(item)}
                    >
                      {/* Image section */}
                      {item.imageUrl ? (
                        <div className="flex-shrink-0">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-md border"
                            onError={(e) => {
                              // Hide image if it fails to load
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md border flex items-center justify-center">
                          <Store className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Content section */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.name}</h4>
                        <p className="text-sm text-muted-foreground truncate">{item.category.name}</p>
                        {item.model && <p className="text-sm truncate">{item.model}</p>}
                        <p className="text-sm font-medium text-green-600">
                          Dostępne: {item.availableQuantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quote Items */}
        {quoteItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pozycje wyceny</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quoteItems.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{item.equipment.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.equipment.category.name}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeQuoteItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Ilość</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuoteItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Okres (dni)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.rentalPeriodDays}
                          onChange={(e) => updateQuoteItem(index, 'rentalPeriodDays', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Cena za dzień</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.pricePerDay}
                          onChange={(e) => updateQuoteItem(index, 'pricePerDay', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Additional Equipment Section */}
                    {item.additionalItems && item.additionalItems.length > 0 && (
                      <div className="mt-4 p-3 border rounded-lg bg-muted/50">
                        <Label className="text-sm font-medium">Dodatkowe wyposażenie</Label>
                        <div className="mt-2 space-y-2">
                          {item.additionalItems.map((additional) => (
                            <div key={additional.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`additional-${index}-${additional.id}`}
                                checked={item.selectedAdditional.includes(additional.id)}
                                onCheckedChange={(checked) => 
                                  updateSelectedAdditional(index, additional.id, checked as boolean)
                                }
                              />
                              <Label 
                                htmlFor={`additional-${index}-${additional.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {additional.name} - {additional.price} PLN/dzień
                              </Label>
                            </div>
                          ))}
                          {item.selectedAdditional.length > 0 && (
                            <div className="text-sm text-muted-foreground mt-2">
                              Koszt dodatkowego wyposażenia: {item.additionalCost} PLN
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        Rabat: {item.discountPercent}%
                      </span>
                      <span className="font-medium">
                        Suma: {calculateItemTotal(item)} PLN
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote Summary and Submit */}
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie wyceny</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...quoteForm}>
              <form onSubmit={quoteForm.handleSubmit(handleSubmitQuote)} className="space-y-4">
                <FormField
                  control={quoteForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uwagi</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Dodatkowe uwagi do wyceny..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Wartość netto:</span>
                    <span className="font-medium">{totals.net} PLN</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT (23%):</span>
                    <span className="font-medium">{(parseFloat(totals.gross) - parseFloat(totals.net)).toFixed(2)} PLN</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Wartość brutto:</span>
                    <span>{totals.gross} PLN</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    type="submit" 
                    disabled={createQuoteMutation.isPending || !clientForm.watch('companyName')?.trim() || !clientForm.watch('phone')?.trim() || quoteItems.length === 0}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    {createQuoteMutation.isPending ? "Tworzenie..." : "Utwórz wycenę"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setLocation("/public-quotes")}>
                    Anuluj
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}