import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PublicEquipmentAdditional } from "@shared/schema";

interface PublicEquipmentAdditionalManagerProps {
  equipmentId: number;
  equipmentName: string;
}

function isUnauthorizedError(error: any): boolean {
  return error?.message?.includes('401') || error?.status === 401;
}

export default function PublicEquipmentAdditionalManager({ equipmentId, equipmentName }: PublicEquipmentAdditionalManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAdditional, setShowAdditional] = useState(false);
  const [showAccessories, setShowAccessories] = useState(false);

  const { data: additionalItems = [] } = useQuery<PublicEquipmentAdditional[]>({
    queryKey: ["/api/public-equipment", equipmentId, "additional"],
    queryFn: async () => {
      const response = await fetch(`/api/public-equipment/${equipmentId}/additional`);
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { type: string; name: string; price: string; position: number }) => {
      const response = await apiRequest("/api/public-equipment-additional", "POST", {
        equipmentId,
        ...data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-equipment", equipmentId, "additional"] });
      toast({
        title: "Sukces",
        description: "Pozycja została dodana",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Brak autoryzacji",
          description: "Sesja wygasła. Przekierowywanie do logowania...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Błąd",
        description: "Nie udało się dodać pozycji",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; price: string }) => {
      const response = await apiRequest(`/api/public-equipment-additional/${data.id}`, "PATCH", {
        name: data.name,
        price: data.price,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-equipment", equipmentId, "additional"] });
      toast({
        title: "Sukces",
        description: "Pozycja została zaktualizowana",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Brak autoryzacji",
          description: "Sesja wygasła. Przekierowywanie do logowania...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować pozycji",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/public-equipment-additional/${id}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public-equipment", equipmentId, "additional"] });
      toast({
        title: "Sukces",
        description: "Pozycja została usunięta",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Brak autoryzacji",
          description: "Sesja wygasła. Przekierowywanie do logowania...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć pozycji",
        variant: "destructive",
      });
    },
  });

  const additionalEquipment = additionalItems.filter(item => item.type === "additional");
  const accessories = additionalItems.filter(item => item.type === "accessories");

  const AddItemForm = ({ type, position, onCancel }: { type: string; position: number; onCancel: () => void }) => {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");

    const handleSubmit = () => {
      if (!name.trim() || !price) {
        toast({
          title: "Błąd",
          description: "Wszystkie pola są wymagane",
          variant: "destructive",
        });
        return;
      }

      createMutation.mutate({ type, name: name.trim(), price, position });
      setName("");
      setPrice("");
      onCancel();
    };

    return (
      <div className="space-y-4 p-4 border border-dashed rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nazwa</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nazwa pozycji..."
            />
          </div>
          <div>
            <Label>Cena (PLN)</Label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Dodaj
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Anuluj
          </Button>
        </div>
      </div>
    );
  };

  const EditableItem = ({ item }: { item: PublicEquipmentAdditional }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const [price, setPrice] = useState(item.price);

    const handleSave = () => {
      updateMutation.mutate({ id: item.id, name, price });
      setIsEditing(false);
    };

    const handleCancel = () => {
      setName(item.name);
      setPrice(item.price);
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <div className="space-y-2 p-3 border rounded-lg">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <div className="font-medium">{item.name}</div>
          <div className="text-sm text-muted-foreground">{item.price} PLN</div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteMutation.mutate(item.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Dodatki i akcesoria - {equipmentName}</h3>
        <p className="text-sm text-muted-foreground">
          Zarządzaj dodatkowym sprzętem i akcesoriami dla tej pozycji
        </p>
      </div>

      {/* Additional Equipment Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Dodatkowy sprzęt</CardTitle>
              <Badge variant="secondary">{additionalEquipment.length}</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdditional(!showAdditional)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAdditional && (
            <AddItemForm
              type="additional"
              position={1}
              onCancel={() => setShowAdditional(false)}
            />
          )}
          
          <div className="space-y-2">
            {additionalEquipment.map((item) => (
              <EditableItem key={item.id} item={item} />
            ))}
          </div>

          {additionalEquipment.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak dodatkowego sprzętu
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accessories Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Akcesoria</CardTitle>
              <Badge variant="secondary">{accessories.length}</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAccessories(!showAccessories)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAccessories && (
            <AddItemForm
              type="accessories"
              position={1}
              onCancel={() => setShowAccessories(false)}
            />
          )}
          
          <div className="space-y-2">
            {accessories.map((item) => (
              <EditableItem key={item.id} item={item} />
            ))}
          </div>

          {accessories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak akcesoriów
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}