import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-microservices-auth";
import { registerParentSchema, type RegisterParent } from "@shared/microservices-types";

export function LoginForm({ onForgotPasswordClick }: { onForgotPasswordClick: () => void }) {
  const { login } = useAuth();
  
  function handleLogin() {
    login();
  }

  return (
    <div className="space-y-6">
      <Button onClick={handleLogin} className="w-full">
        Войти через Keycloak
      </Button>
      
      <div className="text-center">
        <Button variant="link" size="sm" onClick={onForgotPasswordClick}>
          Забыли пароль?
        </Button>
      </div>
    </div>
  );
}

export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin?: () => void }) {
  const { registerParentMutation } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  
  const form = useForm<RegisterParent>({
    resolver: zodResolver(registerParentSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      familyName: "",
    },
  });

  function onSubmit(values: RegisterParent) {
    setIsLoading(true);
    registerParentMutation.mutate(values, {
      onSuccess: () => {
        setIsLoading(false);
        form.reset();
        
        // Показываем уведомление об успешной регистрации
        toast({
          title: "Семья успешно зарегистрирована!",
          description: "Подтвердите свой аккаунт на электронной почте",
          duration: 6000,
        });
        
        // Переключаемся на вкладку входа
        if (onSwitchToLogin) {
          onSwitchToLogin();
        } else {
          navigate('/auth?tab=login');
        }
      },
      onError: () => {
        setIsLoading(false);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Имя</FormLabel>
                <FormControl>
                  <Input placeholder="Иван" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Фамилия</FormLabel>
                <FormControl>
                  <Input placeholder="Петров" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ivan@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="familyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название семьи</FormLabel>
              <FormControl>
                <Input placeholder="Семья Петровых" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        

        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Создание семьи...
            </>
          ) : (
            "Создать семью"
          )}
        </Button>
      </form>
    </Form>
  );
}

export function ForgotPasswordForm() {
  return (
    <div className="space-y-6">
      <p className="text-center text-gray-600">
        Для восстановления пароля обратитесь к администратору Keycloak
      </p>
      <Button 
        onClick={() => window.location.href = 'http://localhost:1111/realms/master/login-actions/reset-credentials'}
        className="w-full"
      >
        Восстановить пароль
      </Button>
    </div>
  );
}