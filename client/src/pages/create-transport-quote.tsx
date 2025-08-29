import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Truck, Calculator, ArrowLeft } from "lucide-react";

interface Client {
  id: number;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  nip?: string;
}

interface TransportVehicle {
  id: number;
  name: string;
  description?: string;
  costPerKm: string;
  isActive: boolean;
}

const transportQuoteSchema = z.object({
  clientName: z.string().min(1, "Podaj nazwę klienta"),
  vehicleId: z.number({ required_error: "Wybierz pojazd" }),
  fromAddress: z.string().min(1, "Podaj adres początkowy"),
  toAddress: z.string().min(1, "Podaj adres docelowy"),
  distance: z.number().min(0.1, "Dystans musi być większy niż 0"),
  notes: z.string().optional(),
});

type TransportQuoteForm = z.infer<typeof transportQuoteSchema>;

export default function CreateTransportQuote() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [calculatedCost, setCalculatedCost] = useState<number>(0);

  const form = useForm<TransportQuoteForm>({
    resolver: zodResolver(transportQuoteSchema),
    defaultValues: {
      clientName: "",
      fromAddress: "",
      toAddress: "",
      distance: 0,
      notes: "",
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: vehicles = [] } = useQuery<TransportVehicle[]>({
    queryKey: ["/api/transport-vehicles"],
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: TransportQuoteForm & { totalCost: number }) => {
      const response = await fetch("/api/transport-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create transport quote");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transport-quotes"] });
      toast({
        title: "Sukces",
        description: "Wycena transportu została utworzona",
      });
      navigate("/transport-quotes");
    },
    onError: (error: Error) => {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate cost when vehicle or distance changes
  const watchedFields = form.watch(["vehicleId", "distance"]);
  const selectedVehicle = vehicles.find(v => v.id === watchedFields[0]);
  const distance = watchedFields[1];

  useEffect(() => {
    if (selectedVehicle && distance > 0) {
      const cost = parseFloat(selectedVehicle.costPerKm) * distance;
      setCalculatedCost(cost);
    } else {
      setCalculatedCost(0);
    }
  }, [selectedVehicle, distance]);

  const onSubmit = (data: TransportQuoteForm) => {
    if (calculatedCost <= 0) {
      toast({
        title: "Błąd",
        description: "Koszt transportu musi być większy niż 0",
        variant: "destructive",
      });
      return;
    }

    createQuoteMutation.mutate({
      ...data,
      totalCost: calculatedCost,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
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
              <Truck className="w-6 h-6" />
              Nowa wycena transportu
            </h1>
            <p className="text-muted-foreground">
              Utwórz wycenę przewozu dla klienta
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Dane klienta</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa klienta</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Wprowadź nazwę klienta"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Transport Details */}
            <Card>
              <CardHeader>
                <CardTitle>Szczegóły transportu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ pojazdu</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz pojazd" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicles.map((vehicle) => (
                            <SelectItem
                              key={vehicle.id}
                              value={vehicle.id.toString()}
                            >
                              <div>
                                <div>{vehicle.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatCurrency(parseFloat(vehicle.costPerKm))}/km
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fromAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adres początkowy</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Wprowadź adres początkowy"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adres docelowy</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Wprowadź adres docelowy"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dystans (km)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
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

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notatki (opcjonalne)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Dodatkowe informacje o transporcie"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Cost Calculation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Kalkulacja kosztów
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pojazd:</span>
                      <div className="font-medium">
                        {selectedVehicle?.name || "Nie wybrano"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cena za km:</span>
                      <div className="font-medium">
                        {selectedVehicle
                          ? formatCurrency(parseFloat(selectedVehicle.costPerKm))
                          : "---"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dystans:</span>
                      <div className="font-medium">
                        {distance ? `${distance} km` : "---"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Koszt całkowity:</span>
                      <div className="font-bold text-lg text-primary">
                        {formatCurrency(calculatedCost)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={createQuoteMutation.isPending || calculatedCost <= 0}
              >
                {createQuoteMutation.isPending ? "Tworzenie..." : "Utwórz wycenę"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}