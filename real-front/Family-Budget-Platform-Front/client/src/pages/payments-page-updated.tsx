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
import { 
  Menu, 
  CreditCard, 
  Plus, 
  Check, 
  Trash2, 
  Loader2,
  Calendar,
  AlertCircle
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
import { Logo } from "@/components/layout/logo";
import { useToast } from "@/hooks/use-toast";

// Схема для добавления обязательного платежа
const addPaymentSchema = z.object({
  name: z.string().min(2, "Название должно содержать не менее 2 символов"),
  amount: z.number().min(0.01, "Сумма должна быть больше 0"),
});

type AddPaymentFormValues = z.infer<typeof addPaymentSchema>;

export default function PaymentsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const initials = user 
    ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '')
    : 'ИП';

  const addPaymentForm = useForm<AddPaymentFormValues>({
    resolver: zodResolver(addPaymentSchema),
    defaultValues: {
      name: "",
      amount: 0,
    },
  });

  // Получаем текущего пользователя
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => userServiceApi.getCurrentUser(),
  });

  // Получаем обязательные платежи семьи
  const { data: payments, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ["mandatory-payments", currentUser?.familyId],
    queryFn: () => familyBudgetServiceApi.getFamilyMandatoryPayments(currentUser!.familyId),
    enabled: !!currentUser?.familyId,
  });

  // Мутация для добавления платежа
  const addPaymentMutation = useMutation({
    mutationFn: async (data: AddPaymentFormValues) => {
      if (!currentUser?.familyId) throw new Error("ID семьи не найден");
      return familyBudgetServiceApi.createMandatoryPayment({
        name: data.name,
        amount: data.amount,
        familyId: currentUser.familyId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Платеж добавлен",
        description: "Новый обязательный платеж успешно создан",
      });
      queryClient.invalidateQueries({ queryKey: ["mandatory-payments"] });
      setAddPaymentOpen(false);
      addPaymentForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка создания платежа",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для закрытия платежа
  const closePaymentMutation = useMutation({
    mutationFn: (paymentId: number) => familyBudgetServiceApi.closeMandatoryPayment(paymentId),
    onSuccess: () => {
      toast({
        title: "Платеж закрыт",
        description: "Обязательный платеж отмечен как оплаченный",
      });
      queryClient.invalidateQueries({ queryKey: ["mandatory-payments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка закрытия платежа",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для удаления платежа
  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) => familyBudgetServiceApi.deleteMandatoryPayment(paymentId),
    onSuccess: () => {
      toast({
        title: "Платеж удален",
        description: "Обязательный платеж успешно удален",
      });
      queryClient.invalidateQueries({ queryKey: ["mandatory-payments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка удаления платежа",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onAddPaymentSubmit = async (values: AddPaymentFormValues) => {
    addPaymentMutation.mutate(values);
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
                <h1 className="text-3xl font-bold text-gray-900">Обязательные платежи</h1>
                <p className="text-gray-600 mt-2">Управление регулярными платежами семьи</p>
              </div>
              
              {/* Кнопка добавления только для родителей */}
              {isParent && (
                <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить платеж
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Добавить новый обязательный платеж</DialogTitle>
                      <DialogDescription>
                        Создайте новый регулярный платеж для семьи
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...addPaymentForm}>
                      <form onSubmit={addPaymentForm.handleSubmit(onAddPaymentSubmit)} className="space-y-4">
                        <FormField
                          control={addPaymentForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Название платежа</FormLabel>
                              <FormControl>
                                <Input placeholder="Коммунальные услуги" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={addPaymentForm.control}
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

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setAddPaymentOpen(false)}>
                            Отмена
                          </Button>
                          <Button type="submit" disabled={addPaymentMutation.isPending}>
                            {addPaymentMutation.isPending && (
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

            {isPaymentsLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Загрузка платежей...</div>
              </div>
            )}

            {/* Список обязательных платежей */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Список обязательных платежей
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payments && payments.length > 0 ? (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${payment.paid ? 'bg-green-100' : 'bg-orange-100'}`}>
                            {payment.paid ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-orange-600" />
                            )}
                          </div>
                          
                          <div>
                            <h3 className="font-semibold text-gray-900">{payment.name}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={payment.paid ? "default" : "destructive"}>
                                {payment.paid ? "Оплачен" : "Не оплачен"}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                Создан: {formatDate(payment.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              {payment.amount.toFixed(2)} ₽
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {payment.id}
                            </div>
                          </div>

                          {/* Действия для родителей */}
                          {isParent && (
                            <div className="flex space-x-2">
                              {!payment.paid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => closePaymentMutation.mutate(payment.id)}
                                  disabled={closePaymentMutation.isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Закрыть
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deletePaymentMutation.mutate(payment.id)}
                                disabled={deletePaymentMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <div className="text-lg font-medium">Нет обязательных платежей</div>
                    <div className="text-sm">
                      {isParent 
                        ? "Добавьте первый обязательный платеж для семьи" 
                        : "В вашей семье пока нет обязательных платежей"
                      }
                    </div>
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