import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  Package, 
  FileText, 
  PlusCircle, 
  Settings, 
  TrendingUp, 
  Users,
  Snowflake,
  Flame,
  Lightbulb,
  Zap,
  Calendar,
  ArrowRight,
  ClipboardList,
  Search,
  Truck,
  ShieldCheck,
  Drill
} from "lucide-react";

interface Quote {
  id: number;
  quoteNumber: string;
  client: {
    companyName: string;
  };
  createdAt: string;
  totalNet: string;
  status: string;
}

interface Equipment {
  id: number;
  name: string;
  category: {
    name: string;
  };
  quantity: number;
  availableQuantity: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    enabled: !!user && (user as any)?.role === 'admin', // Only fetch quotes for logged-in admins
  });

  const { data: equipment = [], isLoading: equipmentLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const recentQuotes = quotes.slice(0, 3);
  
  // Calculate statistics
  const totalEquipment = equipment.reduce((sum, item) => sum + item.quantity, 0);
  const availableEquipment = equipment.reduce((sum, item) => sum + item.availableQuantity, 0);
  const categoryCounts = equipment.reduce((acc, item) => {
    const categoryName = item.category.name;
    acc[categoryName] = (acc[categoryName] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(num);
  };

  const quickActions = [
    {
      title: "Badanie Potrzeb",
      description: "Przeprowadź analizę potrzeb klienta",
      icon: ClipboardList,
      color: "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700",
      path: "/needs-assessment"
    },
    {
      title: "Nowa wycena sprzętu",
      description: "Utwórz wycenę sprzętu dla klienta",
      icon: Drill,
      color: "bg-blue-500 hover:bg-blue-600",
      path: "/create-quote"
    },
    {
      title: "Nowa wycena transportu",
      description: "Utwórz wycenę przewozu",
      icon: Truck,
      color: "bg-cyan-500 hover:bg-cyan-600",
      path: "/create-transport-quote"
    },
    {
      title: "Nowa wycena elektryki",
      description: "Utwórz wycenę sprzętu elektrycznego",
      icon: Zap,
      color: "bg-yellow-500 hover:bg-yellow-600",
      path: "/create-electrical-quote"
    },
    {
      title: "Nowa wycena wynajmu ogólnego",
      description: "Utwórz wycenę sprzętu wynajmu ogólnego",
      icon: Package,
      color: "bg-green-500 hover:bg-green-600",
      path: "/create-general-quote"
    },
    {
      title: "Katalog sprzętu",
      description: "Przeglądaj dostępny sprzęt",
      icon: Package,
      color: "bg-green-500 hover:bg-green-600", 
      path: "/equipment"
    }
  ];

  if ((user as any)?.role === 'admin') {
    quickActions.push({
      title: "Zapisane Wyceny Sprzętu",
      description: "Zarządzaj utworzonymi wycenami sprzętu",
      icon: Drill,
      color: "bg-purple-500 hover:bg-purple-600",
      path: "/quotes"
    });
    quickActions.push({
      title: "Zapisane Wyceny Transportu",
      description: "Zarządzaj wycenami transportu",
      icon: Truck,
      color: "bg-teal-500 hover:bg-teal-600",
      path: "/transport-quotes"
    });
    quickActions.push({
      title: "Zapisane Wyceny Elektryki",
      description: "Zarządzaj wycenami sprzętu elektrycznego",
      icon: Zap,
      color: "bg-amber-500 hover:bg-amber-600",
      path: "/electrical-quotes"
    });
    quickActions.push({
      title: "Zapisane Wyceny Wynajmu Ogólnego",
      description: "Zarządzaj wycenami wynajmu ogólnego",
      icon: Package,
      color: "bg-emerald-500 hover:bg-emerald-600",
      path: "/general-quotes"
    });

  }

  // Add "Zapisane Badania" for all authenticated users
  quickActions.push({
    title: "Zapisane Badania",
    description: "Przeglądaj przeprowadzone badania potrzeb",
    icon: FileText,
    color: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
    path: "/needs-assessment-list"
  });

  if ((user as any)?.role === 'admin') {
    quickActions.push({
      title: "Panel admina",
      description: "Zarządzaj sprzętem i użytkownikami",
      icon: Settings,
      color: "bg-orange-500 hover:bg-orange-600",
      path: "/admin"
    });
  }

  const categoryIcons = {
    'Klimatyzacje': Snowflake,
    'Nagrzewnice': Flame,
    'Maszty oświetleniowe': Lightbulb,
    'Agregaty prądotwórcze': Zap,
  };

  const categoryColors = {
    'Klimatyzacje': 'bg-blue-100 text-blue-800',
    'Nagrzewnice': 'bg-red-100 text-red-800',
    'Maszty oświetleniowe': 'bg-yellow-100 text-yellow-800',
    'Agregaty prądotwórcze': 'bg-green-100 text-green-800',
  };

  if (quotesLoading || equipmentLoading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Witaj{(user as any)?.firstName || (user as any)?.email ? `, ${(user as any)?.firstName || (user as any)?.email}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Zarządzaj ofertami i sprzętem
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Szybkie akcje</h2>
          
          {/* Sekcja 1: Badanie potrzeb i wyceny */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-muted-foreground mb-3">Tworzenie</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.filter(action => 
                action.title.includes("Badanie Potrzeb") || 
                action.title.includes("Nowa wycena")
              ).map((action) => {
                const IconComponent = action.icon;
                return (
                  <Card 
                    key={action.title}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${action.color} text-white`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-base">{action.title}</h3>
                          <p className="text-muted-foreground text-xs">{action.description}</p>
                          <ArrowRight className="w-3 h-3 mt-1 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <hr className="border-t border-muted mb-6" />

          {/* Sekcja 2: Zapisane badania i wyceny */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-muted-foreground mb-3">Zarządzanie</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.filter(action => 
                action.title.includes("Zapisane")
              ).map((action) => {
                const IconComponent = action.icon;
                return (
                  <Card 
                    key={action.title}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${action.color} text-white`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-base">{action.title}</h3>
                          <p className="text-muted-foreground text-xs">{action.description}</p>
                          <ArrowRight className="w-3 h-3 mt-1 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <hr className="border-t border-muted mb-6" />

          {/* Sekcja 3: Katalog sprzętu i panel admina */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-muted-foreground mb-3">System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.filter(action => 
                action.title.includes("Katalog") || action.title.includes("Panel")
              ).map((action) => {
                const IconComponent = action.icon;
                return (
                  <Card 
                    key={action.title}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${action.color} text-white`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-base">{action.title}</h3>
                          <p className="text-muted-foreground text-xs">{action.description}</p>
                          <ArrowRight className="w-3 h-3 mt-1 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>



        <div className={`grid grid-cols-1 ${user && (user as any)?.role === 'admin' ? 'lg:grid-cols-2' : ''} gap-8`}>
          {/* Recent Quotes - Only for logged-in admins */}
          {user && (user as any)?.role === 'admin' ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ostatnie oferty</CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate("/quotes")}>
                  Zobacz wszystkie
                </Button>
              </CardHeader>
              <CardContent>
                {recentQuotes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Brak utworzonych ofert</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => navigate("/create-quote")}
                    >
                      Utwórz pierwszą ofertę
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentQuotes.map((quote) => (
                      <div 
                        key={quote.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/quotes/${quote.id}`)}
                      >
                        <div>
                          <p className="font-medium">{quote.quoteNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {quote.client?.companyName || 'Brak danych'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(quote.totalNet)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(quote.createdAt).toLocaleDateString('pl-PL')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Equipment Categories */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kategorie sprzętu</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/equipment")}>
                Zobacz katalog
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(categoryCounts).map(([categoryName, count]) => {
                  const IconComponent = categoryIcons[categoryName as keyof typeof categoryIcons] || Package;
                  const colorClass = categoryColors[categoryName as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800';
                  
                  return (
                    <div 
                      key={categoryName}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        navigate("/equipment");
                        // Scroll to category after navigation
                        setTimeout(() => {
                          const element = document.getElementById(`category-${categoryName}`);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${colorClass} bg-opacity-20`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{categoryName}</span>
                      </div>
                      <Badge variant="secondary">{count} szt.</Badge>
                    </div>
                  );
                })}
                
                {Object.keys(categoryCounts).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Brak sprzętu w systemie</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}