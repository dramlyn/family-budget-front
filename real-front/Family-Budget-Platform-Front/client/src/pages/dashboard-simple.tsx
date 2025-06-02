import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-microservices-auth";
import { familyBudgetServiceApi, transactionServiceApi } from "@/lib/microservices-api";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Сначала получаем текущий период из API
  const { data: currentPeriod, isLoading: isPeriodLoading, error: periodError } = useQuery({
    queryKey: ["current-period"],
    queryFn: () => familyBudgetServiceApi.getBudgetPeriod(1), // используем ID 1 для текущего периода
  });

  // Запрос баланса пользователя (только после получения периода)
  const { data: userBudget, isLoading: isBudgetLoading, error: budgetError } = useQuery({
    queryKey: ["user-budget", currentPeriod?.id],
    queryFn: () => familyBudgetServiceApi.getUserBudget(currentPeriod!.id),
    enabled: !!user && !!currentPeriod?.id,
  });
  
  // Запрос транзакций по периоду (только после получения периода)
  const { data: transactions, isLoading: isTransactionsLoading, error: transactionsError } = useQuery({
    queryKey: ["transactions", currentPeriod?.id],
    queryFn: () => transactionServiceApi.getTransactionsByPeriod(currentPeriod!.id),
    enabled: !!currentPeriod?.id,
  });
  
  // Запрос категорий
  const { data: categories, isLoading: isCategoriesLoading, error: categoriesError } = useQuery({
    queryKey: ["categories"],
    queryFn: () => familyBudgetServiceApi.getAllCategories(),
  });
  
  const isLoading = isPeriodLoading || isBudgetLoading || isTransactionsLoading || isCategoriesLoading;
  const initials = user ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '') : 'ИП';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col">
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
      <div className="flex-1 flex flex-col overflow-hidden">
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
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Добро пожаловать, {user?.firstName || 'Пользователь'}!
              </h1>
              <p className="text-gray-600 mt-2">
                {currentPeriod ? (
                  <>Период: {currentPeriod.month}/{currentPeriod.year} (ID: {currentPeriod.id})</>
                ) : periodError ? (
                  <span className="text-red-600">Ошибка загрузки периода: {periodError.message}</span>
                ) : (
                  "Загрузка периода..."
                )}
              </p>
            </div>

            {isLoading && (
              <div className="text-center py-8">
                <div className="text-lg">Загрузка данных из микросервисов...</div>
              </div>
            )}

            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Баланс пользователя</CardTitle>
                  <CardDescription>Family Budget Service</CardDescription>
                </CardHeader>
                <CardContent>
                  {budgetError ? (
                    <div className="text-red-600">Ошибка загрузки: {budgetError.message}</div>
                  ) : userBudget ? (
                    <div className="text-2xl font-bold">{userBudget.balance || 0} ₽</div>
                  ) : (
                    <div className="text-gray-500">Нет данных</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Транзакции</CardTitle>
                  <CardDescription>Transaction Service</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionsError ? (
                    <div className="text-red-600">Ошибка загрузки: {transactionsError.message}</div>
                  ) : (
                    <div className="text-2xl font-bold">{transactions?.length || 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Категории</CardTitle>
                  <CardDescription>Family Budget Service</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoriesError ? (
                    <div className="text-red-600">Ошибка загрузки: {categoriesError.message}</div>
                  ) : (
                    <div className="text-2xl font-bold">{categories?.length || 0}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Подробные данные */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Данные бюджета */}
              <Card>
                <CardHeader>
                  <CardTitle>Данные бюджета</CardTitle>
                  <CardDescription>GET /v1/user-budget?periodId={currentPeriod?.id || 'loading'}</CardDescription>
                </CardHeader>
                <CardContent>
                  {budgetError ? (
                    <div className="text-red-600">
                      <div className="font-medium">Ошибка:</div>
                      <div className="text-sm">{budgetError.message}</div>
                    </div>
                  ) : userBudget ? (
                    <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto">
                      {JSON.stringify(userBudget, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-gray-500">Нет данных о бюджете</div>
                  )}
                </CardContent>
              </Card>

              {/* Категории */}
              <Card>
                <CardHeader>
                  <CardTitle>Категории</CardTitle>
                  <CardDescription>GET /v1/category</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoriesError ? (
                    <div className="text-red-600">
                      <div className="font-medium">Ошибка:</div>
                      <div className="text-sm">{categoriesError.message}</div>
                    </div>
                  ) : categories && categories.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {categories.map((category) => (
                        <div key={category.id} className="p-2 bg-gray-50 rounded">
                          <div className="font-medium">{category.name}</div>
                          {category.description && (
                            <div className="text-sm text-gray-600">{category.description}</div>
                          )}
                          <div className="text-xs text-gray-400">ID: {category.id}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500">Категории не найдены</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Транзакции */}
            <Card>
              <CardHeader>
                <CardTitle>Транзакции пользователя</CardTitle>
                <CardDescription>GET /v1/transaction/by-param?periodId={currentPeriod?.id || 'loading'}&userId={user?.id}</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsError ? (
                  <div className="text-red-600">
                    <div className="font-medium">Ошибка:</div>
                    <div className="text-sm">{transactionsError.message}</div>
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">
                            {transaction.type === 'INCOME' ? '📈 Доход' : '📉 Расход'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Категория ID: {transaction.categoryId} | Период: {transaction.periodId}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {transaction.id} | {transaction.createdAt}
                          </div>
                        </div>
                        <div className={`font-bold ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'INCOME' ? '+' : '-'}{transaction.amount} ₽
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">Транзакции не найдены</div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}