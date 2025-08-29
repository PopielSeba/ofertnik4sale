import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  Filter,
  Download,
  Printer,
  Zap
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ElectricalQuote {
  id: number;
  quoteNumber: string;
  client: {
    id: number;
    companyName: string;
  };
  createdBy: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  status: string;
  totalNet: string;
  totalGross: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: number;
    quantity: number;
    rentalPeriodDays: number;
    equipment: {
      name: string;
    };
  }>;
}

export default function ElectricalQuotes() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'employee'))) {
      toast({
        title: "Brak uprawnień",
        description: "Dostęp do wycen elektryki jest dostępny tylko dla pracowników i administratorów.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, user, authLoading, toast]);

  const { data: quotes = [], isLoading } = useQuery<ElectricalQuote[]>({
    queryKey: ["/api/electrical-quotes"],
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const response = await apiRequest(`/api/electrical-quotes/${quoteId}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/electrical-quotes"] });
      toast({
        title: "Sukces",
        description: "Wycena została usunięta",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się usunąć wyceny",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'Wersja robocza';
      case 'pending':
        return 'Oczekuje';
      case 'approved':
        return 'Zatwierdzona';
      case 'rejected':
        return 'Odrzucona';
      default:
        return status;
    }
  };

  // Filter quotes based on search term and status
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.client?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.items.some(item => 
        item.equipment.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || quote.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (authLoading || isLoading) {
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
              <Zap className="w-8 h-8 text-yellow-500" />
              Wyceny Elektryki
            </h1>
            <p className="text-muted-foreground mt-2">
              Zarządzaj wycenami sprzętu elektrycznego
            </p>
          </div>
          <Link href="/create-electrical-quote">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nowa wycena elektryki
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Szukaj po numerze wyceny, firmie lub sprzęcie..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="draft">Wersja robocza</SelectItem>
                    <SelectItem value="pending">Oczekuje</SelectItem>
                    <SelectItem value="approved">Zatwierdzona</SelectItem>
                    <SelectItem value="rejected">Odrzucona</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotes Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Wyceny elektryki ({filteredQuotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredQuotes.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {searchTerm || statusFilter !== 'all' ? 'Brak wyników' : 'Brak wycen elektryki'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Spróbuj zmienić kryteria wyszukiwania'
                    : 'Utwórz pierwszą wycenę sprzętu elektrycznego'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Link href="/create-electrical-quote">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Utwórz pierwszą wycenę
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numer</TableHead>
                      <TableHead>Klient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pozycje</TableHead>
                      <TableHead>Wartość netto</TableHead>
                      <TableHead>Data utworzenia</TableHead>
                      <TableHead>Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">
                          {quote.quoteNumber}
                        </TableCell>
                        <TableCell>
                          {quote.client?.companyName || 'Brak danych'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(quote.status)}>
                            {getStatusLabel(quote.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {quote.items?.length || 0} pozycji
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(quote.totalNet)}
                        </TableCell>
                        <TableCell>
                          {formatDate(quote.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`/electrical-quotes/${quote.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="bg-green-50 hover:bg-green-100 border-green-200"
                              onClick={() => window.open(`/api/electrical-quotes/${quote.id}/print`, '_blank')}
                              title="Drukuj wycenę"
                            >
                              <Printer className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm("Czy na pewno chcesz usunąć tę wycenę?")) {
                                  deleteQuoteMutation.mutate(quote.id);
                                }
                              }}
                              disabled={deleteQuoteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}