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

// Тип для члена семьи из API
interface FamilyMember {
  firstName: string;
  lastName: string;
  role: string;
}

// Схема для добавления члена семьи
const addMemberSchema = z.object({
  email: z.string().email("Введите корректный email"),
  firstName: z.string().min(2, "Имя должно содержать не менее 2 символов"),
  lastName: z.string().min(2, "Фамилия должна содержать не менее 2 символов"),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

export default function FamilyPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
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

  // Получаем информацию о текущем пользователе для familyId
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => userServiceApi.getCurrentUser(),
  });

  // Получаем всех членов семьи
  const { data: familyMembers, isLoading: isMembersLoading, error: membersError } = useQuery({
    queryKey: ["family-members", currentUser?.familyId],
    queryFn: () => userServiceApi.getFamilyMembers(currentUser!.familyId),
    enabled: !!currentUser?.familyId,
  });

  const isLoading = isUserLoading || isMembersLoading;

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
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Состав семьи</h1>
              <p className="text-gray-600 mt-2">Управление членами семьи и их ролями</p>
            </div>

            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <div className="text-lg text-gray-600">Загрузка данных о семье...</div>
              </div>
            )}

            {/* Информация о текущем пользователе */}
            {currentUser && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Информация о семье
                  </CardTitle>
                  <CardDescription>
                    GET /v1/users/whoami
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><strong>ID семьи:</strong> {currentUser.familyId}</div>
                    <div><strong>Ваша роль:</strong> {getRoleLabel(currentUser.role)}</div>
                    <div><strong>Email:</strong> {currentUser.email}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Список членов семьи */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Члены семьи
                </CardTitle>
                <CardDescription>
                  GET /v1/family/members/{currentUser?.familyId || 'loading'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {membersError ? (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-2">Ошибка загрузки членов семьи</div>
                    <div className="text-sm text-gray-500">{membersError.message}</div>
                  </div>
                ) : familyMembers && familyMembers.length > 0 ? (
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
                          <div className="flex items-center space-x-2 text-amber-600">
                            <Crown className="h-5 w-5" />
                            <span className="text-sm font-medium">Администратор</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <div className="text-lg font-medium">Нет членов семьи</div>
                    <div className="text-sm">Члены семьи не найдены</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Информация об API */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Информация об API</CardTitle>
                <CardDescription>Эндпоинты для работы с семьей</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Текущий пользователь:</strong> GET /v1/users/whoami
                  </div>
                  <div>
                    <strong>Члены семьи:</strong> GET /v1/family/members/{currentUser?.familyId || '{familyId}'}
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <strong>Пример ответа:</strong>
                    <pre className="text-xs mt-2 text-gray-600">
{`[
  {
    "firstName": "Виктор1",
    "lastName": "Артамонов", 
    "role": "PARENT"
  }
]`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}