import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import MainLanding from "@/pages/main-landing";
import EmployeePortal from "@/pages/employee-portal";
import ClientPortal from "@/pages/client-portal";
import ClientQuestions from "@/pages/client-questions";
import ClientCatalog from "@/pages/client-catalog";
import ClientSales from "@/pages/client-sales";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Equipment from "@/pages/equipment";
import Quotes from "@/pages/quotes";
import QuoteDetail from "@/pages/quote-detail";
import CreateQuote from "@/pages/create-quote";
import EditQuote from "@/pages/edit-quote";
import Admin from "@/pages/admin";
import AdminNeedsAssessment from "@/pages/admin-needs-assessment";
import AdminApiKeys from "@/pages/admin-api-keys";
import AdminTransport from "@/pages/admin-transport";
import AdminElectrical from "@/pages/admin-electrical";
import AdminGeneral from "@/pages/admin-general";
import AdminPublic from "@/pages/admin-public";
import CreateTransportQuote from "@/pages/create-transport-quote";
import CreateElectricalQuote from "@/pages/create-electrical-quote";
import CreateGeneralQuote from "@/pages/create-general-quote";
import CreatePublicQuote from "@/pages/create-public-quote";
import PublicQuotePrint from "@/pages/public-quote-print";
import PublicQuoteDetail from "@/pages/public-quote-detail";
import EditPublicQuote from "@/pages/edit-public-quote";
import ElectricalQuotes from "@/pages/electrical-quotes";
import GeneralQuotes from "@/pages/general-quotes";
import PublicQuotes from "@/pages/public-quotes";
import TransportQuotes from "@/pages/transport-quotes";
import GeneralQuoteDetails from "@/pages/general-quote-details";
import EditGeneralQuote from "@/pages/edit-general-quote";
import NeedsAssessment from "@/pages/needs-assessment";
import NeedsAssessmentList from "@/pages/needs-assessment-list";
import NeedsAssessmentPrint from "@/pages/needs-assessment-print";
import ClientAssessments from "@/pages/client-assessments";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import GuestQuote from "@/pages/guest-quote";
import PendingApproval from "@/pages/pending-approval";
import Shop from "@/pages/shop";
import ShopAdmin from "@/pages/shop-admin";
import Navbar from "@/components/navbar";
import NotificationPopup from "@/components/NotificationPopup";

function Router() {
  const { isAuthenticated, isLoading, user, needsApproval } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Niezalogowani użytkownicy - tylko główna strona + portale  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/" component={MainLanding} />
          <Route path="/client-portal" component={ClientPortal} />
          <Route path="/client-questions" component={ClientQuestions} />
          <Route path="/client-catalog" component={ClientCatalog} />
          <Route path="/client-sales" component={ClientSales} />
          <Route path="/employee-portal" component={Landing} />
          <Route path="/login" component={Login} />
          <Route component={NotFound} />
        </Switch>
      </div>
    );
  }

  // Check if user needs approval (authenticated but not approved)
  if (user && !(user as any).isApproved) {
    return (
      <div className="min-h-screen bg-background">
        <PendingApproval />
      </div>
    );
  }

  // Zalogowani użytkownicy - pełny system z navbar
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        {/* Główna strona z kafelkami - bez navbar */}
        <Route path="/" component={MainLanding} />
        
        {/* Client portal routes - bez navbar */}
        <Route path="/client-portal" component={ClientPortal} />
        <Route path="/client-questions" component={ClientQuestions} />
        <Route path="/client-catalog" component={ClientCatalog} />
        <Route path="/client-sales" component={ClientSales} />
        
        {/* Employee portal - przekierowanie do dashboard */}
        <Route path="/employee-portal">
          {() => {
            window.location.href = "/dashboard";
            return null;
          }}
        </Route>
        
        {/* Admin system routes - z navbar */}
        <Route path="/dashboard">
          {() => (
            <div>
              <Navbar />
              <Dashboard />
            </div>
          )}
        </Route>
        <Route path="/equipment">
          {() => (
            <div>
              <Navbar />
              <Equipment />
            </div>
          )}
        </Route>
        <Route path="/quotes">
          {() => (
            <div>
              <Navbar />
              <Quotes />
            </div>
          )}
        </Route>
        <Route path="/quotes/:id">
          {() => (
            <div>
              <Navbar />
              <QuoteDetail />
            </div>
          )}
        </Route>
        <Route path="/quotes/:id/edit">
          {() => (
            <div>
              <Navbar />
              <EditQuote />
            </div>
          )}
        </Route>
        <Route path="/create-quote">
          {() => (
            <div>
              <Navbar />
              <CreateQuote />
            </div>
          )}
        </Route>
        <Route path="/create-transport-quote">
          {() => (
            <div>
              <Navbar />
              <CreateTransportQuote />
            </div>
          )}
        </Route>
        <Route path="/create-electrical-quote">
          {() => (
            <div>
              <Navbar />
              <CreateElectricalQuote />
            </div>
          )}
        </Route>
        <Route path="/electrical-quotes">
          {() => (
            <div>
              <Navbar />
              <ElectricalQuotes />
            </div>
          )}
        </Route>
        <Route path="/electrical-quotes/:id">
          {(params) => (
            <div>
              <Navbar />
              <div>Szczegóły wyceny elektrycznej {params.id} - w budowie</div>
            </div>
          )}
        </Route>
        <Route path="/create-general-quote">
          {() => (
            <div>
              <Navbar />
              <CreateGeneralQuote />
            </div>
          )}
        </Route>
        <Route path="/create-public-quote">
          {() => (
            <div>
              <Navbar />
              <CreatePublicQuote />
            </div>
          )}
        </Route>
        <Route path="/public-quotes/:id/edit">
          {() => (
            <div>
              <Navbar />
              <EditPublicQuote />
            </div>
          )}
        </Route>
        <Route path="/public-quotes/:id">
          {() => (
            <div>
              <Navbar />
              <PublicQuoteDetail />
            </div>
          )}
        </Route>
        <Route path="/general-quotes">
          {() => (
            <div>
              <Navbar />
              <GeneralQuotes />
            </div>
          )}
        </Route>
        <Route path="/public-quotes">
          {() => (
            <div>
              <Navbar />
              <PublicQuotes />
            </div>
          )}
        </Route>
        <Route path="/general-quotes/:id">
          {() => (
            <div>
              <Navbar />
              <GeneralQuoteDetails />
            </div>
          )}
        </Route>
        <Route path="/general-quotes/:id/edit">
          {() => (
            <div>
              <Navbar />
              <EditGeneralQuote />
            </div>
          )}
        </Route>
        <Route path="/transport-quotes">
          {() => (
            <div>
              <Navbar />
              <TransportQuotes />
            </div>
          )}
        </Route>
        <Route path="/transport-quotes/:id">
          {(params) => (
            <div>
              <Navbar />
              <div>Szczegóły wyceny transportu {params.id} - w budowie</div>
            </div>
          )}
        </Route>
        <Route path="/needs-assessment">
          {() => (
            <div>
              <Navbar />
              <NeedsAssessment />
            </div>
          )}
        </Route>
        <Route path="/needs-assessment-list">
          {() => (
            <div>
              <Navbar />
              <NeedsAssessmentList />
            </div>
          )}
        </Route>
        <Route path="/client-assessments">
          {() => (
            <div>
              <Navbar />
              <ClientAssessments />
            </div>
          )}
        </Route>
        <Route path="/needs-assessment/:id">
          {(params) => (
            <div>
              <Navbar />
              <NeedsAssessmentPrint id={params.id} />
            </div>
          )}
        </Route>
        <Route path="/needs-assessment/:id/print">
          {(params) => (
            <div>
              <Navbar />
              <NeedsAssessmentPrint id={params.id} />
            </div>
          )}
        </Route>
        <Route path="/admin">
          {() => (
            <div>
              <Navbar />
              <Admin />
            </div>
          )}
        </Route>
        <Route path="/admin/transport">
          {() => (
            <div>
              <Navbar />
              <AdminTransport />
            </div>
          )}
        </Route>
        <Route path="/admin/electrical">
          {() => (
            <div>
              <Navbar />
              <AdminElectrical />
            </div>
          )}
        </Route>
        <Route path="/admin/general">
          {() => (
            <div>
              <Navbar />
              <AdminGeneral />
            </div>
          )}
        </Route>
        <Route path="/admin/public">
          {() => (
            <div>
              <Navbar />
              <AdminPublic />
            </div>
          )}
        </Route>
        <Route path="/public-quotes/:id/print">
          {(params) => (
            <div>
              <Navbar />
              <PublicQuotePrint id={params.id} />
            </div>
          )}
        </Route>
        <Route path="/admin/needs-assessment">
          {() => (
            <div>
              <Navbar />
              <AdminNeedsAssessment />
            </div>
          )}
        </Route>
        <Route path="/admin/api-keys">
          {() => (
            <div>
              <Navbar />
              <AdminApiKeys />
            </div>
          )}
        </Route>
        <Route path="/profile">
          {() => (
            <div>
              <Navbar />
              <Profile />
            </div>
          )}
        </Route>
        <Route path="/settings">
          {() => (
            <div>
              <Navbar />
              <Settings />
            </div>
          )}
        </Route>
        <Route path="/shop">
          {() => (
            <div>
              <Navbar />
              <Shop />
            </div>
          )}
        </Route>
        <Route path="/shop-admin">
          {() => (
            <div>
              <Navbar />
              <ShopAdmin />
            </div>
          )}
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="sebastian-popiel-ui-theme">
        <TooltipProvider>
          <Toaster />
          <NotificationPopup />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
