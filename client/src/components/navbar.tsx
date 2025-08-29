import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  Settings, 
  BarChart3, 
  Wrench, 
  FileText, 
  Plus, 
  LogOut,
  User,
  Bell,
  ClipboardList,
  ChevronDown,
  Truck,
  Zap,
  Drill,
  Package,
  Store,
  ShoppingCart
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  
  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <div className="font-bold text-xl text-primary">PPP :: Program</div>
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              {/* Katalog Sprzętu Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActive("/equipment") || isActive("/admin/electrical") || isActive("/admin/general") ? "default" : "ghost"}
                    className={`flex items-center space-x-2 ${
                      isActive("/equipment") || isActive("/admin/electrical") || isActive("/admin/general")
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>KATALOG</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/equipment" className="cursor-pointer">
                      <Drill className="w-4 h-4 mr-2" />
                      Sprzęt główny
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/electrical" className="cursor-pointer">
                      <Zap className="w-4 h-4 mr-2" />
                      Katalog sprzętu elektrycznego
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/general" className="cursor-pointer">
                      <Package className="w-4 h-4 mr-2" />
                      Katalog wynajmu ogólnego
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Badania Potrzeb Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActive("/needs-assessment") ? "default" : "ghost"}
                    className={`flex items-center space-x-2 ${
                      isActive("/needs-assessment")
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>BADANIA</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/needs-assessment" className="cursor-pointer">
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Nowe Badanie
                    </Link>
                  </DropdownMenuItem>
                  {isAuthenticated && (
                    (user as any)?.role === 'admin' || 
                    (user as any)?.role === 'electrical_manager' || 
                    (user as any)?.role === 'transport_manager' || 
                    (user as any)?.role === 'general_manager'
                  ) && (
                    <DropdownMenuItem asChild>
                      <Link href="/needs-assessment-list" className="cursor-pointer">
                        <FileText className="w-4 h-4 mr-2" />
                        Zapisane Badania
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Badania Klienta - prosty link */}
              {isAuthenticated && (
                <Link href="/client-assessments">
                  <Button
                    variant={isActive("/client-assessments") ? "default" : "ghost"}
                    className={`flex items-center space-x-2 ${
                      isActive("/client-assessments")
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>PYTANIA KLIENTA</span>
                  </Button>
                </Link>
              )}

              {/* Wyceny Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActive("/create-quote") || isActive("/quotes") || isActive("/create-transport-quote") || isActive("/transport-quotes") || isActive("/create-electrical-quote") || isActive("/electrical-quotes") ? "default" : "ghost"}
                    className={`flex items-center space-x-2 ${
                      isActive("/create-quote") || isActive("/quotes") || isActive("/create-transport-quote") || isActive("/transport-quotes") || isActive("/create-electrical-quote") || isActive("/electrical-quotes")
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>OFERTY</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/create-quote" className="cursor-pointer">
                      <Drill className="w-4 h-4 mr-2" />
                      Nowa wycena sprzętu
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/create-transport-quote" className="cursor-pointer">
                      <Truck className="w-4 h-4 mr-2" />
                      Nowa wycena transportu
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/create-electrical-quote" className="cursor-pointer">
                      <Zap className="w-4 h-4 mr-2" />
                      Nowa wycena elektryki
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/create-general-quote" className="cursor-pointer">
                      <Package className="w-4 h-4 mr-2" />
                      Nowa wycena wynajmu ogólnego
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/create-public-quote" className="cursor-pointer">
                      <Store className="w-4 h-4 mr-2" />
                      Nowa wycena publiczna
                    </Link>
                  </DropdownMenuItem>
                  {isAuthenticated && (
                    (user as any)?.role === 'admin' || 
                    (user as any)?.role === 'general_manager' || 
                    (user as any)?.role === 'transport_manager' || 
                    (user as any)?.role === 'electrical_manager'
                  ) && (
                    <>
                      <DropdownMenuSeparator />
                      {/* Main equipment quotes - admin and general manager */}
                      {((user as any)?.role === 'admin' || (user as any)?.role === 'general_manager') && (
                        <DropdownMenuItem asChild>
                          <Link href="/quotes" className="cursor-pointer">
                            <Drill className="w-4 h-4 mr-2" />
                            Zapisane wyceny sprzętu
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {/* Transport quotes - admin and transport manager */}
                      {((user as any)?.role === 'admin' || (user as any)?.role === 'transport_manager') && (
                        <DropdownMenuItem asChild>
                          <Link href="/transport-quotes" className="cursor-pointer">
                            <Truck className="w-4 h-4 mr-2" />
                            Zapisane Wyceny Transportu
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {/* Electrical quotes - admin and electrical manager */}
                      {((user as any)?.role === 'admin' || (user as any)?.role === 'electrical_manager') && (
                        <DropdownMenuItem asChild>
                          <Link href="/electrical-quotes" className="cursor-pointer">
                            <Zap className="w-4 h-4 mr-2" />
                            Zapisane Wyceny Elektryki
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {/* General quotes - admin and general manager */}
                      {((user as any)?.role === 'admin' || (user as any)?.role === 'general_manager') && (
                        <DropdownMenuItem asChild>
                          <Link href="/general-quotes" className="cursor-pointer">
                            <Package className="w-4 h-4 mr-2" />
                            Zapisane Wyceny Wynajmu Ogólnego
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {/* Public quotes - admin and public manager */}
                      {((user as any)?.role === 'admin' || (user as any)?.role === 'public_manager') && (
                        <DropdownMenuItem asChild>
                          <Link href="/public-quotes" className="cursor-pointer">
                            <Store className="w-4 h-4 mr-2" />
                            Zapisane Wyceny Publiczne
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Shop Menu - dla adminów i kierowników sklepu */}
              {isAuthenticated && ((user as any)?.role === 'admin' || (user as any)?.role === 'shop_manager') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isActive("/shop") || isActive("/shop-admin") ? "default" : "ghost"}
                      className={`flex items-center space-x-2 ${
                        isActive("/shop") || isActive("/shop-admin")
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>SKLEP</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/shop" className="cursor-pointer">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Podgląd Sklepu
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/shop-admin" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Zarządzanie Sklepem
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Department Manager Menu - Shop */}
              {isAuthenticated && (user as any)?.role === 'shop_manager' && (
                <Button
                  variant={isActive("/shop-admin") ? "default" : "ghost"}
                  className={`flex items-center space-x-2 ${
                    isActive("/shop-admin")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-primary"
                  }`}
                  asChild
                >
                  <Link href="/shop-admin">
                    <ShoppingCart className="w-4 h-4" />
                    <span>ADMINISTRACJA SKLEPU</span>
                  </Link>
                </Button>
              )}

              {/* Department Manager Menu - Electrical */}
              {isAuthenticated && (user as any)?.role === 'electrical_manager' && (
                <Button
                  variant={isActive("/admin/electrical") ? "default" : "ghost"}
                  className={`flex items-center space-x-2 ${
                    isActive("/admin/electrical")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-primary"
                  }`}
                  asChild
                >
                  <Link href="/admin/electrical">
                    <Zap className="w-4 h-4" />
                    <span>ADMINISTRACJA ELEKTRYKI</span>
                  </Link>
                </Button>
              )}

              {/* Department Manager Menu - Transport */}
              {isAuthenticated && (user as any)?.role === 'transport_manager' && (
                <Button
                  variant={isActive("/admin/transport") ? "default" : "ghost"}
                  className={`flex items-center space-x-2 ${
                    isActive("/admin/transport")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-primary"
                  }`}
                  asChild
                >
                  <Link href="/admin/transport">
                    <Truck className="w-4 h-4" />
                    <span>ADMINISTRACJA TRANSPORTU</span>
                  </Link>
                </Button>
              )}

              {/* Department Manager Menu - General */}
              {isAuthenticated && (user as any)?.role === 'general_manager' && (
                <Button
                  variant={isActive("/admin/general") ? "default" : "ghost"}
                  className={`flex items-center space-x-2 ${
                    isActive("/admin/general")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-primary"
                  }`}
                  asChild
                >
                  <Link href="/admin/general">
                    <Package className="w-4 h-4" />
                    <span>ADMINISTRACJA WYNAJMU</span>
                  </Link>
                </Button>
              )}

              {/* Department Manager Menu - Public */}
              {isAuthenticated && (user as any)?.role === 'public_manager' && (
                <Button
                  variant={isActive("/admin/public") ? "default" : "ghost"}
                  className={`flex items-center space-x-2 ${
                    isActive("/admin/public")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-primary"
                  }`}
                  asChild
                >
                  <Link href="/admin/public">
                    <Store className="w-4 h-4" />
                    <span>ADMINISTRACJA WYNAJMU PUBLICZNEGO</span>
                  </Link>
                </Button>
              )}

              {/* Full Admin Menu - only for administrators */}
              {isAuthenticated && (user as any)?.role === 'admin' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isActive("/admin") || isActive("/admin/electrical") || isActive("/admin/general") || isActive("/admin/transport") ? "default" : "ghost"}
                      className={`flex items-center space-x-2 ${
                        isActive("/admin") || isActive("/admin/electrical") || isActive("/admin/general") || isActive("/admin/transport")
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>ADMIN</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Panel administracyjny
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin/electrical" className="cursor-pointer">
                        <Zap className="w-4 h-4 mr-2" />
                        Administracja elektryki
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/general" className="cursor-pointer">
                        <Package className="w-4 h-4 mr-2" />
                        Administracja wynajmu ogólnego
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/transport" className="cursor-pointer">
                        <Truck className="w-4 h-4 mr-2" />
                        Administracja transportem
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/public" className="cursor-pointer">
                        <Store className="w-4 h-4 mr-2" />
                        Administracja wynajmu publicznego
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Department Manager Links - direct access to their department only */}
              {isAuthenticated && (user as any)?.role === 'electrical_manager' && (
                <Button
                  asChild
                  variant={isActive("/admin/electrical") ? "default" : "ghost"}
                  className={`${
                    isActive("/admin/electrical")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Link href="/admin/electrical">
                    <Zap className="w-4 h-4 mr-2" />
                    ADMINISTRACJA ELEKTRYKI
                  </Link>
                </Button>
              )}

              {isAuthenticated && (user as any)?.role === 'transport_manager' && (
                <Button
                  asChild
                  variant={isActive("/admin/transport") ? "default" : "ghost"}
                  className={`${
                    isActive("/admin/transport")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Link href="/admin/transport">
                    <Truck className="w-4 h-4 mr-2" />
                    ADMINISTRACJA TRANSPORTU
                  </Link>
                </Button>
              )}

              {isAuthenticated && (user as any)?.role === 'general_manager' && (
                <Button
                  asChild
                  variant={isActive("/admin/general") ? "default" : "ghost"}
                  className={`${
                    isActive("/admin/general")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Link href="/admin/general">
                    <Package className="w-4 h-4 mr-2" />
                    ADMINISTRACJA WYNAJMU OGÓLNEGO
                  </Link>
                </Button>
              )}

              {isAuthenticated && (user as any)?.role === 'public_manager' && (
                <Button
                  asChild
                  variant={isActive("/admin/public") ? "default" : "ghost"}
                  className={`${
                    isActive("/admin/public")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Link href="/admin/public">
                    <Store className="w-4 h-4 mr-2" />
                    ADMINISTRACJA WYNAJMU PUBLICZNEGO
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Bell className="w-5 h-5" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 h-10">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={(user as any)?.profileImageUrl || undefined} />
                        <AvatarFallback className="bg-primary text-white">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {(user as any)?.firstName && (user as any)?.lastName 
                          ? `${(user as any).firstName} ${(user as any).lastName}`
                          : (user as any)?.email?.split('@')[0] || 'Użytkownik'
                        }
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Profil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Ustawienia
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Wyloguj
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild>
                <Link href="/login">Zaloguj się</Link>
              </Button>
            )}
          </div>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Badania Potrzeb Mobile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isActive("/needs-assessment") ? "default" : "ghost"}
                  size="sm"
                  className={`flex items-center space-x-1 whitespace-nowrap ${
                    isActive("/needs-assessment")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground"
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span className="text-xs">BADANIA</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/needs-assessment" className="cursor-pointer">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Nowe Badanie
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/needs-assessment-list" className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Zapisane Badania
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Wyceny Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isActive("/create-quote") || isActive("/quotes") || isActive("/create-transport-quote") || isActive("/transport-quotes") ? "default" : "ghost"}
                  size="sm"
                  className={`flex items-center space-x-1 whitespace-nowrap ${
                    isActive("/create-quote") || isActive("/quotes") || isActive("/create-transport-quote") || isActive("/transport-quotes")
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-xs">OFERTY</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/create-quote" className="cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />
                    Nowa wycena sprzętu
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/create-transport-quote" className="cursor-pointer">
                    <Truck className="w-4 h-4 mr-2" />
                    Nowa wycena transportu
                  </Link>
                </DropdownMenuItem>
                {isAuthenticated && (user as any)?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/quotes" className="cursor-pointer">
                        <FileText className="w-4 h-4 mr-2" />
                        Zapisane Wyceny Sprzętu
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/transport-quotes" className="cursor-pointer">
                        <Truck className="w-4 h-4 mr-2" />
                        Zapisane Wyceny Transportu
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}