import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-microservices-auth";
import { transactionServiceApi, familyBudgetServiceApi, userServiceApi } from "@/lib/microservices-api";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Menu, 
  CreditCard, 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Loader2,
  Calendar
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/layout/logo";
import { useToast } from "@/hooks/use-toast";

// Схема для добавления транзакции
const addTransactionSchema = z.object({
  type: z.enum(["SPEND", "INCOME"], { required_error: "Выберите тип транзакции" }),
  amount: z.number().min(0.01, "Сумма должна быть больше 0"),
  categoryId: z.number().min(1, "Выберите категорию"),
});

type AddTransactionFormValues = z.infer<typeof addTransactionSchema>;

export default function TransactionsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const initials = user 
    ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '')
    : 'ИП';

  const addTransactionForm = useForm<AddTransactionFormValues>({
    resolver: zodResolver(addTransactionSchema),
    defaultValues: {
      amount: 0,
    },
  });

  // Получаем текущий период (используем тот же что на дашборде)
  const { data: currentPeriod } = useQuery({
    queryKey: ["budget-period"],
    queryFn: () => familyBudgetServiceApi.getBudgetPeriod(1),
    staleTime: 5 * 60 * 1000, // 5 минут кеширования
  });

  // Получаем текущего пользователя
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => userServiceApi.getCurrentUser(),
  });

  // Получаем транзакции по периоду
  const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ["transactions", currentPeriod?.id],
    queryFn: () => transactionServiceApi.getTransactionsByPeriod(currentPeriod!.id),
    enabled: !!currentPeriod?.id,
  });

  // Получаем категории
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => familyBudgetServiceApi.getAllCategories(),
  });

  // Мутация для добавления транзакции
  const addTransactionMutation = useMutation({
    mutationFn: async (data: AddTransactionFormValues) => {
      if (!currentUser?.id) throw new Error("ID пользователя не найден");
      return transactionServiceApi.createTransaction({
        type: data.type,
        amount: data.amount,
        categoryId: data.categoryId,
        userId: currentUser.id,
      });
    },
    onSuccess: () => {
      toast({
        title: "Транзакция добавлена",
        description: "Новая транзакция успешно создана",
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["user-balance"] });
      setAddTransactionOpen(false);
      addTransactionForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка создания транзакции",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onAddTransactionSubmit = async (values: AddTransactionFormValues) => {
    addTransactionMutation.mutate(values);
  };

  // Функция для получения названия категории
  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || `Категория ${categoryId}`;
  };

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Функция для получения иконки типа транзакции
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'INCOME':
        return <ArrowUpCircle className="h-5 w-5 text-green-600" />;
      case 'SPEND':
        return <ArrowDownCircle className="h-5 w-5 text-red-600" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-600" />;
    }
  };

  // Функция для получения цвета типа транзакции
  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'SPEND':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Функция для получения названия типа на русском
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'Доход';
      case 'SPEND':
        return 'Расход';
      default:
        return type;
    }
  };

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
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Транзакции</h1>
                <p className="text-gray-600 mt-2">История операций и добавление новых транзакций</p>
                {currentPeriod && (
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    Период: {currentPeriod.month}/{currentPeriod.year}
                  </div>
                )}
              </div>
              
              <Dialog open={addTransactionOpen} onOpenChange={setAddTransactionOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить транзакцию
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить новую транзакцию</DialogTitle>
                    <DialogDescription>
                      Создайте новую транзакцию доходов или расходов
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...addTransactionForm}>
                    <form onSubmit={addTransactionForm.handleSubmit(onAddTransactionSubmit)} className="space-y-4">
                      <FormField
                        control={addTransactionForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Тип транзакции</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите тип" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="INCOME">Доход</SelectItem>
                                <SelectItem value="SPEND">Расход</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={addTransactionForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Сумма</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="0.00" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={addTransactionForm.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Категория</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите категорию" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setAddTransactionOpen(false)}>
                          Отмена
                        </Button>
                        <Button type="submit" disabled={addTransactionMutation.isPending}>
                          {addTransactionMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Создать
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isTransactionsLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Загрузка транзакций...</div>
              </div>
            )}

            {/* Список транзакций */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  История транзакций
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions && transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center space-x-4">
                          {getTransactionIcon(transaction.type)}
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTransactionColor(transaction.type)}`}>
                                {getTypeLabel(transaction.type)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryName(transaction.categoryId)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(transaction.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-lg font-semibold ${
                            transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'INCOME' ? '+' : '-'}{transaction.amount.toFixed(2)} ₽
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {transaction.id}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <div className="text-lg font-medium">Нет транзакций</div>
                    <div className="text-sm">Добавьте первую транзакцию для отслеживания финансов</div>
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