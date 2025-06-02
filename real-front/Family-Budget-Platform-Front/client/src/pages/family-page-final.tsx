import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-microservices-auth";
import { userServiceApi } from "@/lib/microservices-api";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Users, Crown, User as UserIcon, Plus, Loader2 } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/layout/logo";
import { useToast } from "@/hooks/use-toast";

// Схема для добавления пользователя
const addMemberSchema = z.object({
  email: z.string().email("Введите корректный email"),
  firstName: z.string().min(2, "Имя должно содержать не менее 2 символов"),
  lastName: z.string().min(2, "Фамилия должна содержать не менее 2 символов"),
});

// Схема для добавления родителя
const addParentSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль должен содержать не менее 6 символов"),
  firstName: z.string().min(2, "Имя должно содержать не менее 2 символов"),
  lastName: z.string().min(2, "Фамилия должна содержать не менее 2 символов"),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;
type AddParentFormValues = z.infer<typeof addParentSchema>;

export default function FamilyPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addParentOpen, setAddParentOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const initials = user 
    ? (user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '')
    : 'ИП';

  const addMemberForm = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  const addParentForm = useForm<AddParentFormValues>({
    resolver: zodResolver(addParentSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  // Получаем информацию о текущем пользователе
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => userServiceApi.getCurrentUser(),
  });

  // Получаем всех членов семьи
  const { data: familyMembers, isLoading: isMembersLoading } = useQuery({
    queryKey: ["family-members", currentUser?.familyId],
    queryFn: () => userServiceApi.getFamilyMembers(currentUser!.familyId),
    enabled: !!currentUser?.familyId,
  });

  // Мутация для добавления нового члена семьи (пользователя)
  const addMemberMutation = useMutation({
    mutationFn: async (data: AddMemberFormValues) => {
      if (!currentUser?.familyId) throw new Error("ID семьи не найден");
      return userServiceApi.addFamilyMember({
        ...data,
        familyId: currentUser.familyId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Пользователь добавлен",
        description: "Новый пользователь успешно добавлен в семью",
      });
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      setAddMemberOpen(false);
      addMemberForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка добавления пользователя",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Мутация для добавления нового родителя
  const addParentMutation = useMutation({
    mutationFn: async (data: AddParentFormValues) => {
      if (!currentUser?.familyId) throw new Error("ID семьи не найден");
      return userServiceApi.addParentToFamily(currentUser.familyId, data);
    },
    onSuccess: () => {
      toast({
        title: "Родитель добавлен",
        description: "Новый родитель успешно добавлен в семью",
      });
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      setAddParentOpen(false);
      addParentForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка добавления родителя",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onAddMemberSubmit = async (values: AddMemberFormValues) => {
    addMemberMutation.mutate(values);
  };

  const onAddParentSubmit = async (values: AddParentFormValues) => {
    addParentMutation.mutate(values);
  };

  const isLoading = isUserLoading || isMembersLoading;

  // Подсчет родителей в семье
  const parentsCount = familyMembers?.filter(member => member.role === 'PARENT').length || 0;
  const canAddParent = parentsCount < 2;

  // Функция для получения инициалов
  const getInitials = (firstName: string, lastName: string) => {
    return (firstName?.charAt(0) || '') + (lastName?.charAt(0) || '');
  };

  // Функция для получения роли на русском
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'PARENT':
        return 'Родитель';
      case 'USER':
        return 'Пользователь';
      default:
        return role;
    }
  };

  // Функция для получения иконки роли
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PARENT':
        return <Crown className="h-4 w-4 text-amber-600" />;
      case 'USER':
        return <UserIcon className="h-4 w-4 text-blue-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  // Функция для получения цвета роли
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'PARENT':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'USER':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
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
                <h1 className="text-3xl font-bold text-gray-900">Состав семьи</h1>
                <p className="text-gray-600 mt-2">Управление членами семьи</p>
              </div>
              
              {/* Кнопки добавления только для родителей */}
              {currentUser?.role === 'PARENT' && (
                <div className="flex space-x-3">
                  {/* Кнопка добавления пользователя */}
                  <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить пользователя
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Добавить нового члена семьи</DialogTitle>
                      <DialogDescription>
                        Заполните информацию о новом члене семьи
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...addMemberForm}>
                      <form onSubmit={addMemberForm.handleSubmit(onAddMemberSubmit)} className="space-y-4">
                        <FormField
                          control={addMemberForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input placeholder="viktor51@mail.ru" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={addMemberForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Имя</FormLabel>
                              <FormControl>
                                <Input placeholder="viktor2" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={addMemberForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Фамилия</FormLabel>
                              <FormControl>
                                <Input placeholder="art" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setAddMemberOpen(false)}>
                            Отмена
                          </Button>
                          <Button type="submit" disabled={addMemberMutation.isPending}>
                            {addMemberMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Добавить
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                  {/* Кнопка добавления родителя */}
                  {canAddParent && (
                    <Dialog open={addParentOpen} onOpenChange={setAddParentOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Добавить родителя
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Добавить нового родителя</DialogTitle>
                          <DialogDescription>
                            Добавьте второго родителя в семью (максимум 2 родителя)
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...addParentForm}>
                          <form onSubmit={addParentForm.handleSubmit(onAddParentSubmit)} className="space-y-4">
                            <FormField
                              control={addParentForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input placeholder="viktor91@mail.ru" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={addParentForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Пароль</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="password" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={addParentForm.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Имя</FormLabel>
                                  <FormControl>
                                    <Input placeholder="viktor2" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={addParentForm.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Фамилия</FormLabel>
                                  <FormControl>
                                    <Input placeholder="art" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setAddParentOpen(false)}>
                                Отмена
                              </Button>
                              <Button type="submit" disabled={addParentMutation.isPending}>
                                {addParentMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Добавить родителя
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </div>

            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Загрузка данных о семье...</div>
              </div>
            )}

            {/* Список членов семьи */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Члены семьи
                </CardTitle>
              </CardHeader>
              <CardContent>
                {familyMembers && familyMembers.length > 0 ? (
                  <div className="space-y-4">
                    {familyMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {member.firstName} {member.lastName}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              {getRoleIcon(member.role)}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}>
                                {getRoleLabel(member.role)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {member.role === 'PARENT' && (
                          <Crown className="h-5 w-5 text-amber-600" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <div className="text-lg font-medium">Нет членов семьи</div>
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