import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Save, Edit, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import type { 
  PublicEquipmentWithCategory, 
  PublicEquipmentServiceCosts, 
  PublicEquipmentServiceItems,
  InsertPublicEquipmentServiceCosts,
  InsertPublicEquipmentServiceItems
} from "@shared/schema";

interface PublicServiceCostsManagerProps {
  equipment: PublicEquipmentWithCategory;
  onClose: () => void;
}

export function PublicServiceCostsManager({ equipment, onClose }: PublicServiceCostsManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch service costs
  const { data: serviceCosts, isLoading: serviceCostsLoading } = useQuery<PublicEquipmentServiceCosts | null>({
    queryKey: [`/api/public-equipment/${equipment.id}/service-costs`],
  });

  // Fetch service items
  const { data: serviceItems = [], isLoading: serviceItemsLoading } = useQuery<PublicEquipmentServiceItems[]>({
    queryKey: [`/api/public-equipment/${equipment.id}/service-items`],
  });

  // Local state for service costs form
  const [serviceCostsForm, setServiceCostsForm] = useState({
    serviceIntervalMonths: 0,
    serviceIntervalKm: 0,
    serviceIntervalMotohours: 0,
    workerHours: 2,
    workerCostPerHour: 100,
  });

  // Check equipment category for different interval types
  const isVehicle = equipment.category.name === 'Pojazdy';
  const isEngineEquipment = equipment.category.name === 'Agregaty prądotwórcze' || equipment.category.name === 'Maszty oświetleniowe';

  // Local state for service items
  const [localServiceItems, setLocalServiceItems] = useState<PublicEquipmentServiceItems[]>([]);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [newItemForm, setNewItemForm] = useState({
    itemName: "",
    itemCost: "0",
    sortOrder: 0,
  });
  const [showNewItemForm, setShowNewItemForm] = useState(false);

  // Update forms when data loads
  useEffect(() => {
    if (serviceCosts) {
      setServiceCostsForm({
        serviceIntervalMonths: serviceCosts.serviceIntervalMonths || 0,
        serviceIntervalKm: (serviceCosts as any).serviceIntervalKm || 0,
        serviceIntervalMotohours: (serviceCosts as any).serviceIntervalMotohours || 0,
        workerHours: parseFloat(serviceCosts.workerHours.toString()),
        workerCostPerHour: parseFloat(serviceCosts.workerCostPerHour.toString()),
      });
    }
  }, [serviceCosts]);

  useEffect(() => {
    if (serviceItems && serviceItems.length >= 0) {
      setLocalServiceItems([...serviceItems]);
    }
  }, [serviceItems?.length]);

  // Mutations
  const updateServiceCostsMutation = useMutation({
    mutationFn: async (data: InsertPublicEquipmentServiceCosts) => {
      return await apiRequest(`/api/public-equipment/${equipment.id}/service-costs`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public-equipment/${equipment.id}/service-costs`] });
      toast({
        title: "Sukces",
        description: "Koszty serwisu zostały zaktualizowane",
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować kosztów serwisu",
        variant: "destructive",
      });
    },
  });

  const addServiceItemMutation = useMutation({
    mutationFn: async (data: InsertPublicEquipmentServiceItems) => {
      return await apiRequest(`/api/public-equipment/${equipment.id}/service-items`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public-equipment/${equipment.id}/service-items`] });
      setShowNewItemForm(false);
      setNewItemForm({ itemName: "", itemCost: "0", sortOrder: 0 });
      toast({
        title: "Sukces",
        description: "Element serwisu został dodany",
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: "Nie udało się dodać elementu serwisu",
        variant: "destructive",
      });
    },
  });

  const updateServiceItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPublicEquipmentServiceItems> }) => {
      return await apiRequest(`/api/public-equipment-service-items/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public-equipment/${equipment.id}/service-items`] });
      setEditingItemId(null);
      toast({
        title: "Sukces",
        description: "Element serwisu został zaktualizowany",
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować elementu serwisu",
        variant: "destructive",
      });
    },
  });

  const deleteServiceItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/public-equipment-service-items/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public-equipment/${equipment.id}/service-items`] });
      toast({
        title: "Sukces",
        description: "Element serwisu został usunięty",
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć elementu serwisu",
        variant: "destructive",
      });
    },
  });

  const handleServiceCostsSubmit = () => {
    updateServiceCostsMutation.mutate({
      equipmentId: equipment.id,
      serviceIntervalMonths: serviceCostsForm.serviceIntervalMonths,
      serviceIntervalKm: isVehicle ? serviceCostsForm.serviceIntervalKm : undefined,
      serviceIntervalMotohours: isEngineEquipment ? serviceCostsForm.serviceIntervalMotohours : undefined,
      workerHours: serviceCostsForm.workerHours.toString(),
      workerCostPerHour: serviceCostsForm.workerCostPerHour.toString(),
    });
  };

  const handleAddServiceItem = () => {
    if (!newItemForm.itemName.trim()) {
      toast({
        title: "Błąd",
        description: "Nazwa elementu jest wymagana",
        variant: "destructive",
      });
      return;
    }

    addServiceItemMutation.mutate({
      equipmentId: equipment.id,
      itemName: newItemForm.itemName,
      itemCost: newItemForm.itemCost,
      sortOrder: newItemForm.sortOrder,
    });
  };

  const handleUpdateServiceItem = (id: number, itemName: string, itemCost: string) => {
    updateServiceItemMutation.mutate({
      id,
      data: { itemName, itemCost }
    });
  };

  if (serviceCostsLoading || serviceItemsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Koszty serwisu - {equipment.name}</h3>
        <Button variant="outline" onClick={onClose} size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Service Costs Form */}
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia serwisu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isVehicle && (
              <div>
                <Label htmlFor="serviceIntervalKm">Interwał serwisu (km)</Label>
                <Input
                  id="serviceIntervalKm"
                  type="number"
                  value={serviceCostsForm.serviceIntervalKm}
                  onChange={(e) => setServiceCostsForm({
                    ...serviceCostsForm,
                    serviceIntervalKm: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            )}
            
            {isEngineEquipment && (
              <div>
                <Label htmlFor="serviceIntervalMotohours">Interwał serwisu (mth)</Label>
                <Input
                  id="serviceIntervalMotohours"
                  type="number"
                  value={serviceCostsForm.serviceIntervalMotohours}
                  onChange={(e) => setServiceCostsForm({
                    ...serviceCostsForm,
                    serviceIntervalMotohours: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            )}

            <div>
              <Label htmlFor="workerHours">Godziny pracy (h)</Label>
              <Input
                id="workerHours"
                type="number"
                step="0.1"
                value={serviceCostsForm.workerHours}
                onChange={(e) => setServiceCostsForm({
                  ...serviceCostsForm,
                  workerHours: parseFloat(e.target.value) || 0
                })}
              />
            </div>

            <div>
              <Label htmlFor="workerCostPerHour">Koszt pracy (PLN/h)</Label>
              <Input
                id="workerCostPerHour"
                type="number"
                value={serviceCostsForm.workerCostPerHour}
                onChange={(e) => setServiceCostsForm({
                  ...serviceCostsForm,
                  workerCostPerHour: parseFloat(e.target.value) || 0
                })}
              />
            </div>
          </div>

          <Button 
            onClick={handleServiceCostsSubmit}
            disabled={updateServiceCostsMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Zapisz ustawienia serwisu
          </Button>
        </CardContent>
      </Card>

      {/* Service Items */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Elementy serwisu</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewItemForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Dodaj element
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new item form */}
          {showNewItemForm && (
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="newItemName">Nazwa elementu</Label>
                    <Input
                      id="newItemName"
                      value={newItemForm.itemName}
                      onChange={(e) => setNewItemForm({
                        ...newItemForm,
                        itemName: e.target.value
                      })}
                      placeholder="np. Filtr oleju"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newItemCost">Koszt (PLN)</Label>
                    <Input
                      id="newItemCost"
                      type="number"
                      step="0.01"
                      value={newItemForm.itemCost}
                      onChange={(e) => setNewItemForm({
                        ...newItemForm,
                        itemCost: e.target.value
                      })}
                    />
                  </div>
                  <div className="flex items-end space-x-2">
                    <Button 
                      onClick={handleAddServiceItem}
                      disabled={addServiceItemMutation.isPending}
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Dodaj
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowNewItemForm(false);
                        setNewItemForm({ itemName: "", itemCost: "0", sortOrder: 0 });
                      }}
                      size="sm"
                    >
                      Anuluj
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service items list */}
          <div className="space-y-2">
            {localServiceItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                {editingItemId === item.id ? (
                  <div className="flex items-center space-x-2 flex-1">
                    <Input
                      value={item.itemName}
                      onChange={(e) => {
                        setLocalServiceItems(localServiceItems.map(si => 
                          si.id === item.id ? { ...si, itemName: e.target.value } : si
                        ));
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={item.itemCost}
                      onChange={(e) => {
                        setLocalServiceItems(localServiceItems.map(si => 
                          si.id === item.id ? { ...si, itemCost: e.target.value } : si
                        ));
                      }}
                      className="w-32"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateServiceItem(item.id, item.itemName, item.itemCost)}
                      disabled={updateServiceItemMutation.isPending}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingItemId(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-sm text-muted-foreground">{item.itemCost} PLN</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingItemId(item.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteServiceItemMutation.mutate(item.id)}
                        disabled={deleteServiceItemMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {localServiceItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak elementów serwisu. Dodaj pierwszy element.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}