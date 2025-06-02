import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-microservices-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Menu, 
  Plus, 
  Edit, 
  ChevronDown, 
  DollarSign, 
  CalendarDays, 
  Target, 
  Coins, 
  PiggyBank, 
  ArrowDownToLine,
  Trash
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown";

// Тип для цели накопления
type SavingsGoal = {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  description: string;
};

// Тип для истории накоплений
type SavingsHistory = {
  id: number;
  date: string;
  amount: number;
  description: string;
  type: 'deposit' | 'withdrawal'; // тип операции: пополнение или снятие
  goalId: number; // к какой цели относится операция
};

// Пример данных для целей
const mockSavingsGoals: SavingsGoal[] = [
  {
    id: 1,
    name: "Отпуск на море",
    targetAmount: 120000,
    currentAmount: 45000,
    description: "Накопления на летний отпуск всей семьей на Черном море",
  },
  {
    id: 2,
    name: "Новый автомобиль",
    targetAmount: 800000,
    currentAmount: 250000,
    description: "Накопления на покупку нового семейного автомобиля",
  }
];

// Пример данных для истории накоплений
const mockSavingsHistory: SavingsHistory[] = [
  {
    id: 1,
    date: "20 мая 2023",
    amount: 10000,
    description: "Регулярный взнос",
    type: 'deposit',
    goalId: 1
  },
  {
    id: 2,
    date: "1 мая 2023",
    amount: 15000,
    description: "Премия с работы",
    type: 'deposit',
    goalId: 1
  },
  {
    id: 3,
    date: "15 апреля 2023",
    amount: 10000,
    description: "Регулярный взнос",
    type: 'deposit',
    goalId: 1
  },
  {
    id: 4,
    date: "1 апреля 2023",
    amount: 10000,
    description: "Регулярный взнос",
    type: 'deposit',
    goalId: 1
  },
  {
    id: 5,
    date: "10 мая 2023",
    amount: 50000,
    description: "Годовой бонус",
    type: 'deposit',
    goalId: 2
  },
  {
    id: 6,
    date: "15 марта 2023",
    amount: 5000,
    description: "Снятие на ремонт",
    type: 'withdrawal',
    goalId: 1
  },
];

// Схема для цели накопления
const savingsGoalSchema = z.object({
  name: z.string().min(3, "Название должно содержать не менее 3 символов"),
  targetAmount: z.coerce.number().min(1, "Сумма должна быть положительным числом"),
  currentAmount: z.coerce.number().min(0, "Сумма не может быть отрицательной").optional(),
  description: z.string().optional(),
});

// Схема для добавления накопления
const addSavingsSchema = z.object({
  amount: z.coerce.number().min(1, "Сумма должна быть положительным числом"),
  description: z.string().min(3, "Описание должно содержать не менее 3 символов"),
});

// Схема для снятия средств
const withdrawSavingsSchema = z.object({
  amount: z.coerce.number().min(1, "Сумма должна быть положительным числом"),
  description: z.string().min(3, "Описание должно содержать не менее 3 символов"),
});

type SavingsGoalFormValues = z.infer<typeof savingsGoalSchema>;
type AddSavingsFormValues = z.infer<typeof addSavingsSchema>;
type WithdrawSavingsFormValues = z.infer<typeof withdrawSavingsSchema>;

export default function SavingsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(mockSavingsGoals);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(mockSavingsGoals.length > 0 ? mockSavingsGoals[0].id : null);
  const [savingsHistory, setSavingsHistory] = useState<SavingsHistory[]>(mockSavingsHistory);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [isWithdrawingFunds, setIsWithdrawingFunds] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [addFundsDialogOpen, setAddFundsDialogOpen] = useState(false);
  const [withdrawFundsDialogOpen, setWithdrawFundsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const { toast } = useToast();
  
  // Получение выбранной цели
  const selectedGoal = selectedGoalId 
    ? savingsGoals.find(goal => goal.id === selectedGoalId) || null 
    : null;

  // Фильтрация истории операций для выбранной цели
  const filteredHistory = selectedGoalId
    ? savingsHistory.filter(item => item.goalId === selectedGoalId)
    : [];
  
  const initials = user 
    ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '') || (user.username.substring(0, 2))
    : 'ИП';
  
  const goalForm = useForm<SavingsGoalFormValues>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: {
      name: editingGoal?.name || "",
      targetAmount: editingGoal?.targetAmount || 0,
      currentAmount: editingGoal?.currentAmount || 0,
      description: editingGoal?.description || "",
    },
  });
  
  const addFundsForm = useForm<AddSavingsFormValues>({
    resolver: zodResolver(addSavingsSchema),
    defaultValues: {
      amount: 0,
      description: "",
    },
  });
  
  const withdrawFundsForm = useForm<WithdrawSavingsFormValues>({
    resolver: zodResolver(withdrawSavingsSchema),
    defaultValues: {
      amount: 0,
      description: "",
    },
  });

  // Обновление формы при изменении цели
  useEffect(() => {
    if (editingGoal) {
      goalForm.reset({
        name: editingGoal.name,
        targetAmount: editingGoal.targetAmount,
        currentAmount: editingGoal.currentAmount,
        description: editingGoal.description,
      });
    } else {
      goalForm.reset({
        name: "",
        targetAmount: 0,
        currentAmount: 0,
        description: "",
      });
    }
  }, [editingGoal, goalForm]);

  // Открытие диалога создания/редактирования цели
  function openGoalDialog(goal: SavingsGoal | null = null) {
    setEditingGoal(goal);
    setGoalDialogOpen(true);
  }

  // Обработчик создания/редактирования цели
  function onSavingsGoalSubmit(values: SavingsGoalFormValues) {
    setIsSaving(true);
    
    setTimeout(() => {
      const newGoal: SavingsGoal = {
        id: editingGoal?.id || Date.now(),
        name: values.name,
        targetAmount: values.targetAmount,
        currentAmount: values.currentAmount || 0,
        description: values.description || "",
      };
      
      if (editingGoal) {
        // Обновляем существующую цель
        setSavingsGoals(savingsGoals.map(goal => goal.id === editingGoal.id ? newGoal : goal));
      } else {
        // Создаем новую цель
        setSavingsGoals([...savingsGoals, newGoal]);
        setSelectedGoalId(newGoal.id);
      }
      
      toast({
        title: editingGoal ? "Цель обновлена" : "Цель создана",
        description: `${values.name} ${editingGoal ? "была обновлена" : "была создана"}`,
      });
      
      setIsSaving(false);
      setGoalDialogOpen(false);
      setEditingGoal(null);
    }, 1000);
  }
  
  // Обработчик добавления средств
  function onAddFundsSubmit(values: AddSavingsFormValues) {
    setIsAddingFunds(true);
    
    setTimeout(() => {
      if (!selectedGoal) return;
      
      // Обновляем текущую сумму в цели
      const updatedGoal = {
        ...selectedGoal,
        currentAmount: selectedGoal.currentAmount + values.amount,
      };
      
      setSavingsGoals(savingsGoals.map(goal => 
        goal.id === selectedGoal.id ? updatedGoal : goal
      ));
      
      // Добавляем запись в историю
      const newHistoryEntry: SavingsHistory = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
        amount: values.amount,
        description: values.description,
        type: 'deposit',
        goalId: selectedGoal.id
      };
      
      setSavingsHistory([newHistoryEntry, ...savingsHistory]);
      
      toast({
        title: "Средства добавлены",
        description: `${formatCurrency(values.amount)} добавлено к цели "${selectedGoal.name}"`,
      });
      
      setIsAddingFunds(false);
      setAddFundsDialogOpen(false);
      addFundsForm.reset();
    }, 1000);
  }
  
  // Обработчик снятия средств
  function onWithdrawFundsSubmit(values: WithdrawSavingsFormValues) {
    setIsWithdrawingFunds(true);
    
    setTimeout(() => {
      if (!selectedGoal) return;
      
      if (values.amount > selectedGoal.currentAmount) {
        toast({
          title: "Ошибка снятия средств",
          description: "Сумма снятия не может превышать текущий баланс цели",
          variant: "destructive"
        });
        setIsWithdrawingFunds(false);
        return;
      }
      
      // Обновляем текущую сумму в цели
      const updatedGoal = {
        ...selectedGoal,
        currentAmount: selectedGoal.currentAmount - values.amount,
      };
      
      setSavingsGoals(savingsGoals.map(goal => 
        goal.id === selectedGoal.id ? updatedGoal : goal
      ));
      
      // Добавляем запись в историю
      const newHistoryEntry: SavingsHistory = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
        amount: values.amount,
        description: values.description,
        type: 'withdrawal',
        goalId: selectedGoal.id
      };
      
      setSavingsHistory([newHistoryEntry, ...savingsHistory]);
      
      toast({
        title: "Средства сняты",
        description: `${formatCurrency(values.amount)} снято с цели "${selectedGoal.name}"`,
      });
      
      setIsWithdrawingFunds(false);
      setWithdrawFundsDialogOpen(false);
      withdrawFundsForm.reset();
    }, 1000);
  }
  
  // Удаление цели
  function deleteGoal(goalId: number) {
    if (!confirm("Вы уверены, что хотите удалить эту цель накопления?")) return;
    
    setSavingsGoals(savingsGoals.filter(goal => goal.id !== goalId));
    
    if (selectedGoalId === goalId) {
      const remainingGoals = savingsGoals.filter(goal => goal.id !== goalId);
      setSelectedGoalId(remainingGoals.length > 0 ? remainingGoals[0].id : null);
    }
    
    // Удаляем всю историю по этой цели
    setSavingsHistory(savingsHistory.filter(item => item.goalId !== goalId));
    
    toast({
      title: "Цель удалена",
      description: "Цель накопления и вся связанная история были удалены",
    });
  }

  // Форматирование валюты
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Расчет процента выполнения цели
  const calculateProgress = (goal: SavingsGoal) => {
    return Math.round((goal.currentAmount / goal.targetAmount) * 100);
  };
  
  // Расчет оставшейся суммы
  const calculateRemainingAmount = (goal: SavingsGoal) => {
    return goal.targetAmount - goal.currentAmount;
  };
  
  // Эти функции были удалены, так как поле "Срок достижения" больше не используется

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
        
        {/* Основной контент */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900">Сберегательные цели</h1>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => openGoalDialog(null)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Новая цель
                  </Button>
                </div>
              </div>

              {savingsGoals.length > 0 ? (
                <>
                  {/* Выбор цели */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-medium text-gray-900">Выберите цель</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {savingsGoals.map((goal) => (
                        <Card 
                          key={goal.id} 
                          className={`cursor-pointer hover:border-primary transition-colors ${goal.id === selectedGoalId ? 'border-primary bg-primary-50' : ''}`}
                          onClick={() => setSelectedGoalId(goal.id)}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{goal.name}</CardTitle>
                            <CardDescription className="text-xs">{goal.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Прогресс</span>
                              <span className="text-xs font-medium">{calculateProgress(goal)}%</span>
                            </div>
                            <Progress value={calculateProgress(goal)} className="h-2 mb-2" />
                            <div className="flex justify-between items-center">
                              <div className="text-sm font-semibold">
                                {formatCurrency(goal.currentAmount)}
                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                  из {formatCurrency(goal.targetAmount)}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {/* Детали выбранной цели */}
                  {selectedGoal && (
                    <div className="mt-8">
                      <Card className="mb-6">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <div>
                            <CardTitle>{selectedGoal.name}</CardTitle>
                            <CardDescription>{selectedGoal.description}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openGoalDialog(selectedGoal)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Изменить
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-500" onClick={() => deleteGoal(selectedGoal.id)}>
                              <Trash className="h-4 w-4 mr-1" />
                              Удалить
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Прогресс накопления</span>
                            <span className="text-sm font-medium">{calculateProgress(selectedGoal)}%</span>
                          </div>
                          <Progress value={calculateProgress(selectedGoal)} className="h-2 mb-4" />
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-6">
                            <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg">
                              <div className="bg-primary-100 p-2 rounded-full">
                                <Coins className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Текущая сумма</p>
                                <p className="text-base font-semibold">{formatCurrency(selectedGoal.currentAmount)}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="bg-gray-100 p-2 rounded-full">
                                <Target className="h-5 w-5 text-gray-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Целевая сумма</p>
                                <p className="text-base font-semibold">{formatCurrency(selectedGoal.targetAmount)}</p>
                              </div>
                            </div>
                            
                            {/* Секция со сроком достижения была удалена */}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end pt-2 gap-3">
                          <Dialog open={withdrawFundsDialogOpen} onOpenChange={setWithdrawFundsDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline">
                                <ArrowDownToLine className="mr-2 h-4 w-4" />
                                Снять средства
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Снять средства с цели</DialogTitle>
                                <DialogDescription>
                                  Укажите сумму и причину снятия средств с цели "{selectedGoal.name}"
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...withdrawFundsForm}>
                                <form onSubmit={withdrawFundsForm.handleSubmit(onWithdrawFundsSubmit)} className="space-y-6">
                                  <FormField
                                    control={withdrawFundsForm.control}
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
                                        <FormDescription>
                                          Максимальная сумма: {formatCurrency(selectedGoal.currentAmount)}
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={withdrawFundsForm.control}
                                    name="description"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Причина снятия</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Например: Непредвиденные расходы" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <DialogFooter>
                                    <Button type="submit" variant="outline" disabled={isWithdrawingFunds}>
                                      {isWithdrawingFunds ? "Снятие..." : "Снять средства"}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog open={addFundsDialogOpen} onOpenChange={setAddFundsDialogOpen}>
                            <DialogTrigger asChild>
                              <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Добавить средства
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Добавить средства к цели</DialogTitle>
                                <DialogDescription>
                                  Укажите сумму и описание для добавления средств к цели "{selectedGoal.name}"
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...addFundsForm}>
                                <form onSubmit={addFundsForm.handleSubmit(onAddFundsSubmit)} className="space-y-6">
                                  <FormField
                                    control={addFundsForm.control}
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
                                    control={addFundsForm.control}
                                    name="description"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Описание</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Например: Регулярный взнос" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <DialogFooter>
                                    <Button type="submit" disabled={isAddingFunds}>
                                      {isAddingFunds ? "Добавление..." : "Добавить средства"}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                        </CardFooter>
                      </Card>
                      
                      {/* Вкладки с историей и советами */}
                      <Tabs defaultValue="history">
                        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 mb-6">
                          <TabsTrigger value="history">История операций</TabsTrigger>
                          <TabsTrigger value="tips">Советы по сбережениям</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="history">
                          <Card>
                            <CardHeader>
                              <CardTitle>История операций</CardTitle>
                              <CardDescription>История ваших взносов и снятий по цели</CardDescription>
                            </CardHeader>
                            <CardContent>
                              {filteredHistory.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  По данной цели еще нет операций
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {filteredHistory.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between border-b pb-3">
                                      <div className="flex items-start">
                                        <div className={`p-2 rounded-full mr-4 ${item.type === 'deposit' ? 'bg-green-50' : 'bg-red-50'}`}>
                                          {item.type === 'deposit' ? (
                                            <Plus className={`h-4 w-4 text-green-600`} />
                                          ) : (
                                            <ArrowDownToLine className={`h-4 w-4 text-red-600`} />
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">{item.description}</p>
                                          <p className="text-xs text-muted-foreground">{item.date}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center">
                                        <p className={`text-sm font-semibold ${item.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                          {item.type === 'deposit' ? '+' : '-'} {formatCurrency(item.amount)}
                                        </p>
                                        <Badge className={`ml-2 ${item.type === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {item.type === 'deposit' ? 'Пополнение' : 'Снятие'}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                        
                        <TabsContent value="tips">
                          <Card>
                            <CardHeader>
                              <CardTitle>Советы по сбережениям</CardTitle>
                              <CardDescription>Полезные советы, которые помогут вам быстрее достичь своей цели</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <h3 className="font-medium text-blue-800 mb-2">Правило 50/30/20</h3>
                                  <p className="text-blue-700 text-sm">Распределяйте свой доход по правилу: 50% на нужды, 30% на желания и 20% на сбережения. Это поможет систематизировать ваши накопления.</p>
                                </div>
                                
                                <div className="bg-green-50 p-4 rounded-lg">
                                  <h3 className="font-medium text-green-800 mb-2">Автоматизируйте сбережения</h3>
                                  <p className="text-green-700 text-sm">Настройте автоматические переводы на сберегательный счет в день получения зарплаты. Так вы не будете тратить деньги, которые планировали сохранить.</p>
                                </div>
                                
                                <div className="bg-purple-50 p-4 rounded-lg">
                                  <h3 className="font-medium text-purple-800 mb-2">Откладывайте "неожиданные" доходы</h3>
                                  <p className="text-purple-700 text-sm">Премии, возврат налогов или подарки — отличный способ ускорить достижение вашей цели без изменения привычного бюджета.</p>
                                </div>
                                
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                  <h3 className="font-medium text-yellow-800 mb-2">Отслеживайте прогресс</h3>
                                  <p className="text-yellow-700 text-sm">Регулярно просматривайте свой прогресс и отмечайте достижения. Визуализация успеха мотивирует продолжать сберегать.</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </>
              ) : (
                <Card className="mt-6">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                      <PiggyBank className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-gray-900">У вас пока нет сберегательных целей</h2>
                    <p className="mt-1 text-gray-500 max-w-md text-center">
                      Создайте цель накопления, чтобы отслеживать ваш прогресс и быстрее достичь желаемого
                    </p>
                    <Button className="mt-6" onClick={() => openGoalDialog(null)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Создать цель
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {/* Диалог создания/редактирования цели */}
              <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingGoal ? "Изменить" : "Создать"} сберегательную цель</DialogTitle>
                    <DialogDescription>
                      {editingGoal ? "Обновите информацию о цели накопления" : "Укажите детали для вашей новой цели накопления"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...goalForm}>
                    <form onSubmit={goalForm.handleSubmit(onSavingsGoalSubmit)} className="space-y-6">
                      <FormField
                        control={goalForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Название цели</FormLabel>
                            <FormControl>
                              <Input placeholder="Например: Отпуск на море" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={goalForm.control}
                        name="targetAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Целевая сумма (₽)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="100000"
                                {...field}
                                onChange={event => field.onChange(Number(event.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {!editingGoal && (
                        <FormField
                          control={goalForm.control}
                          name="currentAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Начальная сумма (₽)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  onChange={event => field.onChange(Number(event.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Если у вас уже есть накопления для этой цели
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      

                      <FormField
                        control={goalForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Описание (необязательно)</FormLabel>
                            <FormControl>
                              <Input placeholder="Описание вашей цели" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? "Сохранение..." : (editingGoal ? "Сохранить изменения" : "Создать цель")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}