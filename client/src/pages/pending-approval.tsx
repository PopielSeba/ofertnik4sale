import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Mail, Shield, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function PendingApproval() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Clock className="w-16 h-16 text-orange-500" />
          </div>
          <CardTitle className="text-xl text-foreground">
            Konto oczekuje na akceptację
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Twoje konto zostało utworzone, ale wymaga zatwierdzenia przez administratora.
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {(user as any)?.email}
              </span>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-foreground">Status konta</span>
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">
              Oczekuje na akceptację
            </Badge>
          </div>

          <div className="space-y-4 pt-4">
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm text-muted-foreground text-center">
                <strong>Co się dzieje teraz?</strong>
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• Administrator został powiadomiony o Twojej rejestracji</li>
                <li>• Twoje konto jest bezpiecznie zapisane w systemie</li>
                <li>• Po zatwierdzeniu otrzymasz pełen dostęp do systemu wycen</li>
              </ul>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              Proces akceptacji może potrwać kilka godzin. 
              Sprawdź ponownie później lub skontaktuj się z administratorem.
            </p>
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={handleRefresh}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sprawdź ponownie
              </Button>
              
              <Button 
                onClick={handleLogout}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                Wyloguj się
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}