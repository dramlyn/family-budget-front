import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-microservices-auth";
import { familyBudgetServiceApi, transactionServiceApi } from "@/lib/microservices-api";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Menu, TrendingUp, CreditCard, Target, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Сначала получаем текущий период из API
  const { data: currentPeriod, isLoading: isPeriodLoading } = useQuery({
    queryKey: ["current-period"],
    queryFn: () => familyBudgetServiceApi.getBudgetPeriod(1),
  });

  // Запрос баланса пользователя
  const { data: userBudget, isLoading: isBudgetLoading } = useQuery({
    queryKey: ["user-budget", currentPeriod?.id],
    queryFn: () => familyBudgetServiceApi.getUserBudget(currentPeriod!.id),
    enabled: !!user && !!currentPeriod?.id,
  });
  
  // Запрос транзакций по периоду
  const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ["transactions", currentPeriod?.id],
    queryFn: () => transactionServiceApi.getTransactionsByPeriod(currentPeriod!.id),
    enabled: !!currentPeriod?.id,
  });
  
  // Запрос категорий
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => familyBudgetServiceApi.getAllCategories(),
  });
  
  const isLoading = isPeriodLoading || isBudgetLoading || isTransactionsLoading || isCategoriesLoading;
  const initials = user ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '') : 'ИП';

  // Подсчитываем статистику
  const incomeTransactions = transactions?.filter(t => t.type === 'INCOME') || [];
  const expenseTransactions = transactions?.filter(t => t.type === 'SPEND') || [];
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50">
        <Sidebar user={user} />
      </div>

      {/* Mobile menu */}
      <MobileMenu 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        user={user}
        initials={initials}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Logo />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            {/* Welcome section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Добро пожаловать, {user?.firstName || 'Пользователь'}!
              </h1>
              <div className="flex items-center mt-2 text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                {currentPeriod ? (
                  <span>
                    {currentPeriod.month}/{currentPeriod.year} • Период ID: {currentPeriod.id}
                  </span>
                ) : (
                  "Загрузка периода..."
                )}
              </div>
            </div>

            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Загрузка данных из микросервисов...</div>
              </div>
            )}

            {/* Основная статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Баланс пользователя
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {userBudget ? `${userBudget.budget || 0} ₽` : "0 ₽"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Family Budget Service
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Доходы
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    +{totalIncome} ₽
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {incomeTransactions.length} операций
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Расходы
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    -{totalExpense} ₽
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {expenseTransactions.length} операций
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Категории
                  </CardTitle>
                  <Target className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {categories?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Доступно категорий
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Подробная информация */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Категории */}
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2 text-purple-600" />
                    Категории расходов
                  </CardTitle>
                  <CardDescription>GET /v1/category</CardDescription>
                </CardHeader>
                <CardContent>
                  {categories && categories.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {categories.map((category) => (
                        <div key={category.id} className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
                          <div className="font-semibold text-gray-800">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-gray-600 mt-1">{category.description}</div>
                          )}
                          <div className="text-xs text-purple-600 mt-1">ID: {category.id}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <div>Категории не найдены</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Данные бюджета */}
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Детали бюджета
                  </CardTitle>
                  <CardDescription>GET /v1/user-budget?periodId={currentPeriod?.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  {userBudget ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                        <div className="text-sm text-green-700">User ID: {userBudget.userId}</div>
                        <div className="text-sm text-green-700">Period ID: {userBudget.periodId}</div>
                        <div className="text-2xl font-bold text-green-800 mt-2">
                          {userBudget.budget} ₽
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <div>Нет данных о бюджете</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Транзакции */}
            <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                  Транзакции за период
                </CardTitle>
                <CardDescription>GET /v1/transaction?periodId={currentPeriod?.id}</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions && transactions.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {transactions.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-blue-50">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${transaction.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {transaction.type === 'INCOME' ? '📈' : '📉'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {transaction.type === 'INCOME' ? 'Доход' : 'Расход'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Категория: {transaction.categoryId} • Пользователь: {transaction.userId}
                            </div>
                            <div className="text-xs text-gray-400">
                              ID: {transaction.id} • {transaction.createdAt}
                            </div>
                          </div>
                        </div>
                        <div className={`text-xl font-bold ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'INCOME' ? '+' : '-'}{transaction.amount} ₽
                        </div>
                      </div>
                    ))}
                    {transactions.length > 10 && (
                      <div className="text-center py-3 text-gray-500">
                        И еще {transactions.length - 10} транзакций...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <div className="text-lg font-medium">Нет транзакций</div>
                    <div className="text-sm">За этот период транзакции не найдены</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}