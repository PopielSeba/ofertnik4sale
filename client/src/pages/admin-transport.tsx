import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft, 
  Car,
  Truck,
  Settings
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TransportVehicle {
  id: number;
  name: string;
  description?: string;
  costPerKm: string;
  isActive: boolean;
  createdAt: string;
}

const vehicleSchema = z.object({
  name: z.string().min(1, "Nazwa pojazdu jest wymagana"),
  description: z.string().optional(),
  costPerKm: z.number().min(0.01, "Koszt za km musi być większy niż 0"),
  isActive: z.boolean().default(true),
});

type VehicleForm = z.infer<typeof vehicleSchema>;

export default function AdminTransport() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Check if user is admin or transport manager
  if (!user || ((user as any)?.role !== 'admin' && (user as any)?.role !== 'transport_manager')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Brak dostępu</h1>
          <p className="text-muted-foreground mb-4">
            Ta strona jest dostępna tylko dla administratorów i kierowników transportu.
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Powrót do pulpitu
          </Button>
        </div>
      </div>
    );
  }

  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: "",
      description: "",
      costPerKm: 0,
      isActive: true,
    },
  });

  const { data: vehicles = [], isLoading } = useQuery<TransportVehicle[]>({
    queryKey: ["/api/transport-vehicles"],
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (data: VehicleForm) => {
      const response = await fetch("/api/transport-vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create vehicle");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transport-vehicles"] });
      toast({
        title: "Sukces",
        description: "Pojazd został dodany",
      });
      setShowCreateDialog(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: VehicleForm }) => {
      const response = await fetch(`/api/transport-vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update vehicle");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transport-vehicles"] });
      toast({
        title: "Sukces",
        description: "Pojazd został zaktualizowany",
      });
      setEditingVehicle(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/transport-vehicles/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete vehicle");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transport-vehicles"] });
      toast({
        title: "Sukces",
        description: "Pojazd został usunięty",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VehicleForm) => {
    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, data });
    } else {
      createVehicleMutation.mutate(data);
    }
  };

  const handleEdit = (vehicle: TransportVehicle) => {
    setEditingVehicle(vehicle);
    form.reset({
      name: vehicle.name,
      description: vehicle.description || "",
      costPerKm: parseFloat(vehicle.costPerKm),
      isActive: vehicle.isActive,
    });
    setShowCreateDialog(true);
  };

  const handleDelete = (vehicle: TransportVehicle) => {
    if (confirm(`Czy na pewno chcesz usunąć pojazd "${vehicle.name}"?`)) {
      deleteVehicleMutation.mutate(vehicle.id);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(num);
  };

  const getVehicleIcon = (name: string) => {
    if (name.toLowerCase().includes('osobowy')) return Car;
    return Truck;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Powrót
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-500" />
              Zarządzanie Wycenami Transportu
            </h1>
            <p className="text-muted-foreground">
              Pojazdy, kategorie i cennik transportu
            </p>
          </div>
        </div>

        {/* Transport Vehicles Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Pojazdy transportowe
            </CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingVehicle(null);
                  form.reset({
                    name: "",
                    description: "",
                    costPerKm: 0,
                    isActive: true,
                  });
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj pojazd
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingVehicle ? "Edytuj pojazd" : "Dodaj nowy pojazd"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nazwa pojazdu</FormLabel>
                          <FormControl>
                            <Input placeholder="np. Samochód osobowy" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opis (opcjonalny)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Dodatkowe informacje o pojeździe"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="costPerKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Koszt za kilometr (PLN)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                      >
                        Anuluj
                      </Button>
                      <Button
                        type="submit"
                        disabled={createVehicleMutation.isPending || updateVehicleMutation.isPending}
                      >
                        {editingVehicle ? "Aktualizuj" : "Dodaj"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Ładowanie...</p>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Brak zdefiniowanych pojazdów</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setShowCreateDialog(true)}
                >
                  Dodaj pierwszy pojazd
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pojazd</TableHead>
                    <TableHead>Opis</TableHead>
                    <TableHead>Koszt/km</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data utworzenia</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => {
                    const IconComponent = getVehicleIcon(vehicle.name);
                    return (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{vehicle.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {vehicle.description || "---"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">
                            {formatCurrency(vehicle.costPerKm)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={vehicle.isActive ? "default" : "secondary"}
                          >
                            {vehicle.isActive ? "Aktywny" : "Nieaktywny"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(vehicle.createdAt).toLocaleDateString('pl-PL')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(vehicle)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(vehicle)}
                              disabled={deleteVehicleMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Categories Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Domyślne kategorie pojazdów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Samochód osobowy", icon: Car, description: "Do przewozu osób" },
                { name: "Furgon ≤3,5t", icon: Truck, description: "Mały transport towarowy" },
                { name: "Ciężarówka solo", icon: Truck, description: "Średni transport" },
                { name: "Wywrotka", icon: Truck, description: "Transport materiałów sypkich" },
                { name: "Ciężarówka z naczepą", icon: Truck, description: "Duży transport dalekobieżny" },
              ].map((category) => {
                const IconComponent = category.icon;
                return (
                  <div 
                    key={category.name}
                    className="p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <IconComponent className="w-5 h-5 text-primary" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}