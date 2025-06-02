import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ProfilePage from "@/pages/profile-page";
import TransactionsPage from "@/pages/transactions-page";
import PaymentsPage from "@/pages/payments-page";
import FamilyPage from "@/pages/family-page";
import SavingsPage from "@/pages/savings-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "next-themes";

import { userRoles } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/transactions" component={TransactionsPage} />
      <ProtectedRoute path="/transactions/new" component={TransactionsPage} />
      <ProtectedRoute 
        path="/payments" 
        component={PaymentsPage} 
        requiredRole={userRoles.PARENT}
      />
      <ProtectedRoute path="/family" component={FamilyPage} />
      <ProtectedRoute path="/savings" component={SavingsPage} />
      <ProtectedRoute path="/reports" component={DashboardPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
