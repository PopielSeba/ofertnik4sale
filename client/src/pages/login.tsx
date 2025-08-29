import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        if (isRegistering) {
          setMessage({
            type: "success",
            text: "Rejestracja zakończona pomyślnie. Oczekuj na akceptację administratora.",
          });
        } else {
          // Login successful - save token and redirect
          localStorage.setItem("authToken", data.token);
          window.location.href = "/";
        }
      } else {
        setMessage({
          type: "error",
          text: data.message || "Wystąpił błąd podczas logowania",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Błąd połączenia z serwerem",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-foreground">
            {isRegistering ? "Rejestracja" : "Logowanie"}
          </CardTitle>
          <p className="text-muted-foreground">
            {isRegistering
              ? "Utwórz nowe konto w systemie"
              : "Zaloguj się do systemu wycen"}
          </p>
        </CardHeader>
        <CardContent>
          {message.text && (
            <Alert className={`mb-4 ${message.type === "error" ? "border-red-500" : "border-green-500"}`}>
              {message.type === "error" ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <AlertDescription className={message.type === "error" ? "text-red-700" : "text-green-700"}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">Imię</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Wprowadź swoje imię"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nazwisko</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Wprowadź swoje nazwisko"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="wprowadz@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Wprowadź hasło"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? "Proszę czekać..."
                : isRegistering
                ? "Zarejestruj się"
                : "Zaloguj się"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isRegistering ? "Masz już konto?" : "Nie masz konta?"}
            </p>
            <Button
              variant="link"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setMessage({ type: "", text: "" });
                setFormData({
                  email: "",
                  password: "",
                  firstName: "",
                  lastName: "",
                });
              }}
              className="p-0 h-auto font-semibold"
            >
              {isRegistering ? "Zaloguj się" : "Zarejestruj się"}
            </Button>
          </div>

          {isRegistering && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-700 text-center">
                <strong>Informacja:</strong> Po rejestracji Twoje konto wymaga akceptacji przez administratora przed uzyskaniem dostępu do systemu.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}