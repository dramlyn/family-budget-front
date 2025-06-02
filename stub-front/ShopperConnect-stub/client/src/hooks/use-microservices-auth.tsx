import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { 
  UserDto, 
  RegisterParent, 
  RegisterUser
} from "@shared/microservices-types";
import { userServiceApi } from "../lib/microservices-api";
import { keycloakAuth, KeycloakConfig } from "../lib/keycloak-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "../lib/queryClient";

type AuthContextType = {
  user: UserDto | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  registerParentMutation: UseMutationResult<UserDto, Error, RegisterParent>;
  registerUserMutation: UseMutationResult<UserDto, Error, RegisterUser>;
  initKeycloak: (config: KeycloakConfig) => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Инициализация Keycloak и проверка аутентификации
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Инициализируем Keycloak
        const { keycloakConfig, KEYCLOAK_CLIENT_SECRET } = await import("../config/keycloak");
        keycloakAuth.init(keycloakConfig);

        // Проверяем, есть ли код в URL (после редиректа от Keycloak)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          // Обмениваем код на токены
          await keycloakAuth.exchangeCodeForTokens(code, KEYCLOAK_CLIENT_SECRET);
          
          // Получаем информацию о пользователе от Keycloak
          const userInfo = await keycloakAuth.getUserInfo();
          if (userInfo) {
            // Создаем объект пользователя из Keycloak данных
            const userData: UserDto = {
              id: 0, // Будет обновлено после запроса к User Service
              email: userInfo.email,
              firstName: userInfo.given_name,
              lastName: userInfo.family_name,
              familyId: 0, // Будет обновлено после запроса к User Service
              keycloakId: userInfo.sub,
              role: "USER", // По умолчанию, может быть обновлено
              createdAt: new Date().toISOString(),
            };
            
            setUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
          }
          
          // Очищаем URL от параметров
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (keycloakAuth.isAuthenticated()) {
          // Пользователь уже аутентифицирован, получаем его данные
          const savedUser = localStorage.getItem('currentUser');
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch (e) {
              localStorage.removeItem('currentUser');
            }
          }
        }
      } catch (error) {
        console.error('Ошибка инициализации аутентификации:', error);
        setError(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Функция для входа через Keycloak
  const login = () => {
    keycloakAuth.login();
  };

  // Функция для выхода
  const logout = async () => {
    try {
      await keycloakAuth.logout();
      setUser(null);
      setError(null);
      toast({
        title: "Выход выполнен",
        description: "До свидания!",
      });
    } catch (error) {
      toast({
        title: "Ошибка выхода",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // Функция для инициализации Keycloak (если нужно)
  const initKeycloak = (config: any) => {
    keycloakAuth.init(config);
  };

  const registerParentMutation = useMutation({
    mutationFn: async (data: RegisterParent) => {
      return userServiceApi.registerParent(data);
    },
    onSuccess: (user: UserDto) => {
      setUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setError(null);
      toast({
        title: "Регистрация успешна!",
        description: `Добро пожаловать, ${user.firstName}! Семья создана.`,
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: "Ошибка регистрации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerUserMutation = useMutation({
    mutationFn: async (data: RegisterUser) => {
      return userServiceApi.registerUser(data);
    },
    onSuccess: (user: UserDto) => {
      setUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setError(null);
      toast({
        title: "Регистрация успешна!",
        description: `Добро пожаловать в семью, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: "Ошибка регистрации",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      return userServiceApi.forgotPassword(email);
    },
    onSuccess: () => {
      toast({
        title: "Письмо отправлено",
        description: "Проверьте вашу почту для восстановления пароля",
      });
    },
    onError: (error: Error) => {
      setError(error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Очищаем локальные данные
      localStorage.removeItem('currentUser');
      setUser(null);
      setError(null);
    },
    onSuccess: () => {
      toast({
        title: "Выход выполнен",
        description: "До свидания!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка выхода",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isAuthenticated: keycloakAuth.isAuthenticated(),
        login,
        logout,
        registerParentMutation,
        registerUserMutation,
        initKeycloak,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}