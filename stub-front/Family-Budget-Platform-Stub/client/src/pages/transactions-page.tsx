import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Plus, Filter, ChevronDown, Search, ShoppingBasket, DollarSign, Film, FileText, Car, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Тип транзакции
type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
};

// Схема для новой транзакции
const transactionSchema = z.object({
  description: z.string().min(3, "Описание должно содержать не менее 3 символов"),
  amount: z.coerce.number().min(1, "Сумма должна быть положительным числом"),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Выберите категорию"),
  date: z.string(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export default function TransactionsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const initials = user 
    ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '') || (user.username.substring(0, 2))
    : 'ИП';
  
  const { data: transactions, isLoading: isTransactionsLoading } = useQuery({
    queryKey: ["/api/transactions"],
  });
  
  // Мутация для удаления транзакции
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      // Инвалидируем кеш для обновления списка транзакций
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      // Также инвалидируем сводку бюджета, так как удаление транзакции может повлиять на баланс
      queryClient.invalidateQueries({ queryKey: ["/api/budget-summary"] });
      
      toast({
        title: "Транзакция удалена",
        description: "Транзакция была успешно удалена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка удаления",
        description: "Не удалось удалить транзакцию. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
      console.error("Delete transaction error:", error);
    },
  });
  
  // Обработчик удаления транзакции
  const handleDeleteTransaction = (id: number) => {
    if (window.confirm("Вы уверены, что хотите удалить эту транзакцию?")) {
      deleteMutation.mutate(id);
    }
  };

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      amount: 0,
      type: "expense",
      category: "",
      date: new Date().toISOString().split('T')[0],
    },
  });

  // Мутация для добавления транзакции
  const addMutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      // Создаем новый объект без поля type
      const transactionData = {
        description: data.description,
        amount: data.type === "expense" ? -Math.abs(data.amount) : Math.abs(data.amount),
        category: data.category,
        date: data.date,
        // Предполагаем, что API ожидает familyId, который берем из пользователя
        familyId: user?.familyId,
        userId: user?.id
      };
      
      const res = await apiRequest("POST", "/api/transactions", transactionData);
      return await res.json();
    },
    onSuccess: () => {
      // Инвалидируем кеш для обновления списка транзакций
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      // Также инвалидируем сводку бюджета, так как новая транзакция влияет на баланс
      queryClient.invalidateQueries({ queryKey: ["/api/budget-summary"] });
      
      toast({
        title: "Транзакция добавлена",
        description: "Ваша транзакция была успешно добавлена",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Ошибка добавления",
        description: "Не удалось добавить транзакцию. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
      console.error("Add transaction error:", error);
    },
    onSettled: () => {
      setIsAddingTransaction(false);
    }
  });
  
  function onSubmit(values: TransactionFormValues) {
    setIsAddingTransaction(true);
    addMutation.mutate(values);
  }

  // Форматирование валюты
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };
  
  // Получение иконки категории
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Еда":
        return <ShoppingBasket className="text-white" size={16} />;
      case "Доход":
        return <DollarSign className="text-white" size={16} />;
      case "Развлечения":
        return <Film className="text-white" size={16} />;
      case "Обязательные":
        return <FileText className="text-white" size={16} />;
      case "Транспорт":
        return <Car className="text-white" size={16} />;
      default:
        return <ShoppingBasket className="text-white" size={16} />;
    }
  };
  
  // Получение цвета категории
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Еда":
        return "bg-orange-500";
      case "Доход":
        return "bg-green-500";
      case "Развлечения":
        return "bg-purple-500";
      case "Обязательные":
        return "bg-red-500";
      case "Транспорт":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar для десктопа */}
      <Sidebar className="hidden lg:flex" user={user} initials={initials} />
      
      {/* Мобильное меню */}
      <MobileMenu isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} initials={initials} />
      
      {/* Основной контент */}
      <div className="flex flex-col w-full overflow-hidden">
        {/* Мобильный хедер */}
        <header className="bg-white shadow-sm lg:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-primary">Семейный бюджет</h1>
                </div>
              </div>
              <div className="flex items-center">
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
        
        {/* Основной контент */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900">Транзакции</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить транзакцию
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Новая транзакция</DialogTitle>
                      <DialogDescription>
                        Добавьте детали новой транзакции
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Описание</FormLabel>
                              <FormControl>
                                <Input placeholder="Например: Продукты в магазине" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Сумма (₽)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="1000"
                                  {...field}
                                  onChange={event => field.onChange(Number(event.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Тип</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите тип" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="income">Доход</SelectItem>
                                    <SelectItem value="expense">Расход</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Категория</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите категорию" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Доход">Доход</SelectItem>
                                    <SelectItem value="Еда">Еда</SelectItem>
                                    <SelectItem value="Транспорт">Транспорт</SelectItem>
                                    <SelectItem value="Развлечения">Развлечения</SelectItem>
                                    <SelectItem value="Обязательные">Обязательные платежи</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Дата</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button type="submit" disabled={isAddingTransaction}>
                            {isAddingTransaction ? "Добавление..." : "Добавить"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">История транзакций</CardTitle>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <Input
                          placeholder="Поиск..."
                          className="pl-8 max-w-[180px] sm:max-w-xs h-9"
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9">
                            <Filter className="mr-2 h-4 w-4" />
                            Фильтр
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuLabel>Фильтровать по</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Все транзакции</DropdownMenuItem>
                          <DropdownMenuItem>Только доходы</DropdownMenuItem>
                          <DropdownMenuItem>Только расходы</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>За последний месяц</DropdownMenuItem>
                          <DropdownMenuItem>За 3 месяца</DropdownMenuItem>
                          <DropdownMenuItem>За год</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isTransactionsLoading ? (
                    <div className="space-y-4 py-4">
                      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Описание</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {Array.isArray(transactions) ? transactions.map((transaction: Transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-500">{transaction.date}</td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getCategoryColor(transaction.category)}`}>
                                    {getCategoryIcon(transaction.category)}
                                  </div>
                                  <span className="ml-2">{transaction.category}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{transaction.description}</td>
                              <td className={`px-4 py-3 text-sm font-medium text-right ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.amount > 0 ? `+${formatCurrency(transaction.amount)}` : `-${formatCurrency(transaction.amount)}`}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          )) : null}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}