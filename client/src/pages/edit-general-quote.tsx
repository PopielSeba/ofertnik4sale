import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Save, 
  Trash2,
  Package,
  Plus
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface GeneralQuoteDetails {
  id: number;
  quoteNumber: string;
  client: {
    id: number;
    companyName: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    nip?: string;
  };
  status: string;
  totalNet: string;
  totalGross: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: number;
    quantity: number;
    rentalPeriodDays: number;
    pricePerDay: string;
    totalPrice: string;
    notes?: string;
    // Installation cost fields
    includeInstallationCost?: boolean;
    installationDistanceKm?: string;
    numberOfTechnicians?: number;
    serviceRatePerTechnician?: string;
    travelRatePerKm?: string;
    totalInstallationCost?: string;
    // Disassembly cost fields
    includeDisassemblyCost?: boolean;
    disassemblyDistanceKm?: string;
    disassemblyNumberOfTechnicians?: number;
    disassemblyServiceRatePerTechnician?: string;
    disassemblyTravelRatePerKm?: string;
    totalDisassemblyCost?: string;
    // Travel/Service cost fields
    includeTravelServiceCost?: boolean;
    travelServiceDistanceKm?: string;
    travelServiceNumberOfTechnicians?: number;
    travelServiceServiceRatePerTechnician?: string;
    travelServiceTravelRatePerKm?: string;
    travelServiceNumberOfTrips?: number;
    totalTravelServiceCost?: string;
    equipment: {
      id: number;
      name: string;
      model?: string;
      power?: string;
    };
  }>;
}

interface QuoteItem {
  id?: number;
  equipmentId: number;
  quantity: number;
  rentalPeriodDays: number;
  pricePerDay: string;
  discountPercent: string;
  totalPrice: string;
  notes?: string;
  // Installation cost fields
  includeInstallationCost?: boolean;
  installationDistanceKm?: string;
  numberOfTechnicians?: number;
  serviceRatePerTechnician?: string;
  travelRatePerKm?: string;
  totalInstallationCost?: string;
  // Disassembly cost fields
  includeDisassemblyCost?: boolean;
  disassemblyDistanceKm?: string;
  disassemblyNumberOfTechnicians?: number;
  disassemblyServiceRatePerTechnician?: string;
  disassemblyTravelRatePerKm?: string;
  totalDisassemblyCost?: string;
  // Travel/Service cost fields
  includeTravelServiceCost?: boolean;
  travelServiceDistanceKm?: string;
  travelServiceNumberOfTechnicians?: number;
  travelServiceServiceRatePerTechnician?: string;
  travelServiceTravelRatePerKm?: string;
  travelServiceNumberOfTrips?: number;
  totalTravelServiceCost?: string;
}

export default function EditGeneralQuote() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [notes, setNotes] = useState("");

  const { data: quote, isLoading } = useQuery<GeneralQuoteDetails>({
    queryKey: [`/api/general-quotes/${id}`],
    enabled: !!id,
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ["/api/general-equipment"],
  });

  // Initialize form data when quote loads
  useEffect(() => {
    if (quote) {
      setItems(quote.items.map(item => ({
        id: item.id,
        equipmentId: item.equipment.id,
        quantity: item.quantity,
        rentalPeriodDays: item.rentalPeriodDays,
        pricePerDay: item.pricePerDay,
        discountPercent: "0", // Default, can be calculated from pricing
        totalPrice: item.totalPrice,
        notes: item.notes || "",
        // Installation cost fields
        includeInstallationCost: item.includeInstallationCost || false,
        installationDistanceKm: item.installationDistanceKm || "",
        numberOfTechnicians: item.numberOfTechnicians || 1,
        serviceRatePerTechnician: item.serviceRatePerTechnician || "150",
        travelRatePerKm: item.travelRatePerKm || "1.15",
        totalInstallationCost: item.totalInstallationCost || "0",
        // Disassembly cost fields
        includeDisassemblyCost: item.includeDisassemblyCost || false,
        disassemblyDistanceKm: item.disassemblyDistanceKm || "",
        disassemblyNumberOfTechnicians: item.disassemblyNumberOfTechnicians || 1,
        disassemblyServiceRatePerTechnician: item.disassemblyServiceRatePerTechnician || "150",
        disassemblyTravelRatePerKm: item.disassemblyTravelRatePerKm || "1.15",
        totalDisassemblyCost: item.totalDisassemblyCost || "0",
        // Travel/Service cost fields
        includeTravelServiceCost: item.includeTravelServiceCost || false,
        travelServiceDistanceKm: item.travelServiceDistanceKm || "",
        travelServiceNumberOfTechnicians: item.travelServiceNumberOfTechnicians || 1,
        travelServiceServiceRatePerTechnician: item.travelServiceServiceRatePerTechnician || "150",
        travelServiceTravelRatePerKm: item.travelServiceTravelRatePerKm || "1.15",
        travelServiceNumberOfTrips: item.travelServiceNumberOfTrips || 1,
        totalTravelServiceCost: item.totalTravelServiceCost || "0",
      })));
      setNotes(quote.notes || "");
    }
  }, [quote]);

  const updateQuoteMutation = useMutation({
    mutationFn: async (data: { items: QuoteItem[]; notes: string; totalNet: string; totalGross: string }) => {
      if (!id) throw new Error("Brak ID wyceny");
      return apiRequest(`/api/general-quotes/${id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({ title: "Sukces", description: "Wycena została zaktualizowana" });
      queryClient.invalidateQueries({ queryKey: [`/api/general-quotes/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/general-quotes"] });
      if (id) navigate(`/general-quotes/${id}`);
    },
    onError: (error: any) => {
      toast({ title: "Błąd", description: error.message || "Wystąpił błąd podczas aktualizacji", variant: "destructive" });
    },
  });

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total price
    if (field === 'quantity' || field === 'rentalPeriodDays' || field === 'pricePerDay') {
      const item = updatedItems[index];
      const price = parseFloat(item.pricePerDay) || 0;
      const quantity = item.quantity || 1;
      const days = item.rentalPeriodDays || 1;
      const discount = parseFloat(item.discountPercent) || 0;
      
      const subtotal = price * quantity * days;
      const discountAmount = subtotal * (discount / 100);
      updatedItems[index].totalPrice = (subtotal - discountAmount).toFixed(2);
    }
    
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const getTotalNet = () => {
    return items.reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0);
  };

  const getTotalGross = () => {
    return getTotalNet() * 1.23; // 23% VAT
  };

  const handleSubmit = () => {
    if (items.length === 0) {
      toast({ title: "Błąd", description: "Wycena musi zawierać przynajmniej jedną pozycję", variant: "destructive" });
      return;
    }

    updateQuoteMutation.mutate({
      items,
      notes,
      totalNet: getTotalNet().toString(),
      totalGross: getTotalGross().toString(),
    });
  };

  const formatCurrency = (amount: string) => {
    return `${parseFloat(amount).toFixed(2)} PLN`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Wycena nie została znaleziona</h2>
            <p className="text-gray-600 mb-6">Sprawdź czy podany numer wyceny jest prawidłowy</p>
            <Button onClick={() => navigate("/general-quotes")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót do listy wycen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate(`/general-quotes/${id}`)} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót do podglądu
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-8 h-8 text-green-600" />
              Edytuj wycenę {quote.quoteNumber}
            </h1>
          </div>
        </div>

        {/* Client Information - Read Only */}
        <Card>
          <CardHeader>
            <CardTitle>Informacje o kliencie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg">{quote.client.companyName}</h3>
                {quote.client.contactPerson && (
                  <p className="text-muted-foreground">{quote.client.contactPerson}</p>
                )}
                {quote.client.nip && (
                  <p className="text-sm text-muted-foreground">NIP: {quote.client.nip}</p>
                )}
              </div>
              <div>
                {quote.client.email && <p className="text-sm">{quote.client.email}</p>}
                {quote.client.phone && <p className="text-sm">{quote.client.phone}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Items */}
        <Card>
          <CardHeader>
            <CardTitle>Pozycje wyceny</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => {
                const equipmentItem = (equipment as any[]).find((eq: any) => eq.id === item.equipmentId);
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold">{equipmentItem?.name || "Nieznany sprzęt"}</h4>
                        {equipmentItem?.model && (
                          <p className="text-sm text-muted-foreground">Model: {equipmentItem.model}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Ilość</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Okres (dni)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.rentalPeriodDays}
                          onChange={(e) => updateItem(index, 'rentalPeriodDays', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Cena za dzień (PLN)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.pricePerDay}
                          onChange={(e) => updateItem(index, 'pricePerDay', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Łączna cena</Label>
                        <div className="h-10 flex items-center font-semibold">
                          {formatCurrency(item.totalPrice)}
                        </div>
                      </div>
                    </div>
                    
                    
                    {/* Installation Cost Section */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id={`installation-${index}`}
                          checked={item.includeInstallationCost || false}
                          onCheckedChange={(checked) => {
                            updateItem(index, 'includeInstallationCost', checked);
                            if (checked) {
                              const distance = parseFloat(item.installationDistanceKm || "0");
                              const technicians = item.numberOfTechnicians || 1;
                              const serviceRate = parseFloat(item.serviceRatePerTechnician || "150");
                              const travelRate = parseFloat(item.travelRatePerKm || "1.15");
                              const totalCost = (distance * travelRate) + (technicians * serviceRate);
                              updateItem(index, 'totalInstallationCost', totalCost.toFixed(2));
                            } else {
                              updateItem(index, 'totalInstallationCost', "0");
                            }
                          }}
                        />
                        <Label htmlFor={`installation-${index}`} className="text-sm font-medium">Koszty montażu</Label>
                      </div>
                      {item.includeInstallationCost && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Odległość (km)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.installationDistanceKm || ""}
                              onChange={(e) => {
                                updateItem(index, 'installationDistanceKm', e.target.value);
                                const distance = parseFloat(e.target.value || "0");
                                const technicians = item.numberOfTechnicians || 1;
                                const serviceRate = parseFloat(item.serviceRatePerTechnician || "150");
                                const travelRate = parseFloat(item.travelRatePerKm || "1.15");
                                const totalCost = (distance * travelRate) + (technicians * serviceRate);
                                updateItem(index, 'totalInstallationCost', totalCost.toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Liczba techników</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.numberOfTechnicians || 1}
                              onChange={(e) => {
                                updateItem(index, 'numberOfTechnicians', parseInt(e.target.value) || 1);
                                const distance = parseFloat(item.installationDistanceKm || "0");
                                const technicians = parseInt(e.target.value) || 1;
                                const serviceRate = parseFloat(item.serviceRatePerTechnician || "150");
                                const travelRate = parseFloat(item.travelRatePerKm || "1.15");
                                const totalCost = (distance * travelRate) + (technicians * serviceRate);
                                updateItem(index, 'totalInstallationCost', totalCost.toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Stawka za technika</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.serviceRatePerTechnician || "150"}
                              onChange={(e) => {
                                updateItem(index, 'serviceRatePerTechnician', e.target.value);
                                const distance = parseFloat(item.installationDistanceKm || "0");
                                const technicians = item.numberOfTechnicians || 1;
                                const serviceRate = parseFloat(e.target.value || "150");
                                const travelRate = parseFloat(item.travelRatePerKm || "1.15");
                                const totalCost = (distance * travelRate) + (technicians * serviceRate);
                                updateItem(index, 'totalInstallationCost', totalCost.toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Łączny koszt montażu</Label>
                            <div className="h-10 flex items-center font-semibold text-blue-600">
                              {formatCurrency(item.totalInstallationCost || "0")}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Disassembly Cost Section */}
                    <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id={`disassembly-${index}`}
                          checked={item.includeDisassemblyCost || false}
                          onCheckedChange={(checked) => {
                            updateItem(index, 'includeDisassemblyCost', checked);
                            if (checked) {
                              const distance = parseFloat(item.disassemblyDistanceKm || "0");
                              const technicians = item.disassemblyNumberOfTechnicians || 1;
                              const serviceRate = parseFloat(item.disassemblyServiceRatePerTechnician || "150");
                              const travelRate = parseFloat(item.disassemblyTravelRatePerKm || "1.15");
                              const totalCost = (distance * travelRate) + (technicians * serviceRate);
                              updateItem(index, 'totalDisassemblyCost', totalCost.toFixed(2));
                            } else {
                              updateItem(index, 'totalDisassemblyCost', "0");
                            }
                          }}
                        />
                        <Label htmlFor={`disassembly-${index}`} className="text-sm font-medium">Koszty demontażu</Label>
                      </div>
                      {item.includeDisassemblyCost && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Odległość (km)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.disassemblyDistanceKm || ""}
                              onChange={(e) => {
                                updateItem(index, 'disassemblyDistanceKm', e.target.value);
                                const distance = parseFloat(e.target.value || "0");
                                const technicians = item.disassemblyNumberOfTechnicians || 1;
                                const serviceRate = parseFloat(item.disassemblyServiceRatePerTechnician || "150");
                                const travelRate = parseFloat(item.disassemblyTravelRatePerKm || "1.15");
                                const totalCost = (distance * travelRate) + (technicians * serviceRate);
                                updateItem(index, 'totalDisassemblyCost', totalCost.toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Liczba techników</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.disassemblyNumberOfTechnicians || 1}
                              onChange={(e) => {
                                updateItem(index, 'disassemblyNumberOfTechnicians', parseInt(e.target.value) || 1);
                                const distance = parseFloat(item.disassemblyDistanceKm || "0");
                                const technicians = parseInt(e.target.value) || 1;
                                const serviceRate = parseFloat(item.disassemblyServiceRatePerTechnician || "150");
                                const travelRate = parseFloat(item.disassemblyTravelRatePerKm || "1.15");
                                const totalCost = (distance * travelRate) + (technicians * serviceRate);
                                updateItem(index, 'totalDisassemblyCost', totalCost.toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Stawka za technika</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.disassemblyServiceRatePerTechnician || "150"}
                              onChange={(e) => {
                                updateItem(index, 'disassemblyServiceRatePerTechnician', e.target.value);
                                const distance = parseFloat(item.disassemblyDistanceKm || "0");
                                const technicians = item.disassemblyNumberOfTechnicians || 1;
                                const serviceRate = parseFloat(e.target.value || "150");
                                const travelRate = parseFloat(item.disassemblyTravelRatePerKm || "1.15");
                                const totalCost = (distance * travelRate) + (technicians * serviceRate);
                                updateItem(index, 'totalDisassemblyCost', totalCost.toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Łączny koszt demontażu</Label>
                            <div className="h-10 flex items-center font-semibold text-orange-600">
                              {formatCurrency(item.totalDisassemblyCost || "0")}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Travel/Service Cost Section */}
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id={`travel-${index}`}
                          checked={item.includeTravelServiceCost || false}
                          onCheckedChange={(checked) => {
                            updateItem(index, 'includeTravelServiceCost', checked);
                            if (checked) {
                              const distance = parseFloat(item.travelServiceDistanceKm || "0");
                              const technicians = item.travelServiceNumberOfTechnicians || 1;
                              const serviceRate = parseFloat(item.travelServiceServiceRatePerTechnician || "150");
                              const travelRate = parseFloat(item.travelServiceTravelRatePerKm || "1.15");
                              const trips = item.travelServiceNumberOfTrips || 1;
                              const totalCost = (distance * travelRate * trips) + (technicians * serviceRate);
                              updateItem(index, 'totalTravelServiceCost', totalCost.toFixed(2));
                            } else {
                              updateItem(index, 'totalTravelServiceCost', "0");
                            }
                          }}
                        />
                        <Label htmlFor={`travel-${index}`} className="text-sm font-medium">Koszty dojazdu na serwis</Label>
                      </div>
                      {item.includeTravelServiceCost && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div>
                            <Label className="text-xs">Odległość (km)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.travelServiceDistanceKm || ""}
                              onChange={(e) => {
                                updateItem(index, 'travelServiceDistanceKm', e.target.value);
                                const distance = parseFloat(e.target.value || "0");
                                const technicians = item.travelServiceNumberOfTechnicians || 1;
                                const serviceRate = parseFloat(item.travelServiceServiceRatePerTechnician || "150");
                                const travelRate = parseFloat(item.travelServiceTravelRatePerKm || "1.15");
                                const trips = item.travelServiceNumberOfTrips || 1;
                                const totalCost = (distance * travelRate * trips) + (technicians * serviceRate);
                                updateItem(index, 'totalTravelServiceCost', totalCost.toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Liczba techników</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.travelServiceNumberOfTechnicians || 1}
                              onChange={(e) => {
                                updateItem(index, 'travelServiceNumberOfTechnicians', parseInt(e.target.value) || 1);
                                const distance = parseFloat(item.travelServiceDistanceKm || "0");
                                const technicians = parseInt(e.target.value) || 1;
                                const serviceRate = parseFloat(item.travelServiceServiceRatePerTechnician || "150");
                                const travelRate = parseFloat(item.travelServiceTravelRatePerKm || "1.15");
                                const trips = item.travelServiceNumberOfTrips || 1;
                                const totalCost = (distance * travelRate * trips) + (technicians * serviceRate);
                                updateItem(index, 'totalTravelServiceCost', totalCost.toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Stawka za technika</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.travelServiceServiceRatePerTechnician || "150"}
                              onChange={(e) => {
                                updateItem(index, 'travelServiceServiceRatePerTechnician', e.target.value);
                                const distance = parseFloat(item.travelServiceDistanceKm || "0");
                                const technicians = item.travelServiceNumberOfTechnicians || 1;
                                const serviceRate = parseFloat(e.target.value || "150");
                                const travelRate = parseFloat(item.travelServiceTravelRatePerKm || "1.15");
                                const trips = item.travelServiceNumberOfTrips || 1;
                                const totalCost = (distance * travelRate * trips) + (technicians * serviceRate);
                                updateItem(index, 'totalTravelServiceCost', totalCost.toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Liczba wyjazdów</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.travelServiceNumberOfTrips || 1}
                              onChange={(e) => {
                                updateItem(index, 'travelServiceNumberOfTrips', parseInt(e.target.value) || 1);
                                const distance = parseFloat(item.travelServiceDistanceKm || "0");
                                const technicians = item.travelServiceNumberOfTechnicians || 1;
                                const serviceRate = parseFloat(item.travelServiceServiceRatePerTechnician || "150");
                                const travelRate = parseFloat(item.travelServiceTravelRatePerKm || "1.15");
                                const trips = parseInt(e.target.value) || 1;
                                const totalCost = (distance * travelRate * trips) + (technicians * serviceRate);
                                updateItem(index, 'totalTravelServiceCost', totalCost.toFixed(2));
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Łączny koszt dojazdu</Label>
                            <div className="h-10 flex items-center font-semibold text-green-600">
                              {formatCurrency(item.totalTravelServiceCost || "0")}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <Label>Notatki</Label>
                      <Input
                        placeholder="Dodatkowe informacje"
                        value={item.notes || ""}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Wartość netto:</span>
                <span className="font-medium">{formatCurrency(getTotalNet().toString())}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (23%):</span>
                <span className="font-medium">{formatCurrency((getTotalGross() - getTotalNet()).toString())}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Wartość brutto:</span>
                <span>{formatCurrency(getTotalGross().toString())}</span>
              </div>
            </div>
            
            <div>
              <Label>Dodatkowe uwagi</Label>
              <Textarea
                placeholder="Dodatkowe informacje do wyceny"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/general-quotes/${id}`)}
              >
                Anuluj
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={updateQuoteMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateQuoteMutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}