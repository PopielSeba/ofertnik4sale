import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, ShoppingCart, Package, Filter, Eye, Phone } from "lucide-react";
import type { ShopProduct, ShopCategory } from "@shared/schema";

export default function Shop() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ShopCategory[]>({
    queryKey: ["/api/shop-categories"],
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery<ShopProduct[]>({
    queryKey: ["/api/shop-products"],
  });

  // Filter products based on search, category, and condition
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
                           product.categoryId.toString() === selectedCategory;
    
    const matchesCondition = selectedCondition === "all" || 
                            product.condition === selectedCondition;
    
    return matchesSearch && matchesCategory && matchesCondition && product.isActive;
  });

  const handleProductClick = (product: ShopProduct) => {
    setSelectedProduct(product);
    setProductDialogOpen(true);
  };

  const formatPrice = (price: string) => {
    return parseFloat(price).toFixed(2) + " PLN";
  };

  const isLoading = categoriesLoading || productsLoading;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          Sklep PPP :: Program
        </h1>
        <p className="text-muted-foreground mt-2">
          Przeglądaj i kupuj produkty z naszego sklepu
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-8 space-y-4 md:space-y-0 md:flex md:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Szukaj produktów..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Wszystkie kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie kategorie</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedCondition} onValueChange={setSelectedCondition}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Stan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="new">Nowy</SelectItem>
              <SelectItem value="used">Używany</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Ładowanie produktów...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Brak produktów
          </h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedCategory !== "all" 
              ? "Nie znaleziono produktów spełniających kryteria wyszukiwania."
              : "Aktualnie brak dostępnych produktów w sklepie."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card 
              key={product.id} 
              className="group hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              <CardHeader className="p-0">
                {product.imageUrl ? (
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Eye className="h-8 w-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-muted rounded-t-lg flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {categories.find(cat => cat.id === product.categoryId)?.name || "Brak kategorii"}
                  </Badge>
                  <Badge variant={product.condition === "new" ? "default" : "outline"} className="text-xs">
                    {product.condition === "new" ? "Nowy" : "Używany"}
                  </Badge>
                </div>
                
                <CardTitle className="text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {product.name}
                </CardTitle>
                
                {product.model && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Model: {product.model}
                  </p>
                )}
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                  {product.description || "Brak opisu produktu"}
                </p>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(product.price)}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {product.quantity > 0 ? (
                        <Badge variant="default">
                          Dostępne: {product.quantity}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Brak w magazynie
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {product.phone && (
                    <Button 
                      size="sm" 
                      className="w-full" 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`tel:${product.phone}`, '_self');
                      }}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {product.phone}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="space-y-4">
                  {selectedProduct.imageUrl ? (
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.name}
                      className="w-full rounded-lg object-cover max-h-96"
                    />
                  ) : (
                    <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
                      <Package className="h-24 w-24 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Product Details */}
                <div className="space-y-4">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {categories.find(cat => cat.id === selectedProduct.categoryId)?.name || "Brak kategorii"}
                    </Badge>
                    <h2 className="text-3xl font-bold text-primary mb-2">
                      {formatPrice(selectedProduct.price)}
                    </h2>
                  </div>
                  
                  {selectedProduct.model && (
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Model</h3>
                      <p className="text-muted-foreground">{selectedProduct.model}</p>
                    </div>
                  )}
                  
                  {selectedProduct.description && (
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Opis</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}
                  
                  {selectedProduct.specifications && (
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Specyfikacja techniczna</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {selectedProduct.specifications}
                      </p>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">Dostępność:</span>
                      {selectedProduct.quantity > 0 ? (
                        <Badge variant="default" className="text-base px-3 py-1">
                          {selectedProduct.quantity} sztuk
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-base px-3 py-1">
                          Brak w magazynie
                        </Badge>
                      )}
                    </div>
                    
                    {selectedProduct.quantity > 0 && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Aby złożyć zamówienie na ten produkt, skontaktuj się z naszym działem sprzedaży.
                        </p>
                        
                        {selectedProduct.phone ? (
                          <Button 
                            className="w-full"
                            onClick={() => window.open(`tel:${selectedProduct.phone}`, '_self')}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Zadzwoń: {selectedProduct.phone}
                          </Button>
                        ) : (
                          <div className="bg-muted p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">Kontakt:</h4>
                            <p className="text-sm">Email: sprzedaz@ppp-program.pl</p>
                            <p className="text-sm">Telefon: +48 123 456 789</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}