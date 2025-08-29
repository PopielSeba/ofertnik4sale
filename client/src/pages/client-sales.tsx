import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Search, Phone, ShoppingCart, Package, Zap, Wrench, ChevronLeft, ChevronRight, Car, Lightbulb, Snowflake, Flame, Droplets, Monitor, Hammer, Laptop, Wifi, Headphones, Camera, Gamepad2, Watch, X } from "lucide-react";

interface ShopProduct {
  id: number;
  name: string;
  categoryId: number;
  description?: string;
  model?: string;
  specifications?: string;
  imageUrl?: string;
  image1Url?: string;
  image2Url?: string;
  image3Url?: string;
  image4Url?: string;
  price: string;
  quantity: number;
  phone?: string;
  condition: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShopCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

export default function ClientSales() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullscreenGallery, setFullscreenGallery] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);

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
    setCurrentImageIndex(0);
    setProductDialogOpen(true);
  };

  // Get all available images for the selected product
  const getProductImages = (product: ShopProduct | null) => {
    if (!product) return [];
    const images = [product.imageUrl, product.image1Url, product.image2Url, product.image3Url, product.image4Url]
      .filter(url => url);
    return images as string[];
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!selectedProduct) return;
    const images = getProductImages(selectedProduct);
    if (direction === 'prev') {
      setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
    } else {
      setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
    }
  };

  const navigateFullscreenImage = (direction: 'prev' | 'next') => {
    if (!selectedProduct) return;
    const images = getProductImages(selectedProduct);
    if (direction === 'prev') {
      setFullscreenImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
    } else {
      setFullscreenImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
    }
  };

  const openFullscreenGallery = () => {
    setFullscreenImageIndex(currentImageIndex);
    setFullscreenGallery(true);
  };

  const closeFullscreenGallery = () => {
    setFullscreenGallery(false);
  };

  // Keyboard navigation for fullscreen gallery
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!fullscreenGallery) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateFullscreenImage('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateFullscreenImage('next');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeFullscreenGallery();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenGallery]);

  const formatPrice = (price: string) => {
    return parseFloat(price).toFixed(2) + " PLN";
  };

  const handlePhoneCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Available icons for categories
  const availableIcons = {
    Package: Package,
    ShoppingCart: ShoppingCart,
    Zap: Zap,
    Wrench: Wrench,
    Car: Car,
    Lightbulb: Lightbulb,
    Snowflake: Snowflake,
    Flame: Flame,
    Droplets: Droplets,
    Monitor: Monitor,
    Hammer: Hammer,
    Laptop: Laptop,
    Wifi: Wifi,
    Headphones: Headphones,
    Camera: Camera,
    Gamepad2: Gamepad2,
    Watch: Watch,
    Phone: Phone,
  };

  // Function to get icon component by name
  const getIconComponent = (iconName: string | undefined) => {
    return availableIcons[iconName as keyof typeof availableIcons] || Package;
  };

  const isLoading = categoriesLoading || productsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 via-blue-400 to-gray-100">
      {/* Sticky Header and Navigation */}
      <div className="sticky top-0 z-40 bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          {/* Search and Category Filter */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/client-portal")}
                className="text-gray-700 hover:text-gray-900 border-gray-300 whitespace-nowrap"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Powrót
              </Button>
              
              <div className="flex items-center gap-2 text-gray-700 whitespace-nowrap">
                <ShoppingCart className="h-5 w-5" />
                <h1 className="text-lg font-bold">Sprzedaż</h1>
              </div>
              
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Szukaj produktów..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Icons */}
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 gap-2">
              <Card 
                className={`cursor-pointer transition-all ${selectedCategory === "all" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-gray-50"}`}
                onClick={() => setSelectedCategory("all")}
              >
                <CardContent className="p-1 text-center">
                  <Package className="h-3 w-3 mx-auto mb-1 text-primary" />
                  <p className="text-[0.65rem] font-medium leading-none">Wszystkie</p>
                  <p className="text-[0.6rem] text-muted-foreground leading-none">{products.filter(p => p.isActive).length}</p>
                </CardContent>
              </Card>

              {categories.map((category) => {
                const categoryProducts = products.filter(p => p.categoryId === category.id && p.isActive);
                const IconComponent = getIconComponent(category.icon || undefined);
                
                return (
                  <Card 
                    key={category.id}
                    className={`cursor-pointer transition-all ${selectedCategory === category.id.toString() ? "ring-2 ring-primary bg-primary/5" : "hover:bg-gray-50"}`}
                    onClick={() => setSelectedCategory(category.id.toString())}
                  >
                    <CardContent className="p-1 text-center">
                      <IconComponent className="h-3 w-3 mx-auto mb-1 text-primary" />
                      <p className="text-[0.65rem] font-medium leading-none">{category.name}</p>
                      <p className="text-[0.6rem] text-muted-foreground leading-none">{categoryProducts.length}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Condition Filter */}
            <div className="flex justify-center mt-3">
              <div className="flex gap-2">
                <Card 
                  className={`cursor-pointer transition-all ${selectedCondition === "all" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedCondition("all")}
                >
                  <CardContent className="p-1 px-3 text-center">
                    <p className="text-[0.65rem] font-medium leading-none">Wszystkie</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all ${selectedCondition === "new" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedCondition("new")}
                >
                  <CardContent className="p-1 px-3 text-center">
                    <p className="text-[0.65rem] font-medium leading-none">Nowy</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-all ${selectedCondition === "used" ? "ring-2 ring-primary bg-primary/5" : "hover:bg-gray-50"}`}
                  onClick={() => setSelectedCondition("used")}
                >
                  <CardContent className="p-1 px-3 text-center">
                    <p className="text-[0.65rem] font-medium leading-none">Używany</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-8 pb-8">

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-white text-lg">Ładowanie produktów...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="hover:shadow-xl transition-all cursor-pointer bg-white/95 backdrop-blur-sm border-0 shadow-lg"
                onClick={() => handleProductClick(product)}
              >
                <CardHeader className="p-0">
                  {product.imageUrl && (
                    <div className="relative">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      {product.phone && (
                        <Button
                          size="sm"
                          className="absolute top-2 right-2 bg-green-600 hover:bg-green-700 text-white shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePhoneCall(product.phone!);
                          }}
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Zadzwoń
                        </Button>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
                    </div>
                    
                    {product.model && (
                      <p className="text-sm text-muted-foreground">Model: {product.model}</p>
                    )}
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description || "Brak opisu"}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">
                          {categories.find(cat => cat.id === product.categoryId)?.name || "Brak kategorii"}
                        </Badge>
                        <Badge variant={product.condition === "new" ? "default" : "outline"} className="text-xs">
                          {product.condition === "new" ? "Nowy" : "Używany"}
                        </Badge>
                      </div>
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    {product.quantity > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        Dostępność: {product.quantity} szt.
                      </p>
                    )}

                    {product.phone && (
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePhoneCall(product.phone!);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Zadzwoń: {product.phone}
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
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            
            {selectedProduct && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images Gallery with Carousel */}
                <div className="space-y-4">
                  {(() => {
                    const images = getProductImages(selectedProduct);
                    if (images.length === 0) {
                      return (
                        <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="h-16 w-16 text-gray-400" />
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        {/* Main Image with Navigation */}
                        <div className="relative">
                          <img 
                            src={images[currentImageIndex]} 
                            alt={`${selectedProduct.name} - ${currentImageIndex + 1}`}
                            className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={openFullscreenGallery}
                          />
                          
                          {/* Navigation Arrows */}
                          {images.length > 1 && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                                onClick={() => navigateImage('prev')}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                                onClick={() => navigateImage('next')}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {/* Image Counter */}
                          {images.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                              {currentImageIndex + 1} / {images.length}
                            </div>
                          )}
                        </div>
                        
                        {/* Thumbnail Images */}
                        {images.length > 1 && (
                          <div className="grid grid-cols-4 gap-2">
                            {images.map((url, index) => (
                              <img 
                                key={index}
                                src={url} 
                                alt={`${selectedProduct.name} - miniatura ${index + 1}`}
                                className={`w-full h-16 object-cover rounded-md cursor-pointer transition-all ${
                                  index === currentImageIndex 
                                    ? 'ring-2 ring-primary' 
                                    : 'hover:opacity-80'
                                }`}
                                onClick={() => setCurrentImageIndex(index)}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
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
                    {selectedProduct.model && (
                      <p className="text-lg text-muted-foreground mb-4">
                        Model: {selectedProduct.model}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Opis produktu</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {selectedProduct.description || "Brak szczegółowego opisu produktu."}
                    </p>
                  </div>
                  
                  {selectedProduct.specifications && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Specyfikacja</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {selectedProduct.specifications}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Dostępność</p>
                      <p className="font-medium text-green-600">{selectedProduct.quantity} sztuk</p>
                    </div>
                    
                    {selectedProduct.phone && (
                      <Button
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handlePhoneCall(selectedProduct.phone!)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Zadzwoń: {selectedProduct.phone}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Fullscreen Gallery Modal */}
        {fullscreenGallery && selectedProduct && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
            {(() => {
              const images = getProductImages(selectedProduct);
              if (images.length === 0) return null;
              
              return (
                <>
                  {/* Close Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white border-white/20 z-10"
                    onClick={closeFullscreenGallery}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  {/* Main Image - 80% screen size */}
                  <div className="relative w-[80vw] h-[80vh] flex items-center justify-center">
                    <img 
                      src={images[fullscreenImageIndex]} 
                      alt={`${selectedProduct.name} - ${fullscreenImageIndex + 1}`}
                      className="max-w-full max-h-full object-contain"
                    />
                    
                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                      <>
                        <Button
                          size="lg"
                          variant="outline"
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                          onClick={() => navigateFullscreenImage('prev')}
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                          onClick={() => navigateFullscreenImage('next')}
                        >
                          <ChevronRight className="h-6 w-6" />
                        </Button>
                      </>
                    )}
                    
                    {/* Image Counter */}
                    {images.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg">
                        {fullscreenImageIndex + 1} / {images.length}
                      </div>
                    )}
                  </div>
                  
                  {/* Thumbnail Navigation */}
                  {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 translate-y-16">
                      <div className="flex space-x-2 bg-black/50 p-2 rounded-lg max-w-md overflow-x-auto">
                        {images.map((url, index) => (
                          <img 
                            key={index}
                            src={url} 
                            alt={`${selectedProduct.name} - miniatura ${index + 1}`}
                            className={`w-12 h-12 object-cover rounded cursor-pointer transition-all flex-shrink-0 ${
                              index === fullscreenImageIndex 
                                ? 'ring-2 ring-white' 
                                : 'opacity-60 hover:opacity-100'
                            }`}
                            onClick={() => setFullscreenImageIndex(index)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Keyboard Navigation Hint */}
                  <div className="absolute top-4 left-4 text-white/70 text-sm">
                    <p>Użyj strzałek ← → do nawigacji</p>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center text-white/70 text-sm">
          <p>System sprzedaży by PPP :: PROGRAM Sebastian Popiel, tel. +48 500 600 525</p>
        </div>
      </div>
    </div>
  );
}