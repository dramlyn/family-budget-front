import {
  UserDto,
  FamilyDto,
  TransactionDto,
  CategoryDto,
  GoalDto,
  MandatoryPaymentDto,
  BudgetPeriodDto,
  FamilyBudgetPlanDto,
  CategoryExpenseReportDto,
  RegisterParent,
  RegisterUser,
  LoginUser,
  UpdateUser,
  ChangePassword,
  CreateTransaction,
  CreateGoal,
  UpdateGoal,
  TopUpGoal,
  CreateMandatoryPayment,
  AddCategory,
  CreateFamilyBudgetPlan,
} from "@shared/microservices-types";

// Базовые URL для микросервисов
const USER_SERVICE_URL = "http://127.0.0.1:8081";
const TRANSACTION_SERVICE_URL = "http://127.0.0.1:8082";
const FAMILY_BUDGET_SERVICE_URL = "http://127.0.0.1:8083";

// Функция для получения токена из localStorage
function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

// Общая функция для API запросов с Keycloak токеном
async function apiRequest<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
  data?: any,
  requireAuth: boolean = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Добавляем Authorization header с Bearer токеном для защищенных запросов
  if (requireAuth) {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error("Токен доступа не найден. Пожалуйста, войдите в систему.");
    }
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const options: RequestInit = {
    method,
    headers,
    credentials: "include",
  };

  if (data && method !== "GET") {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    if (response.status === 401) {
      // Токен истек или недействителен
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
      throw new Error("Сессия истекла. Пожалуйста, войдите в систему заново.");
    }
    
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ===== USER SERVICE API =====

export const userServiceApi = {
  // Регистрация родителя (создает семью)
  registerParent: (data: RegisterParent): Promise<UserDto> =>
    apiRequest(`${USER_SERVICE_URL}/v1/users/parent`, "POST", data),

  // Регистрация пользователя в существующую семью
  registerUser: (data: RegisterUser): Promise<UserDto> =>
    apiRequest(`${USER_SERVICE_URL}/v1/users/user`, "POST", data),

  // Обновление информации о пользователе
  updateUser: (email: string, data: UpdateUser): Promise<UserDto> =>
    apiRequest(`${USER_SERVICE_URL}/v1/users/${encodeURIComponent(email)}`, "PUT", data),

  // Удаление пользователя
  deleteUser: (email: string): Promise<void> =>
    apiRequest(`${USER_SERVICE_URL}/v1/users/${encodeURIComponent(email)}`, "DELETE"),

  // Смена пароля
  changePassword: (data: ChangePassword): Promise<void> =>
    apiRequest(`${USER_SERVICE_URL}/v1/users/change-password`, "PUT", data),

  // Восстановление пароля
  forgotPassword: (email: string): Promise<void> =>
    apiRequest(`${USER_SERVICE_URL}/v1/users/forgot-password/${encodeURIComponent(email)}`, "POST"),

  // Создание семьи
  createFamily: (data: { name: string; description?: string }): Promise<FamilyDto> =>
    apiRequest(`${USER_SERVICE_URL}/v1/family`, "POST", data),

  // Добавление родителя в семью
  addParentToFamily: (familyId: number, data: { email: string; password: string; firstName: string; lastName: string }): Promise<UserDto> =>
    apiRequest(`${USER_SERVICE_URL}/v1/family/add-parent/${familyId}`, "POST", data),
};

// ===== TRANSACTION SERVICE API =====

export const transactionServiceApi = {
  // Создание транзакции
  createTransaction: (data: CreateTransaction): Promise<TransactionDto> =>
    apiRequest(`${TRANSACTION_SERVICE_URL}/v1/transaction`, "POST", data),

  // Получение транзакции по ID
  getTransaction: (transactionId: number): Promise<TransactionDto> =>
    apiRequest(`${TRANSACTION_SERVICE_URL}/v1/transaction/${transactionId}`),

  // Удаление транзакции
  deleteTransaction: (transactionId: number): Promise<void> =>
    apiRequest(`${TRANSACTION_SERVICE_URL}/v1/transaction/${transactionId}`, "DELETE"),

  // Получение транзакций по параметрам
  getTransactionsByParams: (periodId?: number, userId?: number): Promise<TransactionDto[]> => {
    const params = new URLSearchParams();
    if (periodId) params.append("periodId", periodId.toString());
    if (userId) params.append("userId", userId.toString());
    
    return apiRequest(`${TRANSACTION_SERVICE_URL}/v1/transaction/by-param?${params.toString()}`);
  },
};

// ===== FAMILY BUDGET SERVICE API =====

export const familyBudgetServiceApi = {
  // ===== CATEGORIES =====
  // Получение всех категорий
  getAllCategories: (): Promise<CategoryDto[]> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/category`),

  // Создание категории
  createCategory: (data: AddCategory): Promise<CategoryDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/category`, "POST", data),

  // Получение категории по ID
  getCategory: (categoryId: number): Promise<CategoryDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/category/${categoryId}`),

  // Удаление категории
  deleteCategory: (categoryId: number): Promise<void> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/category/${categoryId}`, "DELETE"),

  // Отчет по расходам категории
  getCategoryExpenseReport: (periodId: number, categoryId: number): Promise<CategoryExpenseReportDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/category/expense-report?periodId=${periodId}&categoryId=${categoryId}`),

  // ===== GOALS =====
  // Создание цели
  createGoal: (data: CreateGoal): Promise<GoalDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/goal`, "POST", data),

  // Пополнение баланса цели
  topUpGoal: (data: TopUpGoal): Promise<GoalDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/goal`, "PATCH", data),

  // Получение цели по ID
  getGoal: (goalId: number): Promise<GoalDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/goal/${goalId}`),

  // Обновление цели
  updateGoal: (goalId: number, data: UpdateGoal): Promise<GoalDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/goal/${goalId}`, "PUT", data),

  // Удаление цели
  deleteGoal: (goalId: number): Promise<void> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/goal/${goalId}`, "DELETE"),

  // Получение всех целей семьи
  getFamilyGoals: (familyId: number): Promise<GoalDto[]> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/goal/family/${familyId}`),

  // ===== MANDATORY PAYMENTS =====
  // Создание обязательного платежа
  createMandatoryPayment: (data: CreateMandatoryPayment): Promise<MandatoryPaymentDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/mandatory-payment`, "POST", data),

  // Получение обязательного платежа по ID
  getMandatoryPayment: (paymentId: number): Promise<MandatoryPaymentDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/mandatory-payment/${paymentId}`),

  // Закрытие обязательного платежа (отметка как оплаченный)
  closeMandatoryPayment: (paymentId: number): Promise<MandatoryPaymentDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/mandatory-payment/${paymentId}`, "PUT"),

  // Удаление обязательного платежа
  deleteMandatoryPayment: (paymentId: number): Promise<void> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/mandatory-payment/${paymentId}`, "DELETE"),

  // Получение всех обязательных платежей семьи
  getFamilyMandatoryPayments: (familyId: number): Promise<MandatoryPaymentDto[]> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/mandatory-payment/family/${familyId}`),

  // ===== BUDGET PLANNING =====
  // Создание месячного плана бюджета семьи
  createFamilyBudgetPlan: (data: CreateFamilyBudgetPlan): Promise<object> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/plan`, "POST", data),

  // Получение плана бюджета семьи
  getFamilyBudgetPlan: (familyId: number, periodId?: number): Promise<FamilyBudgetPlanDto> => {
    const params = new URLSearchParams();
    params.append("familyId", familyId.toString());
    if (periodId) params.append("periodId", periodId.toString());
    
    return apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/plan?${params.toString()}`);
  },

  // ===== BUDGET PERIODS =====
  // Получение периода бюджета
  getBudgetPeriod: (periodId: number): Promise<BudgetPeriodDto> =>
    apiRequest(`${FAMILY_BUDGET_SERVICE_URL}/v1/budget-period/${periodId}`),
};

// Экспорт всех API для удобства
export const microservicesApi = {
  user: userServiceApi,
  transaction: transactionServiceApi,
  familyBudget: familyBudgetServiceApi,
};