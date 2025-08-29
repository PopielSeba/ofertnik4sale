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
  Store,
  Pencil,
  Copy
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

interface PublicQuote {
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

export default function PublicQuotes() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'public_manager'))) {
      toast({
        title: "Brak uprawnień",
        description: "Dostęp do wycen wynajmu publicznego jest dostępny tylko dla administratorów i kierowników wynajmu publicznego.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, user, authLoading, toast]);

  // Queries
  const { 
    data: quotes = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery<PublicQuote[]>({
    queryKey: ["/api/public-quotes"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Mutations
  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      return apiRequest(`/api/public-quotes/${quoteId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-quotes"] });
      queryClient.refetchQueries({ queryKey: ["/api/public-quotes"] });
      toast({ title: "Sukces", description: "Wycena została usunięta" });
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
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  // Filter quotes based on search term and status
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = searchTerm === "" || 
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.client?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Mutations
  const copyQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const response = await apiRequest(`/api/public-quotes/${quoteId}/copy`, "POST");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-quotes"] });
      queryClient.refetchQueries({ queryKey: ["/api/public-quotes"] });
      toast({ 
        title: "Sukces", 
        description: `Wycena została skopiowana jako ${data.quoteNumber}` 
      });
      // Navigate to the new quote
      window.location.href = `/public-quotes/${data.id}`;
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
      toast({ title: "Błąd", description: error.message || "Nie udało się skopiować wyceny", variant: "destructive" });
    },
  });

  // Event handlers
  const handleViewQuote = (quoteId: number) => {
    window.location.href = `/public-quotes/${quoteId}`;
  };

  const handleEditQuote = (quoteId: number) => {
    window.location.href = `/public-quotes/${quoteId}/edit`;
  };

  const handleCopyQuote = (quoteId: number) => {
    copyQuoteMutation.mutate(quoteId);
  };

  const handleDeleteQuote = (quoteId: number) => {
    if (confirm("Czy na pewno chcesz usunąć tę wycenę?")) {
      deleteQuoteMutation.mutate(quoteId);
    }
  };

  const handlePrintQuote = (quoteId: number) => {
    window.open(`/api/public-quotes/${quoteId}/print`, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Szkic</Badge>;
      case 'sent':
        return <Badge variant="default">Wysłana</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-600">Zaakceptowana</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Odrzucona</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  if (error && isUnauthorizedError(error)) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-destructive">Brak autoryzacji</h2>
                <p className="text-muted-foreground">
                  Nastąpi przekierowanie do strony logowania...
                </p>
              </div>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Store className="w-8 h-8 text-blue-600" />
              Wyceny Publiczne
            </h1>
            <p className="text-muted-foreground mt-2">
              Zarządzanie wycenami wynajmu publicznego
            </p>
          </div>
          <Button asChild>
            <Link href="/create-public-quote">
              <Plus className="w-4 h-4 mr-2" />
              Nowa wycena
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Szukaj po numerze wyceny lub nazwie klienta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    <SelectItem value="draft">Szkic</SelectItem>
                    <SelectItem value="sent">Wysłana</SelectItem>
                    <SelectItem value="accepted">Zaakceptowana</SelectItem>
                    <SelectItem value="rejected">Odrzucona</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => refetch()}>
                  Odśwież
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotes Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Wyceny ({filteredQuotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Ładowanie wycen...</p>
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="text-center py-8">
                <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Brak wycen</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "Nie znaleziono wycen spełniających kryteria wyszukiwania." 
                    : "Rozpocznij pracę tworząc pierwszą wycenę publiczną."
                  }
                </p>
                <Button asChild>
                  <Link href="/create-public-quote">
                    <Plus className="w-4 h-4 mr-2" />
                    Utwórz pierwszą wycenę
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numer</TableHead>
                    <TableHead>Klient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pozycje</TableHead>
                    <TableHead>Wartość netto</TableHead>
                    <TableHead>Wartość brutto</TableHead>
                    <TableHead>Data utworzenia</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filteredQuotes || []).map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.quoteNumber}
                      </TableCell>
                      <TableCell>
                        {quote.client?.companyName || 'Brak danych'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(quote.status)}
                      </TableCell>
                      <TableCell>
                        {(quote.items || []).length} pozycji
                      </TableCell>
                      <TableCell>
                        {parseFloat(quote.totalNet).toFixed(2)} PLN
                      </TableCell>
                      <TableCell>
                        {parseFloat(quote.totalGross).toFixed(2)} PLN
                      </TableCell>
                      <TableCell>
                        {formatDate(quote.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewQuote(quote.id)}
                            title="Podgląd"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditQuote(quote.id)}
                            title="Edytuj"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyQuote(quote.id)}
                            title="Kopiuj"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintQuote(quote.id)}
                            title="Drukuj"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuote(quote.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Usuń"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
  );
}