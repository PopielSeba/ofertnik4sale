import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Printer, 
  Download,
  Package,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Copy
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

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
    equipment: {
      id: number;
      name: string;
      model?: string;
      power?: string;
    };
  }>;
}

export default function GeneralQuoteDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: quote, isLoading } = useQuery<GeneralQuoteDetails>({
    queryKey: [`/api/general-quotes/${id}`],
    enabled: !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Projekt';
      case 'sent': return 'Wysłana';
      case 'accepted': return 'Zaakceptowana';
      case 'rejected': return 'Odrzucona';
      default: return status;
    }
  };

  const formatCurrency = (amount: string) => {
    return `${parseFloat(amount).toFixed(2)} PLN`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const handlePrint = () => {
    window.open(`/api/general-quotes/${id}/print`, '_blank');
  };

  const copyQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await apiRequest(`/api/general-quotes/${quoteId}/copy`, "POST", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/general-quotes"] });
      toast({
        title: "Sukces",
        description: `Wycena została skopiowana z numerem ${data.newQuoteNumber}`,
      });
      window.location.href = `/general-quotes/${data.newQuoteId}`;
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: "Nie udało się skopiować wyceny",
        variant: "destructive",
      });
    },
  });

  const handleCopyQuote = () => {
    if (id) {
      copyQuoteMutation.mutate(id);
    }
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
            <Link href="/general-quotes">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Powrót do listy wycen
              </Button>
            </Link>
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
            <Link href="/general-quotes">
              <Button variant="ghost" className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Powrót do listy
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-8 h-8 text-green-600" />
              Wycena {quote.quoteNumber}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge className={getStatusColor(quote.status)}>
                {getStatusLabel(quote.status)}
              </Badge>
              <span className="text-muted-foreground">
                <Calendar className="w-4 h-4 inline mr-1" />
                {formatDate(quote.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {(user?.role === 'admin' || user?.role === 'employee' || user?.role === 'general_manager') && (
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Drukuj
              </Button>
            )}
            {(user?.role === 'admin' || user?.role === 'employee' || user?.role === 'general_manager') && (
              <Button 
                variant="outline" 
                onClick={handleCopyQuote}
                disabled={copyQuoteMutation.isPending}
              >
                <Copy className="w-4 h-4 mr-2" />
                {copyQuoteMutation.isPending ? "Kopiowanie..." : "Kopiuj"}
              </Button>
            )}
            {(user?.role === 'admin' || user?.role === 'employee' || user?.role === 'general_manager') && (
              <Link href={`/general-quotes/${id}/edit`}>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edytuj
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informacje o kliencie
            </CardTitle>
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
              <div className="space-y-2">
                {quote.client.email && (
                  <p className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4" />
                    {quote.client.email}
                  </p>
                )}
                {quote.client.phone && (
                  <p className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4" />
                    {quote.client.phone}
                  </p>
                )}
                {quote.client.address && (
                  <p className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    {quote.client.address}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Items */}
        <Card>
          <CardHeader>
            <CardTitle>Pozycje wyceny</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quote.items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{item.equipment.name}</h4>
                      {item.equipment.model && (
                        <p className="text-sm text-muted-foreground">Model: {item.equipment.model}</p>
                      )}
                      {item.equipment.power && (
                        <p className="text-sm text-muted-foreground">Moc: {item.equipment.power}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Ilość:</span>
                      <span className="ml-2 font-medium">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Okres:</span>
                      <span className="ml-2 font-medium">{item.rentalPeriodDays} dni</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cena za dzień:</span>
                      <span className="ml-2 font-medium">{formatCurrency(item.pricePerDay)}</span>
                    </div>
                  </div>
                  
                  {item.notes && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Notatki:</strong> {item.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Podsumowanie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Wartość netto:</span>
                <span className="font-medium">{formatCurrency(quote.totalNet)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (23%):</span>
                <span className="font-medium">
                  {formatCurrency((parseFloat(quote.totalGross) - parseFloat(quote.totalNet)).toString())}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Wartość brutto:</span>
                <span>{formatCurrency(quote.totalGross)}</span>
              </div>
            </div>
            
            {quote.notes && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-2">Dodatkowe uwagi:</h4>
                <p className="text-muted-foreground">{quote.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}