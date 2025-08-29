import { useAuth } from "@/hooks/useAuth";
import { Switch, Route } from "wouter";
import Landing from "./landing";
import Dashboard from "./dashboard";
import Equipment from "./equipment";
import Quotes from "./quotes";
import QuoteDetail from "./quote-detail";
import CreateQuote from "./create-quote";
import EditQuote from "./edit-quote";
import Admin from "./admin";
import AdminNeedsAssessment from "./admin-needs-assessment";
import AdminApiKeys from "./admin-api-keys";
import AdminTransport from "./admin-transport";
import AdminElectrical from "./admin-electrical";
import AdminGeneral from "./admin-general";
import CreateTransportQuote from "./create-transport-quote";
import CreateElectricalQuote from "./create-electrical-quote";
import CreateGeneralQuote from "./create-general-quote";
import ElectricalQuotes from "./electrical-quotes";
import GeneralQuotes from "./general-quotes";
import TransportQuotes from "./transport-quotes";
import GeneralQuoteDetails from "./general-quote-details";
import EditGeneralQuote from "./edit-general-quote";
import NeedsAssessment from "./needs-assessment";
import NeedsAssessmentList from "./needs-assessment-list";
import NeedsAssessmentPrint from "./needs-assessment-print";
import Profile from "./profile";
import Settings from "./settings";
import NotFound from "./not-found";
import PendingApproval from "./pending-approval";
import Navbar from "@/components/navbar";

export default function EmployeePortal() {
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Landing />
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

  // Zalogowany użytkownik - przekieruj do głównego dashboard
  window.location.href = "/dashboard";
  return null;
}