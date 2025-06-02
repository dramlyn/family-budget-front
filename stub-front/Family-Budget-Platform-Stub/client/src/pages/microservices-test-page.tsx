import { useState } from "react";
import { useAuth } from "@/hooks/use-microservices-auth";
import { microservicesApi } from "@/lib/microservices-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, CreditCard, Target, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MicroservicesTestPage() {
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setTesting(prev => ({ ...prev, [testName]: true }));
    try {
      const result = await testFn();
      setTestResults(prev => ({ ...prev, [testName]: { success: true, data: result } }));
      toast({
        title: "Тест успешен",
        description: `${testName} выполнен успешно`,
      });
    } catch (error) {
      setTestResults(prev => ({ ...prev, [testName]: { success: false, error: (error as Error).message } }));
      toast({
        title: "Ошибка теста",
        description: `${testName}: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setTesting(prev => ({ ...prev, [testName]: false }));
    }
  };

  const testUserService = () => runTest("User Service", async () => {
    // Тест создания семьи
    const family = await microservicesApi.user.createFamily({
      name: "Тестовая семья",
      description: "Семья для тестирования API"
    });
    return family;
  });

  const testTransactionService = () => runTest("Transaction Service", async () => {
    if (!user?.id) throw new Error("Пользователь не найден");
    
    // Тест создания транзакции
    const transaction = await microservicesApi.transaction.createTransaction({
      type: "SPEND",
      amount: 1000,
      categoryId: 1,
      userId: user.id,
    });
    return transaction;
  });

  const testFamilyBudgetService = () => runTest("Family Budget Service", async () => {
    // Тест получения категорий
    const categories = await microservicesApi.familyBudget.getAllCategories();
    return categories;
  });

  const testGoalsService = () => runTest("Goals Service", async () => {
    if (!user?.familyId) throw new Error("Семья не найдена");
    
    // Тест создания цели
    const goal = await microservicesApi.familyBudget.createGoal({
      cost: 50000,
      name: "Тестовая цель накопления",
      description: "Цель для тестирования API",
      familyId: user.familyId,
    });
    return goal;
  });

  const renderTestResult = (testName: string) => {
    const result = testResults[testName];
    const isTestingNow = testing[testName];

    if (isTestingNow) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    if (!result) {
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }

    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }

    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Тестирование микросервисов</h1>
        <p className="text-muted-foreground">
          Проверка интеграции с User Service, Transaction Service и Family Budget Service
        </p>
      </div>

      {/* Статус аутентификации */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Статус аутентификации
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isAuthenticated && user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Аутентифицирован</Badge>
                <span className="text-sm">{user.email}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {user.firstName} {user.lastName} • Family ID: {user.familyId} • Role: {user.role}
              </p>
              <Button onClick={logout} variant="outline" size="sm">
                Выйти
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Badge variant="destructive">Не аутентифицирован</Badge>
              <p className="text-sm text-muted-foreground">
                Необходимо войти через Keycloak для тестирования API
              </p>
              <Button onClick={login} size="sm">
                Войти через Keycloak
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Тесты микросервисов */}
      {isAuthenticated && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Service */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Service
                {renderTestResult("User Service")}
              </CardTitle>
              <CardDescription>
                Тестирование управления пользователями и семьями (порт 8081)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testUserService} 
                disabled={testing["User Service"]}
                className="w-full"
              >
                {testing["User Service"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать тестовую семью
              </Button>
              {testResults["User Service"] && (
                <div className="text-xs">
                  <pre className="bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(testResults["User Service"], null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Service */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Transaction Service
                {renderTestResult("Transaction Service")}
              </CardTitle>
              <CardDescription>
                Тестирование управления транзакциями (порт 8082)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testTransactionService} 
                disabled={testing["Transaction Service"]}
                className="w-full"
              >
                {testing["Transaction Service"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать тестовую транзакцию
              </Button>
              {testResults["Transaction Service"] && (
                <div className="text-xs">
                  <pre className="bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(testResults["Transaction Service"], null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Family Budget Service - Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Budget Service
                {renderTestResult("Family Budget Service")}
              </CardTitle>
              <CardDescription>
                Тестирование управления категориями и бюджетом (порт 8083)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testFamilyBudgetService} 
                disabled={testing["Family Budget Service"]}
                className="w-full"
              >
                {testing["Family Budget Service"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Получить категории
              </Button>
              {testResults["Family Budget Service"] && (
                <div className="text-xs">
                  <pre className="bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(testResults["Family Budget Service"], null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goals Service */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goals Service
                {renderTestResult("Goals Service")}
              </CardTitle>
              <CardDescription>
                Тестирование управления целями накопления (порт 8083)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testGoalsService} 
                disabled={testing["Goals Service"]}
                className="w-full"
              >
                {testing["Goals Service"] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать тестовую цель
              </Button>
              {testResults["Goals Service"] && (
                <div className="text-xs">
                  <pre className="bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(testResults["Goals Service"], null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Информация о подключении */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Информация о подключении</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div><strong>Keycloak:</strong> http://localhost:1111</div>
            <div><strong>Realm:</strong> dev</div>
            <div><strong>Client ID:</strong> fbp</div>
            <div><strong>User Service:</strong> http://127.0.0.1:8081</div>
            <div><strong>Transaction Service:</strong> http://127.0.0.1:8082</div>
            <div><strong>Family Budget Service:</strong> http://127.0.0.1:8083</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}