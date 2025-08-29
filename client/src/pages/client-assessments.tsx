import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  User, 
  FileText, 
  Eye, 
  Printer, 
  Trash2, 
  Search,
  Phone,
  Mail,
  Building,
  Calendar,
  Paperclip,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ClientAssessment {
  id: number;
  responseNumber: string;
  clientCompanyName?: string;
  clientContactPerson?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  responses: Record<string, string>;
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function ClientAssessments() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingAssessment, setEditingAssessment] = useState<ClientAssessment | null>(null);
  const [editFormData, setEditFormData] = useState({
    clientCompanyName: "",
    clientContactPerson: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
  });

  // Fetch client assessments
  const { data: assessments = [], isLoading, error } = useQuery<ClientAssessment[]>({
    queryKey: ["/api/needs-assessment/client-responses"],
  });


  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest(`/api/needs-assessment/responses/${id}`, "PUT", data);
      if (!response.ok) {
        throw new Error("Failed to update assessment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/needs-assessment/client-responses"] });
      setEditingAssessment(null);
      toast({
        title: "Sukces",
        description: "Badanie klienta zostało zaktualizowane",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować badania",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/needs-assessment/responses/${id}`, "DELETE");
      if (!response.ok) {
        throw new Error("Failed to delete assessment");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/needs-assessment/client-responses"] });
      toast({
        title: "Sukces",
        description: "Badanie klienta zostało usunięte",
      });
    },
    onError: () => {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć badania",
        variant: "destructive",
      });
    },
  });

  // Filter assessments based on search term
  const filteredAssessments = assessments.filter(assessment =>
    assessment.responseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.clientCompanyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.clientContactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.clientPhone?.includes(searchTerm) ||
    assessment.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleView = (id: number) => {
    setLocation(`/needs-assessment/${id}`);
  };

  const handlePrint = (id: number) => {
    window.open(`/api/needs-assessment/responses/${id}/print`, '_blank');
  };

  const handleEdit = (assessment: ClientAssessment) => {
    setEditingAssessment(assessment);
    setEditFormData({
      clientCompanyName: assessment.clientCompanyName || "",
      clientContactPerson: assessment.clientContactPerson || "",
      clientPhone: assessment.clientPhone || "",
      clientEmail: assessment.clientEmail || "",
      clientAddress: assessment.clientAddress || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingAssessment) return;
    
    const updateData = {
      clientCompanyName: editFormData.clientCompanyName,
      clientContactPerson: editFormData.clientContactPerson,
      clientPhone: editFormData.clientPhone,
      clientEmail: editFormData.clientEmail,
      clientAddress: editFormData.clientAddress,
      responses: editingAssessment.responses, // Keep original responses unchanged
      attachments: editingAssessment.attachments,
    };
    
    updateMutation.mutate({
      id: editingAssessment.id,
      data: updateData
    });
  };

  const handleCancelEdit = () => {
    setEditingAssessment(null);
    setEditFormData({
      clientCompanyName: "",
      clientContactPerson: "",
      clientPhone: "",
      clientEmail: "",
      clientAddress: "",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Czy na pewno chcesz usunąć to badanie klienta?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="text-center p-8">
              <p className="text-red-600">Wystąpił błąd podczas ładowania badań klienta.</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Spróbuj ponownie
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <User className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Badania Klienta</h1>
          </div>
          <p className="text-muted-foreground">
            Lista wszystkich badań potrzeb przesłanych przez klientów przez portal klienta
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Szukaj po numerze, firmie, osobie kontaktowej, telefonie lub emailu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Łącznie badań</p>
                  <p className="text-2xl font-bold">{assessments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Dzisiaj</p>
                  <p className="text-2xl font-bold">
                    {assessments.filter(a => 
                      new Date(a.createdAt).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Znalezione</p>
                  <p className="text-2xl font-bold">{filteredAssessments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessments List */}
        {filteredAssessments.length === 0 ? (
          <Card>
            <CardContent className="text-center p-8">
              <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "Brak wyników wyszukiwania" : "Brak badań klienta"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Spróbuj użyć innych słów kluczowych" 
                  : "Żadne badania nie zostały jeszcze przesłane przez klientów"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAssessments.map((assessment) => (
              <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {assessment.responseNumber}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(assessment.createdAt).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {assessment.clientCompanyName && (
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{assessment.clientCompanyName}</span>
                          </div>
                        )}
                        {assessment.clientContactPerson && (
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{assessment.clientContactPerson}</span>
                          </div>
                        )}
                        {assessment.clientPhone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{assessment.clientPhone}</span>
                          </div>
                        )}
                        {assessment.clientEmail && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{assessment.clientEmail}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Liczba odpowiedzi: {Object.keys(assessment.responses).length}
                        </p>
                        {assessment.attachments && assessment.attachments.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Załączniki: {assessment.attachments.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(assessment.id)}
                        className="h-8"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrint(assessment.id)}
                        className="h-8"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(assessment)}
                        className="h-8"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(assessment.id)}
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingAssessment && (
          <Dialog open={!!editingAssessment} onOpenChange={() => handleCancelEdit()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edytuj dane kontaktowe - {editingAssessment.responseNumber}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clientCompanyName">Nazwa firmy</Label>
                  <Input
                    id="clientCompanyName"
                    value={editFormData.clientCompanyName}
                    onChange={(e) => setEditFormData({...editFormData, clientCompanyName: e.target.value})}
                    placeholder="Nazwa firmy"
                  />
                </div>
                
                <div>
                  <Label htmlFor="clientContactPerson">Osoba kontaktowa</Label>
                  <Input
                    id="clientContactPerson"
                    value={editFormData.clientContactPerson}
                    onChange={(e) => setEditFormData({...editFormData, clientContactPerson: e.target.value})}
                    placeholder="Imię i nazwisko"
                  />
                </div>
                
                <div>
                  <Label htmlFor="clientPhone">Telefon</Label>
                  <Input
                    id="clientPhone"
                    value={editFormData.clientPhone}
                    onChange={(e) => setEditFormData({...editFormData, clientPhone: e.target.value})}
                    placeholder="Numer telefonu"
                  />
                </div>
                
                <div>
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={editFormData.clientEmail}
                    onChange={(e) => setEditFormData({...editFormData, clientEmail: e.target.value})}
                    placeholder="Adres email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="clientAddress">Adres</Label>
                  <Input
                    id="clientAddress"
                    value={editFormData.clientAddress}
                    onChange={(e) => setEditFormData({...editFormData, clientAddress: e.target.value})}
                    placeholder="Adres firmy"
                  />
                </div>
              </div>
              
              <DialogFooter className="space-x-2">
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={updateMutation.isPending}
                >
                  Anuluj
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Zapisuję..." : "Zapisz dane kontaktowe"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}