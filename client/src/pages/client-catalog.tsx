import { useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Plus, ShoppingCart, Settings, X, Fuel, Wrench, Truck, Cog, Save, Printer, Store, Snowflake, Flame, Lightbulb, Zap, Droplets, LayoutGrid, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Equipment {
  id: number;
  name: string;
  description?: string;
  model?: string;
  category?: string;
  department?: string;
  isAvailable: boolean;
  quantity: number;
  dailyPrice?: string;
  isTransport?: boolean;
  kmRate?: string; // stawka za kilometr dla pojazdów
  fuelConsumption75?: number; // zużycie paliwa L/h przy 75% obciążenia
  pricing?: Array<{
    periodStart: number;
    periodEnd: number | null;
    pricePerDay: string;
    discountPercent: string;
  }>;
  additionalEquipment?: Array<{
    id: number;
    type: string;
    name: string;
    price: string;
    position: number;
  }>;
  serviceCosts?: {
    serviceIntervalMonths?: number;
    serviceIntervalKm?: number; 
    serviceIntervalMotohours?: number;
    workerHours: number;
    workerCostPerHour: number;
  };
  serviceItems?: Array<{
    id: number;
    itemName: string;
    itemCost: string;
    sortOrder: number;
  }>;
}

interface CartItem {
  equipment: Equipment;
  days: number;
  kilometers?: number; // kilometry dla pojazdów
  
  // Paliwo
  includeFuelCost?: boolean;
  fuelPricePerLiter?: number;
  hoursPerDay?: number;
  fuelConsumptionPer100km?: number;
  kilometersPerDay?: number;
  calculationType?: 'motohours' | 'kilometers';
  
  // Montaż
  includeInstallationCost?: boolean;
  installationDistanceKm?: number;
  numberOfTechnicians?: number;
  serviceRatePerTechnician?: number;
  travelRatePerKm?: number;
  
  // Demontaż  
  includeDisassemblyCost?: boolean;
  disassemblyDistanceKm?: number;
  disassemblyNumberOfTechnicians?: number;
  disassemblyServiceRatePerTechnician?: number;
  disassemblyTravelRatePerKm?: number;
  
  // Dojazd/Serwis
  includeTravelServiceCost?: boolean;
  travelServiceDistanceKm?: number;
  travelServiceNumberOfTechnicians?: number;
  travelServiceServiceRatePerTechnician?: number;
  travelServiceTravelRatePerKm?: number;
  travelServiceNumberOfTrips?: number;
  
  // Wyposażenie dodatkowe i akcesoria
  selectedAdditional?: Array<{id: number, name: string, pricePerDay: string, quantity: number}>;
  selectedAccessories?: Array<{id: number, name: string, pricePerDay: string, quantity: number}>;
}

export default function ClientCatalog() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(true);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [clientData, setClientData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    nip: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to get price for given rental period
  const getPriceForPeriod = (equipment: Equipment, days: number): number => {
    if (!equipment.pricing || equipment.pricing.length === 0) {
      return 100; // fallback price
    }

    // Find the right pricing tier
    const pricing = equipment.pricing.find(p => 
      days >= p.periodStart && (p.periodEnd === null || days <= p.periodEnd)
    );

    if (!pricing) {
      // Use the highest tier (30+ days)
      const lastTier = equipment.pricing[equipment.pricing.length - 1];
      return parseFloat(lastTier.pricePerDay);
    }

    return parseFloat(pricing.pricePerDay);
  };

  // Helper function for transport pricing with "zmyłka"
  const calculateTransportCost = (kmRate: string, kilometers: number): number => {
    const baseRate = parseFloat(kmRate || "0");
    const baseCost = baseRate * kilometers;
    
    // Zmyłka - dodatkowe opłaty za obsługę w zależności od dystansu
    let handlingFee = 0;
    if (kilometers <= 10) {
      handlingFee = 287; // do 10 km
    } else if (kilometers <= 50) {
      handlingFee = 198; // 10-50 km  
    } else if (kilometers <= 100) {
      handlingFee = 87;  // 50-100 km
    } else {
      handlingFee = 40;  // powyżej 100 km
    }
    
    return baseCost + handlingFee;
  };

  // Fetch only public equipment
  const { data: publicEquipment = [], isLoading: isLoadingPublic } = useQuery({
    queryKey: ['/api/public-equipment']
  });

  // Pobierz dodatki dla wybranego sprzętu z modalem opcji
  const { data: equipmentAdditional = [], isLoading: isLoadingAdditional, refetch: refetchAdditional } = useQuery({
    queryKey: [
      selectedCartItem?.equipment.department === 'Elektryka' ? '/api/electrical-equipment' :
      selectedCartItem?.equipment.department === 'Ogólny' ? '/api/general-equipment' :
      '/api/equipment', 
      selectedCartItem?.equipment.id, 'additional'
    ],
    queryFn: async () => {
      if (!selectedCartItem?.equipment.id || selectedCartItem?.equipment.isTransport) return [];
      let endpoint = '';
      
      if (selectedCartItem.equipment.department === 'Elektryka') {
        endpoint = `/api/electrical-equipment/${selectedCartItem.equipment.id}/additional`;
      } else if (selectedCartItem.equipment.department === 'Ogólny') {
        endpoint = `/api/general-equipment/${selectedCartItem.equipment.id}/additional`;
      } else {
        endpoint = `/api/public-equipment/${selectedCartItem.equipment.id}/additional`;
      }
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch additional equipment');
      }
      return response.json();
    },
    enabled: !!selectedCartItem?.equipment.id && !selectedCartItem?.equipment.isTransport
  });

  const isLoading = isLoadingPublic;

  // Transform public equipment data
  const allEquipment = (publicEquipment as any[]).map((item: any) => ({
    ...item,
    department: 'Publiczny',
    category: typeof item.category === 'object' ? (item.category as any)?.name : item.category,
    isTransport: false,
    isAvailable: item.isActive !== false,
    quantity: item.availableQuantity || 0
  }));

  // Filter public equipment
  const filteredEquipment = allEquipment.filter((item: Equipment) => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
      item.category?.toLowerCase() === selectedCategory.toLowerCase();
      
    return matchesSearch && matchesCategory;
  }).sort((a: Equipment, b: Equipment) => a.name?.localeCompare(b.name) || 0);

  const addToCart = (equipment: Equipment) => {
    const existingItem = cart.find(item => item.equipment.id === equipment.id);
    if (existingItem) {
      toast({
        title: "Informacja",
        description: "Ten sprzęt jest już w Twojej ofercie.",
        variant: "default"
      });
      return;
    }

    setCart(prev => [...prev, { 
      equipment, 
      days: 1,
      // Domyślne wartości (ukryte przed klientem)
      includeFuelCost: false,
      fuelPricePerLiter: 6.50,
      hoursPerDay: 8,
      includeInstallationCost: false,
      numberOfTechnicians: 1,
      serviceRatePerTechnician: 100,
      travelRatePerKm: 2.50,
      includeDisassemblyCost: false,
      disassemblyNumberOfTechnicians: 1,
      disassemblyServiceRatePerTechnician: 100,
      disassemblyTravelRatePerKm: 2.50,
      includeTravelServiceCost: false,
      travelServiceNumberOfTechnicians: 1,
      travelServiceServiceRatePerTechnician: 100,
      travelServiceTravelRatePerKm: 2.50,
      travelServiceNumberOfTrips: 1,
      selectedAdditional: [],
      selectedAccessories: []
    }]);
    toast({
      title: "Dodano do oferty",
      description: `${equipment.name} został dodany do Twojej oferty.`,
      variant: "default"
    });
  };

  const removeFromCart = (equipmentId: number) => {
    setCart(prev => prev.filter(item => item.equipment.id !== equipmentId));
  };

  const updateCartItem = (equipmentId: number, field: string, value: number | boolean | any) => {
    setCart(prev => {
      const newCart = prev.map(item => 
        item.equipment.id === equipmentId ? { ...item, [field]: value } : item
      );
      
      // Aktualizuj również selectedCartItem jeśli to ten sam sprzęt
      if (selectedCartItem && selectedCartItem.equipment.id === equipmentId) {
        setSelectedCartItem({ ...selectedCartItem, [field]: value });
      }
      
      return newCart;
    });
  };

  const saveAndPrintQuote = async () => {
    if (cart.length === 0) {
      toast({
        title: "Brak pozycji",
        description: "Dodaj sprzęt do oferty przed zapisaniem wyceny",
        variant: "destructive"
      });
      return;
    }

    if (!clientData.companyName.trim()) {
      toast({
        title: "Brak danych",
        description: "Wypełnij co najmniej nazwę firmy",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare quote items
      const items = cart.map(item => {
        let itemTotalPrice;
        let additionalCost = 0;
        let accessoriesCost = 0;

        if (item.equipment.isTransport) {
          itemTotalPrice = calculateTransportCost(item.equipment.kmRate || "0", item.kilometers || 0);
        } else {
          const dailyPrice = getPriceForPeriod(item.equipment, item.days);
          itemTotalPrice = dailyPrice * item.days;

          // Add fuel costs
          if (item.includeFuelCost) {
            const equipmentConsumption = item.equipment.fuelConsumption75 || 0;
            const consumptionPerDay = equipmentConsumption * (item.hoursPerDay || 8);
            itemTotalPrice += consumptionPerDay * item.days * (item.fuelPricePerLiter || 6.50);
          }

          // Add installation costs
          if (item.includeInstallationCost) {
            const travelCost = (item.installationDistanceKm || 0) * (item.travelRatePerKm || 2.50);
            const technicianCost = (item.numberOfTechnicians || 1) * (item.serviceRatePerTechnician || 100);
            itemTotalPrice += travelCost + technicianCost;
          }

          // Add disassembly costs
          if (item.includeDisassemblyCost) {
            const travelCost = (item.disassemblyDistanceKm || 0) * (item.disassemblyTravelRatePerKm || 2.50);
            const technicianCost = (item.disassemblyNumberOfTechnicians || 1) * (item.disassemblyServiceRatePerTechnician || 100);
            itemTotalPrice += travelCost + technicianCost;
          }

          // Add service travel costs
          if (item.includeTravelServiceCost) {
            itemTotalPrice += (item.travelServiceDistanceKm || 0) * (item.travelServiceTravelRatePerKm || 2.50);
          }

          // Calculate additional equipment costs
          if (item.selectedAdditional && item.selectedAdditional.length > 0) {
            additionalCost = item.selectedAdditional.reduce((sum, additional) => {
              const itemPrice = parseFloat(additional.pricePerDay) || 0;
              const quantity = additional.quantity || 1;
              return sum + (itemPrice * quantity * item.days);
            }, 0);
          }

          // Calculate accessories costs
          if (item.selectedAccessories && item.selectedAccessories.length > 0) {
            accessoriesCost = item.selectedAccessories.reduce((sum, accessory) => {
              const itemPrice = parseFloat(accessory.pricePerDay) || 0;
              const quantity = accessory.quantity || 1;
              return sum + (itemPrice * quantity * item.days);
            }, 0);
          }
        }

        return {
          equipmentId: item.equipment.id,
          quantity: 1,
          rentalPeriodDays: item.equipment.isTransport ? (item.kilometers || 0) : item.days,
          pricePerDay: item.equipment.isTransport ? (item.equipment.kmRate || "0") : getPriceForPeriod(item.equipment, item.days).toString(),
          discountPercent: "0",
          totalPrice: (itemTotalPrice + additionalCost + accessoriesCost).toString(),
          additionalCost: additionalCost.toString(),
          accessoriesCost: accessoriesCost.toString(),
          selectedAdditional: item.selectedAdditional || [],
          selectedAccessories: item.selectedAccessories || [],
          notes: item.equipment.isTransport ? `Transport - ${item.kilometers || 0} km` : `Wynajem na ${item.days} dni`
        };
      });

      const totalNet = calculateTotal();
      const vatRate = 23;
      const totalGross = totalNet * (1 + vatRate / 100);

      const quoteData = {
        clientData,
        guestEmail: clientData.email || '',
        items,
        status: 'draft',
        totalNet: totalNet.toString(),
        totalGross: totalGross.toString(),
        vatRate: vatRate.toString(),
        notes: 'Wycena wygenerowana przez klienta z katalogu online'
      };

      // Save quote
      const response = await fetch('/api/quotes/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      });

      if (!response.ok) {
        throw new Error('Nie udało się zapisać wyceny');
      }

      const savedQuote = await response.json();

      toast({
        title: "Sukces!",
        description: "Wycena została zapisana i zostanie wydrukowana",
        variant: "default"
      });

      setShowQuoteModal(false);

      // Open print view in new tab
      setTimeout(() => {
        window.open(`/api/quotes/guest/${savedQuote.id}/print`, '_blank');
      }, 500);

    } catch (error: any) {
      console.error('Error saving quote:', error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zapisać wyceny",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      if (item.equipment.isTransport) {
        // Pojazdy: stawka za kilometr + zmyłka (opłaty obsługowe)
        const transportCost = calculateTransportCost(item.equipment.kmRate || "0", item.kilometers || 0);
        return total + transportCost;
      } else {
        // Sprzęt: cena za okres z rabatami + dodatki
        const dailyPrice = getPriceForPeriod(item.equipment, item.days);
        const basePrice = dailyPrice * item.days;
        
        // Koszty paliwa (używamy danych z bazy - fuelConsumption75)
        let fuelCost = 0;
        if (item.includeFuelCost) {
          const equipmentConsumption = item.equipment.fuelConsumption75 || 0;
          const consumptionPerDay = equipmentConsumption * (item.hoursPerDay || 8);
          fuelCost = consumptionPerDay * item.days * (item.fuelPricePerLiter || 6.50);
        }
        
        // Koszty montażu
        let installationCost = 0;
        if (item.includeInstallationCost) {
          const travelCost = (item.installationDistanceKm || 0) * (item.travelRatePerKm || 2.50);
          const technicianCost = (item.numberOfTechnicians || 1) * (item.serviceRatePerTechnician || 100);
          installationCost = travelCost + technicianCost;
        }
        
        // Koszty demontażu
        let disassemblyCost = 0;
        if (item.includeDisassemblyCost) {
          const travelCost = (item.disassemblyDistanceKm || 0) * (item.travelRatePerKm || 2.50);
          const technicianCost = (item.disassemblyNumberOfTechnicians || 1) * (item.disassemblyServiceRatePerTechnician || 100);
          disassemblyCost = travelCost + technicianCost;
        }
        
        // Koszty dojazdu serwisu
        let serviceTravelCost = 0;
        if (item.includeTravelServiceCost) {
          serviceTravelCost = (item.travelServiceDistanceKm || 0) * (item.travelServiceTravelRatePerKm || 2.50);
        }
        
        // Koszty wyposażenia dodatkowego (dane z katalogu)
        let additionalEquipmentCost = 0;
        if (item.selectedAdditional && item.selectedAdditional.length > 0) {
          additionalEquipmentCost = item.selectedAdditional.reduce((sum, additional) => {
            const itemPrice = parseFloat(additional.pricePerDay) || 0;
            const quantity = additional.quantity || 1;
            return sum + (itemPrice * quantity * item.days);
          }, 0);
        }
        
        // Koszty akcesoriów (dane z katalogu)  
        let accessoriesCost = 0;
        if (item.selectedAccessories && item.selectedAccessories.length > 0) {
          accessoriesCost = item.selectedAccessories.reduce((sum, accessory) => {
            const itemPrice = parseFloat(accessory.pricePerDay) || 0;
            const quantity = accessory.quantity || 1;
            return sum + (itemPrice * quantity * item.days);
          }, 0);
        }
        
        return total + basePrice + fuelCost + installationCost + disassemblyCost + serviceTravelCost + additionalEquipmentCost + accessoriesCost;
      }
    }, 0);
  };

  const submitQuote = () => {
    if (cart.length === 0) {
      toast({
        title: "Błąd",
        description: "Dodaj sprzęt do oferty przed wysłaniem.",
        variant: "destructive"
      });
      return;
    }

    const totalPrice = calculateTotal();
    toast({
      title: "Oferta została przygotowana!",
      description: `Całkowita cena: ${totalPrice.toFixed(2)} PLN netto. Cena obliczona na podstawie przyjętych parametrów, w celu ich poznania oraz uzyskania rabatu prosimy o kontakt z handlowcem.`,
      variant: "default"
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-500 via-blue-400 to-gray-100 flex items-center justify-center">
        <div className="text-white text-xl">Ładowanie katalogu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 via-blue-400 to-gray-100">
      {/* Sticky Header and Navigation */}
      <div className="sticky top-0 z-40 bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          {/* Search and Category Filter */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-xl">
            {/* Search with navigation */}
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setLocation("/client-portal")}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Powrót</span>
              </button>
              
              <div className="flex items-center gap-2 text-gray-700 whitespace-nowrap">
                <ShoppingCart className="h-5 w-5" />
                <h1 className="text-lg font-bold">Katalog Sprzętu</h1>
              </div>
              
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Szukaj sprzętu po nazwie, opisie lub modelu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter Tiles */}
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 gap-2">
              {/* WSZYSTKO tile */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCategory === "all" ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                }`}
                onClick={() => setSelectedCategory("all")}
              >
                <CardContent className="flex flex-col items-center justify-center p-1 min-h-[40px]">
                  <LayoutGrid className="w-3 h-3 mb-1 text-blue-600" />
                  <span className="text-[0.65rem] font-medium text-center leading-none">WSZYSTKO</span>
                </CardContent>
              </Card>

              {/* Category tiles */}
              {[
                { name: "Agregaty prądotwórcze", displayName: "AGREGATY PRĄDOTWÓRCZE", icon: Zap },
                { name: "Maszty oświetleniowe", displayName: "MASZTY OŚWIETLENIOWE", icon: Lightbulb },
                { name: "Klimatyzacje", displayName: "KLIMATYZACJE", icon: Snowflake },
                { name: "Nagrzewnice", displayName: "NAGRZEWNICE", icon: Flame },
                { name: "Zbiorniki", displayName: "ZBIORNIKI", icon: Droplets }
              ].map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                const hasEquipment = allEquipment.some((item: Equipment) => 
                  item.category?.toLowerCase() === cat.name.toLowerCase()
                );
                
                return (
                  <Card 
                    key={cat.name}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                    } ${!hasEquipment ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (hasEquipment) {
                        setSelectedCategory(cat.name.toLowerCase());
                      }
                    }}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-1 min-h-[40px]">
                      <IconComponent className="w-3 h-3 mb-1 text-blue-600" />
                      <span className="text-[0.65rem] font-medium text-center leading-none">
                        {cat.displayName}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Cart Panel */}
        {showCart && (
          <Card className="mb-8 bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Twoja oferta</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-gray-500">Brak sprzętu w ofercie</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={`${item.equipment.id}_${item.equipment.department}`} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.equipment.name}</h4>
                        <p className="text-sm text-gray-600">{item.equipment.department} - {item.equipment.category || 'Brak kategorii'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {item.equipment.isTransport ? (
                          // Pola dla pojazdów
                          <>
                            <div>
                              <Label className="text-xs">Kilometry</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.kilometers || 0}
                                onChange={(e) => updateCartItem(item.equipment.id, 'kilometers', parseInt(e.target.value) || 1)}
                                className="w-24"
                              />
                            </div>
                            <div className="text-sm text-gray-600">
                              Wycena zostanie obliczona w podsumowaniu
                            </div>
                          </>
                        ) : (
                          // Pola dla zwykłego sprzętu
                          <>
                            <div>
                              <Label className="text-xs">Dni</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.days}
                                onChange={(e) => updateCartItem(item.equipment.id, 'days', parseInt(e.target.value) || 1)}
                                className="w-20"
                              />
                            </div>
                            <div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  setSelectedCartItem(item);
                                  setShowOptionsModal(true);
                                }}
                              >
                                Opcje dodatkowe
                              </Button>
                            </div>
                            <div className="text-sm text-gray-600">
                              Wycena zostanie obliczona w podsumowaniu
                            </div>
                          </>
                        )}
                        <Button
                          onClick={() => removeFromCart(item.equipment.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Usuń
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="text-right text-xl font-bold">
                      Szacunkowa cena: {calculateTotal().toFixed(2)} PLN netto
                    </div>
                    <p className="text-sm text-gray-600 text-right mt-2">
                      Cena obliczona na podstawie przyjętych parametrów, w celu ich poznania oraz uzyskania rabatu prosimy o kontakt z handlowcem.
                    </p>
                    <div className="text-right mt-4 flex gap-3 justify-end">
                      <Button onClick={submitQuote} size="lg" variant="outline">
                        Wyślij zapytanie ofertowe
                      </Button>
                      <Button onClick={() => setShowQuoteModal(true)} size="lg" className="bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" />
                        Zapisz i wydrukuj wycenę
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SPRZĘT I TOWARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.map((item: Equipment) => (
            <Card key={`equipment-${item.id}`} className="bg-white/95 backdrop-blur-sm hover:shadow-lg transition-shadow relative">
              {/* Equipment Image - Large style like in admin panel */}
              {(item as any).imageUrl && (item as any).imageUrl.trim() !== "" ? (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                  <img
                    src={(item as any).imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      // Hide image if it fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="aspect-video w-full bg-gray-100 rounded-t-lg flex items-center justify-center">
                  <Store className="w-16 h-16 text-gray-400" />
                </div>
              )}
              
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <Badge variant={item.isAvailable ? "default" : "secondary"}>
                    {item.isAvailable ? "Dostępny" : "Niedostępny"}
                  </Badge>
                </div>
                
                {item.description && (
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">{item.description}</p>
                )}
                
                {item.model && (
                  <p className="text-sm text-gray-500 mb-2">Model: {item.model}</p>
                )}
                
                <div className="mb-2">
                  <span className="text-sm text-blue-600">Kategoria: {item.category || 'Brak kategorii'}</span>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Dostępne: {item.quantity} szt.</p>
                </div>
                
                <Button
                  onClick={() => addToCart(item)}
                  className="w-full"
                  variant={cart.some(cartItem => cartItem.equipment.id === item.id) ? "secondary" : "default"}
                  disabled={cart.some(cartItem => cartItem.equipment.id === item.id)}
                >
                  {cart.some(cartItem => cartItem.equipment.id === item.id) ? (
                    "W ofercie"
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Dodaj do oferty
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SEPARATOR I SEKCJA TRANSPORTU */}
        {filteredEquipment.length === 0 && (
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 text-xl">Nie znaleziono sprzętu lub usług spełniających kryteria wyszukiwania</p>
            </CardContent>
          </Card>
        )}
        
        {/* Modal Opcji Dodatkowych */}
        <Dialog open={showOptionsModal} onOpenChange={setShowOptionsModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Opcje dodatkowe - {selectedCartItem?.equipment.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCartItem && (
              <Tabs defaultValue="equipment" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="equipment" className="flex items-center gap-1">
                    <Cog className="w-4 h-4" />
                    Wyposażenie
                  </TabsTrigger>
                </TabsList>



                {/* WYPOSAŻENIE DODATKOWE Z KATALOGU */}
                <TabsContent value="equipment" className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="font-medium">Wyposażenie dodatkowe i akcesoria</h4>
                    
                    {isLoadingAdditional ? (
                      <div className="text-sm text-gray-500 p-4 border border-dashed border-gray-300 rounded-lg text-center">
                        Ładowanie wyposażenia z katalogu...
                      </div>
                    ) : Array.isArray(equipmentAdditional) && equipmentAdditional.length > 0 ? (
                      <div className="space-y-4">
                        {/* Wyposażenie dodatkowe */}
                        {Array.isArray(equipmentAdditional) && equipmentAdditional.filter((item: any) => item.type === 'additional').length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-green-700">📦 Wyposażenie dodatkowe:</Label>
                            {Array.isArray(equipmentAdditional) && equipmentAdditional
                              .filter((item: any) => item.type === 'additional')
                              .map((item: any) => {
                                const isSelected = selectedCartItem.selectedAdditional?.some(s => s.id === item.id);
                                const selectedItem = selectedCartItem.selectedAdditional?.find(s => s.id === item.id);
                                return (
                                  <div key={item.id} className="flex items-center gap-3 p-3 border border-green-200 rounded-lg bg-green-50">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const current = selectedCartItem.selectedAdditional || [];
                                        if (e.target.checked) {
                                          updateCartItem(
                                            selectedCartItem.equipment.id,
                
                                            'selectedAdditional',
                                            [...current, {
                                              id: item.id,
                                              name: item.name,
                                              pricePerDay: item.pricePerDay || item.price,
                                              quantity: 1
                                            }]
                                          );
                                        } else {
                                          updateCartItem(
                                            selectedCartItem.equipment.id,
                
                                            'selectedAdditional',
                                            current.filter(s => s.id !== item.id)
                                          );
                                        }
                                      }}
                                      className="h-4 w-4 text-green-600 focus:ring-green-500"
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-sm text-green-800">{item.name}</div>
                                    </div>
                                    {isSelected && (
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs text-green-700">Ilość:</Label>
                                        <Input
                                          type="number"
                                          value={selectedItem?.quantity || 1}
                                          onChange={(e) => {
                                            const current = selectedCartItem.selectedAdditional || [];
                                            const newList = current.map(s => 
                                              s.id === item.id ? { ...s, quantity: parseInt(e.target.value) || 1 } : s
                                            );
                                            updateCartItem(
                                              selectedCartItem.equipment.id,
                  
                                              'selectedAdditional',
                                              newList
                                            );
                                          }}
                                          min="1"
                                          className="w-16 h-8"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                        
                        {/* Akcesoria */}
                        {Array.isArray(equipmentAdditional) && equipmentAdditional.filter((item: any) => item.type === 'accessories').length > 0 && (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-blue-700">🔧 Akcesoria:</Label>
                            {Array.isArray(equipmentAdditional) && equipmentAdditional
                              .filter((item: any) => item.type === 'accessories')
                              .map((item: any) => {
                                const isSelected = selectedCartItem.selectedAccessories?.some(s => s.id === item.id);
                                const selectedItem = selectedCartItem.selectedAccessories?.find(s => s.id === item.id);
                                return (
                                  <div key={item.id} className="flex items-center gap-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const current = selectedCartItem.selectedAccessories || [];
                                        if (e.target.checked) {
                                          updateCartItem(
                                            selectedCartItem.equipment.id,
                
                                            'selectedAccessories',
                                            [...current, {
                                              id: item.id,
                                              name: item.name,
                                              pricePerDay: item.pricePerDay || item.price,
                                              quantity: 1
                                            }]
                                          );
                                        } else {
                                          updateCartItem(
                                            selectedCartItem.equipment.id,
                
                                            'selectedAccessories',
                                            current.filter(s => s.id !== item.id)
                                          );
                                        }
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-sm text-blue-800">{item.name}</div>
                                    </div>
                                    {isSelected && (
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs text-blue-700">Ilość:</Label>
                                        <Input
                                          type="number"
                                          value={selectedItem?.quantity || 1}
                                          onChange={(e) => {
                                            const current = selectedCartItem.selectedAccessories || [];
                                            const newList = current.map(s => 
                                              s.id === item.id ? { ...s, quantity: parseInt(e.target.value) || 1 } : s
                                            );
                                            updateCartItem(
                                              selectedCartItem.equipment.id,
                  
                                              'selectedAccessories',
                                              newList
                                            );
                                          }}
                                          min="1"
                                          className="w-16 h-8"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 p-4 border border-dashed border-gray-300 rounded-lg text-center">
                        Brak dostępnego wyposażenia dodatkowego dla tego sprzętu w katalogu
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowOptionsModal(false)}>
                Anuluj
              </Button>
              <Button onClick={() => setShowOptionsModal(false)}>
                Zapisz opcje
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal zapisu wyceny */}
        <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                Zapisz i wydrukuj wycenę
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName" className="text-sm font-medium">
                  Nazwa firmy *
                </Label>
                <Input
                  id="companyName"
                  value={clientData.companyName}
                  onChange={(e) => setClientData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Nazwa firmy"
                  required
                />
              </div>

              <div>
                <Label htmlFor="contactPerson" className="text-sm font-medium">
                  Osoba kontaktowa
                </Label>
                <Input
                  id="contactPerson"
                  value={clientData.contactPerson}
                  onChange={(e) => setClientData(prev => ({ ...prev, contactPerson: e.target.value }))}
                  placeholder="Imię i nazwisko"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={clientData.email}
                  onChange={(e) => setClientData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@firma.pl"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium">
                  Telefon
                </Label>
                <Input
                  id="phone"
                  value={clientData.phone}
                  onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="123-456-789"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-sm font-medium">
                  Adres
                </Label>
                <Input
                  id="address"
                  value={clientData.address}
                  onChange={(e) => setClientData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Ulica, miasto, kod pocztowy"
                />
              </div>

              <div>
                <Label htmlFor="nip" className="text-sm font-medium">
                  NIP
                </Label>
                <Input
                  id="nip"
                  value={clientData.nip}
                  onChange={(e) => setClientData(prev => ({ ...prev, nip: e.target.value }))}
                  placeholder="123-456-78-90"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowQuoteModal(false)}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button
                onClick={saveAndPrintQuote}
                disabled={isSubmitting || !clientData.companyName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Zapisuję...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Zapisz i wydrukuj
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SEO Keywords */}
        <div className="mt-16 text-center text-white/60 text-xs max-w-4xl mx-auto mb-4">
          <p className="leading-relaxed">
            Ofertownik online | Katalog sprzętu budowlanego | Wyceny automatyczne | Portal wynajmu | Agregaty elektryczne | Transport budowlany | System rentalowy | Kalkulator kosztów | Zarządzanie flotą
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-white/70 text-xs mb-20">
          <p>System Wycen Ofertnik by PPP :: PROGRAM Sebastian Popiel, tel. +48 500 600 525</p>
        </div>

        {/* Floating Green Phone Button */}
        <div className="fixed bottom-24 right-6 z-50">
          <Button
            onClick={() => {
              window.location.href = 'tel:+48452229586';
            }}
            className="bg-green-600 hover:bg-green-700 text-white shadow-2xl px-6 py-3 text-base font-semibold border-0 rounded-full transition-all duration-300 hover:scale-105"
            size="lg"
          >
            <Phone className="w-5 h-5 mr-2" />
            +48 452 229 586
          </Button>
        </div>

        {/* Floating Orange Quote Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => {
              // Scroll to top of page
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white shadow-2xl px-6 py-3 text-lg font-semibold border-0 rounded-full transition-all duration-300 hover:scale-105"
            size="lg"
          >
            <ShoppingCart className="w-6 h-6 mr-2" />
            Oferta ({cart.length})
          </Button>
        </div>
      </div>
    </div>
  );
}