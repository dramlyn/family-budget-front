import { useState } from "react";
import { useAuth } from "@/hooks/use-microservices-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Plus, Trash2, Calendar, DollarSign, MoreVertical, CheckCircle2, XCircle } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Тип для обязательного платежа
type Payment = {
  id: number;
  name: string;
  amount: number;
  dueDate: string; // день месяца
  category: string;
  isCompleted: boolean;
};

// Пример данных
const mockPayments: Payment[] = [
  {
    id: 1,
    name: "Аренда квартиры",
    amount: 25000,
    dueDate: "1",
    category: "Жилье",
    isCompleted: true,
  },
  {
    id: 2,
    name: "Электроэнергия",
    amount: 1500,
    dueDate: "10",
    category: "Коммунальные услуги",
    isCompleted: false,
  },
  {
    id: 3,
    name: "Интернет",
    amount: 800,
    dueDate: "15",
    category: "Связь",
    isCompleted: false,
  },
  {
    id: 4,
    name: "Кредит",
    amount: 10000,
    dueDate: "20",
    category: "Финансы",
    isCompleted: false,
  },
  {
    id: 5,
    name: "Мобильная связь",
    amount: 500,
    dueDate: "25",
    category: "Связь",
    isCompleted: true,
  },
];

// Схема для нового платежа
const paymentSchema = z.object({
  name: z.string().min(3, "Название должно содержать не менее 3 символов"),
  amount: z.coerce.number().min(1, "Сумма должна быть положительным числом"),
  dueDate: z.string().min(1, "Выберите день платежа"),
  category: z.string().min(1, "Выберите категорию"),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function PaymentsPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const initials = user 
    ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '') || (user.username.substring(0, 2))
    : 'ИП';
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      name: "",
      amount: 0,
      dueDate: "",
      category: "",
    },
  });

  function onSubmit(values: PaymentFormValues) {
    setIsAddingPayment(true);
    
    // Имитация отправки данных
    setTimeout(() => {
      const newPayment: Payment = {
        id: Date.now(),
        name: values.name,
        amount: values.amount,
        dueDate: values.dueDate,
        category: values.category,
        isCompleted: false,
      };
      
      setPayments([...payments, newPayment]);
      
      toast({
        title: "Платеж добавлен",
        description: "Обязательный платеж был успешно добавлен",
      });
      
      setIsAddingPayment(false);
      setDialogOpen(false);
      form.reset();
    }, 1000);
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
  
  // Обработчик изменения статуса платежа
  const togglePaymentStatus = (id: number) => {
    setPayments(payments.map(payment => 
      payment.id === id ? { ...payment, isCompleted: !payment.isCompleted } : payment
    ));
    
    const payment = payments.find(p => p.id === id);
    
    toast({
      title: payment?.isCompleted ? "Платеж отмечен как неоплаченный" : "Платеж отмечен как оплаченный",
      description: `${payment?.name} - ${formatCurrency(payment?.amount || 0)}`,
    });
  };
  
  // Удаление платежа
  const deletePayment = (id: number) => {
    const payment = payments.find(p => p.id === id);
    
    setPayments(payments.filter(payment => payment.id !== id));
    
    toast({
      title: "Платеж удален",
      description: `${payment?.name} был удален из списка`,
      variant: "destructive",
    });
  };

  // Расчет общей суммы платежей
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Расчет суммы оплаченных платежей
  const paidAmount = payments
    .filter(payment => payment.isCompleted)
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  // Расчет количества оплаченных платежей
  const paidCount = payments.filter(payment => payment.isCompleted).length;

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
                <h1 className="text-2xl font-semibold text-gray-900">Обязательные платежи</h1>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить платеж
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Новый обязательный платеж</DialogTitle>
                      <DialogDescription>
                        Добавьте информацию о регулярном платеже
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Название</FormLabel>
                              <FormControl>
                                <Input placeholder="Например: Аренда квартиры" {...field} />
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
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>День платежа</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите день" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 31 }, (_, i) => (
                                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                                        {i + 1}
                                      </SelectItem>
                                    ))}
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
                                    <SelectItem value="Жилье">Жилье</SelectItem>
                                    <SelectItem value="Коммунальные услуги">Коммунальные услуги</SelectItem>
                                    <SelectItem value="Связь">Связь</SelectItem>
                                    <SelectItem value="Финансы">Финансы</SelectItem>
                                    <SelectItem value="Подписки">Подписки</SelectItem>
                                    <SelectItem value="Образование">Образование</SelectItem>
                                    <SelectItem value="Другое">Другое</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button type="submit" disabled={isAddingPayment}>
                            {isAddingPayment ? "Добавление..." : "Добавить"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
              {/* Статистика платежей */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Всего платежей</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{payments.length}</div>
                      <div className="ml-2 text-sm text-gray-500">платежей</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Оплачено</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline">
                      <div className="text-2xl font-semibold text-green-600">{paidCount}</div>
                      <div className="ml-2 text-sm text-gray-500">из {payments.length}</div>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{formatCurrency(paidAmount)} из {formatCurrency(totalAmount)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Осталось оплатить</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline">
                      <div className="text-2xl font-semibold text-red-600">{formatCurrency(totalAmount - paidAmount)}</div>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{payments.length - paidCount} платежей</div>
                  </CardContent>
                </Card>
              </div>
            
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Список обязательных платежей</CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-12">
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Нет платежей</h3>
                      <p className="mt-1 text-sm text-gray-500">Добавьте свой первый обязательный платеж</p>
                      <div className="mt-6">
                        <Button onClick={() => setDialogOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Добавить платеж
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Категория</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">День платежа</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center">
                                  <Checkbox
                                    id={`payment-${payment.id}`}
                                    checked={payment.isCompleted}
                                    onCheckedChange={() => togglePaymentStatus(payment.id)}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                <div className="flex items-center">
                                  {payment.isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500 mr-2" />
                                  )}
                                  {payment.name}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">{payment.category}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                  {payment.dueDate} число каждого месяца
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-right">
                                <div className="flex items-center justify-end">
                                  <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                                  {formatCurrency(payment.amount)}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (window.confirm("Вы уверены, что хотите удалить этот платеж?")) {
                                      deletePayment(payment.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
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