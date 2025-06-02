import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-microservices-auth";
import { familyBudgetServiceApi, userServiceApi } from "@/lib/microservices-api";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Menu, 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  PiggyBank,
  TrendingUp,
  CheckCircle,
  Circle
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/layout/logo";
import { useToast } from "@/hooks/use-toast";

// Схемы для форм
const createGoalSchema = z.object({
  name: z.string().min(2, "Название должно содержать не менее 2 символов"),
  description: z.string().optional(),
  cost: z.number().min(0.01, "Стоимость должна быть больше 0"),
});

const topUpGoalSchema = z.object({
  balance: z.number().min(0.01, "Сумма должна быть больше 0"),
});

const updateGoalSchema = z.object({
  name: z.string().min(2, "Название должно содержать не менее 2 символов"),
  description: z.string().optional(),
});

type CreateGoalFormValues = z.infer<typeof createGoalSchema>;
type TopUpGoalFormValues = z.infer<typeof topUpGoalSchema>;
type UpdateGoalFormValues = z.infer<typeof updateGoalSchema>;

export default function SavingsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  const [topUpGoalOpen, setTopUpGoalOpen] = useState(false);
  const [editGoalOpen, setEditGoalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const initials = user 
    ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '')
    : 'ИП';

  const createGoalForm = useForm<CreateGoalFormValues>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      name: "",
      description: "",
      cost: 0,
    },
  });

  const topUpGoalForm = useForm<TopUpGoalFormValues>({
    resolver: zodResolver(topUpGoalSchema),
    defaultValues: {
      balance: 0,
    },
  });

  const updateGoalForm = useForm<UpdateGoalFormValues>({
    resolver: zodResolver(updateGoalSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Получаем текущего пользователя
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => userServiceApi.getCurrentUser(),
  });

  // Получаем цели семьи
  const { data: goals, isLoading: isGoalsLoading } = useQuery({
    queryKey: ["family-goals", currentUser?.familyId],
    queryFn: () => familyBudgetServiceApi.getFamilyGoals(currentUser!.familyId),
    enabled: !!currentUser?.familyId,
  });

  // Мутация для создания цели
  const createGoalMutation = useMutation({
    mutationFn: async (data: CreateGoalFormValues) => {
      if (!currentUser?.familyId) throw new Error("ID семьи не найден");
      return familyBudgetServiceApi.createGoal({
        ...data,
        familyId: currentUser.familyId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Цель создана",
        description: "Новая сберегательная цель успешно создана",
      });
      queryClient.invalidateQueries({ queryKey: ["family-goals"] });
      setCreateGoalOpen(false);
      createGoalForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка создания цели",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для пополнения цели
  const topUpGoalMutation = useMutation({
    mutationFn: async (data: TopUpGoalFormValues) => {
      if (!selectedGoal) throw new Error("Цель не выбрана");
      // Отправляем только сумму пополнения
      return familyBudgetServiceApi.topUpGoal({
        goalId: selectedGoal.id,
        balance: data.balance,
      });
    },
    onSuccess: () => {
      toast({
        title: "Цель пополнена",
        description: "Баланс цели успешно обновлен",
      });
      queryClient.invalidateQueries({ queryKey: ["family-goals"] });
      setTopUpGoalOpen(false);
      topUpGoalForm.reset();
      setSelectedGoal(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка пополнения",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для обновления цели
  const updateGoalMutation = useMutation({
    mutationFn: async (data: UpdateGoalFormValues) => {
      if (!selectedGoal) throw new Error("Цель не выбрана");
      return familyBudgetServiceApi.updateGoal(selectedGoal.id, data);
    },
    onSuccess: () => {
      toast({
        title: "Цель обновлена",
        description: "Информация о цели успешно обновлена",
      });
      queryClient.invalidateQueries({ queryKey: ["family-goals"] });
      setEditGoalOpen(false);
      updateGoalForm.reset();
      setSelectedGoal(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка обновления",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для удаления цели
  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: number) => familyBudgetServiceApi.deleteGoal(goalId),
    onSuccess: () => {
      toast({
        title: "Цель удалена",
        description: "Сберегательная цель успешно удалена",
      });
      queryClient.invalidateQueries({ queryKey: ["family-goals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCreateGoalSubmit = async (values: CreateGoalFormValues) => {
    createGoalMutation.mutate(values);
  };

  const onTopUpGoalSubmit = async (values: TopUpGoalFormValues) => {
    topUpGoalMutation.mutate(values);
  };

  const onUpdateGoalSubmit = async (values: UpdateGoalFormValues) => {
    updateGoalMutation.mutate(values);
  };

  const handleTopUpGoal = (goal: any) => {
    setSelectedGoal(goal);
    setTopUpGoalOpen(true);
  };

  const handleEditGoal = (goal: any) => {
    setSelectedGoal(goal);
    updateGoalForm.setValue("name", goal.name);
    updateGoalForm.setValue("description", goal.description || "");
    setEditGoalOpen(true);
  };

  const handleDeleteGoal = (goalId: number) => {
    if (confirm("Вы уверены, что хотите удалить эту цель?")) {
      deleteGoalMutation.mutate(goalId);
    }
  };

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Функция для расчета прогресса
  const getProgress = (balance: number, cost: number) => {
    return Math.min((balance / cost) * 100, 100);
  };

  const isParent = currentUser?.role === 'PARENT';

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
                <h1 className="text-3xl font-bold text-gray-900">Сберегательные цели</h1>
                <p className="text-gray-600 mt-2">Управление семейными накоплениями и целями</p>
              </div>
              
              {/* Кнопка создания только для родителей */}
              {isParent && (
                <Dialog open={createGoalOpen} onOpenChange={setCreateGoalOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Создать цель
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Создать новую цель</DialogTitle>
                      <DialogDescription>
                        Создайте новую сберегательную цель для семьи
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createGoalForm}>
                      <form onSubmit={createGoalForm.handleSubmit(onCreateGoalSubmit)} className="space-y-4">
                        <FormField
                          control={createGoalForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Название цели</FormLabel>
                              <FormControl>
                                <Input placeholder="Покупка автомобиля" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={createGoalForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Описание (необязательно)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Описание цели..."
                                  className="resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createGoalForm.control}
                          name="cost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Целевая сумма</FormLabel>
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

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setCreateGoalOpen(false)}>
                            Отмена
                          </Button>
                          <Button type="submit" disabled={createGoalMutation.isPending}>
                            {createGoalMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Создать
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {isGoalsLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Загрузка целей...</div>
              </div>
            )}

            {/* Список целей */}
            {goals && goals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map((goal) => {
                  const progress = getProgress(goal.balance, goal.cost);
                  const isCompleted = goal.paid || progress >= 100;
                  
                  return (
                    <Card key={goal.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400" />
                            )}
                            <CardTitle className="text-lg">{goal.name}</CardTitle>
                          </div>
                          <Badge variant={isCompleted ? "default" : "secondary"}>
                            {isCompleted ? "Достигнута" : "В процессе"}
                          </Badge>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-gray-600 mt-2">{goal.description}</p>
                        )}
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Прогресс */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Прогресс</span>
                            <span className="font-medium">{progress.toFixed(1)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-sm">
                            <span className="text-green-600 font-medium">
                              {goal.balance.toFixed(2)} ₽
                            </span>
                            <span className="text-gray-600">
                              из {goal.cost.toFixed(2)} ₽
                            </span>
                          </div>
                        </div>

                        {/* Информация */}
                        <div className="text-xs text-gray-500">
                          Создано: {formatDate(goal.createdAt)}
                        </div>

                        {/* Действия для родителей */}
                        {isParent && (
                          <div className="flex space-x-2 pt-2">
                            {!isCompleted && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTopUpGoal(goal)}
                                className="flex-1"
                              >
                                <PiggyBank className="h-4 w-4 mr-1" />
                                Пополнить
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditGoal(goal)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg font-medium">Нет сберегательных целей</div>
                  <div className="text-sm">
                    {isParent 
                      ? "Создайте первую сберегательную цель для семьи" 
                      : "В вашей семье пока нет сберегательных целей"
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Диалог пополнения цели */}
            <Dialog open={topUpGoalOpen} onOpenChange={setTopUpGoalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Пополнить цель</DialogTitle>
                  <DialogDescription>
                    Пополните баланс цели "{selectedGoal?.name}"
                  </DialogDescription>
                </DialogHeader>
                <Form {...topUpGoalForm}>
                  <form onSubmit={topUpGoalForm.handleSubmit(onTopUpGoalSubmit)} className="space-y-4">
                    <div className="text-sm text-gray-600">
                      Текущий баланс: {selectedGoal?.balance?.toFixed(2)} ₽ из {selectedGoal?.cost?.toFixed(2)} ₽
                    </div>
                    <FormField
                      control={topUpGoalForm.control}
                      name="balance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Сумма пополнения</FormLabel>
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
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setTopUpGoalOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={topUpGoalMutation.isPending}>
                        {topUpGoalMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Пополнить
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Диалог редактирования цели */}
            <Dialog open={editGoalOpen} onOpenChange={setEditGoalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Редактировать цель</DialogTitle>
                  <DialogDescription>
                    Измените название и описание цели
                  </DialogDescription>
                </DialogHeader>
                <Form {...updateGoalForm}>
                  <form onSubmit={updateGoalForm.handleSubmit(onUpdateGoalSubmit)} className="space-y-4">
                    <FormField
                      control={updateGoalForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название цели</FormLabel>
                          <FormControl>
                            <Input placeholder="Покупка автомобиля" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={updateGoalForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание (необязательно)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Описание цели..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditGoalOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={updateGoalMutation.isPending}>
                        {updateGoalMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Сохранить
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}