import { useState } from "react";
import { useAuth } from "@/hooks/use-microservices-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Plus, Trash2, Edit, MoreVertical, User } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Тип для члена семьи
type FamilyMember = {
  id: number;
  name: string;
  relation: string;
  age: number;
  budgetAccess: "full" | "limited" | "none";
};

// Пример данных
const mockFamilyMembers: FamilyMember[] = [
  {
    id: 1,
    name: "Анна Иванова",
    relation: "Жена",
    age: 32,
    budgetAccess: "full",
  },
  {
    id: 2,
    name: "Максим Иванов",
    relation: "Сын",
    age: 10,
    budgetAccess: "none",
  },
  {
    id: 3,
    name: "Ольга Иванова",
    relation: "Дочь",
    age: 14,
    budgetAccess: "limited",
  },
  {
    id: 4,
    name: "Мария Петрова",
    relation: "Бабушка",
    age: 65,
    budgetAccess: "limited",
  },
];

// Схема для нового члена семьи
const familyMemberSchema = z.object({
  name: z.string().min(2, "Имя должно содержать не менее 2 символов"),
  relation: z.string().min(1, "Выберите родственную связь"),
  age: z.coerce.number().min(0, "Возраст должен быть положительным числом").max(120, "Введите корректный возраст"),
  budgetAccess: z.enum(["full", "limited", "none"]),
});

type FamilyMemberFormValues = z.infer<typeof familyMemberSchema>;

export default function FamilyPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(mockFamilyMembers);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const { toast } = useToast();
  
  const initials = user 
    ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '') || (user.username.substring(0, 2))
    : 'ИП';
  
  const form = useForm<FamilyMemberFormValues>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: {
      name: "",
      relation: "",
      age: 0,
      budgetAccess: "none",
    },
  });

  const editMember = (member: FamilyMember) => {
    setEditingMemberId(member.id);
    form.reset({
      name: member.name,
      relation: member.relation,
      age: member.age,
      budgetAccess: member.budgetAccess,
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  function onSubmit(values: FamilyMemberFormValues) {
    setIsAdding(true);
    
    setTimeout(() => {
      if (isEditing && editingMemberId) {
        // Обновление существующего члена семьи
        setFamilyMembers(familyMembers.map(member => 
          member.id === editingMemberId 
            ? { ...member, ...values } 
            : member
        ));
        
        toast({
          title: "Информация обновлена",
          description: `Данные о ${values.name} были обновлены`,
        });
      } else {
        // Добавление нового члена семьи
        const newMember: FamilyMember = {
          id: Date.now(),
          name: values.name,
          relation: values.relation,
          age: values.age,
          budgetAccess: values.budgetAccess,
        };
        
        setFamilyMembers([...familyMembers, newMember]);
        
        toast({
          title: "Член семьи добавлен",
          description: `${values.name} был добавлен в состав семьи`,
        });
      }
      
      setIsAdding(false);
      setIsEditing(false);
      setEditingMemberId(null);
      setDialogOpen(false);
      form.reset();
    }, 1000);
  }

  // Удаление члена семьи
  const deleteMember = (id: number) => {
    const member = familyMembers.find(m => m.id === id);
    
    setFamilyMembers(familyMembers.filter(member => member.id !== id));
    
    toast({
      title: "Член семьи удален",
      description: `${member?.name} был удален из состава семьи`,
      variant: "destructive",
    });
  };

  // Получение строки доступа
  const getBudgetAccessString = (access: string) => {
    switch (access) {
      case "full":
        return "Полный доступ";
      case "limited":
        return "Ограниченный доступ";
      case "none":
        return "Нет доступа";
      default:
        return "Неизвестно";
    }
  };
  
  // Получение цвета для уровня доступа
  const getBudgetAccessColor = (access: string) => {
    switch (access) {
      case "full":
        return "bg-green-100 text-green-800";
      case "limited":
        return "bg-yellow-100 text-yellow-800";
      case "none":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Получение инициалов
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
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
                <h1 className="text-2xl font-semibold text-gray-900">Состав семьи</h1>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) {
                    setIsEditing(false);
                    setEditingMemberId(null);
                    form.reset();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      form.reset();
                      setIsEditing(false);
                      setEditingMemberId(null);
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить члена семьи
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{isEditing ? "Редактировать" : "Добавить"} члена семьи</DialogTitle>
                      <DialogDescription>
                        {isEditing ? "Измените информацию о члене семьи" : "Добавьте нового члена семьи"}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Имя и фамилия</FormLabel>
                              <FormControl>
                                <Input placeholder="Например: Иван Иванов" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="relation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Родственная связь</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите связь" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Муж">Муж</SelectItem>
                                    <SelectItem value="Жена">Жена</SelectItem>
                                    <SelectItem value="Сын">Сын</SelectItem>
                                    <SelectItem value="Дочь">Дочь</SelectItem>
                                    <SelectItem value="Отец">Отец</SelectItem>
                                    <SelectItem value="Мать">Мать</SelectItem>
                                    <SelectItem value="Дедушка">Дедушка</SelectItem>
                                    <SelectItem value="Бабушка">Бабушка</SelectItem>
                                    <SelectItem value="Другое">Другое</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="age"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Возраст</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="30"
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
                          name="budgetAccess"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Доступ к бюджету</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите уровень доступа" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="full">Полный доступ</SelectItem>
                                    <SelectItem value="limited">Ограниченный доступ</SelectItem>
                                    <SelectItem value="none">Нет доступа</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button type="submit" disabled={isAdding}>
                            {isAdding ? "Сохранение..." : isEditing ? "Сохранить изменения" : "Добавить"}
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
                  <CardTitle className="text-lg">Члены семьи</CardTitle>
                </CardHeader>
                <CardContent>
                  {familyMembers.length === 0 ? (
                    <div className="text-center py-12">
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Нет членов семьи</h3>
                      <p className="mt-1 text-sm text-gray-500">Добавьте членов вашей семьи</p>
                      <div className="mt-6">
                        <Button onClick={() => setDialogOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Добавить члена семьи
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {familyMembers.map((member) => (
                        <div key={member.id} className="bg-white overflow-hidden border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          <div className="px-4 py-5 sm:p-6">
                            <div className="flex items-center">
                              <Avatar className="h-12 w-12 bg-primary-100 text-primary-800">
                                <AvatarFallback>
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="ml-4 flex-1">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-lg font-medium text-gray-900">{member.name}</h3>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => editMember(member)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        <span>Редактировать</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => deleteMember(member.id)}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        <span>Удалить</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                  <User className="h-4 w-4 mr-1 text-gray-400" />
                                  <span>{member.relation}, {member.age} лет</span>
                                </div>
                                <div className="mt-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBudgetAccessColor(member.budgetAccess)}`}>
                                    {getBudgetAccessString(member.budgetAccess)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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