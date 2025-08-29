import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Store, Plus, Trash2, Search, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types (matching the detail page)
interface PublicEquipmentPricing {
  id: number;
  equipmentId: number;
  periodStart: number;
  periodEnd: number | null;
  pricePerDay: string;
  discountPercent: string;
}

interface PublicEquipmentAdditional {
  id: number;
  equipmentId: number;
  type: string;
  name: string;
  price: string;
  position: number;
}

interface PublicEquipment {
  id: number;
  name: string;
  categoryId: number;
  description: string;
  model: string;
  power: string;
  pricing: PublicEquipmentPricing[];
  additionalEquipment: PublicEquipmentAdditional[];
  category: {
    id: number;
    name: string;
  };
}

interface PublicQuoteDetail {
  id: number;
  quoteNumber: string;
  clientId: number;
  createdById: string;
  totalNet: string;
  totalGross: string;
  vatRate: string;
  status: string;
  notes: string;
  createdAt: string;
  client: {
    id: number;
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    nip: string;
  };
  items: Array<{
    id: number;
    equipmentId: number;
    quantity: number;
    rentalPeriodDays: number;
    pricePerDay: string;
    discountPercent: string;
    totalPrice: string;
    additionalCost: string;
    accessoriesCost: string;
    notes: string;
    selectedAdditional: number[];
    equipment: {
      id: number;
      name: string;
      description: string;
      model: string;
      power: string;
    };
    additionalItems: Array<{
      id: number;
      name: string;
      price: string;
    }>;
  }>;
}

interface QuoteItem {
  equipmentId: number;
  equipment: PublicEquipment;
  quantity: number;
  rentalPeriodDays: number;
  pricePerDay: string;
  discountPercent: string;
  totalPrice: string;
  additionalCost: string;
  accessoriesCost: string;
  selectedAdditional: number[];
  additionalItems: PublicEquipmentAdditional[];
  notes: string;
}

// Schemas
const clientSchema = z.object({
  companyName: z.string().min(1, "Nazwa firmy jest wymagana"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Nieprawidłowy format email").optional().or(z.literal("")),
  address: z.string().optional(),
  nip: z.string().optional(),
});

const quoteSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;
type QuoteFormData = z.infer<typeof quoteSchema>;

function isUnauthorizedError(error: any): boolean {
  return error?.message === "Unauthorized" || 
         error?.response?.status === 401 ||
         error?.status === 401;
}

export default function EditPublicQuote() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get quote ID from URL
  const quoteId = parseInt(window.location.pathname.split('/')[2] || '0');
  
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState("");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);

  // Forms
  const clientForm = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      nip: "",
    }
  });

  const quoteForm = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      status: "draft",
      notes: "",
    }
  });

  // Redirect non-authorized users
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'public_manager'))) {
      toast({
        title: "Brak uprawnień",
        description: "Dostęp do edycji wycen wynajmu publicznego jest dostępny tylko dla administratorów i kierowników wynajmu publicznego.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/public-quotes");
      }, 1000);
    }
  }, [isAuthenticated, user, authLoading, toast, setLocation]);

  // Queries
  const { data: quote, isLoading: quoteLoading } = useQuery<PublicQuoteDetail>({
    queryKey: [`/api/public-quotes/${quoteId}`],
    enabled: !!quoteId && quoteId > 0,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery<PublicEquipment[]>({
    queryKey: ["/api/public-equipment"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Load quote data into forms when available
  useEffect(() => {
    if (quote) {
      // Set client form data
      clientForm.reset({
        companyName: quote.client.companyName,
        contactPerson: quote.client.contactPerson || "",
        phone: quote.client.phone || "",
        email: quote.client.email || "",
        address: quote.client.address || "",
        nip: quote.client.nip || "",
      });

      // Set quote form data
      quoteForm.reset({
        status: quote.status,
        notes: quote.notes || "",
      });

      // Convert quote items to QuoteItem format
      const convertedItems: QuoteItem[] = quote.items.map(item => {
        const equipmentData = equipment.find(eq => eq.id === item.equipmentId);
        
        return {
          equipmentId: item.equipmentId,
          equipment: equipmentData || {
            id: item.equipmentId,
            name: item.equipment.name,
            categoryId: 1,
            description: item.equipment.description || "",
            model: item.equipment.model || "",
            power: item.equipment.power || "",
            pricing: [],
            additionalEquipment: [],
            category: { id: 1, name: "Unknown" }
          },
          quantity: item.quantity,
          rentalPeriodDays: item.rentalPeriodDays,
          pricePerDay: item.pricePerDay,
          discountPercent: item.discountPercent,
          totalPrice: item.totalPrice,
          additionalCost: item.additionalCost,
          accessoriesCost: item.accessoriesCost,
          selectedAdditional: item.selectedAdditional,
          additionalItems: item.additionalItems.map(add => ({
            id: add.id,
            equipmentId: item.equipmentId,
            type: "additional",
            name: add.name,
            price: add.price,
            position: 1
          })),
          notes: item.notes || "",
        };
      });

      setQuoteItems(convertedItems);
    }
  }, [quote, equipment, clientForm, quoteForm]);

  // Mutations
  const updateQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/public-quotes/${quoteId}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-quotes"] });
      queryClient.invalidateQueries({ queryKey: [`/api/public-quotes/${quoteId}`] });
      toast({ 
        title: "Sukces", 
        description: "Wycena została zaktualizowana" 
      });
      setLocation(`/public-quotes/${quoteId}`);
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sesja wygasła",
          description: "Nastąpi przekierowanie do strony logowania.",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/", 2000);
        return;
      }
      toast({ 
        title: "Błąd", 
        description: error.message || "Nie udało się zaktualizować wyceny", 
        variant: "destructive" 
      });
    },
  });

  // Helper functions
  const calculateItemTotal = (item: QuoteItem): string => {
    const baseTotal = item.quantity * item.rentalPeriodDays * parseFloat(item.pricePerDay);
    const discountedTotal = baseTotal * (1 - parseFloat(item.discountPercent) / 100);
    const additionalCost = parseFloat(item.additionalCost || "0");
    const accessoriesCost = parseFloat(item.accessoriesCost || "0");
    return (discountedTotal + additionalCost + accessoriesCost).toFixed(2);
  };

  const calculateQuoteTotal = () => {
    const net = quoteItems.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
    const gross = net * 1.23;
    return { net: net.toFixed(2), gross: gross.toFixed(2) };
  };

  const addEquipmentToQuote = (selectedEquipment: PublicEquipment) => {
    const existingItemIndex = quoteItems.findIndex(item => item.equipmentId === selectedEquipment.id);
    
    if (existingItemIndex !== -1) {
      const updatedItems = [...quoteItems];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].totalPrice = calculateItemTotal(updatedItems[existingItemIndex]);
      setQuoteItems(updatedItems);
    } else {
      const defaultPricing = selectedEquipment.pricing.find(p => p.periodStart === 1);
      const newItem: QuoteItem = {
        equipmentId: selectedEquipment.id,
        equipment: selectedEquipment,
        quantity: 1,
        rentalPeriodDays: 1,
        pricePerDay: defaultPricing?.pricePerDay || "0",
        discountPercent: defaultPricing?.discountPercent || "0",
        totalPrice: "0",
        additionalCost: "0",
        accessoriesCost: "0",
        selectedAdditional: [],
        additionalItems: selectedEquipment.additionalEquipment,
        notes: "",
      };
      newItem.totalPrice = calculateItemTotal(newItem);
      setQuoteItems([...quoteItems, newItem]);
    }
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

  const toggleAdditionalEquipment = (itemIndex: number, additionalId: number) => {
    const updated = [...quoteItems];
    const item = updated[itemIndex];
    
    if (item.selectedAdditional.includes(additionalId)) {
      item.selectedAdditional = item.selectedAdditional.filter(id => id !== additionalId);
    } else {
      item.selectedAdditional = [...item.selectedAdditional, additionalId];
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

  const removeQuoteItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const handleSubmitQuote = (data: QuoteFormData) => {
    const clientData = clientForm.getValues();
    
    if (!clientData.companyName.trim()) {
      toast({ title: "Błąd", description: "Wprowadź nazwę firmy", variant: "destructive" });
      return;
    }

    if (quoteItems.length === 0) {
      toast({ title: "Błąd", description: "Dodaj przynajmniej jeden element do wyceny", variant: "destructive" });
      return;
    }

    const totals = calculateQuoteTotal();
    const updateData = {
      clientId: quote?.clientId,
      client: {
        companyName: clientData.companyName.trim(),
        contactPerson: clientData.contactPerson?.trim() || "",
        phone: clientData.phone?.trim() || "",
        email: clientData.email?.trim() || "",
        address: clientData.address?.trim() || "",
        nip: clientData.nip?.trim() || "",
      },
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
      status: data.status || "draft",
      notes: data.notes,
    };

    updateQuoteMutation.mutate(updateData);
  };

  // Filter equipment based on search term
  const filteredEquipment = equipment.filter(item => 
    equipmentSearchTerm === "" || 
    item.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    item.model?.toLowerCase().includes(equipmentSearchTerm.toLowerCase()) ||
    item.category.name.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
  );

  const totals = calculateQuoteTotal();

  if (authLoading || quoteLoading) {
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

  if (!quote) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setLocation("/public-quotes")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <p className="text-center">Wycena nie została znaleziona.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setLocation(`/public-quotes/${quoteId}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Edit className="w-8 h-8 text-blue-600" />
                Edycja Wyceny: {quote.quoteNumber}
              </h1>
              <p className="text-muted-foreground mt-2">
                Edytuj wycenę wynajmu publicznego
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Informacje o kliencie</CardTitle>
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
                          <FormLabel>Telefon</FormLabel>
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
                    <FormField
                      control={clientForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adres</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Opcjonalne" />
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
                            <Input {...field} placeholder="Opcjonalne" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>

                {/* Quote Settings */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-4">Ustawienia wyceny</h3>
                  <Form {...quoteForm}>
                    <div className="space-y-4">
                      <FormField
                        control={quoteForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Wybierz status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Szkic</SelectItem>
                                <SelectItem value="pending">Oczekująca</SelectItem>
                                <SelectItem value="approved">Zatwierdzona</SelectItem>
                                <SelectItem value="rejected">Odrzucona</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={quoteForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notatki</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Dodatkowe informacje..."
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Form>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equipment and Quote Items */}
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

                {equipmentLoading ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Ładowanie sprzętu...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {filteredEquipment.map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => addEquipmentToQuote(item)}
                      >
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">{item.category.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <Button size="sm" className="mt-2 w-full">
                          <Plus className="w-3 h-3 mr-1" />
                          Dodaj
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quote Items Table */}
            {quoteItems.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Pozycje wyceny</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {quoteItems.map((item, index) => (
                      <div key={`${item.equipmentId}-${index}`} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{item.equipment.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {item.equipment.category.name}
                              {item.equipment.model && ` • ${item.equipment.model}`}
                              {item.equipment.power && ` • ${item.equipment.power}`}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeQuoteItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-3">
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
                            <Label>Cena/dzień</Label>
                            <Input
                              value={parseFloat(item.pricePerDay).toFixed(2) + ' PLN'}
                              readOnly
                            />
                          </div>
                        </div>

                        {item.additionalItems.length > 0 && (
                          <div className="mb-3">
                            <Label className="text-sm font-medium">Dodatkowe wyposażenie</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {item.additionalItems.map((additional) => (
                                <div key={additional.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`additional-${additional.id}`}
                                    checked={item.selectedAdditional.includes(additional.id)}
                                    onCheckedChange={() => toggleAdditionalEquipment(index, additional.id)}
                                  />
                                  <Label
                                    htmlFor={`additional-${additional.id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {additional.name} (+{parseFloat(additional.price).toFixed(2)} PLN)
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mb-3">
                          <Label>Notatki</Label>
                          <Input
                            placeholder="Dodatkowe informacje..."
                            value={item.notes}
                            onChange={(e) => updateQuoteItem(index, 'notes', e.target.value)}
                          />
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t">
                          <span className="text-sm text-muted-foreground">
                            Rabat: {parseFloat(item.discountPercent).toFixed(0)}%
                          </span>
                          <span className="font-bold text-lg">
                            {parseFloat(item.totalPrice).toFixed(2)} PLN
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quote Summary */}
                  <div className="border-t mt-6 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Wartość netto:</span>
                      <span className="font-bold text-lg">{totals.net} PLN</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">VAT (23%):</span>
                      <span className="font-bold text-lg">
                        {(parseFloat(totals.gross) - parseFloat(totals.net)).toFixed(2)} PLN
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xl border-t pt-2">
                      <span className="font-bold">Wartość brutto:</span>
                      <span className="font-bold text-blue-600">{totals.gross} PLN</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="mt-6">
                    <Form {...quoteForm}>
                      <form onSubmit={quoteForm.handleSubmit(handleSubmitQuote)}>
                        <Button 
                          type="submit" 
                          className="w-full" 
                          size="lg"
                          disabled={updateQuoteMutation.isPending}
                        >
                          {updateQuoteMutation.isPending ? (
                            "Aktualizowanie..."
                          ) : (
                            "Zaktualizuj wycenę"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}