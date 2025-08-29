import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Copy, Printer, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

function isUnauthorizedError(error: any): boolean {
  return error?.message === "Unauthorized" || 
         error?.response?.status === 401 ||
         error?.status === 401;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pl-PL');
}

function formatCurrency(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return numValue.toFixed(2) + ' PLN';
}

function getStatusBadge(status: string) {
  const statusMap = {
    'draft': { label: 'Szkic', variant: 'secondary' as const },
    'pending': { label: 'Oczekująca', variant: 'default' as const },
    'approved': { label: 'Zatwierdzona', variant: 'default' as const },
    'rejected': { label: 'Odrzucona', variant: 'destructive' as const },
  };

  const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
  return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
}

export default function PublicQuoteDetail() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get quote ID from URL
  const quoteId = parseInt(window.location.pathname.split('/').pop() || '0');

  // Redirect non-authorized users
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'public_manager'))) {
      toast({
        title: "Brak uprawnień",
        description: "Dostęp do wycen wynajmu publicznego jest dostępny tylko dla administratorów i kierowników wynajmu publicznego.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/public-quotes");
      }, 1000);
    }
  }, [isAuthenticated, user, authLoading, toast, setLocation]);

  // Queries
  const { 
    data: quote, 
    isLoading, 
    error 
  } = useQuery<PublicQuoteDetail>({
    queryKey: [`/api/public-quotes/${quoteId}`],
    enabled: !!quoteId && quoteId > 0,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Mutations
  const copyQuoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/public-quotes/${quoteId}/copy`, "POST");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-quotes"] });
      toast({ 
        title: "Sukces", 
        description: `Wycena została skopiowana jako ${data.quoteNumber}` 
      });
      setLocation(`/public-quotes/${data.id}`);
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
        description: error.message || "Nie udało się skopiować wyceny", 
        variant: "destructive" 
      });
    },
  });

  // Event handlers
  const handleCopyQuote = () => {
    copyQuoteMutation.mutate();
  };

  const handleEditQuote = () => {
    setLocation(`/public-quotes/${quoteId}/edit`);
  };

  const handlePrintQuote = () => {
    window.open(`/api/public-quotes/${quoteId}/print`, '_blank');
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

  if (error) {
    if (isUnauthorizedError(error)) {
      return (
        <div className="min-h-screen p-4">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-destructive">Sesja wygasła. Przekierowanie...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

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
              <p className="text-center text-destructive">
                Błąd: {(error as any)?.message || "Nie udało się załadować wyceny"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
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
            <Button variant="outline" onClick={() => setLocation("/public-quotes")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Store className="w-8 h-8 text-blue-600" />
                Wycena Publiczna: {quote.quoteNumber}
              </h1>
              <p className="text-muted-foreground mt-2">
                Szczegóły wyceny wynajmu publicznego
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrintQuote}
              title="Drukuj"
            >
              <Printer className="w-4 h-4 mr-2" />
              Drukuj
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyQuote}
              disabled={copyQuoteMutation.isPending}
              title="Kopiuj"
            >
              <Copy className="w-4 h-4 mr-2" />
              {copyQuoteMutation.isPending ? "Kopiowanie..." : "Kopiuj"}
            </Button>
            <Button
              onClick={handleEditQuote}
              title="Edytuj"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edytuj
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quote Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Informacje o wycenie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Numer wyceny</label>
                  <p className="text-lg font-bold">{quote.quoteNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">{getStatusBadge(quote.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Data utworzenia</label>
                  <p>{formatDate(quote.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Wartość netto</label>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(quote.totalNet)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">VAT ({quote.vatRate}%)</label>
                  <p>{formatCurrency((parseFloat(quote.totalGross) - parseFloat(quote.totalNet)).toString())}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Wartość brutto</label>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(quote.totalGross)}</p>
                </div>
                {quote.notes && (
                  <div>
                    <label className="text-sm font-medium">Notatki</label>
                    <p className="text-sm bg-gray-50 p-3 rounded">{quote.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Informacje o kliencie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Nazwa firmy</label>
                  <p className="font-semibold">{quote.client.companyName}</p>
                </div>
                {quote.client.contactPerson && (
                  <div>
                    <label className="text-sm font-medium">Osoba kontaktowa</label>
                    <p>{quote.client.contactPerson}</p>
                  </div>
                )}
                {quote.client.phone && (
                  <div>
                    <label className="text-sm font-medium">Telefon</label>
                    <p>{quote.client.phone}</p>
                  </div>
                )}
                {quote.client.email && (
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p>{quote.client.email}</p>
                  </div>
                )}
                {quote.client.address && (
                  <div>
                    <label className="text-sm font-medium">Adres</label>
                    <p>{quote.client.address}</p>
                  </div>
                )}
                {quote.client.nip && (
                  <div>
                    <label className="text-sm font-medium">NIP</label>
                    <p>{quote.client.nip}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quote Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Pozycje wyceny</CardTitle>
              </CardHeader>
              <CardContent>
                {quote.items.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Brak pozycji w wycenie
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sprzęt</TableHead>
                        <TableHead className="text-right">Ilość</TableHead>
                        <TableHead className="text-right">Okres (dni)</TableHead>
                        <TableHead className="text-right">Cena/dzień</TableHead>
                        <TableHead className="text-right">Rabat</TableHead>
                        <TableHead className="text-right">Dodatkowe</TableHead>
                        <TableHead className="text-right">Suma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quote.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.equipment.name}</div>
                              {item.equipment.description && (
                                <div className="text-sm text-muted-foreground">
                                  {item.equipment.description}
                                </div>
                              )}
                              {item.equipment.model && (
                                <div className="text-sm text-muted-foreground">
                                  Model: {item.equipment.model}
                                </div>
                              )}
                              {item.equipment.power && (
                                <div className="text-sm text-muted-foreground">
                                  Moc: {item.equipment.power}
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-sm text-blue-600 mt-1">
                                  {item.notes}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.rentalPeriodDays}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.pricePerDay)}</TableCell>
                          <TableCell className="text-right">{parseFloat(item.discountPercent).toFixed(0)}%</TableCell>
                          <TableCell className="text-right">
                            {item.additionalItems.length > 0 ? (
                              <div className="space-y-1">
                                {item.additionalItems.map((addItem) => (
                                  <div key={addItem.id} className="text-sm">
                                    {addItem.name} (+{formatCurrency(addItem.price)})
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Brak</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.totalPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}