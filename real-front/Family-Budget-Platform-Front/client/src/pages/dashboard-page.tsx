import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-microservices-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CategoryBudgets } from "@/components/dashboard/category-budgets";
import { BudgetPlanningDialog } from "@/components/dashboard/budget-planning-dialog";
import { Menu, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown";
import { familyBudgetServiceApi, transactionServiceApi } from "@/lib/microservices-api";
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [budgetPlanningOpen, setBudgetPlanningOpen] = useState(false);
  
  // Получаем текущий период (год и месяц)
  const currentDate = new Date();
  const currentPeriodId = parseInt(`${currentDate.getFullYear()}${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`);
  
  // Запрос баланса пользователя
  const { data: userBudget, isLoading: isBudgetLoading } = useQuery({
    queryKey: ["user-budget", currentPeriodId],
    queryFn: () => familyBudgetServiceApi.getUserBudget(currentPeriodId),
    enabled: !!user,
  });
  
  // Запрос транзакций пользователя
  const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ["transactions", currentPeriodId, user?.id],
    queryFn: () => transactionServiceApi.getTransactionsByParams(currentPeriodId, user?.id),
    enabled: !!user?.id,
  });
  
  // Запрос категорий
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => familyBudgetServiceApi.getAllCategories(),
  });
  
  const isLoading = isBudgetLoading || isTransactionsLoading || isCategoriesLoading;
  
  const initials = user ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '') : 'ИП';
  
  // Проверяем, нужно ли показать диалог планирования бюджета
  useEffect(() => {
    // Показываем диалог планирования бюджета для родителей, если нет данных о бюджете
    if (!userBudget && user?.role === 'PARENT') {
      setBudgetPlanningOpen(true);
    }
  }, [userBudget, user]);
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar for desktop */}
      <Sidebar className="hidden lg:flex" user={user} initials={initials} />
      
      {/* Mobile menu */}
      <MobileMenu isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} initials={initials} />
      
      {/* Main content */}
      <div className="flex flex-col w-full overflow-hidden">
        {/* Mobile header */}
        <header className="bg-white shadow-sm lg:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Logo size={24} className="mr-2" />
                  <h1 className="text-xl font-bold text-primary">Семейный бюджет</h1>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <NotificationsDropdown />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarOpen(true)} 
                  aria-label="Открыть меню"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">Обзор бюджета</h1>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Budget summary cards */}
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <StatsCard 
                  title="Текущий баланс"
                  value={budgetSummary?.balance || 0}
                  icon="wallet"
                  linkText="Просмотреть историю"
                  linkHref="/transactions"
                  color="green"
                  isLoading={isLoading}
                />
                
                <StatsCard 
                  title="Расходы за месяц"
                  value={budgetSummary?.monthlyExpenses || 0}
                  icon="expenses"
                  linkText="Анализ расходов"
                  linkHref="/expenses"
                  color="red"
                  isLoading={isLoading}
                />
                
                <StatsCard 
                  title={`Цель: ${budgetSummary?.savingsGoal?.name || 'Накопления'}`}
                  value={budgetSummary?.savingsGoal?.target || 0}
                  progress={budgetSummary?.savingsGoal?.progress || 0}
                  currentValue={budgetSummary?.savingsGoal?.current || 0}
                  icon="goal"
                  linkText="Управление целью"
                  linkHref="/savings"
                  color="purple"
                  isLoading={isLoading}
                />
              </div>
              
              {/* Бюджеты по категориям */}
              <div className="mt-6">
                <CategoryBudgets 
                  categoryBudgets={budgetSummary?.categoryBudgets || []} 
                  currentPeriod={budgetSummary?.currentPeriod || 'Май 2025'} 
                  isLoading={isLoading} 
                />
              </div>
              
              {/* Charts and transactions */}
              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <SpendingChart categories={spendingCategories || []} isLoading={isLoading} />
                <RecentTransactions transactions={transactions || []} isLoading={isLoading} />
              </div>
              
              {/* Quick Actions */}
              <QuickActions />
              
              {/* Budget Planning Card */}
              {user?.role === 'PARENT' && (
                <div className="mt-6">
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Планирование семейного бюджета
                      </CardTitle>
                      <CardDescription className="text-blue-100">
                        Распределите бюджет семьи по категориям расходов
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Создайте план расходов на месяц для эффективного управления семейным бюджетом и достижения финансовых целей.
                      </p>
                      <Button 
                        onClick={() => setBudgetPlanningOpen(true)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        Спланировать бюджет
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      
      {/* Budget Planning Dialog */}
      <BudgetPlanningDialog 
        open={budgetPlanningOpen} 
        onOpenChange={setBudgetPlanningOpen} 
      />
    </div>
  );
}
