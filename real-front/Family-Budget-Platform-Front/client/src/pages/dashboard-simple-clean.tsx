import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-microservices-auth";
import { familyBudgetServiceApi, userServiceApi, transactionServiceApi } from "@/lib/microservices-api";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Menu, TrendingUp, CreditCard, Target, Calendar, Users, PiggyBank, AlertCircle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// Схема для планирования бюджета
const budgetPlanSchema = z.object({
  budgetLimit: z.number().min(1, "Общий бюджет должен быть больше 0"),
});

type BudgetPlanFormValues = z.infer<typeof budgetPlanSchema>;

export default function DashboardPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [memberLimits, setMemberLimits] = useState<{ [key: string]: number }>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const initials = user ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '') : 'ИП';

  // Получаем текущего пользователя для familyId
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => userServiceApi.getCurrentUser(),
  });

  // Проверяем существование плана бюджета
  const { data: budgetPlan, error: budgetPlanError } = useQuery({
    queryKey: ["budget-plan", currentUser?.familyId],
    queryFn: () => familyBudgetServiceApi.getFamilyBudgetPlan(currentUser!.familyId, 1), // periodId = 1 по умолчанию
    enabled: !!currentUser?.familyId,
    retry: false, // Не повторяем запрос при ошибке 404
  });

  // Получаем членов семьи для планирования
  const { data: familyMembers } = useQuery({
    queryKey: ["family-members", currentUser?.familyId],
    queryFn: () => userServiceApi.getFamilyMembers(currentUser!.familyId),
    enabled: !!currentUser?.familyId && planDialogOpen,
  });

  // Получаем категории
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => familyBudgetServiceApi.getAllCategories(),
    enabled: planDialogOpen,
  });

  // Получаем категории для отображения на главной странице
  const { data: allCategories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: () => familyBudgetServiceApi.getAllCategories(),
    enabled: !!currentUser?.familyId,
  });

  // Получаем данные по категориям для расчета баланса
  const { data: categoryBalances } = useQuery({
    queryKey: ["category-balances", currentUser?.id],
    queryFn: async () => {
      if (!allCategories || !currentUser?.id) return {};
      
      const currentPeriodId = 1; // Текущий период
      const balances: Record<number, { income: number; spend: number; budget: number; balance: number; transactions: any[] }> = {};
      
      for (const category of allCategories) {
        try {
          // Получаем транзакции по категории
          const transactions = await transactionServiceApi.getTransactionsByCategory(category.id, currentPeriodId);
          
          const income = transactions
            .filter((t: any) => t.type === 'INCOME')
            .reduce((sum: number, t: any) => sum + t.amount, 0);
          
          const spend = transactions
            .filter((t: any) => t.type === 'SPEND')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

          // Получаем лимит пользователя по категории
          let budget = 0;
          try {
            const userBudget = await familyBudgetServiceApi.getUserBudgetByCategory(currentPeriodId, category.id);
            budget = userBudget.budget || 0;
          } catch (budgetError) {
            budget = 0; // Если нет лимита, то 0
          }
          
          // Рассчитываем баланс: лимит + (доходы - расходы)
          const balance = budget + (income - spend);
          
          balances[category.id] = {
            income,
            spend,
            budget,
            balance,
            transactions
          };
        } catch (error) {
          balances[category.id] = {
            income: 0,
            spend: 0,
            budget: 0,
            balance: 0,
            transactions: []
          };
        }
      }
      
      return balances;
    },
    enabled: !!allCategories && !!currentUser?.id,
    retry: false,
  });

  // Проверяем, нужно ли показывать кнопку планирования (ошибка 404)
  const shouldShowPlanButton = budgetPlanError && budgetPlanError.message.includes('404');

  const budgetForm = useForm<BudgetPlanFormValues>({
    resolver: zodResolver(budgetPlanSchema),
    defaultValues: {
      budgetLimit: 0,
    },
  });

  // Мутация для создания плана бюджета
  const createBudgetPlanMutation = useMutation({
    mutationFn: async (data: BudgetPlanFormValues) => {
      if (!currentUser?.familyId) throw new Error("ID семьи не найден");
      
      // Создаем массив планов для членов семьи
      const familyMembersPlan: Array<{
        categoryId: number;
        userId: number;
        limit: number;
      }> = [];

      // Собираем все лимиты для каждого члена семьи и категории
      Object.entries(memberLimits).forEach(([key, limit]) => {
        if (limit > 0) {
          const [userId, categoryId] = key.split('-').map(Number);
          familyMembersPlan.push({
            categoryId,
            userId, // Используем userId из нового формата API
            limit: Math.round(limit), // Преобразуем в целое число
          });
        }
      });

      return familyBudgetServiceApi.createFamilyBudgetPlan({
        familyId: currentUser.familyId,
        budgetLimit: Math.round(data.budgetLimit), // Преобразуем в целое число
        familyMembersPlan,
      });
    },
    onSuccess: () => {
      toast({
        title: "План бюджета создан",
        description: "Семейный бюджет успешно распланирован",
      });
      queryClient.invalidateQueries({ queryKey: ["budget-plan"] });
      setPlanDialogOpen(false);
      budgetForm.reset();
      setMemberLimits({});
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка создания плана",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCreateBudgetPlan = async (values: BudgetPlanFormValues) => {
    // Проверяем, что общая сумма лимитов не превышает общий бюджет
    const totalLimits = Object.values(memberLimits).reduce((sum, limit) => sum + limit, 0);
    
    if (totalLimits > values.budgetLimit) {
      toast({
        title: "Ошибка планирования",
        description: `Общая сумма лимитов (${totalLimits}) превышает общий бюджет (${values.budgetLimit})`,
        variant: "destructive",
      });
      return;
    }

    createBudgetPlanMutation.mutate(values);
  };

  // Функция для обновления лимитов
  const updateMemberLimit = (userId: number, categoryId: number, limit: number) => {
    const key = `${userId}-${categoryId}`;
    setMemberLimits(prev => ({
      ...prev,
      [key]: limit || 0,
    }));
  };

  // Подсчитываем общую сумму лимитов
  const totalAllocated = Object.values(memberLimits).reduce((sum, limit) => sum + limit, 0);
  const budgetLimit = budgetForm.watch("budgetLimit") || 0;
  const remainingBudget = budgetLimit - totalAllocated;

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
            {/* Welcome header */}
            <div className="mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Добро пожаловать, {user?.firstName || 'Пользователь'}!
                  </h1>
                  <p className="text-gray-600">
                    Управляйте семейным бюджетом эффективно и легко
                  </p>
                </div>
                
                {/* Кнопка планирования бюджета, если план не найден */}
                {shouldShowPlanButton && (
                  <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Распланировать бюджет</span>
                      </Button>
                    </DialogTrigger>
                    
                    {/* Диалог планирования бюджета */}
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Планирование семейного бюджета</DialogTitle>
                        <DialogDescription>
                          Распределите общий бюджет между членами семьи по категориям расходов
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...budgetForm}>
                        <form onSubmit={budgetForm.handleSubmit(onCreateBudgetPlan)} className="space-y-6">
                          {/* Общий бюджет */}
                          <FormField
                            control={budgetForm.control}
                            name="budgetLimit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Общий бюджет семьи на месяц</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="1"
                                    min="0"
                                    placeholder="10000" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Индикатор распределения бюджета */}
                          {budgetLimit > 0 && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">Распределение бюджета:</span>
                                <span className={`text-sm font-medium ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  Остаток: {Math.round(remainingBudget)} ₽
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                Распределено: {Math.round(totalAllocated)} ₽ из {Math.round(budgetLimit)} ₽
                              </div>
                            </div>
                          )}

                          {/* Планирование по членам семьи и категориям */}
                          {familyMembers && categories && budgetLimit > 0 && (
                            <div className="space-y-6">
                              <h3 className="text-lg font-semibold">Распределение по членам семьи</h3>
                              
                              {familyMembers.map((member: any) => (
                                <Card key={member.userId || `${member.firstName}-${member.lastName}`}>
                                  <CardHeader>
                                    <CardTitle className="text-base">
                                      {member.firstName} {member.lastName}
                                      <span className="ml-2 text-sm font-normal text-gray-500">
                                        ({member.role === 'PARENT' ? 'Родитель' : 'Пользователь'})
                                      </span>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {categories.map((category: any) => {
                                        const key = `${member.userId}-${category.id}`;
                                        const currentLimit = memberLimits[key] || 0;
                                        
                                        return (
                                          <div key={category.id} className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">
                                              {category.name}
                                            </label>
                                            <Input
                                              type="number"
                                              step="1"
                                              min="0"
                                              placeholder="0"
                                              value={currentLimit || ''}
                                              onChange={(e) => {
                                                const value = parseInt(e.target.value) || 0;
                                                updateMemberLimit(member.userId, category.id, value);
                                              }}
                                              className="w-full"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(false)}>
                              Отмена
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createBudgetPlanMutation.isPending || remainingBudget < 0}
                            >
                              {createBudgetPlanMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Создать план бюджета
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Анализ по категориям */}
              {allCategories && categoryBalances && (
                <div className="mt-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Анализ по категориям</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allCategories.map((category: any) => {
                      const balance = categoryBalances[category.id] || { income: 0, spend: 0, budget: 0, balance: 0 };
                      const currentBalance = balance.balance;
                      const isPositive = currentBalance >= 0;
                      
                      return (
                        <Card key={category.id} className="p-6">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-semibold">
                              {category.name}
                            </CardTitle>
                            {category.description && (
                              <p className="text-sm text-gray-600">{category.description}</p>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Лимит по категории */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Лимит:</span>
                              <span className="text-sm font-medium text-blue-600">
                                {balance.budget.toLocaleString('ru-RU')} ₽
                              </span>
                            </div>
                            
                            {/* Доходы */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Доходы:</span>
                              <span className="text-sm font-medium text-green-600">
                                +{balance.income.toLocaleString('ru-RU')} ₽
                              </span>
                            </div>
                            
                            {/* Расходы */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Расходы:</span>
                              <span className="text-sm font-medium text-red-600">
                                -{balance.spend.toLocaleString('ru-RU')} ₽
                              </span>
                            </div>
                            
                            {/* Текущий баланс */}
                            <div className="pt-2 border-t">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">Текущий баланс:</span>
                                <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                  {isPositive ? '+' : ''}{currentBalance.toLocaleString('ru-RU')} ₽
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {balance.budget} + ({balance.income} - {balance.spend}) = {currentBalance}
                              </div>
                            </div>
                            
                            {/* Количество транзакций */}
                            <div className="text-xs text-gray-500 text-center">
                              Транзакций: {balance.transactions?.length || 0}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Уведомление о необходимости планирования */}
              {shouldShowPlanButton && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Семейный бюджет еще не распланирован. Нажмите кнопку "Распланировать бюджет" для создания плана расходов.
                  </AlertDescription>
                </Alert>
              )}
            </div>





            {/* Quick actions */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Быстрые действия</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => window.location.href = '/transactions'}
                >
                  <TrendingUp className="h-6 w-6" />
                  <span className="text-sm">Транзакции</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => window.location.href = '/savings'}
                >
                  <Target className="h-6 w-6" />
                  <span className="text-sm">Цели</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => window.location.href = '/payments'}
                >
                  <CreditCard className="h-6 w-6" />
                  <span className="text-sm">Платежи</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => window.location.href = '/family'}
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Семья</span>
                </Button>
              </div>
            </div>


          </div>
        </main>
      </div>
    </div>
  );
}