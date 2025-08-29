import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Edit, Trash2, Package, ShoppingCart, Settings, Search, Zap, Wrench, Car, Lightbulb, Snowflake, Flame, Droplets, Monitor, Hammer, Laptop, Wifi, Headphones, Camera, Gamepad2, Watch, Phone } from "lucide-react";
import type { ShopCategory, ShopProduct } from "@shared/schema";
import { ShopImageUploader } from "@/components/ShopImageUploader";

// Form schemas
const categoryFormSchema = z.object({
  name: z.string().min(1, "Nazwa kategorii jest wymagana"),
  description: z.string().optional(),
  icon: z.string().optional().default("Package"),
});

const productFormSchema = z.object({
  name: z.string().min(1, "Nazwa produktu jest wymagana"),
  categoryId: z.coerce.number().min(1, "Kategoria jest wymagana"),
  description: z.string().optional(),
  model: z.string().optional(),
  specifications: z.string().optional(),
  imageUrl: z.string().optional(),
  image1Url: z.string().optional(),
  image2Url: z.string().optional(),
  image3Url: z.string().optional(),
  image4Url: z.string().optional(),
  price: z.coerce.number().min(0, "Cena musi być większa lub równa 0"),
  quantity: z.coerce.number().min(0, "Ilość musi być większa lub równa 0"),
  phone: z.string().optional(),
  condition: z.string().default("new"),
  isActive: z.boolean().optional().default(true),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;
type ProductFormData = z.infer<typeof productFormSchema>;

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

export default function ShopAdmin() {
  const [selectedTab, setSelectedTab] = useState<"categories" | "products" | "settings">("products");
  const [editingCategory, setEditingCategory] = useState<ShopCategory | null>(null);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [defaultPhoneNumber, setDefaultPhoneNumber] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ShopCategory[]>({
    queryKey: ["/api/shop-categories"],
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery<ShopProduct[]>({
    queryKey: ["/api/shop-products"],
  });

  // Fetch default phone number setting
  const { data: defaultPhoneData } = useQuery<{ value: string }>({
    queryKey: ["/api/shop-settings/default_phone"],
  });

  const defaultPhone = defaultPhoneData?.value || "";

  // Update local state when default phone changes
  useEffect(() => {
    if (defaultPhone) {
      setDefaultPhoneNumber(defaultPhone);
    }
  }, [defaultPhone]);

  // Filter functions
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.model?.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // Category form
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "Package",
    },
  });

  // Product form
  const productForm = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      categoryId: 0,
      description: "",
      model: "",
      specifications: "",
      imageUrl: "",
      image1Url: "",
      image2Url: "",
      image3Url: "",
      image4Url: "",
      price: 0,
      quantity: 0,
      phone: "",
      condition: "new",
      isActive: true,
    },
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await fetch("/api/shop-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop-categories"] });
      toast({ title: "Kategoria została utworzona" });
      setCategoryDialogOpen(false);
      categoryForm.reset();
      setEditingCategory(null);
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się utworzyć kategorii", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CategoryFormData> }) => {
      const response = await fetch(`/api/shop-categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update category");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop-categories"] });
      toast({ title: "Kategoria została zaktualizowana" });
      setCategoryDialogOpen(false);
      categoryForm.reset();
      setEditingCategory(null);
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zaktualizować kategorii", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/shop-categories/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop-categories"] });
      toast({ title: "Kategoria została usunięta" });
    },
    onError: (error: Error) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await fetch("/api/shop-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop-products"] });
      toast({ title: "Produkt został utworzony" });
      setProductDialogOpen(false);
      productForm.reset();
      setEditingProduct(null);
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się utworzyć produktu", variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProductFormData> }) => {
      const response = await fetch(`/api/shop-products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop-products"] });
      toast({ title: "Produkt został zaktualizowany" });
      setProductDialogOpen(false);
      productForm.reset();
      setEditingProduct(null);
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zaktualizować produktu", variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/shop-products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop-products"] });
      toast({ title: "Produkt został usunięty" });
    },
    onError: (error: Error) => {
      toast({ title: "Błąd", description: error.message, variant: "destructive" });
    },
  });

  const updateDefaultPhoneMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await fetch("/api/shop-settings/default_phone", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: phoneNumber }),
      });
      if (!response.ok) throw new Error("Failed to update default phone");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shop-settings/default_phone"] });
      toast({ title: "Domyślny numer telefonu został zapisany" });
    },
    onError: () => {
      toast({ title: "Błąd", description: "Nie udało się zapisać domyślnego numeru", variant: "destructive" });
    },
  });

  const handleCategorySubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleProductSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleEditCategory = (category: ShopCategory) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "Package",
    });
    setCategoryDialogOpen(true);
  };

  const handleEditProduct = (product: ShopProduct) => {
    setEditingProduct(product);
    productForm.reset({
      name: product.name,
      categoryId: product.categoryId,
      description: product.description || "",
      model: product.model || "",
      specifications: product.specifications || "",
      imageUrl: product.imageUrl || "",
      image1Url: product.image1Url || "",
      image2Url: product.image2Url || "",
      image3Url: product.image3Url || "",
      image4Url: product.image4Url || "",
      price: parseFloat(product.price),
      quantity: product.quantity,
      phone: product.phone || "",
      condition: product.condition || "new",
      isActive: product.isActive,
    });
    setProductDialogOpen(true);
  };

  const handleNewCategory = () => {
    setEditingCategory(null);
    categoryForm.reset();
    setCategoryDialogOpen(true);
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    productForm.reset({
      name: "",
      categoryId: 0,
      description: "",
      model: "",
      specifications: "",
      imageUrl: "",
      image1Url: "",
      image2Url: "",
      image3Url: "",
      image4Url: "",
      price: 0,
      quantity: 1,
      phone: defaultPhone || "",
      condition: "new",
      isActive: true,
    });
    setProductDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Zarządzanie Sklepem
        </h1>
        <p className="text-muted-foreground mt-2">
          Zarządzaj kategoriami i produktami w sklepie
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <Button
          variant={selectedTab === "categories" ? "default" : "outline"}
          onClick={() => setSelectedTab("categories")}
          className="flex items-center gap-2"
        >
          <Package className="h-4 w-4" />
          Kategorie
        </Button>
        <Button
          variant={selectedTab === "products" ? "default" : "outline"}
          onClick={() => setSelectedTab("products")}
          className="flex items-center gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          Produkty
        </Button>
        <Button
          variant={selectedTab === "settings" ? "default" : "outline"}
          onClick={() => setSelectedTab("settings")}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Ustawienia
        </Button>
      </div>

      {/* Categories Tab */}
      {selectedTab === "categories" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Kategorie</h2>
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewCategory} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Dodaj kategorię
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Edytuj kategorię" : "Nowa kategoria"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...categoryForm}>
                  <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-4">
                    <FormField
                      control={categoryForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nazwa kategorii</FormLabel>
                          <FormControl>
                            <Input placeholder="Wprowadź nazwę kategorii" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={categoryForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opis (opcjonalny)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Wprowadź opis kategorii" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={categoryForm.control}
                      name="icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ikona kategorii</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue>
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const IconComponent = getIconComponent(field.value);
                                        return <IconComponent className="h-4 w-4" />;
                                      })()}
                                      <span>{field.value || "Package"}</span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(availableIcons).map(([name, IconComponent]) => (
                                    <SelectItem key={name} value={name}>
                                      <div className="flex items-center gap-2">
                                        <IconComponent className="h-4 w-4" />
                                        <span>{name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              {/* Icon Preview Grid */}
                              <div className="grid grid-cols-6 gap-2 p-2 border rounded-md bg-gray-50">
                                {Object.entries(availableIcons).map(([name, IconComponent]) => (
                                  <button
                                    key={name}
                                    type="button"
                                    className={`p-2 rounded-md hover:bg-blue-100 transition-colors ${
                                      field.value === name ? 'bg-blue-200 ring-2 ring-blue-500' : 'bg-white'
                                    }`}
                                    onClick={() => field.onChange(name)}
                                    title={name}
                                  >
                                    <IconComponent className="h-5 w-5 mx-auto" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                        Anuluj
                      </Button>
                      <Button type="submit">
                        {editingCategory ? "Zapisz zmiany" : "Dodaj kategorię"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search for categories */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Szukaj kategorii..."
              value={categorySearchTerm}
              onChange={(e) => setCategorySearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {categoriesLoading ? (
            <div className="text-center py-8">Ładowanie kategorii...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const IconComponent = getIconComponent(category.icon || undefined);
                          return <IconComponent className="h-5 w-5 text-primary" />;
                        })()}
                        <span>{category.name}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteCategoryMutation.mutate(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {category.description || "Brak opisu"}
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      {products.filter(p => p.categoryId === category.id).length} produktów
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Products Tab */}
      {selectedTab === "products" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Produkty</h2>
            <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewProduct} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Dodaj produkt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "Edytuj produkt" : "Nowy produkt"}
                  </DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  <Form {...productForm}>
                    <form onSubmit={productForm.handleSubmit(handleProductSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={productForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nazwa produktu</FormLabel>
                            <FormControl>
                              <Input placeholder="Wprowadź nazwę produktu" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={productForm.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kategoria</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Wybierz kategorię" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={productForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opis</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Wprowadź opis produktu" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={productForm.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="Model produktu" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Zdjęcia produktu */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Zdjęcia produktu (maksymalnie 5)</h4>
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={productForm.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ShopImageUploader
                                  value={field.value}
                                  onChange={field.onChange}
                                  label="Zdjęcie główne (miniatura)"
                                  placeholder="Wgraj główne zdjęcie produktu"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={productForm.control}
                          name="image1Url"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ShopImageUploader
                                  value={field.value}
                                  onChange={field.onChange}
                                  label="Zdjęcie 2"
                                  placeholder="Wgraj drugie zdjęcie produktu"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={productForm.control}
                          name="image2Url"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ShopImageUploader
                                  value={field.value}
                                  onChange={field.onChange}
                                  label="Zdjęcie 3"
                                  placeholder="Wgraj trzecie zdjęcie produktu"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={productForm.control}
                          name="image3Url"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ShopImageUploader
                                  value={field.value}
                                  onChange={field.onChange}
                                  label="Zdjęcie 4"
                                  placeholder="Wgraj czwarte zdjęcie produktu"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={productForm.control}
                          name="image4Url"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ShopImageUploader
                                  value={field.value}
                                  onChange={field.onChange}
                                  label="Zdjęcie 5"
                                  placeholder="Wgraj piąte zdjęcie produktu"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={productForm.control}
                      name="specifications"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specyfikacja techniczna</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Wprowadź specyfikację techniczną" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={productForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cena (PLN)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={productForm.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ilość</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={productForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numer telefonu kontaktowy</FormLabel>
                          <FormControl>
                            <Input placeholder="Wprowadź numer telefonu" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={productForm.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stan</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz stan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">Nowy</SelectItem>
                                <SelectItem value="used">Używany</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setProductDialogOpen(false)}>
                        Anuluj
                      </Button>
                      <Button type="submit">
                        {editingProduct ? "Zapisz zmiany" : "Dodaj produkt"}
                      </Button>
                    </div>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search for products */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Szukaj produktów..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {productsLoading ? (
            <div className="text-center py-8">Ładowanie produktów...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{product.name}</span>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteProductMutation.mutate(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {product.imageUrl && (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-md mb-3"
                      />
                    )}
                    <p className="text-muted-foreground text-sm mb-2">
                      {product.description || "Brak opisu"}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">
                          {categories.find(cat => cat.id === product.categoryId)?.name || "Brak kategorii"}
                        </Badge>
                        <Badge variant={product.condition === "new" ? "default" : "outline"} className="text-xs">
                          {product.condition === "new" ? "Nowy" : "Używany"}
                        </Badge>
                      </div>
                      <span className="font-bold text-primary">
                        {parseFloat(product.price).toFixed(2)} PLN
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-muted-foreground">
                        Ilość: {product.quantity}
                      </span>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Aktywny" : "Nieaktywny"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {selectedTab === "settings" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Ustawienia Sklepu</h2>
          
          <Card>
            <CardHeader>
              <CardTitle>Domyślny numer telefonu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ten numer telefonu będzie automatycznie przypisywany do nowych produktów. 
                Możesz go później zmienić dla każdego produktu osobno.
              </p>
              <div className="flex gap-4">
                <Input
                  placeholder="Wprowadź domyślny numer telefonu"
                  value={defaultPhoneNumber}
                  onChange={(e) => setDefaultPhoneNumber(e.target.value)}
                />
                <Button 
                  onClick={() => updateDefaultPhoneMutation.mutate(defaultPhoneNumber)}
                  disabled={updateDefaultPhoneMutation.isPending}
                >
                  {updateDefaultPhoneMutation.isPending ? "Zapisywanie..." : "Zapisz"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}