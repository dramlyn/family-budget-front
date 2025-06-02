import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, DollarSign } from "lucide-react";

// Категории расходов
const DEFAULT_CATEGORIES = [
  { name: "Еда", color: "bg-orange-500" },
  { name: "Транспорт", color: "bg-blue-500" },
  { name: "Развлечения", color: "bg-purple-500" },
  { name: "Обязательные платежи", color: "bg-red-500" },
  { name: "Одежда", color: "bg-indigo-500" },
  { name: "Здоровье", color: "bg-green-500" },
  { name: "Образование", color: "bg-amber-500" },
  { name: "Другое", color: "bg-gray-500" },
];

// Схема для формы планирования бюджета
const budgetPlanningSchema = z.object({
  totalBudget: z.coerce.number().min(1, "Бюджет должен быть положительным числом"),
  categoryAllocations: z.record(z.string(), z.coerce.number().min(0, "Значение не может быть отрицательным")),
});

type BudgetPlanningFormValues = z.infer<typeof budgetPlanningSchema>;

interface BudgetPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BudgetPlanningDialog({ open, onOpenChange }: BudgetPlanningDialogProps) {
  const { toast } = useToast();
  const [unallocated, setUnallocated] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Инициализируем форму
  const form = useForm<BudgetPlanningFormValues>({
    resolver: zodResolver(budgetPlanningSchema),
    defaultValues: {
      totalBudget: 100000,
      categoryAllocations: DEFAULT_CATEGORIES.reduce((acc, category) => {
        acc[category.name] = 0;
        return acc;
      }, {} as Record<string, number>),
    },
  });

  // Следим за изменениями общего бюджета и распределений
  const totalBudget = form.watch("totalBudget");
  const categoryAllocations = form.watch("categoryAllocations");

  // Пересчитываем нераспределенный бюджет при изменении значений
  useEffect(() => {
    const totalAllocated = Object.values(categoryAllocations).reduce((sum, amount) => sum + Number(amount), 0);
    setUnallocated(Math.max(0, totalBudget - totalAllocated));
  }, [totalBudget, categoryAllocations]);

  // Мутация для отправки данных о планировании бюджета
  const planBudgetMutation = useMutation({
    mutationFn: async (data: BudgetPlanningFormValues) => {
      const res = await apiRequest("POST", "/api/budget-planning", data);
      return res.json();
    },
    onSuccess: () => {
      // Инвалидируем кеш для обновления бюджетной сводки
      queryClient.invalidateQueries({ queryKey: ["/api/budget-summary"] });
      
      toast({
        title: "Бюджет спланирован",
        description: "Ваш бюджет на месяц успешно спланирован",
      });
      
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Ошибка планирования",
        description: "Не удалось запланировать бюджет. Пожалуйста, попробуйте снова.",
        variant: "destructive",
      });
      console.error("Budget planning error:", error);
    },
  });

  // Обработчик распределения нераспределенного бюджета
  const distributeUnallocated = () => {
    if (unallocated <= 0) return;
    
    const categories = Object.keys(categoryAllocations);
    if (categories.length === 0) return;
    
    const allocation = unallocated / categories.length;
    
    const newAllocations = { ...categoryAllocations };
    categories.forEach(category => {
      newAllocations[category] = Math.round((newAllocations[category] || 0) + allocation);
    });
    
    form.setValue("categoryAllocations", newAllocations);
  };

  // Обработчик отправки формы
  function onSubmit(values: BudgetPlanningFormValues) {
    setHasSubmitted(true);
    
    // Проверяем, что сумма распределений не превышает общий бюджет
    const totalAllocated = Object.values(values.categoryAllocations).reduce((sum, amount) => sum + Number(amount), 0);
    
    if (totalAllocated > values.totalBudget) {
      toast({
        title: "Ошибка планирования",
        description: "Сумма распределений превышает общий бюджет",
        variant: "destructive",
      });
      return;
    }
    
    // Если есть нераспределенный бюджет и пользователь подтверждает
    if (unallocated > 0) {
      const confirm = window.confirm(`У вас остались нераспределенные средства (${formatCurrency(unallocated)}). Хотите распределить их автоматически?`);
      if (confirm) {
        distributeUnallocated();
        return;
      }
    }
    
    planBudgetMutation.mutate(values);
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

  // Расчет процента распределения для категории
  const calculatePercentage = (amount: number) => {
    if (totalBudget <= 0) return 0;
    return Math.round((amount / totalBudget) * 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Планирование бюджета на месяц</DialogTitle>
          <DialogDescription>
            Укажите общий бюджет и распределите его по категориям расходов
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="totalBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">Общий бюджет на месяц</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                      <Input
                        {...field}
                        type="number"
                        placeholder="100000"
                        className="text-lg"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Распределение бюджета по категориям</h3>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">
                      Нераспределенный бюджет: <span className={unallocated > 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(unallocated)}</span>
                    </CardTitle>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={distributeUnallocated}
                      disabled={unallocated <= 0}
                    >
                      Распределить автоматически
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {DEFAULT_CATEGORIES.map((category) => (
                      <div key={category.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full ${category.color} mr-2`}></div>
                            <FormLabel className="text-sm font-medium">{category.name}</FormLabel>
                          </div>
                          <FormField
                            control={form.control}
                            name={`categoryAllocations.${category.name}`}
                            render={({ field }) => (
                              <FormItem className="flex-1 max-w-[150px]">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    className="text-right"
                                    placeholder="0"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name={`categoryAllocations.${category.name}`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Slider
                                    value={[Number(field.value)]}
                                    max={totalBudget}
                                    step={1000}
                                    onValueChange={(value) => field.onChange(value[0])}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <span className="text-xs text-gray-500 w-12 text-right">
                            {calculatePercentage(categoryAllocations[category.name] || 0)}%
                          </span>
                        </div>
                        
                        <Progress 
                          value={calculatePercentage(categoryAllocations[category.name] || 0)} 
                          className={`h-2 ${category.color}`} 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={planBudgetMutation.isPending}>
                {planBudgetMutation.isPending ? (
                  "Планирование..."
                ) : (
                  <>
                    Спланировать бюджет
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}