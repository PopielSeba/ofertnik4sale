import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Truck, 
  Printer, 
  Eye, 
  Calendar, 
  MapPin, 
  User, 
  FileText,
  ArrowLeft,
  Calculator,
  Trash2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

import type { TransportQuoteWithDetails } from "@shared/schema";

export default function TransportQuotes() {
  const [selectedQuote, setSelectedQuote] = useState<TransportQuoteWithDetails | null>(null);

  const { data: quotes = [], isLoading } = useQuery<TransportQuoteWithDetails[]>({
    queryKey: ["/api/transport-quotes"],
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/transport-quotes/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to delete transport quote");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transport-quotes"] });
    },
  });

  const handleDelete = async (id: number, quoteNumber: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć wycenę ${quoteNumber}?`)) {
      try {
        await deleteQuoteMutation.mutateAsync(id);
      } catch (error) {
        console.error("Error deleting transport quote:", error);
        alert("Błąd podczas usuwania wyceny");
      }
    }
  };

  const handlePrint = (quote: TransportQuoteWithDetails) => {
    const printUrl = `/api/transport-quotes/${quote.id}/print`;
    window.open(printUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Ładowanie wycen transportu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Powrót</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Truck className="w-8 h-8 text-blue-600" />
              <span>Zapisane Wyceny Transportu</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Zarządzaj zapisanymi wycenami transportu
            </p>
          </div>
        </div>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak wycen transportu</h3>
            <p className="text-muted-foreground text-center">
              Nie masz jeszcze zapisanych wycen transportu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Truck className="w-6 h-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-xl">
                        Wycena {quote.quoteNumber}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {quote.createdAt ? format(new Date(quote.createdAt), 'dd.MM.yyyy HH:mm', { locale: pl }) : 'Brak daty'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {parseFloat(quote.totalCost).toFixed(2)} zł
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Klient:</span>
                      <span>{quote.clientName || 'Brak danych'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Pojazd:</span>
                      <span>{quote.vehicle?.name || 'Brak danych'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Z:</span>
                      <span className="truncate">{quote.fromAddress}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Do:</span>
                      <span className="truncate">{quote.toAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calculator className="w-4 h-4" />
                      <span>{parseFloat(quote.distance).toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>×</span>
                      <span>{quote.vehicle?.costPerKm ? parseFloat(quote.vehicle.costPerKm).toFixed(2) : '0.00'} zł/km</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQuote(quote)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Podgląd
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-2">
                            <Truck className="w-5 h-5" />
                            <span>Wycena Transportu {quote.quoteNumber}</span>
                          </DialogTitle>
                        </DialogHeader>
                        {selectedQuote && (
                          <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Dane Klienta</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="font-medium">Firma:</span> {selectedQuote.clientName || 'Brak danych'}</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Szczegóły Transportu</h4>
                                  <div className="space-y-1 text-sm">
                                    <div><span className="font-medium">Pojazd:</span> {selectedQuote.vehicle?.name || 'Brak danych'}</div>
                                    <div><span className="font-medium">Cena za km:</span> {selectedQuote.vehicle?.costPerKm ? parseFloat(selectedQuote.vehicle.costPerKm).toFixed(2) : '0.00'} zł</div>
                                    <div><span className="font-medium">Dystans:</span> {parseFloat(selectedQuote.distance).toFixed(1)} km</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                              <h4 className="font-semibold">Trasa</h4>
                              <div className="space-y-2 text-sm">
                                <div><span className="font-medium">Z:</span> {selectedQuote.fromAddress}</div>
                                <div><span className="font-medium">Do:</span> {selectedQuote.toAddress}</div>
                              </div>
                            </div>

                            {selectedQuote.notes && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="font-semibold mb-2">Uwagi</h4>
                                  <p className="text-sm text-muted-foreground">{selectedQuote.notes}</p>
                                </div>
                              </>
                            )}

                            <Separator />

                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h4 className="font-semibold mb-2">Kalkulacja</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Dystans:</span>
                                  <span>{parseFloat(selectedQuote.distance).toFixed(1)} km</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Cena za kilometr:</span>
                                  <span>{selectedQuote.vehicle?.costPerKm ? parseFloat(selectedQuote.vehicle.costPerKm).toFixed(2) : '0.00'} zł</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-semibold text-lg">
                                  <span>Koszt całkowity:</span>
                                  <span>{parseFloat(selectedQuote.totalCost).toFixed(2)} zł</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handlePrint(quote)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Drukuj
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(quote.id, quote.quoteNumber)}
                      disabled={deleteQuoteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Usuń
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}