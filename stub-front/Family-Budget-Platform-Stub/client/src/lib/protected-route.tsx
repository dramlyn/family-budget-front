import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Redirect, Route } from "wouter";
import { userRoles } from "@shared/schema";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: string;
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Проверяем роль, если требуется
  if (requiredRole && user.role !== requiredRole) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещен</h1>
          <p className="text-gray-600 text-center mb-4 max-w-md">
            У вас нет необходимых прав для доступа к этой странице. 
            {requiredRole === userRoles.PARENT && 
              "Эта страница доступна только для родителей."}
          </p>
          <a href="/" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">
            Вернуться на главную
          </a>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
